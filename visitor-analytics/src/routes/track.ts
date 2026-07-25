import { Router } from 'express';
import { z } from 'zod';
import pako from 'pako';
import { env } from '../config/env.js';
import { asyncHandler, requireSiteKey, type AuthedRequest } from '../middleware/auth.js';
import { identifyVisitor, ingestEventBatch, endSession } from '../services/tracking.js';
import { storeRecordingChunk } from '../services/recording.js';
import { trackBookingEvent } from '../services/bookingAnalytics.js';
import type { BookingEventType, IncomingEvent } from '../types/index.js';
import {
  geoFromHeaders,
  getClientIp,
  parseUserAgent,
  resolveSessionAttribution,
} from '../utils/helpers.js';
import { enrichGeoFromIp } from '../services/geoLookup.js';

const router = Router();

const nestedDeviceSchema = z
  .object({
    browser: z.string().nullable().optional(),
    browserVersion: z.string().nullable().optional(),
    os: z.string().nullable().optional(),
    deviceType: z.enum(['desktop', 'tablet', 'mobile', 'unknown']).optional(),
    screenWidth: z.number().int().nullable().optional(),
    screenHeight: z.number().int().nullable().optional(),
    language: z.string().nullable().optional(),
    userAgent: z.string().nullable().optional(),
    timezone: z.string().nullable().optional(),
  })
  .optional();

const nestedUtmSchema = z
  .object({
    utmSource: z.string().nullable().optional(),
    utmMedium: z.string().nullable().optional(),
    utmCampaign: z.string().nullable().optional(),
    utmTerm: z.string().nullable().optional(),
    utmContent: z.string().nullable().optional(),
    gclid: z.string().nullable().optional(),
    gadSource: z.string().nullable().optional(),
    gadCampaignId: z.string().nullable().optional(),
    referrer: z.string().nullable().optional(),
    landingPage: z.string().nullable().optional(),
  })
  .optional();

const identifySchema = z.object({
  visitorKey: z.string().min(8).max(64),
  sessionId: z.string().uuid().optional().nullable(),
  landingPage: z.string().max(2048).optional(),
  referrer: z.string().max(2048).optional().nullable(),
  language: z.string().max(32).optional().nullable(),
  timezone: z.string().max(80).optional().nullable(),
  screenWidth: z.number().int().optional().nullable(),
  screenHeight: z.number().int().optional().nullable(),
  consentGiven: z.boolean().optional().default(true),
  userAgent: z.string().optional(),
  /** SDK sends nested device / utm — accept both shapes */
  device: nestedDeviceSchema,
  utm: nestedUtmSchema,
});

const eventsSchema = z.object({
  sessionId: z.string().uuid(),
  visitorId: z.string().uuid(),
  events: z.array(z.record(z.unknown())).min(1).max(env.MAX_EVENT_BATCH),
});

const recordingSchema = z.object({
  sessionId: z.string().uuid(),
  chunkIndex: z.number().int().min(0),
  events: z.array(z.unknown()).optional().default([]),
  startedAt: z.string(),
  endedAt: z.string(),
  compressed: z.boolean().optional().default(false),
  encoding: z.enum(['json', 'gzip-base64']).optional().default('json'),
  data: z.string().optional(),
  visitorId: z.string().uuid().optional(),
  siteKey: z.string().optional(),
});

function resolveRecordingEvents(body: z.infer<typeof recordingSchema>): unknown[] {
  if (body.compressed && body.encoding === 'gzip-base64' && body.data) {
    const buf = Buffer.from(body.data, 'base64');
    const json = pako.ungzip(buf, { to: 'string' }) as string;
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) throw new Error('Invalid compressed recording payload');
    return parsed;
  }
  return body.events || [];
}
const bookingSchema = z.object({
  sessionId: z.string().uuid().optional().nullable(),
  visitorId: z.string().uuid().optional().nullable(),
  vehicleCategory: z.string().min(1).max(80),
  eventType: z.enum([
    'quote_request',
    'booking_form',
    'phone_call',
    'whatsapp_click',
    'payment_success',
    'booking_completed',
    'booking_started',
  ]),
  bookingId: z.string().max(64).optional().nullable(),
  amount: z.number().optional().nullable(),
  currency: z.string().max(8).optional().nullable(),
  pageUrl: z.string().max(2048).optional().nullable(),
  meta: z.record(z.unknown()).optional().nullable(),
  occurredAt: z.string().optional().nullable(),
});

router.post(
  '/identify',
  requireSiteKey,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = identifySchema.parse(req.body);
    const nested = body.device;
    const nestedUtm = body.utm;
    const ua =
      body.userAgent ||
      nested?.userAgent ||
      req.headers['user-agent'] ||
      '';
    const screenW = body.screenWidth ?? nested?.screenWidth ?? null;
    const screenH = body.screenHeight ?? nested?.screenHeight ?? null;
    const device = parseUserAgent(ua, screenW, screenH);
    if (nested?.deviceType) device.deviceType = nested.deviceType;
    if (nested?.browser) device.browser = nested.browser;
    if (nested?.browserVersion) device.browserVersion = nested.browserVersion;
    if (nested?.os) device.os = nested.os;
    device.language = body.language ?? nested?.language ?? null;

    const landing =
      nestedUtm?.landingPage || body.landingPage || '/';
    const referrer = nestedUtm?.referrer ?? body.referrer ?? null;
    // Parse Ads/UTM from landing URL + prefer explicit nested SDK fields
    const utm = resolveSessionAttribution({
      utmSource: nestedUtm?.utmSource,
      utmMedium: nestedUtm?.utmMedium,
      utmCampaign: nestedUtm?.utmCampaign,
      utmTerm: nestedUtm?.utmTerm,
      utmContent: nestedUtm?.utmContent,
      gclid: nestedUtm?.gclid,
      gadSource: nestedUtm?.gadSource,
      gadCampaignId: nestedUtm?.gadCampaignId,
      referrer,
      landingPage: landing,
    });

    const ip = getClientIp(req);
    const geo = await enrichGeoFromIp(ip, geoFromHeaders(req));

    const identity = await identifyVisitor({
      siteId: req.siteId!,
      visitorKey: body.visitorKey,
      sessionId: body.sessionId,
      ip,
      geo,
      device,
      utm,
      consentGiven: body.consentGiven,
      language: body.language ?? nested?.language,
      timezone: body.timezone ?? nested?.timezone,
    });
    res.json(identity);
  }),
);

router.post(
  '/events',
  requireSiteKey,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = eventsSchema.parse(req.body);
    const events = body.events.map((e) => {
      const occurredAt =
        typeof e.occurredAt === 'string' ? e.occurredAt : new Date().toISOString();
      const base = e as unknown as IncomingEvent;
      return {
        ...base,
        type: String(e.type || 'custom'),
        occurredAt,
      } satisfies IncomingEvent;
    });

    const result = await ingestEventBatch({
      siteId: req.siteId!,
      sessionId: body.sessionId,
      visitorId: body.visitorId,
      events,
    });
    res.json(result);
  }),
);

router.post(
  '/recording',
  requireSiteKey,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = recordingSchema.parse(req.body);
    const events = resolveRecordingEvents(body);
    if (!events.length) {
      res.status(400).json({ error: 'Empty recording chunk' });
      return;
    }
    const result = await storeRecordingChunk({
      siteId: req.siteId!,
      sessionId: body.sessionId,
      chunkIndex: body.chunkIndex,
      events,
      startedAt: body.startedAt,
      endedAt: body.endedAt,
      visitorId: body.visitorId,
    });
    res.json(result);
  }),
);

router.post(
  '/booking',
  requireSiteKey,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = bookingSchema.parse(req.body);
    const result = await trackBookingEvent({
      siteId: req.siteId!,
      sessionId: body.sessionId,
      visitorId: body.visitorId,
      vehicleCategory: body.vehicleCategory,
      eventType: body.eventType as BookingEventType,
      bookingId: body.bookingId,
      amount: body.amount,
      currency: body.currency,
      pageUrl: body.pageUrl,
      meta: body.meta,
      occurredAt: body.occurredAt,
    });
    res.json(result);
  }),
);

router.post(
  '/session/end',
  requireSiteKey,
  asyncHandler(async (req: AuthedRequest, res) => {
    const sessionId = z.string().uuid().parse(req.body.sessionId);
    await endSession(sessionId);
    res.json({ ok: true });
  }),
);

export default router;
