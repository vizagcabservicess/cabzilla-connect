import pako from 'pako';
import { env } from '../config/env.js';
import { query, queryOne } from '../db/pool.js';
import { putObject, getObjectBuffer, objectStoreMode } from './s3.js';
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
  if (store !== 'db') {
    try {
      await putObject(s3Key, compressed, 'application/json', 'gzip');
    } catch (err) {
      console.warn(
        '[va] object-store put failed; relying on DB payload_gzip',
        err instanceof Error ? err.message : err,
      );
    }
  }

  const startedAt = params.startedAt.replace('T', ' ').replace('Z', '');
  const endedAt = params.endedAt.replace('T', ' ').replace('Z', '');

  // Use positional params for MEDIUMBLOB — mysql2 named placeholders can drop Buffer values as NULL.
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
        compressed,
        params.events.length,
        startedAt,
        endedAt,
      ],
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/payload_gzip/i.test(msg)) throw err;
    // Without this column, Hostinger redeploys make every replay unplayable.
    const missing = new Error(
      'Recording storage not ready: run sql/patches/2026-07-25_recording_payload_db.sql (add va_recording_chunks.payload_gzip)',
    ) as Error & { status?: number };
    missing.status = 503;
    throw missing;
  }

  // Guard: never mark has_recording if the durable payload did not land
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
