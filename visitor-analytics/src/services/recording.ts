import pako from 'pako';
import { env } from '../config/env.js';
import { query, queryOne } from '../db/pool.js';
import { putObject, getObjectBuffer, objectStoreMode, persistRecordingBlobsInMysql } from './s3.js';
import { realtimeHub } from '../websocket/hub.js';
import { newId, toMysqlDateTime } from '../utils/helpers.js';

function decodeGzipJson(buf: Buffer): unknown[] {
  const json = pako.ungzip(buf, { to: 'string' }) as string;
  return JSON.parse(json) as unknown[];
}

function asBuffer(value: unknown): Buffer | null {
  if (!value) return null;
  if (Buffer.isBuffer(value)) return value.length ? value : null;
  if (value instanceof Uint8Array) return value.length ? Buffer.from(value) : null;
  if (typeof value === 'string' && value.length) return Buffer.from(value, 'binary');
  return null;
}

const RECORDING_PRUNE_TARGET_RATIO = 0.8;
let recordingBytesCache = 0;
let recordingBytesCacheAt = 0;
let pruneInFlight: Promise<PruneRecordingResult> | null = null;

export type PruneRecordingResult = {
  deletedChunks: number;
  deletedSessions: number;
  bytesBefore: number;
  bytesAfter: number;
};

async function recordingTableBytes(): Promise<number> {
  const now = Date.now();
  if (now - recordingBytesCacheAt < 15_000) return recordingBytesCache;
  const row = await queryOne<{ n: number | string }>(
    `SELECT COALESCE(SUM(byte_size), 0) AS n FROM va_recording_chunks`,
  );
  recordingBytesCache = Number(row?.n || 0);
  recordingBytesCacheAt = now;
  return recordingBytesCache;
}

/**
 * Delete oldest session replays when MySQL recording blobs exceed RECORDING_DB_MAX_BYTES (1GB).
 * Stops at 80% of the cap so we are not pruning on every new chunk.
 */
export async function pruneRecordingDbToBudget(opts?: {
  incomingBytes?: number;
  protectSessionId?: string;
}): Promise<PruneRecordingResult> {
  const empty: PruneRecordingResult = {
    deletedChunks: 0,
    deletedSessions: 0,
    bytesBefore: 0,
    bytesAfter: 0,
  };
  const maxBytes = env.RECORDING_DB_MAX_BYTES;
  if (!maxBytes || maxBytes <= 0) return empty;

  if (pruneInFlight) return pruneInFlight;

  pruneInFlight = (async () => {
    const incoming = Math.max(0, opts?.incomingBytes ?? 0);
    const bytesBefore = await recordingTableBytes();
    if (bytesBefore + incoming <= maxBytes) {
      recordingBytesCache = bytesBefore + incoming;
      return { ...empty, bytesBefore, bytesAfter: bytesBefore };
    }

    const targetBytes = Math.floor(maxBytes * RECORDING_PRUNE_TARGET_RATIO);
    let remaining = bytesBefore;
    let deletedChunks = 0;
    let deletedSessions = 0;
    const protect = opts?.protectSessionId;

    for (let pass = 0; pass < 10 && remaining + incoming > targetBytes; pass += 1) {
      const oldest = await query<Array<{ session_id: string; bytes: number | string }>>(
        `SELECT session_id, COALESCE(SUM(byte_size), 0) AS bytes
         FROM va_recording_chunks
         GROUP BY session_id
         ORDER BY MIN(started_at) ASC
         LIMIT 200`,
      );
      if (!oldest.length) break;

      let progressed = false;
      for (const row of oldest) {
        if (remaining + incoming <= targetBytes) break;
        if (protect && row.session_id === protect) continue;

        const del = await query<{ affectedRows?: number }>(
          `DELETE FROM va_recording_chunks WHERE session_id = :id`,
          { id: row.session_id },
        );
        const removed = Number(del?.affectedRows || 0);
        await query(
          `UPDATE va_sessions SET has_recording = 0, recording_s3_key = NULL WHERE id = :id`,
          { id: row.session_id },
        );
        remaining = Math.max(0, remaining - Number(row.bytes || 0));
        deletedSessions += 1;
        deletedChunks += removed;
        progressed = true;
      }
      if (!progressed) break;
    }

    recordingBytesCacheAt = 0;
    const bytesAfter = await recordingTableBytes();
    if (deletedSessions > 0) {
      console.log(
        `[va] recording DB prune sessions=${deletedSessions} chunks=${deletedChunks} ` +
          `before=${Math.round(bytesBefore / 1024 / 1024)}MB after=${Math.round(bytesAfter / 1024 / 1024)}MB cap=${Math.round(maxBytes / 1024 / 1024)}MB`,
      );
    }
    return { deletedChunks, deletedSessions, bytesBefore, bytesAfter };
  })().finally(() => {
    pruneInFlight = null;
  });

  return pruneInFlight;
}

async function loadPayloadFromDb(
  sessionId: string,
  chunkIndex: number,
): Promise<unknown[] | null> {
  try {
    const row = await queryOne<{ payload_gzip: unknown }>(
      `SELECT payload_gzip FROM va_recording_chunks
       WHERE session_id = :sessionId AND chunk_index = :chunkIndex
       LIMIT 1`,
      { sessionId, chunkIndex },
    );
    const buf = asBuffer(row?.payload_gzip);
    if (!buf) return null;
    return decodeGzipJson(buf);
  } catch (dbErr) {
    const dbMsg = dbErr instanceof Error ? dbErr.message : String(dbErr);
    if (/payload_gzip/i.test(dbMsg)) return null;
    throw dbErr;
  }
}

export async function storeRecordingChunk(params: {
  siteId: string;
  sessionId: string;
  chunkIndex: number;
  events: unknown[];
  startedAt: string;
  endedAt: string;
  visitorId?: string | null;
}): Promise<{ s3Key: string; byteSize: number }> {
  const json = JSON.stringify(params.events);
  const compressed = Buffer.from(pako.gzip(json));
  if (compressed.byteLength > env.MAX_RECORDING_CHUNK_BYTES) {
    const err = new Error(
      `Recording chunk too large (${compressed.byteLength} > ${env.MAX_RECORDING_CHUNK_BYTES})`,
    );
    (err as Error & { status?: number }).status = 413;
    throw err;
  }

  const s3Key = `recordings/${params.siteId}/${params.sessionId}/${params.chunkIndex}.json.gz`;
  const store = objectStoreMode();
  const keepBlobInDb = persistRecordingBlobsInMysql();

  if (store === 'db' && !keepBlobInDb) {
    return { s3Key, byteSize: compressed.byteLength };
  }

  if (keepBlobInDb) {
    await pruneRecordingDbToBudget({
      incomingBytes: compressed.byteLength,
      protectSessionId: params.sessionId,
    });
  }

  if (store !== 'db') {
    try {
      await putObject(s3Key, compressed, 'application/json', 'gzip');
    } catch (err) {
      console.warn(
        '[va] object-store put failed; chunk not stored in MySQL either',
        err instanceof Error ? err.message : err,
      );
      if (!keepBlobInDb) {
        return { s3Key, byteSize: compressed.byteLength };
      }
    }
  }

  const startedAt = params.startedAt.replace('T', ' ').replace('Z', '');
  const endedAt = params.endedAt.replace('T', ' ').replace('Z', '');
  const payload = keepBlobInDb ? compressed : null;

  try {
    await query(
      `INSERT INTO va_recording_chunks (
        site_id, session_id, chunk_index, s3_key, byte_size, payload_gzip, event_count, started_at, ended_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        s3_key = VALUES(s3_key),
        byte_size = VALUES(byte_size),
        payload_gzip = VALUES(payload_gzip),
        event_count = VALUES(event_count),
        started_at = VALUES(started_at),
        ended_at = VALUES(ended_at)`,
      [
        params.siteId,
        params.sessionId,
        params.chunkIndex,
        s3Key,
        compressed.byteLength,
        payload,
        params.events.length,
        startedAt,
        endedAt,
      ],
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/payload_gzip/i.test(msg)) throw err;
    const missing = new Error(
      'Recording storage not ready: run sql/patches/2026-07-25_recording_payload_db.sql (add va_recording_chunks.payload_gzip)',
    ) as Error & { status?: number };
    missing.status = 503;
    throw missing;
  }

  if (keepBlobInDb) {
    const verify = await queryOne<{ n: number }>(
      `SELECT LENGTH(payload_gzip) AS n FROM va_recording_chunks
       WHERE session_id = ? AND chunk_index = ? LIMIT 1`,
      [params.sessionId, params.chunkIndex],
    );
    if (!verify?.n) {
      const err = new Error(
        'Recording payload_gzip write failed (NULL after insert) — check MySQL max_allowed_packet',
      ) as Error & { status?: number };
      err.status = 500;
      throw err;
    }
  }

  recordingBytesCache += compressed.byteLength;
  recordingBytesCacheAt = Date.now();

  await query(
    `UPDATE va_sessions SET has_recording = 1, recording_s3_key = :key WHERE id = :id`,
    { key: `recordings/${params.siteId}/${params.sessionId}/`, id: params.sessionId },
  );

  // Push to live dashboard watchers.
  // Never inline full page snapshots over WS — they stall the admin UI; fetch via HTTP instead.
  const hasFull = params.events.some(
    (e) => typeof e === 'object' && e !== null && (e as { op?: string }).op === 'full',
  );
  const includeEvents = !hasFull && compressed.byteLength < 80_000;
  realtimeHub.broadcastToDashboard(params.siteId, {
    type: 'recording.live',
    payload: {
      sessionId: params.sessionId,
      visitorId: params.visitorId || null,
      chunkIndex: params.chunkIndex,
      events: includeEvents ? params.events : undefined,
      fetchChunk: !includeEvents,
      hasFull,
      at: new Date().toISOString(),
    },
  });

  return { s3Key, byteSize: compressed.byteLength };
}

export async function listRecordingChunks(sessionId: string) {
  return query<
    Array<{
      chunk_index: number;
      s3_key: string;
      byte_size: number;
      event_count: number;
      started_at: Date;
      ended_at: Date;
    }>
  >(
    `SELECT chunk_index, s3_key, byte_size, event_count, started_at, ended_at
     FROM va_recording_chunks WHERE session_id = :sessionId ORDER BY chunk_index ASC`,
    { sessionId },
  );
}

/**
 * Load chunk events.
 * Durable copy is MySQL payload_gzip. Local disk / S3 are optional caches.
 */
export async function loadRecordingChunkEvents(
  s3Key: string,
  opts?: { sessionId?: string; chunkIndex?: number },
): Promise<unknown[]> {
  const preferDb = opts?.sessionId != null && opts.chunkIndex != null;

  if (preferDb) {
    const fromDb = await loadPayloadFromDb(opts.sessionId!, opts.chunkIndex!);
    if (fromDb) return fromDb;
  }

  try {
    const buf = await getObjectBuffer(s3Key);
    return decodeGzipJson(buf);
  } catch (err) {
    const status =
      typeof err === 'object' && err && 'status' in err
        ? Number((err as { status: unknown }).status)
        : 0;
    const code =
      typeof err === 'object' && err && 'code' in err
        ? String((err as { code: unknown }).code)
        : '';
    const missing = status === 404 || code === 'ENOENT' || /not found/i.test(String(err));
    if (!missing || opts?.sessionId == null || opts.chunkIndex == null) throw err;

    const fromDb = await loadPayloadFromDb(opts.sessionId, opts.chunkIndex);
    if (fromDb) return fromDb;
    throw err;
  }
}

export async function getRecordingManifest(sessionId: string) {
  const session = await queryOne<{
    id: string;
    started_at: Date;
    ended_at: Date | null;
    has_recording: number;
  }>(`SELECT id, started_at, ended_at, has_recording FROM va_sessions WHERE id = :id`, { id: sessionId });

  if (!session) return null;
  const chunks = await listRecordingChunks(sessionId);

  // Browser cannot fetch local:// or raw MinIO without CORS — always expose HTTP API chunk URLs.
  // Frontend loads these with the operator JWT via /api/admin/...
  const signed = chunks.map((c) => ({
    index: c.chunk_index,
    url: `/api/admin/recordings/${sessionId}/chunks/${c.chunk_index}/data`,
    byteSize: c.byte_size,
    eventCount: c.event_count,
    startedAt: c.started_at,
    endedAt: c.ended_at,
  }));

  return {
    sessionId,
    startedAt: session.started_at,
    endedAt: session.ended_at,
    hasRecording: Boolean(session.has_recording),
    chunks: signed,
  };
}

export async function createUploadPlaceholder(): Promise<string> {
  return newId();
}

export { toMysqlDateTime };
