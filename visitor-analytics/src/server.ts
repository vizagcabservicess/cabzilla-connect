import http from 'node:http';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import { corsOrigins, env } from './config/env.js';
import { pool } from './db/pool.js';
import { realtimeHub } from './websocket/hub.js';
import { objectStoreMode, persistRecordingBlobsInMysql, pruneLocalRecordingFiles } from './services/s3.js';
import { pruneRecordingDbToBudget } from './services/recording.js';
import trackRouter from './routes/track.js';
import adminRouter from './routes/admin.js';
import chatRouter from './routes/chat.js';
import authRouter from './routes/auth.js';

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(
  cors({
    origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      if (!origin || corsOrigins.includes('*') || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(compression());
app.use(express.json({ limit: '16mb' }));
app.use(express.urlencoded({ extended: true, limit: '16mb' }));

const publicLimiter = rateLimit({
  windowMs: 60_000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

/** Dashboard replay loads many recording chunks; keep this well above public. */
const adminLimiter = rateLimit({
  windowMs: 60_000,
  max: env.NODE_ENV === 'production' ? 3_000 : 20_000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

const trackLimiter = rateLimit({
  windowMs: 60_000,
  max: 1_200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many tracking requests' },
});

app.get('/', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'visitor-analytics',
    health: '/health',
  });
});

app.get('/health', (_req, res) => {
  const mask = (raw: string | undefined) => {
    const v = String(raw || '').trim();
    if (!v) return { set: false, length: 0, prefix: null as string | null };
    return {
      set: true,
      length: v.length,
      prefix: v.slice(0, 4),
    };
  };
  res.json({
    ok: true,
    service: 'visitor-analytics',
    env: env.NODE_ENV,
    wsClients: realtimeHub.clientCount(),
    time: new Date().toISOString(),
    // Lengths only — compare Hostinger env vs local without exposing secrets
    keys: {
      GEMINI_API_KEY: mask(env.GEMINI_API_KEY),
      OPENAI_API_KEY: mask(env.OPENAI_API_KEY),
      GOOGLE_MAPS_SERVER_KEY: mask(env.GOOGLE_MAPS_SERVER_KEY),
    },
  });
});

app.use('/api/auth', publicLimiter, authRouter);
app.use('/api/track', trackLimiter, trackRouter);
// Tracker SDK posts to /v1/collect/* (see visitor-analytics/sdk)
app.use('/v1/collect', trackLimiter, trackRouter);
app.use('/api/admin', adminLimiter, adminRouter);
app.use('/api/chat', publicLimiter, chatRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.flatten() });
    return;
  }
  if (err instanceof Error && err.message.startsWith('CORS blocked')) {
    res.status(403).json({ error: err.message });
    return;
  }
  const missingRecording =
    (err instanceof Error &&
      ((err as Error & { code?: string }).code === 'ENOENT' ||
        (err as Error & { status?: number }).status === 404) &&
      /Recording object not found|no such file|ENOENT/i.test(err.message)) ||
    (typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: string }).code === 'ENOENT');
  if (missingRecording) {
    res.status(404).json({ error: 'Recording chunk file missing', events: [] });
    return;
  }
  // body-parser JSON failures (truncated keepalive bodies show up as "{\")
  const parseFailed =
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    (err as { type?: string }).type === 'entity.parse.failed';
  if (parseFailed || (err instanceof SyntaxError && 'status' in err)) {
    const status =
      typeof err === 'object' && err && 'status' in err && typeof (err as { status: unknown }).status === 'number'
        ? (err as { status: number }).status
        : 400;
    console.warn('[server] invalid JSON body', {
      status,
      preview:
        typeof err === 'object' && err && 'body' in err
          ? String((err as { body: unknown }).body).slice(0, 80)
          : undefined,
    });
    res.status(status).json({ error: 'Invalid JSON body' });
    return;
  }
  console.error('[server] unhandled error', err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  const statusCode =
    typeof err === 'object' && err && 'status' in err && typeof (err as { status: unknown }).status === 'number'
      ? (err as { status: number }).status
      : message.startsWith('Recording chunk too large')
        ? 413
        : message === 'Conversation not found' || message === 'Chat is disabled for this site'
          ? 400
          : 500;
  res.status(statusCode).json({
    error: env.NODE_ENV === 'production' && statusCode === 500 ? 'Internal server error' : message,
  });
});

let server: http.Server | null = null;

async function start(existingServer?: http.Server): Promise<http.Server> {
  // Hostinger proxies to process.env.PORT (often 3000). Listen FIRST —
  // never block startup on MySQL (remote DB can hang and cause 503).
  const port = Number(process.env.PORT) || Number(process.env.WEB_PORT) || 3000;

  if (existingServer) {
    server = existingServer;
    realtimeHub.attach(server);
  } else {
    server = http.createServer(app);
    realtimeHub.attach(server);

    await new Promise<void>((resolve, reject) => {
      server!.once('error', reject);
      server!.listen(port, '0.0.0.0', () => {
        server!.off('error', reject);
        console.log(`[visitor-analytics] listening on 0.0.0.0:${port}`);
        console.log(`[visitor-analytics] recording store=${objectStoreMode()} blobsInMysql=${persistRecordingBlobsInMysql()}`);
        resolve();
      });
    });
  }

  if (env.NODE_ENV === 'production' && objectStoreMode() !== 'local') {
    void pruneLocalRecordingFiles({ olderThanDays: 0 })
      .then((pruned) => {
        console.log(
          `[visitor-analytics] pruned leftover local recordings files=${pruned.deletedFiles} dirs=${pruned.deletedDirs}`,
        );
      })
      .catch((err) => {
        console.warn(
          '[visitor-analytics] local recording prune failed',
          err instanceof Error ? err.message : err,
        );
      });
  }

  void pool
    .query('SELECT 1')
    .then(async () => {
      console.log('[visitor-analytics] database connection OK');
      try {
        const [cols] = await pool.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = 'va_recording_chunks'
             AND COLUMN_NAME = 'payload_gzip'`,
        );
        const hasPayload = Array.isArray(cols) && cols.length > 0;
        if (!hasPayload) {
          console.error(
            '[visitor-analytics] SESSION REPLAY BROKEN until you run: ' +
              'sql/patches/2026-07-25_recording_payload_db.sql ' +
              '(adds va_recording_chunks.payload_gzip). Local disk recordings are wiped on Hostinger redeploy.',
          );
        } else {
          console.log('[visitor-analytics] recording DB payload column OK');
          const cap = await pruneRecordingDbToBudget();
          console.log(
            `[visitor-analytics] recording DB ${Math.round(cap.bytesAfter / 1024 / 1024)}MB / ${Math.round(env.RECORDING_DB_MAX_BYTES / 1024 / 1024)}MB cap`,
          );
          setInterval(() => {
            void pruneRecordingDbToBudget().catch((err) => {
              console.warn(
                '[visitor-analytics] recording DB prune failed',
                err instanceof Error ? err.message : err,
              );
            });
          }, 15 * 60 * 1000).unref();
        }
      } catch (checkErr) {
        console.warn(
          '[visitor-analytics] could not verify recording payload column',
          checkErr instanceof Error ? checkErr.message : checkErr,
        );
      }
    })
    .catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[visitor-analytics] database not ready:', msg);
      if (/Access denied/i.test(msg)) {
        const fromHost = msg.match(/@'([^']+)'/)?.[1] || 'unknown';
        console.error(
          `[visitor-analytics] MySQL rejected client host '${fromHost}'. ` +
            `In hPanel search "Remote MySQL" (on the hosting that owns u644605165_vth_db), ` +
            `Create access for IP '${fromHost}' AND Any Host (%), pick database u644605165_vth_db. ` +
            `If already allowed, reset the DB user password in hPanel and set DB_PASSWORD to the new value (avoid special chars like ^ ] if Hostinger mangles them).`,
        );
      }
    });

  return server;
}

function shutdown(signal: string): void {
  console.log(`[visitor-analytics] ${signal} received, shutting down`);
  const s = server;
  if (!s) {
    process.exit(0);
    return;
  }
  s.close(async () => {
    try {
      await pool.end();
    } catch {
      // ignore
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { app, pool, realtimeHub, server, start };

const isMain =
  typeof require !== 'undefined' &&
  typeof module !== 'undefined' &&
  require.main === module;

if (isMain || process.env.VA_AUTOSTART === '1') {
  start().catch((err) => {
    console.error('[visitor-analytics] failed to start', err);
    process.exit(1);
  });
}
