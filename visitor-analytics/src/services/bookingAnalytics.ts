import { query, queryOne } from '../db/pool.js';
import type { BookingEventType } from '../types/index.js';
import { VEHICLE_CATEGORIES, type VehicleCategory } from '../ai/assistant.js';
import { createNotification } from './notifications.js';
import { realtimeHub } from '../websocket/hub.js';

export { VEHICLE_CATEGORIES };
export type { VehicleCategory };

export function normalizeVehicleCategory(input: string | null | undefined): VehicleCategory | string {
  if (!input) return 'Local Taxi';
  const raw = input.trim();
  const exact = VEHICLE_CATEGORIES.find((c) => c.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;

  const lower = raw.toLowerCase();
  if (lower.includes('airport')) return 'Airport Taxi';
  if (lower.includes('outstation')) return 'Outstation';
  if (lower.includes('tempo') || lower.includes('traveller')) return 'Tempo Traveller';
  if (lower.includes('araku')) return 'Araku Tour';
  if (lower.includes('simhachalam')) return 'Simhachalam';
  if (lower.includes('borra')) return 'Borra Caves';
  if (lower.includes('lambasingi')) return 'Lambasingi';
  if (lower.includes('vizag') && lower.includes('tour')) return 'Vizag Tour';
  if (lower.includes('local') || lower.includes('sightseeing')) return 'Local Taxi';
  return raw;
}

export async function trackBookingEvent(input: {
  siteId: string;
  sessionId?: string | null;
  visitorId?: string | null;
  vehicleCategory: string;
  eventType: BookingEventType;
  bookingId?: string | null;
  amount?: number | null;
  currency?: string | null;
  pageUrl?: string | null;
  meta?: Record<string, unknown> | null;
  occurredAt?: string | null;
}): Promise<{ id: number }> {
  const category = normalizeVehicleCategory(input.vehicleCategory);
  const occurredAt = (input.occurredAt || new Date().toISOString()).replace('T', ' ').replace('Z', '');

  const result = await query<{ insertId: number }>(
    `INSERT INTO va_booking_events (
      site_id, session_id, visitor_id, vehicle_category, event_type,
      booking_id, amount, currency, page_url, meta, occurred_at
    ) VALUES (
      :siteId, :sessionId, :visitorId, :vehicleCategory, :eventType,
      :bookingId, :amount, :currency, :pageUrl, :meta, :occurredAt
    )`,
    {
      siteId: input.siteId,
      sessionId: input.sessionId ?? null,
      visitorId: input.visitorId ?? null,
      vehicleCategory: category,
      eventType: input.eventType,
      bookingId: input.bookingId ?? null,
      amount: input.amount ?? null,
      currency: input.currency ?? 'INR',
      pageUrl: input.pageUrl ?? null,
      meta: input.meta ? JSON.stringify(input.meta) : null,
      occurredAt,
    },
  );

  const insertId = Number((result as unknown as { insertId?: number }).insertId || 0);

  if (input.eventType === 'booking_started') {
    await createNotification({
      siteId: input.siteId,
      type: 'booking_started',
      title: 'Booking started',
      body: `${category} booking started`,
      entityType: 'session',
      entityId: input.sessionId || undefined,
      meta: { vehicleCategory: category, visitorId: input.visitorId },
    });
  } else if (input.eventType === 'booking_completed') {
    await createNotification({
      siteId: input.siteId,
      type: 'booking_completed',
      title: 'Booking completed',
      body: `${category} booking completed`,
      entityType: 'session',
      entityId: input.sessionId || undefined,
      meta: { vehicleCategory: category, amount: input.amount, visitorId: input.visitorId },
    });
  } else if (input.eventType === 'payment_success') {
    await createNotification({
      siteId: input.siteId,
      type: 'payment_success',
      title: 'Payment success',
      body: `${category} payment received`,
      entityType: 'session',
      entityId: input.sessionId || undefined,
      meta: { vehicleCategory: category, amount: input.amount, visitorId: input.visitorId },
    });
  }

  realtimeHub.broadcastToDashboard(input.siteId, {
    type: 'booking.event',
    payload: {
      vehicleCategory: category,
      eventType: input.eventType,
      sessionId: input.sessionId,
      visitorId: input.visitorId,
      amount: input.amount,
      occurredAt,
    },
  });

  return { id: insertId };
}

export async function bookingStatsByCategory(siteId: string, from: string, to: string) {
  return query<
    Array<{
      vehicle_category: string;
      event_type: string;
      count: number;
      revenue: number;
    }>
  >(
    `SELECT vehicle_category, event_type, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS revenue
     FROM va_booking_events
     WHERE site_id = :siteId AND occurred_at BETWEEN :from AND :to
     GROUP BY vehicle_category, event_type
     ORDER BY count DESC`,
    { siteId, from: `${from} 00:00:00`, to: `${to} 23:59:59.999` },
  );
}

export async function topVehicles(siteId: string, from: string, to: string, limit = 10) {
  return query<Array<{ vehicle_category: string; count: number }>>(
    `SELECT vehicle_category, COUNT(*) AS count
     FROM va_booking_events
     WHERE site_id = :siteId
       AND occurred_at BETWEEN :from AND :to
       AND event_type IN ('booking_started','booking_completed','quote_request','booking_form')
     GROUP BY vehicle_category
     ORDER BY count DESC
     LIMIT :limit`,
    { siteId, from: `${from} 00:00:00`, to: `${to} 23:59:59.999`, limit },
  );
}

export async function conversionByCategory(siteId: string, from: string, to: string) {
  const rows = await query<
    Array<{ vehicle_category: string; started: number; completed: number; paid: number }>
  >(
    `SELECT vehicle_category,
       SUM(event_type IN ('booking_started','quote_request','booking_form')) AS started,
       SUM(event_type = 'booking_completed') AS completed,
       SUM(event_type = 'payment_success') AS paid
     FROM va_booking_events
     WHERE site_id = :siteId AND occurred_at BETWEEN :from AND :to
     GROUP BY vehicle_category`,
    { siteId, from: `${from} 00:00:00`, to: `${to} 23:59:59.999` },
  );

  return rows.map((r) => {
    const started = Number(r.started) || 0;
    const completed = Number(r.completed) || 0;
    const paid = Number(r.paid) || 0;
    return {
      vehicleCategory: r.vehicle_category,
      started,
      completed,
      paid,
      completionRate: started > 0 ? completed / started : 0,
      paymentRate: started > 0 ? paid / started : 0,
    };
  });
}

export async function listBookingEvents(
  siteId: string,
  opts: { from?: string; to?: string; category?: string; limit?: number } = {},
) {
  const limit = opts.limit ?? 100;
  return query(
    `SELECT * FROM va_booking_events
     WHERE site_id = :siteId
       AND (:from IS NULL OR occurred_at >= :from)
       AND (:to IS NULL OR occurred_at <= :to)
       AND (:category IS NULL OR vehicle_category = :category)
     ORDER BY occurred_at DESC
     LIMIT :limit`,
    {
      siteId,
      from: opts.from ? `${opts.from} 00:00:00` : null,
      to: opts.to ? `${opts.to} 23:59:59.999` : null,
      category: opts.category ?? null,
      limit,
    },
  );
}

export async function getBookingEvent(id: number, siteId: string) {
  return queryOne(`SELECT * FROM va_booking_events WHERE id = :id AND site_id = :siteId`, { id, siteId });
}
