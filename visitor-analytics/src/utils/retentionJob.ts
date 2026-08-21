import { env } from '../config/env.js';
import { pool, query, queryOne } from '../db/pool.js';
import { deleteObjects, pruneLocalRecordingFiles } from '../services/s3.js';
import { pruneRecordingDbToBudget } from '../services/recording.js';

interface SiteRow {
  id: string;
  name: string;
  retention_days: number;
}

async function deleteForSite(site: SiteRow): Promise<{
  sessions: number;
  events: number;
  recordings: number;
  heatmap: number;
  bookingEvents: number;
}> {
  const days = Math.max(1, site.retention_days || env.DEFAULT_RETENTION_DAYS);

  const recordingKeys = await query<Array<{ s3_key: string }>>(
    `SELECT rc.s3_key
     FROM va_recording_chunks rc
     INNER JOIN va_sessions s ON s.id = rc.session_id
     WHERE s.site_id = :siteId
       AND s.started_at < (UTC_TIMESTAMP() - INTERVAL :days DAY)`,
    { siteId: site.id, days },
  );

  const keys = recordingKeys.map((r) => r.s3_key).filter(Boolean);
  for (let i = 0; i < keys.length; i += 100) {
    await deleteObjects(keys.slice(i, i + 100));
  }

  const recResult = await query<{ affectedRows: number }>(
    `DELETE rc FROM va_recording_chunks rc
     INNER JOIN va_sessions s ON s.id = rc.session_id
     WHERE s.site_id = :siteId
       AND s.started_at < (UTC_TIMESTAMP() - INTERVAL :days DAY)`,
    { siteId: site.id, days },
  );

  const eventsResult = await query<{ affectedRows: number }>(
    `DELETE FROM va_events
     WHERE site_id = :siteId
       AND occurred_at < (UTC_TIMESTAMP() - INTERVAL :days DAY)`,
    { siteId: site.id, days },
  );

  const heatResult = await query<{ affectedRows: number }>(
    `DELETE FROM va_heatmap_points
     WHERE site_id = :siteId
       AND day_date < (UTC_DATE() - INTERVAL :days DAY)`,
    { siteId: site.id, days },
  );

  const bookingResult = await query<{ affectedRows: number }>(
    `DELETE FROM va_booking_events
     WHERE site_id = :siteId
       AND occurred_at < (UTC_TIMESTAMP() - INTERVAL :days DAY)`,
    { siteId: site.id, days },
  );

  const sessionsResult = await query<{ affectedRows: number }>(
    `DELETE FROM va_sessions
     WHERE site_id = :siteId
       AND started_at < (UTC_TIMESTAMP() - INTERVAL :days DAY)`,
    { siteId: site.id, days },
  );

  // Orphan visitors with no sessions and last_seen older than retention
  await query(
    `DELETE v FROM va_visitors v
     LEFT JOIN va_sessions s ON s.visitor_id = v.id
     WHERE v.site_id = :siteId
       AND s.id IS NULL
       AND v.last_seen_at < (UTC_TIMESTAMP() - INTERVAL :days DAY)`,
    { siteId: site.id, days },
  );

  // Old notifications
  await query(
    `DELETE FROM va_notifications
     WHERE site_id = :siteId
       AND created_at < (UTC_TIMESTAMP() - INTERVAL :days DAY)`,
    { siteId: site.id, days },
  );

  const affected = (r: { affectedRows?: number } | unknown) =>
    Number((r as { affectedRows?: number })?.affectedRows || 0);

  return {
    sessions: affected(sessionsResult),
    events: affected(eventsResult),
    recordings: affected(recResult) || keys.length,
    heatmap: affected(heatResult),
    bookingEvents: affected(bookingResult),
  };
}

export async function runRetentionJob(siteId?: string): Promise<void> {
  const sites = siteId
    ? await query<SiteRow[]>(`SELECT id, name, retention_days FROM va_sites WHERE id = :id`, {
        id: siteId,
      })
    : await query<SiteRow[]>(`SELECT id, name, retention_days FROM va_sites`);

  console.log(`[retention] starting for ${sites.length} site(s)`);

  for (const site of sites) {
    const result = await deleteForSite(site);
    console.log(
      `[retention] site=${site.name} (${site.id}) days=${site.retention_days} ` +
        `sessions=${result.sessions} events=${result.events} recordings=${result.recordings} ` +
        `heatmap=${result.heatmap} bookings=${result.bookingEvents}`,
    );
  }

  const pruned = await pruneLocalRecordingFiles({
    olderThanDays: env.DEFAULT_RETENTION_DAYS,
  });
  console.log(
    `[retention] local recording files deleted=${pruned.deletedFiles} dirs=${pruned.deletedDirs}`,
  );

  const dbCap = await pruneRecordingDbToBudget();
  console.log(
    `[retention] recording DB cap deletedSessions=${dbCap.deletedSessions} ` +
      `after=${Math.round(dbCap.bytesAfter / 1024 / 1024)}MB`,
  );

  console.log('[retention] done');
}

async function main(): Promise<void> {
  const siteId = process.argv[2];
  if (siteId) {
    const exists = await queryOne(`SELECT id FROM va_sites WHERE id = :id`, { id: siteId });
    if (!exists) {
      console.error(`[retention] unknown site id: ${siteId}`);
      process.exit(1);
    }
  }

  try {
    await runRetentionJob(siteId);
  } finally {
    await pool.end();
  }
}

const isDirect =
  process.argv[1]?.includes('retentionJob') ||
  process.env.RUN_RETENTION === '1';

if (isDirect) {
  main().catch((err) => {
    console.error('[retention] failed', err);
    process.exit(1);
  });
}
