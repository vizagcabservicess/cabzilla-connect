import { query, queryOne } from '../db/pool.js';
import { classifyTrafficSource, resolveSessionAttribution } from '../utils/helpers.js';

function dateRange(from: string, to: string) {
  return { from: `${from} 00:00:00`, to: `${to} 23:59:59.999` };
}

function pct(numer: number, denom: number): number {
  if (!denom) return 0;
  return Math.round((numer / denom) * 1000) / 10;
}

const DEVICE_ORDER = ['mobile', 'desktop', 'tablet', 'unknown'] as const;
const SOURCE_ORDER = [
  'Google Ads',
  'Organic Search',
  'Direct',
  'Facebook',
  'Instagram',
  'Referral',
];

/** Sessions that converted (completed booking or payment), from either booking table or events. */
async function convertedSessionIds(siteId: string, from: string, to: string): Promise<Set<string>> {
  const rows = await query<Array<{ session_id: string }>>(
    `SELECT DISTINCT session_id FROM (
       SELECT session_id
       FROM va_booking_events
       WHERE site_id = :siteId
         AND occurred_at BETWEEN :from AND :to
         AND session_id IS NOT NULL
         AND event_type IN ('booking_completed', 'payment_success')
       UNION
       SELECT session_id
       FROM va_events
       WHERE site_id = :siteId
         AND occurred_at BETWEEN :from AND :to
         AND event_type IN ('booking_completed', 'razorpay_payment', 'payment_success')
     ) t`,
    { siteId, ...dateRange(from, to) },
  );
  return new Set(rows.map((r) => r.session_id).filter(Boolean));
}

async function topLandingPages(siteId: string, from: string, to: string, limit = 10) {
  // Strip query strings so Ads params don't fragment the same page into many rows
  return query<Array<{ page: string; count: number }>>(
    `SELECT SUBSTRING_INDEX(landing_page, '?', 1) AS page, COUNT(*) AS count
     FROM va_sessions
     WHERE site_id = :siteId AND started_at BETWEEN :from AND :to AND landing_page IS NOT NULL
     GROUP BY page
     ORDER BY count DESC
     LIMIT :limit`,
    { siteId, ...dateRange(from, to), limit },
  );
}

async function topExitPages(siteId: string, from: string, to: string, limit = 10) {
  return query<Array<{ page: string; count: number }>>(
    `SELECT SUBSTRING_INDEX(exit_page, '?', 1) AS page, COUNT(*) AS count
     FROM va_sessions
     WHERE site_id = :siteId AND started_at BETWEEN :from AND :to AND exit_page IS NOT NULL
     GROUP BY page
     ORDER BY count DESC
     LIMIT :limit`,
    { siteId, ...dateRange(from, to), limit },
  );
}

async function topVehicles(siteId: string, from: string, to: string, limit = 10) {
  return query<Array<{ vehicle: string; count: number }>>(
    `SELECT vehicle_category AS vehicle, COUNT(*) AS count
     FROM va_booking_events
     WHERE site_id = :siteId AND occurred_at BETWEEN :from AND :to
     GROUP BY vehicle_category
     ORDER BY count DESC
     LIMIT :limit`,
    { siteId, ...dateRange(from, to), limit },
  );
}

async function topButtons(siteId: string, from: string, to: string, limit = 10) {
  return query<Array<{ label: string; count: number }>>(
    `SELECT COALESCE(NULLIF(element_text, ''), NULLIF(element_id, ''), element_tag, 'unknown') AS label,
            COUNT(*) AS count
     FROM va_events
     WHERE site_id = :siteId
       AND occurred_at BETWEEN :from AND :to
       AND event_type IN ('click', 'phone_click', 'whatsapp_click', 'email_click')
     GROUP BY label
     ORDER BY count DESC
     LIMIT :limit`,
    { siteId, ...dateRange(from, to), limit },
  );
}

async function topCampaigns(siteId: string, from: string, to: string, limit = 10) {
  return query<Array<{ campaign: string; count: number }>>(
    `SELECT COALESCE(utm_campaign, '(none)') AS campaign, COUNT(*) AS count
     FROM va_sessions
     WHERE site_id = :siteId AND started_at BETWEEN :from AND :to
     GROUP BY campaign
     ORDER BY count DESC
     LIMIT :limit`,
    { siteId, ...dateRange(from, to), limit },
  );
}

async function topSearchTerms(siteId: string, from: string, to: string, limit = 100) {
  return query<Array<{ term: string; count: number }>>(
    `SELECT term, COUNT(*) AS count FROM (
       SELECT utm_term AS term
       FROM va_sessions
       WHERE site_id = :siteId
         AND started_at BETWEEN :from AND :to
         AND utm_term IS NOT NULL AND utm_term <> ''
       UNION ALL
       SELECT COALESCE(
         NULLIF(JSON_UNQUOTE(JSON_EXTRACT(meta, '$.query')), ''),
         NULLIF(JSON_UNQUOTE(JSON_EXTRACT(meta, '$.term')), ''),
         NULLIF(JSON_UNQUOTE(JSON_EXTRACT(meta, '$.keyword')), ''),
         event_name
       ) AS term
       FROM va_events
       WHERE site_id = :siteId
         AND occurred_at BETWEEN :from AND :to
         AND (
           (event_type = 'custom' AND event_name LIKE 'search%')
           OR JSON_UNQUOTE(JSON_EXTRACT(meta, '$.kind')) = 'search'
         )
     ) t
     WHERE term IS NOT NULL
       AND term <> ''
       AND term NOT IN ('search', 'search_submit', 'search_query', 'search_term')
     GROUP BY term
     ORDER BY count DESC
     LIMIT :limit`,
    { siteId, ...dateRange(from, to), limit },
  );
}

async function coreCounts(siteId: string, from: string, to: string) {
  const visitors = await queryOne<{ new_v: number; ret_v: number }>(
    `SELECT
       SUM(is_returning = 0) AS new_v,
       SUM(is_returning = 1) AS ret_v
     FROM va_visitors
     WHERE site_id = :siteId AND first_seen_at BETWEEN :from AND :to`,
    { siteId, ...dateRange(from, to) },
  );

  const sessions = await queryOne<{ c: number; avg_ms: number }>(
    `SELECT COUNT(*) AS c, COALESCE(AVG(duration_ms), 0) AS avg_ms
     FROM va_sessions
     WHERE site_id = :siteId AND started_at BETWEEN :from AND :to`,
    { siteId, ...dateRange(from, to) },
  );

  const pageviews = await queryOne<{ c: number }>(
    `SELECT COUNT(*) AS c FROM va_events
     WHERE site_id = :siteId AND event_type = 'page_view' AND occurred_at BETWEEN :from AND :to`,
    { siteId, ...dateRange(from, to) },
  );

  const chats = await queryOne<{ c: number }>(
    `SELECT COUNT(*) AS c FROM va_chat_conversations
     WHERE site_id = :siteId AND created_at BETWEEN :from AND :to`,
    { siteId, ...dateRange(from, to) },
  );

  const contactCtas = await queryOne<{ whatsapp: number; phone: number }>(
    `SELECT
       SUM(event_type = 'whatsapp_click') AS whatsapp,
       SUM(event_type = 'phone_click') AS phone
     FROM va_events
     WHERE site_id = :siteId
       AND event_type IN ('whatsapp_click', 'phone_click')
       AND occurred_at BETWEEN :from AND :to`,
    { siteId, ...dateRange(from, to) },
  );

  const bookings = await queryOne<{ started: number; completed: number; paid: number }>(
    `SELECT
       SUM(event_type = 'booking_started') AS started,
       SUM(event_type = 'booking_completed') AS completed,
       SUM(event_type = 'payment_success') AS paid
     FROM va_booking_events
     WHERE site_id = :siteId AND occurred_at BETWEEN :from AND :to`,
    { siteId, ...dateRange(from, to) },
  );

  return {
    visitorsNew: Number(visitors?.new_v || 0),
    visitorsReturning: Number(visitors?.ret_v || 0),
    sessions: Number(sessions?.c || 0),
    avgSessionMs: Math.round(Number(sessions?.avg_ms || 0)),
    pageviews: Number(pageviews?.c || 0),
    chats: Number(chats?.c || 0),
    whatsappClicks: Number(contactCtas?.whatsapp || 0),
    phoneClicks: Number(contactCtas?.phone || 0),
    bookingsStarted: Number(bookings?.started || 0),
    bookingsCompleted: Number(bookings?.completed || 0),
    paymentsSuccess: Number(bookings?.paid || 0),
  };
}

export async function buildReport(siteId: string, from: string, to: string) {
  const [
    core,
    landing,
    exit,
    vehicles,
    buttons,
    campaigns,
    searchTerms,
  ] = await Promise.all([
    coreCounts(siteId, from, to),
    topLandingPages(siteId, from, to),
    topExitPages(siteId, from, to),
    topVehicles(siteId, from, to),
    topButtons(siteId, from, to),
    topCampaigns(siteId, from, to),
    topSearchTerms(siteId, from, to, 100),
  ]);

  return {
    siteId,
    from,
    to,
    ...core,
    topLandingPages: landing,
    topExitPages: exit,
    topVehicles: vehicles,
    topButtons: buttons,
    topCampaigns: campaigns,
    topSearchTerms: searchTerms,
  };
}

export async function dailyReport(siteId: string, day: string) {
  return buildReport(siteId, day, day);
}

function addUtcDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayKey(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value || '').slice(0, 10);
}

export type DailySeriesPoint = {
  day: string;
  sessions: number;
  pageviews: number;
  chats: number;
  bookingsStarted: number;
  paymentsSuccess: number;
  whatsappClicks: number;
  phoneClicks: number;
};

function emptyPoint(day: string): DailySeriesPoint {
  return {
    day,
    sessions: 0,
    pageviews: 0,
    chats: 0,
    bookingsStarted: 0,
    paymentsSuccess: 0,
    whatsappClicks: 0,
    phoneClicks: 0,
  };
}

/** Live per-day counts for the selected range (does not depend on va_daily_stats rollups). */
export async function dailySeries(siteId: string, from: string, to: string): Promise<DailySeriesPoint[]> {
  const params = { siteId, ...dateRange(from, to) };
  const [sessionRows, pvRows, chatRows, bookRows, ctaRows] = await Promise.all([
    query<Array<{ d: unknown; c: number }>>(
      `SELECT DATE_FORMAT(started_at, '%Y-%m-%d') AS d, COUNT(*) AS c
       FROM va_sessions
       WHERE site_id = :siteId AND started_at BETWEEN :from AND :to
       GROUP BY DATE_FORMAT(started_at, '%Y-%m-%d')`,
      params,
    ),
    query<Array<{ d: unknown; c: number }>>(
      `SELECT DATE_FORMAT(occurred_at, '%Y-%m-%d') AS d, COUNT(*) AS c
       FROM va_events
       WHERE site_id = :siteId AND event_type = 'page_view' AND occurred_at BETWEEN :from AND :to
       GROUP BY DATE_FORMAT(occurred_at, '%Y-%m-%d')`,
      params,
    ),
    query<Array<{ d: unknown; c: number }>>(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS d, COUNT(*) AS c
       FROM va_chat_conversations
       WHERE site_id = :siteId AND created_at BETWEEN :from AND :to
       GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')`,
      params,
    ),
    query<Array<{ d: unknown; started: number; paid: number }>>(
      `SELECT DATE_FORMAT(occurred_at, '%Y-%m-%d') AS d,
              SUM(event_type = 'booking_started') AS started,
              SUM(event_type = 'payment_success') AS paid
       FROM va_booking_events
       WHERE site_id = :siteId AND occurred_at BETWEEN :from AND :to
       GROUP BY DATE_FORMAT(occurred_at, '%Y-%m-%d')`,
      params,
    ),
    query<Array<{ d: unknown; wa: number; ph: number }>>(
      `SELECT DATE_FORMAT(occurred_at, '%Y-%m-%d') AS d,
              SUM(event_type = 'whatsapp_click') AS wa,
              SUM(event_type = 'phone_click') AS ph
       FROM va_events
       WHERE site_id = :siteId
         AND event_type IN ('whatsapp_click', 'phone_click')
         AND occurred_at BETWEEN :from AND :to
       GROUP BY DATE_FORMAT(occurred_at, '%Y-%m-%d')`,
      params,
    ),
  ]);

  const byDay = new Map<string, DailySeriesPoint>();
  const point = (raw: unknown) => {
    const day = dayKey(raw);
    if (!day) return emptyPoint('');
    let row = byDay.get(day);
    if (!row) {
      row = emptyPoint(day);
      byDay.set(day, row);
    }
    return row;
  };

  for (const r of sessionRows) point(r.d).sessions = Number(r.c || 0);
  for (const r of pvRows) point(r.d).pageviews = Number(r.c || 0);
  for (const r of chatRows) point(r.d).chats = Number(r.c || 0);
  for (const r of bookRows) {
    const p = point(r.d);
    p.bookingsStarted = Number(r.started || 0);
    p.paymentsSuccess = Number(r.paid || 0);
  }
  for (const r of ctaRows) {
    const p = point(r.d);
    p.whatsappClicks = Number(r.wa || 0);
    p.phoneClicks = Number(r.ph || 0);
  }

  const out: DailySeriesPoint[] = [];
  let cursor = from;
  while (cursor <= to) {
    out.push(byDay.get(cursor) ?? emptyPoint(cursor));
    cursor = addUtcDays(cursor, 1);
  }
  return out;
}

export async function rangeReport(siteId: string, from: string, to: string) {
  return buildReport(siteId, from, to);
}

export async function weeklyReport(siteId: string, endDay: string) {
  const end = new Date(`${endDay}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);
  const from = start.toISOString().slice(0, 10);
  return buildReport(siteId, from, endDay);
}

export async function monthlyReport(siteId: string, yearMonth: string) {
  // yearMonth: YYYY-MM
  const [y, m] = yearMonth.split('-').map(Number);
  const from = `${yearMonth}-01`;
  const lastDay = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  const to = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
  return buildReport(siteId, from, to);
}

export async function upsertDailyStats(siteId: string, day: string) {
  const report = await dailyReport(siteId, day);
  await query(
    `INSERT INTO va_daily_stats (
      site_id, day_date, visitors_new, visitors_returning, sessions, pageviews, chats,
      bookings_started, bookings_completed, payments_success, avg_session_ms,
      top_landing_pages, top_exit_pages, top_vehicles, top_buttons, top_campaigns, top_search_terms
    ) VALUES (
      :siteId, :day, :visitorsNew, :visitorsReturning, :sessions, :pageviews, :chats,
      :bookingsStarted, :bookingsCompleted, :paymentsSuccess, :avgSessionMs,
      :topLanding, :topExit, :topVehicles, :topButtons, :topCampaigns, :topSearch
    ) ON DUPLICATE KEY UPDATE
      visitors_new = VALUES(visitors_new),
      visitors_returning = VALUES(visitors_returning),
      sessions = VALUES(sessions),
      pageviews = VALUES(pageviews),
      chats = VALUES(chats),
      bookings_started = VALUES(bookings_started),
      bookings_completed = VALUES(bookings_completed),
      payments_success = VALUES(payments_success),
      avg_session_ms = VALUES(avg_session_ms),
      top_landing_pages = VALUES(top_landing_pages),
      top_exit_pages = VALUES(top_exit_pages),
      top_vehicles = VALUES(top_vehicles),
      top_buttons = VALUES(top_buttons),
      top_campaigns = VALUES(top_campaigns),
      top_search_terms = VALUES(top_search_terms)`,
    {
      siteId,
      day,
      visitorsNew: report.visitorsNew,
      visitorsReturning: report.visitorsReturning,
      sessions: report.sessions,
      pageviews: report.pageviews,
      chats: report.chats,
      bookingsStarted: report.bookingsStarted,
      bookingsCompleted: report.bookingsCompleted,
      paymentsSuccess: report.paymentsSuccess,
      avgSessionMs: report.avgSessionMs,
      topLanding: JSON.stringify(report.topLandingPages),
      topExit: JSON.stringify(report.topExitPages),
      topVehicles: JSON.stringify(report.topVehicles),
      topButtons: JSON.stringify(report.topButtons),
      topCampaigns: JSON.stringify(report.topCampaigns),
      topSearch: JSON.stringify(report.topSearchTerms),
    },
  );
  return report;
}

export async function getStoredDailyStats(siteId: string, from: string, to: string) {
  return query(
    `SELECT * FROM va_daily_stats
     WHERE site_id = :siteId AND day_date BETWEEN :from AND :to
     ORDER BY day_date ASC`,
    { siteId, from, to },
  );
}

export type AttributionDeviceRow = {
  device: string;
  label: string;
  visitors: number;
  bookings: number;
  conversion: number;
};

export type AttributionSourceRow = {
  source: string;
  visitors: number;
  bookings: number;
  conversion: number;
};

export type AttributionCampaignRow = {
  campaign: string;
  visitors: number;
  bookings: number;
  conversion: number;
  utmSource: string | null;
  utmMedium: string | null;
};

export type AttributionCityRow = {
  city: string;
  pincode: string | null;
  visitors: number;
  bookings: number;
  conversion: number;
};

export type AdsClickQualityCityRow = {
  city: string;
  pincode: string | null;
  adsClicks: number;
  uniqueIps: number;
  shortBounces: number;
  bounceRate: number;
  avgDurationSec: number;
  bookings: number;
  risk: 'high' | 'medium' | 'low';
};

export type SuspiciousAdsIpRow = {
  ip: string;
  city: string;
  pincode: string | null;
  isp: string | null;
  isProxy: boolean;
  isHosting: boolean;
  adsClicks: number;
  shortBounces: number;
  bounceRate: number;
  avgDurationSec: number;
  bookings: number;
  risk: 'high' | 'medium' | 'low';
  flags: string[];
};

type SessionAttrRow = {
  id: string;
  visitor_id: string;
  device_type: string;
  city: string | null;
  pincode: string | null;
  ip_address: string | null;
  isp: string | null;
  ip_org: string | null;
  is_proxy: number | boolean | null;
  is_hosting: number | boolean | null;
  duration_ms: number | null;
  page_count: number | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  gclid: string | null;
  referrer: string | null;
  landing_page: string | null;
  entry_url: string | null;
  exit_page: string | null;
};

/** Very short / empty sessions — common bot / accidental / fake-click pattern */
function isShortBounce(s: SessionAttrRow): boolean {
  const dur = s.duration_ms == null ? null : Number(s.duration_ms);
  const pages = Number(s.page_count || 0);
  if (dur != null && dur < 3_000) return true;
  if (dur == null && pages <= 1) return true;
  return false;
}

function riskLevel(input: {
  adsClicks: number;
  bounceRate: number;
  bookings: number;
  isHosting?: boolean;
  isProxy?: boolean;
}): 'high' | 'medium' | 'low' {
  const { adsClicks, bounceRate, bookings, isHosting, isProxy } = input;
  // Datacenter / proxy Ads traffic with no conversion is almost always junk
  if ((isHosting || isProxy) && adsClicks >= 1 && bookings === 0) return 'high';
  if (adsClicks >= 5 && bounceRate >= 80 && bookings === 0) return 'high';
  if (adsClicks >= 3 && bounceRate >= 60 && bookings === 0) return 'medium';
  if (adsClicks >= 8 && bounceRate >= 50 && bookings === 0) return 'medium';
  // Single Ads click + instant bounce: listable, but not auto high-risk
  if (adsClicks >= 1 && bounceRate >= 80 && bookings === 0) return 'medium';
  return 'low';
}

export async function attributionReport(siteId: string, from: string, to: string) {
  const range = dateRange(from, to);
  const [sessions, converted] = await Promise.all([
    query<SessionAttrRow[]>(
      `SELECT id, visitor_id, device_type, city, pincode, ip_address, isp, ip_org, is_proxy, is_hosting,
              duration_ms, page_count,
              utm_source, utm_medium, utm_campaign, utm_term,
              gclid, referrer, landing_page, entry_url, exit_page
       FROM va_sessions
       WHERE site_id = :siteId AND started_at BETWEEN :from AND :to`,
      { siteId, ...range },
    ).catch(async (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/gclid|pincode|isp|ip_org|is_proxy|is_hosting/i.test(msg)) throw err;
      return query<SessionAttrRow[]>(
        `SELECT id, visitor_id, device_type, city, pincode, ip_address,
                NULL AS isp, NULL AS ip_org, 0 AS is_proxy, 0 AS is_hosting,
                duration_ms, page_count,
                utm_source, utm_medium, utm_campaign, utm_term,
                gclid, referrer, landing_page, entry_url, exit_page
         FROM va_sessions
         WHERE site_id = :siteId AND started_at BETWEEN :from AND :to`,
        { siteId, ...range },
      ).catch(async (err2: unknown) => {
        const msg2 = err2 instanceof Error ? err2.message : String(err2);
        if (!/gclid|pincode/i.test(msg2)) throw err2;
        return query<SessionAttrRow[]>(
          `SELECT id, visitor_id, device_type, city, NULL AS pincode, ip_address,
                  NULL AS isp, NULL AS ip_org, 0 AS is_proxy, 0 AS is_hosting,
                  duration_ms, page_count,
                  utm_source, utm_medium, utm_campaign, utm_term,
                  NULL AS gclid, referrer, landing_page, entry_url, exit_page
           FROM va_sessions
           WHERE site_id = :siteId AND started_at BETWEEN :from AND :to`,
          { siteId, ...range },
        );
      });
    }),
    convertedSessionIds(siteId, from, to),
  ]);

  type Agg = { visitors: Set<string>; bookings: number };
  const devices = new Map<string, Agg>();
  const sources = new Map<string, Agg>();
  const cities = new Map<string, Agg & { city: string; pincode: string | null }>();
  const campaigns = new Map<string, Agg & { utmSource: string | null; utmMedium: string | null }>();

  const ensure = (map: Map<string, Agg>, key: string): Agg => {
    let row = map.get(key);
    if (!row) {
      row = { visitors: new Set(), bookings: 0 };
      map.set(key, row);
    }
    return row;
  };

  const resolvedFor = (s: SessionAttrRow) =>
    resolveSessionAttribution({
      utmSource: s.utm_source,
      utmMedium: s.utm_medium,
      utmCampaign: s.utm_campaign,
      utmTerm: s.utm_term,
      gclid: s.gclid,
      referrer: s.referrer,
      landingPage: s.landing_page,
      entryUrl: s.entry_url,
      exitPage: s.exit_page,
    });

  const cityKey = (s: SessionAttrRow) => {
    const city = (s.city || '').trim() || 'Unknown';
    const pin = (s.pincode || '').trim();
    return pin ? `${city}|${pin}` : city;
  };

  // First session in range wins for visitor device/source; bookings follow session attribution.
  const visitorDevice = new Map<string, string>();
  const visitorSource = new Map<string, string>();
  const visitorCity = new Map<string, string>();

  for (const s of sessions) {
    const device = (s.device_type || 'unknown').toLowerCase();
    if (!visitorDevice.has(s.visitor_id)) visitorDevice.set(s.visitor_id, device);

    const ck = cityKey(s);
    if (!visitorCity.has(s.visitor_id)) {
      visitorCity.set(s.visitor_id, ck);
      if (!cities.has(ck)) {
        cities.set(ck, {
          visitors: new Set(),
          bookings: 0,
          city: (s.city || '').trim() || 'Unknown',
          pincode: (s.pincode || '').trim() || null,
        });
      }
    }

    const attr = resolvedFor(s);
    const source = classifyTrafficSource({
      utmSource: attr.utmSource,
      utmMedium: attr.utmMedium,
      gclid: attr.gclid,
      gadSource: attr.gadSource,
      referrer: attr.referrer,
    });
    if (!visitorSource.has(s.visitor_id)) visitorSource.set(s.visitor_id, source);

    if (source === 'Google Ads') {
      const campaign = (attr.utmCampaign || '').trim() || '(not set)';
      const c = campaigns.get(campaign) || {
        visitors: new Set<string>(),
        bookings: 0,
        utmSource: attr.utmSource,
        utmMedium: attr.utmMedium,
      };
      c.visitors.add(s.visitor_id);
      if (converted.has(s.id)) c.bookings += 1;
      if (!c.utmSource && attr.utmSource) c.utmSource = attr.utmSource;
      if (!c.utmMedium && attr.utmMedium) c.utmMedium = attr.utmMedium;
      campaigns.set(campaign, c);
    }
  }

  for (const [visitorId, device] of visitorDevice) {
    ensure(devices, device).visitors.add(visitorId);
  }
  for (const [visitorId, source] of visitorSource) {
    ensure(sources, source).visitors.add(visitorId);
  }
  for (const [visitorId, ck] of visitorCity) {
    cities.get(ck)?.visitors.add(visitorId);
  }

  for (const s of sessions) {
    if (!converted.has(s.id)) continue;
    const device = (s.device_type || 'unknown').toLowerCase();
    ensure(devices, device).bookings += 1;
    const attr = resolvedFor(s);
    const source = classifyTrafficSource({
      utmSource: attr.utmSource,
      utmMedium: attr.utmMedium,
      gclid: attr.gclid,
      gadSource: attr.gadSource,
      referrer: attr.referrer,
    });
    ensure(sources, source).bookings += 1;
    const ck = cityKey(s);
    const cityRow = cities.get(ck);
    if (cityRow) cityRow.bookings += 1;
  }

  const deviceLabels: Record<string, string> = {
    mobile: 'Mobile',
    desktop: 'Desktop',
    tablet: 'Tablet',
    unknown: 'Unknown',
  };

  const deviceBreakdown: AttributionDeviceRow[] = DEVICE_ORDER.filter((d) => devices.has(d) || d !== 'unknown')
    .map((d) => {
      const row = devices.get(d) || { visitors: new Set<string>(), bookings: 0 };
      const visitors = row.visitors.size;
      return {
        device: d,
        label: deviceLabels[d] || d,
        visitors,
        bookings: row.bookings,
        conversion: pct(row.bookings, visitors),
      };
    })
    .filter((r) => r.visitors > 0 || r.bookings > 0 || r.device !== 'unknown');

  // Always show the three primary devices even if zero (empty day still readable)
  for (const d of ['mobile', 'desktop', 'tablet'] as const) {
    if (!deviceBreakdown.some((r) => r.device === d)) {
      deviceBreakdown.push({
        device: d,
        label: deviceLabels[d],
        visitors: 0,
        bookings: 0,
        conversion: 0,
      });
    }
  }
  deviceBreakdown.sort(
    (a, b) => DEVICE_ORDER.indexOf(a.device as (typeof DEVICE_ORDER)[number]) -
      DEVICE_ORDER.indexOf(b.device as (typeof DEVICE_ORDER)[number]),
  );

  const trafficSources: AttributionSourceRow[] = [];
  const seenSources = new Set<string>();
  for (const name of SOURCE_ORDER) {
    const row = sources.get(name) || { visitors: new Set<string>(), bookings: 0 };
    trafficSources.push({
      source: name,
      visitors: row.visitors.size,
      bookings: row.bookings,
      conversion: pct(row.bookings, row.visitors.size),
    });
    seenSources.add(name);
  }
  for (const [name, row] of sources) {
    if (seenSources.has(name)) continue;
    trafficSources.push({
      source: name,
      visitors: row.visitors.size,
      bookings: row.bookings,
      conversion: pct(row.bookings, row.visitors.size),
    });
  }
  // Drop trailing zero-only custom sources; keep canonical list
  const filteredSources = trafficSources.filter(
    (r) => SOURCE_ORDER.includes(r.source) || r.visitors > 0 || r.bookings > 0,
  );

  const googleAdsCampaigns: AttributionCampaignRow[] = [...campaigns.entries()]
    .map(([campaign, row]) => ({
      campaign,
      visitors: row.visitors.size,
      bookings: row.bookings,
      conversion: pct(row.bookings, row.visitors.size),
      utmSource: row.utmSource,
      utmMedium: row.utmMedium,
    }))
    .sort((a, b) => b.visitors - a.visitors || b.bookings - a.bookings);

  const cityBreakdown: AttributionCityRow[] = [...cities.values()]
    .map((row) => ({
      city: row.city,
      pincode: row.pincode,
      visitors: row.visitors.size,
      bookings: row.bookings,
      conversion: pct(row.bookings, row.visitors.size),
    }))
    .sort((a, b) => b.visitors - a.visitors || b.bookings - a.bookings)
    .slice(0, 15);

  // --- Google Ads click quality / likely fake-click signals by city + IP ---
  type QualityAgg = {
    city: string;
    pincode: string | null;
    adsClicks: number;
    shortBounces: number;
    durationSum: number;
    durationN: number;
    bookings: number;
    ips: Set<string>;
    hostingClicks: number;
    proxyClicks: number;
  };
  type IpAgg = QualityAgg & {
    ip: string;
    isp: string | null;
    isProxy: boolean;
    isHosting: boolean;
  };

  const adsByCity = new Map<string, QualityAgg>();
  const adsByIp = new Map<string, IpAgg>();

  for (const s of sessions) {
    const attr = resolvedFor(s);
    const source = classifyTrafficSource({
      utmSource: attr.utmSource,
      utmMedium: attr.utmMedium,
      gclid: attr.gclid,
      gadSource: attr.gadSource,
      referrer: attr.referrer,
    });
    if (source !== 'Google Ads') continue;

    const city = (s.city || '').trim() || 'Unknown';
    const pincode = (s.pincode || '').trim() || null;
    const ck = cityKey(s);
    const ip = (s.ip_address || '').trim() || 'unknown';
    const bounce = isShortBounce(s);
    const booked = converted.has(s.id);
    const dur = s.duration_ms == null ? null : Number(s.duration_ms);
    const isProxy = Boolean(s.is_proxy);
    const isHosting = Boolean(s.is_hosting);
    const isp = (s.isp || s.ip_org || '').trim() || null;

    let cityAgg = adsByCity.get(ck);
    if (!cityAgg) {
      cityAgg = {
        city,
        pincode,
        adsClicks: 0,
        shortBounces: 0,
        durationSum: 0,
        durationN: 0,
        bookings: 0,
        ips: new Set(),
        hostingClicks: 0,
        proxyClicks: 0,
      };
      adsByCity.set(ck, cityAgg);
    }
    cityAgg.adsClicks += 1;
    if (bounce) cityAgg.shortBounces += 1;
    if (booked) cityAgg.bookings += 1;
    if (isHosting) cityAgg.hostingClicks += 1;
    if (isProxy) cityAgg.proxyClicks += 1;
    if (dur != null) {
      cityAgg.durationSum += dur;
      cityAgg.durationN += 1;
    }
    if (ip !== 'unknown') cityAgg.ips.add(ip);

    let ipAgg = adsByIp.get(ip);
    if (!ipAgg) {
      ipAgg = {
        ip,
        city,
        pincode,
        isp,
        isProxy,
        isHosting,
        adsClicks: 0,
        shortBounces: 0,
        durationSum: 0,
        durationN: 0,
        bookings: 0,
        ips: new Set([ip]),
        hostingClicks: 0,
        proxyClicks: 0,
      };
      adsByIp.set(ip, ipAgg);
    }
    ipAgg.adsClicks += 1;
    if (bounce) ipAgg.shortBounces += 1;
    if (booked) ipAgg.bookings += 1;
    if (isHosting) {
      ipAgg.isHosting = true;
      ipAgg.hostingClicks += 1;
    }
    if (isProxy) {
      ipAgg.isProxy = true;
      ipAgg.proxyClicks += 1;
    }
    if (isp && !ipAgg.isp) ipAgg.isp = isp;
    if (dur != null) {
      ipAgg.durationSum += dur;
      ipAgg.durationN += 1;
    }
  }

  const adsClickQualityByCity: AdsClickQualityCityRow[] = [...adsByCity.values()]
    .map((row) => {
      const bounceRate = pct(row.shortBounces, row.adsClicks);
      const mostlyHosting = row.hostingClicks / Math.max(row.adsClicks, 1) >= 0.5;
      const mostlyProxy = row.proxyClicks / Math.max(row.adsClicks, 1) >= 0.5;
      return {
        city: row.city,
        pincode: row.pincode,
        adsClicks: row.adsClicks,
        uniqueIps: row.ips.size,
        shortBounces: row.shortBounces,
        bounceRate,
        avgDurationSec: row.durationN
          ? Math.round(row.durationSum / row.durationN / 1000)
          : 0,
        bookings: row.bookings,
        risk: riskLevel({
          adsClicks: row.adsClicks,
          bounceRate,
          bookings: row.bookings,
          isHosting: mostlyHosting,
          isProxy: mostlyProxy,
        }),
      };
    })
    .sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 };
      return rank[a.risk] - rank[b.risk] || b.adsClicks - a.adsClicks;
    })
    .slice(0, 20);

  const suspiciousAdsIps: SuspiciousAdsIpRow[] = [...adsByIp.values()]
    .filter((row) => row.ip !== 'unknown')
    .map((row) => {
      const bounceRate = pct(row.shortBounces, row.adsClicks);
      const flags: string[] = [];
      if (row.isHosting) flags.push('Datacenter');
      if (row.isProxy) flags.push('Proxy/VPN');
      if (bounceRate >= 80) flags.push('High bounce');
      return {
        ip: row.ip,
        city: row.city,
        pincode: row.pincode,
        isp: row.isp,
        isProxy: row.isProxy,
        isHosting: row.isHosting,
        adsClicks: row.adsClicks,
        shortBounces: row.shortBounces,
        bounceRate,
        avgDurationSec: row.durationN
          ? Math.round(row.durationSum / row.durationN / 1000)
          : 0,
        bookings: row.bookings,
        flags,
        risk: riskLevel({
          adsClicks: row.adsClicks,
          bounceRate,
          bookings: row.bookings,
          isHosting: row.isHosting,
          isProxy: row.isProxy,
        }),
      };
    })
    .filter(
      (row) =>
        row.isHosting ||
        row.isProxy ||
        row.adsClicks >= 2 ||
        (row.bounceRate >= 80 && row.bookings === 0),
    )
    .sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 };
      return rank[a.risk] - rank[b.risk] || b.adsClicks - a.adsClicks || b.bounceRate - a.bounceRate;
    })
    .slice(0, 50);

  return {
    siteId,
    from,
    to,
    deviceBreakdown,
    trafficSources: filteredSources,
    googleAdsCampaigns,
    cityBreakdown,
    adsClickQualityByCity,
    suspiciousAdsIps,
  };
}
