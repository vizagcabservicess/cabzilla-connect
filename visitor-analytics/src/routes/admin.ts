import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, requireOperator, type AuthedRequest } from '../middleware/auth.js';
import { query, queryOne } from '../db/pool.js';
import { getHeatmap } from '../services/heatmap.js';
import { getRecordingManifest, listRecordingChunks, loadRecordingChunkEvents } from '../services/recording.js';
import {
  analyzeFunnel,
  createFunnel,
  deleteFunnel,
  getFunnel,
  listFunnels,
  updateFunnel,
  type FunnelStep,
} from '../services/funnels.js';
import {
  bookingStatsByCategory,
  conversionByCategory,
  listBookingEvents,
  topVehicles,
} from '../services/bookingAnalytics.js';
import {
  attributionReport,
  dailyReport,
  dailySeries,
  getStoredDailyStats,
  monthlyReport,
  rangeReport,
  upsertDailyStats,
  weeklyReport,
} from '../services/reports.js';
import {
  listNotifications,
  markNotificationRead,
  unreadCount,
} from '../services/notifications.js';
import { getLiveVisitors, refreshAndBroadcastLiveVisitors } from '../services/realtime.js';
import { listOperators, setOperatorStatus } from '../services/chat.js';
import type { DeviceType, HeatmapType } from '../types/index.js';

const router = Router();

router.use(requireOperator);

router.get(
  '/sessions',
  asyncHandler(async (req: AuthedRequest, res) => {
    const siteId = req.siteId!;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const from = (req.query.from as string) || null;
    const to = (req.query.to as string) || null;
    const hasRecording = req.query.hasRecording === '1' ? 1 : req.query.hasRecording === '0' ? 0 : null;

    const sessionParams = {
      siteId,
      from: from ? `${from} 00:00:00` : null,
      to: to ? `${to} 23:59:59` : null,
      hasRecording,
      limit,
      offset,
    };
    let rows;
    try {
      rows = await query(
        `SELECT s.*, v.visitor_key, v.is_returning, v.name AS visitor_name, v.phone AS visitor_phone,
                v.city AS visitor_city, v.pincode AS visitor_pincode, v.country AS visitor_country
         FROM va_sessions s
         INNER JOIN va_visitors v ON v.id = s.visitor_id
         WHERE s.site_id = :siteId
           AND (:from IS NULL OR s.started_at >= :from)
           AND (:to IS NULL OR s.started_at <= :to)
           AND (:hasRecording IS NULL OR s.has_recording = :hasRecording)
         ORDER BY s.started_at DESC
         LIMIT :limit OFFSET :offset`,
        sessionParams,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/pincode/i.test(msg)) throw err;
      rows = await query(
        `SELECT s.*, v.visitor_key, v.is_returning, v.name AS visitor_name, v.phone AS visitor_phone,
                v.city AS visitor_city, NULL AS visitor_pincode, v.country AS visitor_country
         FROM va_sessions s
         INNER JOIN va_visitors v ON v.id = s.visitor_id
         WHERE s.site_id = :siteId
           AND (:from IS NULL OR s.started_at >= :from)
           AND (:to IS NULL OR s.started_at <= :to)
           AND (:hasRecording IS NULL OR s.has_recording = :hasRecording)
         ORDER BY s.started_at DESC
         LIMIT :limit OFFSET :offset`,
        sessionParams,
      );
    }
    res.json({ sessions: rows });
  }),
);

router.get(
  '/sessions/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const row = await queryOne(
      `SELECT s.*, v.visitor_key, v.is_returning, v.name AS visitor_name, v.email AS visitor_email,
              v.phone AS visitor_phone, v.city AS visitor_city, v.country AS visitor_country
       FROM va_sessions s
       INNER JOIN va_visitors v ON v.id = s.visitor_id
       WHERE s.id = :id AND s.site_id = :siteId`,
      { id: req.params.id, siteId: req.siteId! },
    );
    if (!row) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({ session: row });
  }),
);

router.get(
  '/visitors',
  asyncHandler(async (req: AuthedRequest, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const q = (req.query.q as string) || null;
    const rows = await query(
      `SELECT * FROM va_visitors
       WHERE site_id = :siteId
         AND (
           :q IS NULL OR name LIKE CONCAT('%', :q, '%') OR email LIKE CONCAT('%', :q, '%')
           OR phone LIKE CONCAT('%', :q, '%') OR city LIKE CONCAT('%', :q, '%')
           OR visitor_key LIKE CONCAT('%', :q, '%')
         )
       ORDER BY last_seen_at DESC
       LIMIT :limit OFFSET :offset`,
      { siteId: req.siteId!, q, limit, offset },
    );
    res.json({ visitors: rows });
  }),
);

router.get(
  '/visitors/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const visitor = await queryOne(`SELECT * FROM va_visitors WHERE id = :id AND site_id = :siteId`, {
      id: req.params.id,
      siteId: req.siteId!,
    });
    if (!visitor) {
      res.status(404).json({ error: 'Visitor not found' });
      return;
    }
    const sessions = await query(
      `SELECT * FROM va_sessions WHERE visitor_id = :id ORDER BY started_at DESC LIMIT 50`,
      { id: req.params.id },
    );
    res.json({ visitor, sessions });
  }),
);

router.get(
  '/events',
  asyncHandler(async (req: AuthedRequest, res) => {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const sessionId = (req.query.sessionId as string) || null;
    const visitorId = (req.query.visitorId as string) || null;
    const eventType = (req.query.type as string) || null;
    const rows = await query(
      `SELECT * FROM va_events
       WHERE site_id = :siteId
         AND (:sessionId IS NULL OR session_id = :sessionId)
         AND (:visitorId IS NULL OR visitor_id = :visitorId)
         AND (:eventType IS NULL OR event_type = :eventType)
       ORDER BY occurred_at DESC
       LIMIT :limit`,
      { siteId: req.siteId!, sessionId, visitorId, eventType, limit },
    );
    res.json({ events: rows });
  }),
);

router.get(
  '/recordings/:sessionId',
  asyncHandler(async (req: AuthedRequest, res) => {
    const session = await queryOne(`SELECT id FROM va_sessions WHERE id = :id AND site_id = :siteId`, {
      id: req.params.sessionId,
      siteId: req.siteId!,
    });
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    const manifest = await getRecordingManifest(req.params.sessionId!);
    res.json({ recording: manifest });
  }),
);

router.get(
  '/recordings/:sessionId/chunks',
  asyncHandler(async (req: AuthedRequest, res) => {
    const chunks = await listRecordingChunks(req.params.sessionId!);
    res.json({ chunks });
  }),
);

router.get(
  '/recordings/:sessionId/chunks/:chunkIndex/data',
  asyncHandler(async (req: AuthedRequest, res) => {
    const sessionId = req.params.sessionId!;
    const chunkIndex = Number(req.params.chunkIndex);
    if (!Number.isFinite(chunkIndex)) {
      res.status(400).json({ error: 'Invalid chunk index' });
      return;
    }

    const session = await queryOne(`SELECT id FROM va_sessions WHERE id = :id AND site_id = :siteId`, {
      id: sessionId,
      siteId: req.siteId!,
    });
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const chunks = await listRecordingChunks(sessionId);
    const chunk = chunks.find((c) => c.chunk_index === chunkIndex);
    if (!chunk) {
      res.status(404).json({ error: 'Chunk not found' });
      return;
    }

    try {
      const events = await loadRecordingChunkEvents(chunk.s3_key, {
        sessionId,
        chunkIndex,
      });
      res.json({ events });
    } catch (err) {
      const status =
        typeof err === 'object' &&
        err &&
        'status' in err &&
        typeof (err as { status: unknown }).status === 'number'
          ? (err as { status: number }).status
          : 0;
      const code =
        typeof err === 'object' && err && 'code' in err
          ? String((err as { code: unknown }).code)
          : '';
      // Old sessions: DB row exists but disk/S3 file was wiped on redeploy (before payload_gzip)
      if (status === 404 || code === 'ENOENT') {
        res.status(404).json({
          error: 'Recording chunk file missing',
          events: [],
          reason: 'storage_missing',
        });
        return;
      }
      throw err;
    }
  }),
);

router.get(
  '/heatmaps',
  asyncHandler(async (req: AuthedRequest, res) => {
    const pagePath = z.string().min(1).parse(req.query.pagePath);
    const type = z.enum(['click', 'scroll', 'move']).parse(req.query.type || 'click') as HeatmapType;
    const from = z.string().parse(req.query.from);
    const to = z.string().parse(req.query.to);
    const device = (req.query.device as DeviceType | 'all' | undefined) || 'all';
    const campaign = (req.query.campaign as string) || null;
    const data = await getHeatmap({
      siteId: req.siteId!,
      pagePath,
      type,
      device,
      from,
      to,
      campaign,
    });
    res.json(data);
  }),
);

router.get(
  '/funnels',
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json({ funnels: await listFunnels(req.siteId!) });
  }),
);

router.get(
  '/funnels/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const funnel = await getFunnel(req.params.id!, req.siteId!);
    if (!funnel) {
      res.status(404).json({ error: 'Funnel not found' });
      return;
    }
    res.json({ funnel });
  }),
);

router.post(
  '/funnels',
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = z
      .object({
        name: z.string().min(1),
        steps: z.array(z.object({ name: z.string(), event: z.string(), match: z.record(z.unknown()).optional() })),
        isDefault: z.boolean().optional(),
      })
      .parse(req.body);
    const funnel = await createFunnel({
      siteId: req.siteId!,
      name: body.name,
      steps: body.steps as FunnelStep[],
      isDefault: body.isDefault,
    });
    res.status(201).json({ funnel });
  }),
);

router.patch(
  '/funnels/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = z
      .object({
        name: z.string().optional(),
        steps: z
          .array(z.object({ name: z.string(), event: z.string(), match: z.record(z.unknown()).optional() }))
          .optional(),
        isDefault: z.boolean().optional(),
      })
      .parse(req.body);
    const funnel = await updateFunnel(req.params.id!, req.siteId!, {
      name: body.name,
      steps: body.steps as FunnelStep[] | undefined,
      isDefault: body.isDefault,
    });
    if (!funnel) {
      res.status(404).json({ error: 'Funnel not found' });
      return;
    }
    res.json({ funnel });
  }),
);

router.delete(
  '/funnels/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    await deleteFunnel(req.params.id!, req.siteId!);
    res.json({ ok: true });
  }),
);

router.get(
  '/funnels/:id/analytics',
  asyncHandler(async (req: AuthedRequest, res) => {
    const from = z.string().parse(req.query.from);
    const to = z.string().parse(req.query.to);
    const analytics = await analyzeFunnel({
      siteId: req.siteId!,
      funnelId: req.params.id!,
      from,
      to,
    });
    if (!analytics) {
      res.status(404).json({ error: 'Funnel not found' });
      return;
    }
    res.json({ analytics });
  }),
);

router.get(
  '/reports/daily',
  asyncHandler(async (req: AuthedRequest, res) => {
    const day = z.string().parse(req.query.day || new Date().toISOString().slice(0, 10));
    res.json({ report: await dailyReport(req.siteId!, day) });
  }),
);

router.get(
  '/reports/range',
  asyncHandler(async (req: AuthedRequest, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const from = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.from || today);
    const to = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.to || today);
    if (from > to) {
      res.status(400).json({ error: 'from must be on or before to' });
      return;
    }
    res.json({ report: await rangeReport(req.siteId!, from, to) });
  }),
);

router.get(
  '/reports/series',
  asyncHandler(async (req: AuthedRequest, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const from = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.from || today);
    const to = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.to || today);
    if (from > to) {
      res.status(400).json({ error: 'from must be on or before to' });
      return;
    }
    res.json({ series: await dailySeries(req.siteId!, from, to) });
  }),
);

router.get(
  '/reports/attribution',
  asyncHandler(async (req: AuthedRequest, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const from = z.string().parse(req.query.from || today);
    const to = z.string().parse(req.query.to || today);
    res.json({ report: await attributionReport(req.siteId!, from, to) });
  }),
);

router.get(
  '/reports/weekly',
  asyncHandler(async (req: AuthedRequest, res) => {
    const end = z.string().parse(req.query.end || new Date().toISOString().slice(0, 10));
    res.json({ report: await weeklyReport(req.siteId!, end) });
  }),
);

router.get(
  '/reports/monthly',
  asyncHandler(async (req: AuthedRequest, res) => {
    const month = z.string().regex(/^\d{4}-\d{2}$/).parse(
      req.query.month || new Date().toISOString().slice(0, 7),
    );
    res.json({ report: await monthlyReport(req.siteId!, month) });
  }),
);

router.post(
  '/reports/daily/rollup',
  asyncHandler(async (req: AuthedRequest, res) => {
    const day = z.string().parse(req.body.day || new Date().toISOString().slice(0, 10));
    const report = await upsertDailyStats(req.siteId!, day);
    res.json({ report });
  }),
);

router.get(
  '/reports/stored',
  asyncHandler(async (req: AuthedRequest, res) => {
    const from = z.string().parse(req.query.from);
    const to = z.string().parse(req.query.to);
    res.json({ stats: await getStoredDailyStats(req.siteId!, from, to) });
  }),
);

router.get(
  '/bookings/stats',
  asyncHandler(async (req: AuthedRequest, res) => {
    const from = z.string().parse(req.query.from);
    const to = z.string().parse(req.query.to);
    const [byCategory, conversion, vehicles] = await Promise.all([
      bookingStatsByCategory(req.siteId!, from, to),
      conversionByCategory(req.siteId!, from, to),
      topVehicles(req.siteId!, from, to),
    ]);
    res.json({ byCategory, conversion, vehicles });
  }),
);

router.get(
  '/bookings/events',
  asyncHandler(async (req: AuthedRequest, res) => {
    const events = await listBookingEvents(req.siteId!, {
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      category: req.query.category as string | undefined,
      limit: Number(req.query.limit) || 100,
    });
    res.json({ events });
  }),
);

router.get(
  '/notifications',
  asyncHandler(async (req: AuthedRequest, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const [items, unread] = await Promise.all([
      listNotifications(req.siteId!, limit),
      unreadCount(req.siteId!),
    ]);
    res.json({ notifications: items, unread });
  }),
);

router.post(
  '/notifications/:id/read',
  asyncHandler(async (req: AuthedRequest, res) => {
    await markNotificationRead(req.params.id!, req.siteId!);
    res.json({ ok: true });
  }),
);

router.get(
  '/live-visitors',
  asyncHandler(async (req: AuthedRequest, res) => {
    const visitors = await getLiveVisitors(req.siteId!);
    res.json({ visitors, count: visitors.length });
  }),
);

router.post(
  '/live-visitors/refresh',
  asyncHandler(async (req: AuthedRequest, res) => {
    const visitors = await refreshAndBroadcastLiveVisitors(req.siteId!);
    res.json({ visitors, count: visitors.length });
  }),
);

router.get(
  '/operators',
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json({ operators: await listOperators(req.siteId!) });
  }),
);

router.post(
  '/operators/status',
  asyncHandler(async (req: AuthedRequest, res) => {
    const status = z.enum(['online', 'away', 'offline']).parse(req.body.status);
    const operatorId = req.operator?.operatorId;
    if (!operatorId) {
      res.status(400).json({ error: 'No operator id on token' });
      return;
    }
    await setOperatorStatus(operatorId, status);
    res.json({ ok: true, status });
  }),
);

export default router;
