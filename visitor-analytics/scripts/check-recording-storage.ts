import { pool } from '../src/db/pool.js';
import { loadRecordingChunkEvents } from '../src/services/recording.js';

async function main() {
  const [rows] = await pool.query(
    `SELECT session_id, chunk_index, s3_key, byte_size, LENGTH(payload_gzip) AS payload_len
     FROM va_recording_chunks
     WHERE payload_gzip IS NOT NULL AND LENGTH(payload_gzip) > 5000
     ORDER BY id DESC
     LIMIT 3`,
  );
  const list = rows as Array<{
    session_id: string;
    chunk_index: number;
    s3_key: string;
    byte_size: number;
    payload_len: number;
  }>;
  console.log('candidates:', JSON.stringify(list, null, 2));

  for (const row of list) {
    try {
      const events = await loadRecordingChunkEvents(row.s3_key, {
        sessionId: row.session_id,
        chunkIndex: row.chunk_index,
      });
      const ops = events as Array<{ op?: string }>;
      const hasFull = ops.some((e) => e?.op === 'full');
      console.log(
        `load ok session=${row.session_id.slice(0, 8)} chunk=${row.chunk_index} events=${ops.length} hasFull=${hasFull}`,
      );
    } catch (e) {
      console.error(
        `load FAIL session=${row.session_id.slice(0, 8)} chunk=${row.chunk_index}`,
        e instanceof Error ? e.message : e,
      );
    }
  }

  await pool.end();
}

main().catch(async (e) => {
  console.error('ERR', e instanceof Error ? e.message : e);
  try {
    await pool.end();
  } catch {
    // ignore
  }
  process.exit(1);
});
