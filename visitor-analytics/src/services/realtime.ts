import { query } from '../db/pool.js';
import type { DeviceType, LiveVisitorSnapshot } from '../types/index.js';
import { realtimeHub } from '../websocket/hub.js';

interface SessionRow {
  id: string;
  visitor_id: string;
  landing_page: string | null;
  exit_page: string | null;
  started_at: Date | string;
  updated_at: Date | string;
  utm_source: string | null;
  referrer: string | null;
  device_type: DeviceType;
  browser: string | null;
  city: string | null;
  pincode: string | null;
  country: string | null;
  ip_address: string | null;
  is_returning: number;
}

/**
 * Online visitors: prefer live WebSocket connections, enrich from active sessions.
 */
export async function getLiveVisitors(siteId: string): Promise<LiveVisitorSnapshot[]> {
  const live = realtimeHub.getOnlineVisitorSessions(siteId);
  const liveIds = new Set(live.map((v) => v.visitorId));

  const activeSessions = await query<SessionRow[]>(
    `SELECT s.id, s.visitor_id, s.landing_page, s.exit_page, s.started_at, s.updated_at,
            s.utm_source, s.referrer, s.device_type, s.browser, s.city, s.pincode, s.country,
            s.ip_address, v.is_returning
     FROM va_sessions s
     INNER JOIN va_visitors v ON v.id = s.visitor_id
     WHERE s.site_id = :siteId
       AND s.is_active = 1
       AND s.updated_at >= (UTC_TIMESTAMP() - INTERVAL 5 MINUTE)
     ORDER BY s.updated_at DESC
     LIMIT 200`,
    { siteId },
  ).catch(async (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/pincode/i.test(msg)) throw err;
    return query<SessionRow[]>(
      `SELECT s.id, s.visitor_id, s.landing_page, s.exit_page, s.started_at, s.updated_at,
              s.utm_source, s.referrer, s.device_type, s.browser, s.city, NULL AS pincode, s.country,
              s.ip_address, v.is_returning
       FROM va_sessions s
       INNER JOIN va_visitors v ON v.id = s.visitor_id
       WHERE s.site_id = :siteId
         AND s.is_active = 1
         AND s.updated_at >= (UTC_TIMESTAMP() - INTERVAL 5 MINUTE)
       ORDER BY s.updated_at DESC
       LIMIT 200`,
      { siteId },
    );
  });

  const byVisitor = new Map<string, SessionRow>();
  for (const row of activeSessions) {
    if (!byVisitor.has(row.visitor_id)) byVisitor.set(row.visitor_id, row);
  }

  // Merge WS-connected visitors that may not yet have a fresh session row
  for (const conn of live) {
    if (!byVisitor.has(conn.visitorId)) {
      const fallback = activeSessions.find((s) => s.visitor_id === conn.visitorId);
      if (fallback) byVisitor.set(conn.visitorId, fallback);
    }
  }

  const snapshots: LiveVisitorSnapshot[] = [];
  const now = Date.now();

  for (const [visitorId, row] of byVisitor) {
    const started = new Date(row.started_at).getTime();
    const updated = new Date(row.updated_at).getTime();
    const ws = live.find((c) => c.visitorId === visitorId);
    const isWsOnline = liveIds.has(visitorId);

    // Include if WS-connected or session touched recently
    if (!isWsOnline && now - updated > 5 * 60_000) continue;

    const trafficSource =
      row.utm_source ||
      (row.referrer
        ? (() => {
            try {
              return new URL(row.referrer).hostname.replace(/^www\./, '');
            } catch {
              return 'referral';
            }
          })()
        : 'direct');

    snapshots.push({
      visitorId,
      sessionId: ws?.sessionId || row.id,
      isReturning: Boolean(row.is_returning),
      currentPage: row.exit_page || row.landing_page || '/',
      timeOnPageMs: Math.max(0, now - started),
      mouseX: null,
      mouseY: null,
      city: row.city,
      pincode: row.pincode,
      country: row.country,
      ipAddress: row.ip_address,
      trafficSource,
      deviceType: row.device_type,
      browser: row.browser,
      lastSeenAt: new Date(Math.max(updated, ws?.connectedAt || 0)).toISOString(),
    });
  }

  // Ensure pure WS visitors without DB row still appear
  for (const conn of live) {
    if (snapshots.some((s) => s.visitorId === conn.visitorId)) continue;
    snapshots.push({
      visitorId: conn.visitorId,
      sessionId: conn.sessionId || '',
      isReturning: false,
      currentPage: '/',
      timeOnPageMs: Math.max(0, now - conn.connectedAt),
      mouseX: null,
      mouseY: null,
      city: null,
      pincode: null,
      country: null,
      ipAddress: null,
      trafficSource: 'direct',
      deviceType: 'unknown',
      browser: null,
      lastSeenAt: new Date(conn.connectedAt).toISOString(),
    });
  }

  snapshots.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  return snapshots;
}

export async function getLiveVisitorCount(siteId: string): Promise<number> {
  const visitors = await getLiveVisitors(siteId);
  return visitors.length;
}

export function broadcastLiveSnapshot(siteId: string, snapshots: LiveVisitorSnapshot[]): void {
  realtimeHub.broadcastToDashboard(siteId, {
    type: 'visitors.live',
    payload: { visitors: snapshots, count: snapshots.length, at: new Date().toISOString() },
  });
}

export async function refreshAndBroadcastLiveVisitors(siteId: string): Promise<LiveVisitorSnapshot[]> {
  const snapshots = await getLiveVisitors(siteId);
  broadcastLiveSnapshot(siteId, snapshots);
  return snapshots;
}
