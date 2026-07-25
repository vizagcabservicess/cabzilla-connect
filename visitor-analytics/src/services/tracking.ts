import { env } from '../config/env.js';
import { query, queryOne } from '../db/pool.js';
import type { DeviceInfo, GeoInfo, IncomingEvent, UtmInfo, VisitorIdentity } from '../types/index.js';
import {
  hashIp,
  newId,
  pathFromUrl,
  toMysqlDateTime,
  trafficSourceLabel,
} from '../utils/helpers.js';
import { createNotification } from './notifications.js';
import { upsertHeatmapFromEvents } from './heatmap.js';
import { realtimeHub } from '../websocket/hub.js';
import { formatCityPincode } from './geoLookup.js';

interface IdentifyInput {
  siteId: string;
  visitorKey: string;
  sessionId?: string | null;
  ip: string;
  geo: GeoInfo;
  device: DeviceInfo;
  utm: UtmInfo;
  consentGiven: boolean;
  language?: string | null;
  timezone?: string | null;
}

export async function identifyVisitor(input: IdentifyInput): Promise<VisitorIdentity> {
  const now = toMysqlDateTime();
  const existing = await queryOne<{ id: string; is_returning: number }>(
    `SELECT id, is_returning FROM va_visitors WHERE site_id = :siteId AND visitor_key = :visitorKey LIMIT 1`,
    { siteId: input.siteId, visitorKey: input.visitorKey },
  );

  let visitorId: string;
  let isReturning: boolean;

  if (existing) {
    visitorId = existing.id;
    isReturning = true;
    const visitorUpdateParams = {
      id: visitorId,
      now,
      country: input.geo.country,
      city: input.geo.city,
      pincode: input.geo.pincode,
      region: input.geo.region,
      timezone: input.timezone || input.geo.timezone,
      language: input.language,
      browser: input.device.browser,
      browserVersion: input.device.browserVersion,
      os: input.device.os,
      deviceType: input.device.deviceType,
      screenWidth: input.device.screenWidth,
      screenHeight: input.device.screenHeight,
      userAgent: input.device.userAgent,
      ip: input.ip,
      ipHash: hashIp(input.ip),
    };
    try {
      await query(
        `UPDATE va_visitors SET
          is_returning = 1,
          last_seen_at = :now,
          country = COALESCE(:country, country),
          city = COALESCE(:city, city),
          pincode = COALESCE(:pincode, pincode),
          region = COALESCE(:region, region),
          timezone = COALESCE(:timezone, timezone),
          language = COALESCE(:language, language),
          browser = COALESCE(:browser, browser),
          browser_version = COALESCE(:browserVersion, browser_version),
          os = COALESCE(:os, os),
          device_type = :deviceType,
          screen_width = COALESCE(:screenWidth, screen_width),
          screen_height = COALESCE(:screenHeight, screen_height),
          user_agent = COALESCE(:userAgent, user_agent),
          ip_address = :ip,
          ip_hash = :ipHash
        WHERE id = :id`,
        visitorUpdateParams,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/pincode/i.test(msg)) throw err;
      await query(
        `UPDATE va_visitors SET
          is_returning = 1,
          last_seen_at = :now,
          country = COALESCE(:country, country),
          city = COALESCE(:city, city),
          region = COALESCE(:region, region),
          timezone = COALESCE(:timezone, timezone),
          language = COALESCE(:language, language),
          browser = COALESCE(:browser, browser),
          browser_version = COALESCE(:browserVersion, browser_version),
          os = COALESCE(:os, os),
          device_type = :deviceType,
          screen_width = COALESCE(:screenWidth, screen_width),
          screen_height = COALESCE(:screenHeight, screen_height),
          user_agent = COALESCE(:userAgent, user_agent),
          ip_address = :ip,
          ip_hash = :ipHash
        WHERE id = :id`,
        visitorUpdateParams,
      );
    }
  } else {
    visitorId = newId();
    isReturning = false;
    const visitorInsertParams = {
      id: visitorId,
      siteId: input.siteId,
      visitorKey: input.visitorKey,
      now,
      country: input.geo.country,
      city: input.geo.city,
      pincode: input.geo.pincode,
      region: input.geo.region,
      timezone: input.timezone || input.geo.timezone,
      language: input.language,
      browser: input.device.browser,
      browserVersion: input.device.browserVersion,
      os: input.device.os,
      deviceType: input.device.deviceType,
      screenWidth: input.device.screenWidth,
      screenHeight: input.device.screenHeight,
      userAgent: input.device.userAgent,
      ipHash: hashIp(input.ip),
      ip: input.ip,
    };
    try {
      await query(
        `INSERT INTO va_visitors (
          id, site_id, visitor_key, is_returning, first_seen_at, last_seen_at,
          country, city, pincode, region, timezone, language, browser, browser_version, os,
          device_type, screen_width, screen_height, user_agent, ip_hash, ip_address
        ) VALUES (
          :id, :siteId, :visitorKey, 0, :now, :now,
          :country, :city, :pincode, :region, :timezone, :language, :browser, :browserVersion, :os,
          :deviceType, :screenWidth, :screenHeight, :userAgent, :ipHash, :ip
        )`,
        visitorInsertParams,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/pincode/i.test(msg)) throw err;
      await query(
        `INSERT INTO va_visitors (
          id, site_id, visitor_key, is_returning, first_seen_at, last_seen_at,
          country, city, region, timezone, language, browser, browser_version, os,
          device_type, screen_width, screen_height, user_agent, ip_hash, ip_address
        ) VALUES (
          :id, :siteId, :visitorKey, 0, :now, :now,
          :country, :city, :region, :timezone, :language, :browser, :browserVersion, :os,
          :deviceType, :screenWidth, :screenHeight, :userAgent, :ipHash, :ip
        )`,
        visitorInsertParams,
      );
    }

    const fraudTag = input.geo.isHosting
      ? ' · datacenter IP'
      : input.geo.isProxy
        ? ' · proxy/VPN'
        : '';
    await createNotification({
      siteId: input.siteId,
      type: 'new_visitor',
      title: 'New visitor',
      body: `${formatCityPincode(input.geo)} · ${input.device.deviceType}${fraudTag}`,
      entityType: 'visitor',
      entityId: visitorId,
      meta: {
        trafficSource: trafficSourceLabel(input.utm),
        city: input.geo.city,
        pincode: input.geo.pincode,
        isp: input.geo.isp,
        isProxy: input.geo.isProxy,
        isHosting: input.geo.isHosting,
      },
    });
  }

  let sessionId = input.sessionId || null;
  if (sessionId) {
    const session = await queryOne<{ id: string; is_active: number }>(
      `SELECT id, is_active FROM va_sessions WHERE id = :id AND visitor_id = :visitorId LIMIT 1`,
      { id: sessionId, visitorId },
    );
    if (!session || !session.is_active) sessionId = null;
  }

  if (!sessionId) {
    sessionId = newId();
    const sessionParams = {
      id: sessionId,
      siteId: input.siteId,
      visitorId,
      now,
      landingPage: input.utm.landingPage,
      referrer: input.utm.referrer,
      utmSource: input.utm.utmSource,
      utmMedium: input.utm.utmMedium,
      utmCampaign: input.utm.utmCampaign,
      utmTerm: input.utm.utmTerm,
      utmContent: input.utm.utmContent,
      gclid: input.utm.gclid ?? null,
      entryUrl: input.utm.landingPage,
      deviceType: input.device.deviceType,
      browser: input.device.browser,
      os: input.device.os,
      country: input.geo.country,
      city: input.geo.city,
      pincode: input.geo.pincode,
      isp: input.geo.isp,
      ipOrg: input.geo.ipOrg,
      isProxy: input.geo.isProxy ? 1 : 0,
      isHosting: input.geo.isHosting ? 1 : 0,
      isMobileNet: input.geo.isMobileNet ? 1 : 0,
      ip: input.ip,
      consent: input.consentGiven ? 1 : 0,
    };
    try {
      await query(
        `INSERT INTO va_sessions (
          id, site_id, visitor_id, started_at, is_active, landing_page, referrer,
          utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, entry_url,
          device_type, browser, os, country, city, pincode,
          isp, ip_org, is_proxy, is_hosting, is_mobile_net,
          ip_address, consent_given
        ) VALUES (
          :id, :siteId, :visitorId, :now, 1, :landingPage, :referrer,
          :utmSource, :utmMedium, :utmCampaign, :utmTerm, :utmContent, :gclid, :entryUrl,
          :deviceType, :browser, :os, :country, :city, :pincode,
          :isp, :ipOrg, :isProxy, :isHosting, :isMobileNet,
          :ip, :consent
        )`,
        sessionParams,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Fall back through older schemas (missing fraud / gclid / pincode columns)
      if (!/gclid|pincode|isp|ip_org|is_proxy|is_hosting|is_mobile_net/i.test(msg)) throw err;
      try {
        await query(
          `INSERT INTO va_sessions (
            id, site_id, visitor_id, started_at, is_active, landing_page, referrer,
            utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, entry_url,
            device_type, browser, os, country, city, pincode, ip_address, consent_given
          ) VALUES (
            :id, :siteId, :visitorId, :now, 1, :landingPage, :referrer,
            :utmSource, :utmMedium, :utmCampaign, :utmTerm, :utmContent, :gclid, :entryUrl,
            :deviceType, :browser, :os, :country, :city, :pincode, :ip, :consent
          )`,
          sessionParams,
        );
      } catch (err2) {
        const msg2 = err2 instanceof Error ? err2.message : String(err2);
        if (!/gclid|pincode/i.test(msg2)) throw err2;
        try {
          await query(
            `INSERT INTO va_sessions (
              id, site_id, visitor_id, started_at, is_active, landing_page, referrer,
              utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, entry_url,
              device_type, browser, os, country, city, ip_address, consent_given
            ) VALUES (
              :id, :siteId, :visitorId, :now, 1, :landingPage, :referrer,
              :utmSource, :utmMedium, :utmCampaign, :utmTerm, :utmContent, :gclid, :entryUrl,
              :deviceType, :browser, :os, :country, :city, :ip, :consent
            )`,
            sessionParams,
          );
        } catch (err3) {
          const msg3 = err3 instanceof Error ? err3.message : String(err3);
          if (!/gclid|pincode/i.test(msg3)) throw err3;
          await query(
            `INSERT INTO va_sessions (
              id, site_id, visitor_id, started_at, is_active, landing_page, referrer,
              utm_source, utm_medium, utm_campaign, utm_term, utm_content, entry_url,
              device_type, browser, os, country, city, ip_address, consent_given
            ) VALUES (
              :id, :siteId, :visitorId, :now, 1, :landingPage, :referrer,
              :utmSource, :utmMedium, :utmCampaign, :utmTerm, :utmContent, :entryUrl,
              :deviceType, :browser, :os, :country, :city, :ip, :consent
            )`,
            sessionParams,
          );
        }
      }
    }
  } else {
    await query(`UPDATE va_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = :id`, { id: sessionId });
  }

  return { visitorId, visitorKey: input.visitorKey, sessionId, isReturning };
}

export async function ingestEventBatch(params: {
  siteId: string;
  sessionId: string;
  visitorId: string;
  events: IncomingEvent[];
}): Promise<{ accepted: number }> {
  const events = params.events.slice(0, env.MAX_EVENT_BATCH);
  if (events.length === 0) return { accepted: 0 };

  const values: unknown[] = [];
  const placeholders: string[] = [];

  for (const ev of events) {
    // 21 columns — must match VALUES arity
    placeholders.push('(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    values.push(
      params.siteId,
      params.sessionId,
      params.visitorId,
      ev.type,
      ev.name ?? null,
      ev.pageUrl ?? null,
      ev.pagePath ?? pathFromUrl(ev.pageUrl) ?? null,
      ev.pageTitle ?? null,
      ev.x ?? null,
      ev.y ?? null,
      ev.scrollDepth ?? null,
      ev.viewportW ?? null,
      ev.viewportH ?? null,
      ev.elementTag ?? null,
      ev.elementId ?? null,
      ev.elementClass ?? null,
      ev.elementText ?? null,
      ev.elementHref ?? null,
      ev.formName ?? null,
      ev.meta ? JSON.stringify(ev.meta) : null,
      ev.occurredAt.replace('T', ' ').replace('Z', ''),
    );
  }

  await query(
    `INSERT INTO va_events (
      site_id, session_id, visitor_id, event_type, event_name, page_url, page_path, page_title,
      x, y, scroll_depth, viewport_w, viewport_h, element_tag, element_id, element_class,
      element_text, element_href, form_name, meta, occurred_at
    ) VALUES ${placeholders.join(',')}`,
    values,
  );

  const pageViews = events.filter((e) => e.type === 'page_view').length;
  await query(
    `UPDATE va_sessions SET
      event_count = event_count + :ec,
      page_count = page_count + :pc,
      exit_page = COALESCE(:exitPage, exit_page),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = :sessionId`,
    {
      ec: events.length,
      pc: pageViews,
      exitPage: events[events.length - 1]?.pagePath ?? pathFromUrl(events[events.length - 1]?.pageUrl),
      sessionId: params.sessionId,
    },
  );

  await query(`UPDATE va_visitors SET last_seen_at = UTC_TIMESTAMP() WHERE id = :id`, {
    id: params.visitorId,
  });

  await upsertHeatmapFromEvents(params.siteId, events);
  await maybeEmitBookingNotifications(params.siteId, params.sessionId, params.visitorId, events);

  const lastMove = [...events].reverse().find((e) => e.type === 'mouse_move' || e.type === 'click');
  const lastPage = [...events].reverse().find((e) => e.pagePath || e.pageUrl);

  realtimeHub.broadcastToDashboard(params.siteId, {
    type: 'visitor.activity',
    payload: {
      visitorId: params.visitorId,
      sessionId: params.sessionId,
      currentPage: lastPage?.pagePath || pathFromUrl(lastPage?.pageUrl),
      mouseX: lastMove?.x ?? null,
      mouseY: lastMove?.y ?? null,
      lastEventType: events[events.length - 1]?.type,
      occurredAt: events[events.length - 1]?.occurredAt,
    },
  });

  return { accepted: events.length };
}

async function maybeEmitBookingNotifications(
  siteId: string,
  sessionId: string,
  visitorId: string,
  events: IncomingEvent[],
): Promise<void> {
  for (const ev of events) {
    if (ev.type === 'booking_started') {
      await createNotification({
        siteId,
        type: 'booking_started',
        title: 'Booking started',
        body: ev.pagePath || 'Visitor started booking',
        entityType: 'session',
        entityId: sessionId,
        meta: { visitorId, ...(ev.meta || {}) },
      });
    }
    if (ev.type === 'booking_completed') {
      await createNotification({
        siteId,
        type: 'booking_completed',
        title: 'Booking completed',
        body: 'A visitor completed a booking',
        entityType: 'session',
        entityId: sessionId,
        meta: { visitorId, ...(ev.meta || {}) },
      });
    }
    if (ev.type === 'razorpay_payment') {
      await createNotification({
        siteId,
        type: 'payment_success',
        title: 'Payment success',
        body: 'Razorpay payment recorded',
        entityType: 'session',
        entityId: sessionId,
        meta: { visitorId, ...(ev.meta || {}) },
      });
    }
  }
}

export async function endSession(sessionId: string): Promise<void> {
  await query(
    `UPDATE va_sessions SET
      is_active = 0,
      ended_at = UTC_TIMESTAMP(),
      duration_ms = TIMESTAMPDIFF(MICROSECOND, started_at, UTC_TIMESTAMP(3)) DIV 1000
    WHERE id = :id AND is_active = 1`,
    { id: sessionId },
  );
}
