import type { Booking, TourItineraryDay } from '@/types/api';
import type { TourDetail, TourListItem } from '@/types/tour';

function tempoPriceFromTourPricing(pricing: Record<string, number> | undefined): number | null {
  if (!pricing || typeof pricing !== 'object') return null;
  for (const [k, v] of Object.entries(pricing)) {
    const key = k.toLowerCase();
    if (!key.includes('tempo') && !key.includes('traveller')) continue;
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function narrowToursByAdminNotes(candidates: TourListItem[], booking: Booking): TourListItem | null {
  if (candidates.length < 2) return null;
  const blob = [
    booking.adminNotes,
    (booking as Booking & { admin_notes?: string }).admin_notes,
    (booking as Booking & { special_notes?: string }).special_notes,
    booking.additionalRequirements,
    (booking as Booking & { additional_requirements?: string }).additional_requirements,
  ]
    .map((x) => (x == null ? '' : String(x)))
    .join(' ')
    .toLowerCase();
  if (!blob.trim()) return null;

  const one = (pred: (t: TourListItem) => boolean): TourListItem | null => {
    const hit = candidates.filter(pred);
    return hit.length === 1 ? hit[0] : null;
  };

  if (blob.includes('south city') || (blob.includes('south') && blob.includes('city tour'))) {
    const x = one((t) => t.tourName.toLowerCase().includes('south'));
    if (x) return x;
  }
  if (blob.includes('north city') || (blob.includes('north') && blob.includes('city tour'))) {
    const x = one((t) => t.tourName.toLowerCase().includes('north'));
    if (x) return x;
  }
  return null;
}

/**
 * When `tour_id` was never stored, try to resolve a single catalog tour using km,
 * published Tempo price vs booked fare, and optional admin/note hints.
 */
export function pickTourListItemFromBookingContext(
  tours: TourListItem[],
  booking: Booking
): TourListItem | null {
  if (!Array.isArray(tours) || tours.length === 0) return null;
  const d = Math.round(Number(booking.distance) || 0);
  if (d <= 0) return null;

  const kmTol = 2;
  const byKm = tours.filter((t) => Math.abs(Math.round(Number(t.distance) || 0) - d) <= kmTol);
  if (byKm.length === 0) return null;
  if (byKm.length === 1) return byKm[0];

  const vehicleLabel = String(booking.vehicle_type ?? booking.cabType ?? '');
  const vl = vehicleLabel.toLowerCase();
  const isTempo = vl.includes('tempo') || vl.includes('traveller');
  const fare = Number(booking.fare ?? booking.totalAmount ?? 0) || 0;

  if (isTempo && fare > 0) {
    const tol = Math.max(100, fare * 0.06);
    const byPublishedTempo = byKm.filter((t) => {
      const p = tempoPriceFromTourPricing(t.pricing as Record<string, number>);
      return p != null && Math.abs(p - fare) <= tol;
    });
    if (byPublishedTempo.length === 1) return byPublishedTempo[0];

    const byMin = byKm.filter((t) => {
      const mp = Number(t.minPrice) || 0;
      return mp > 0 && Math.abs(mp - fare) <= tol;
    });
    if (byMin.length === 1) return byMin[0];

    if (byPublishedTempo.length === 0) {
      const byAnyVehiclePrice = byKm.filter((t) => {
        const p = t.pricing as Record<string, number>;
        if (!p || typeof p !== 'object') return false;
        return Object.values(p).some((v) => {
          const n = Number(v);
          return Number.isFinite(n) && n > 0 && Math.abs(n - fare) <= tol;
        });
      });
      if (byAnyVehiclePrice.length === 1) return byAnyVehiclePrice[0];
    }
  }

  const byNotes = narrowToursByAdminNotes(byKm, booking);
  if (byNotes) return byNotes;

  return null;
}

/**
 * Resolve catalog tour from saved title and/or drop (when DB never stored tour_id).
 */
export function pickTourListItemByName(tours: TourListItem[], booking: Booking): TourListItem | null {
  if (!Array.isArray(tours) || tours.length === 0) return null;

  const chunks: string[] = [];
  const tn = String(booking.tour_name ?? booking.tourName ?? '').trim();
  if (tn) chunks.push(tn);
  const dropRaw =
    typeof booking.drop_location === 'string'
      ? booking.drop_location
      : booking.drop_location && typeof booking.drop_location === 'object'
        ? String((booking.drop_location as { city?: string }).city ?? '')
        : '';
  const dropAlt = String(booking.dropLocation ?? dropRaw ?? '').trim();
  if (dropAlt) chunks.push(dropAlt.split(',')[0].trim());

  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFKC')
      .replace(/\s+/g, ' ')
      .trim();

  for (const raw of chunks) {
    if (!raw) continue;
    const n = norm(raw);
    const exact = tours.find((t) => norm(t.tourName) === n);
    if (exact) return exact;
  }

  for (const raw of chunks) {
    if (!raw) continue;
    const n = norm(raw);
    const hits = tours.filter(
      (t) => {
        const tn2 = norm(t.tourName);
        return tn2.includes(n) || n.includes(tn2);
      }
    );
    if (hits.length === 1) return hits[0];
  }

  return null;
}

export function isTourBooking(
  tripType: string,
  tourId: string | undefined | null,
  booking: Booking
): boolean {
  const t = (tripType || '').toLowerCase();
  if (t === 'tour') return true;
  if (tourId && String(tourId).trim() !== '') return true;
  if (booking.tour_id != null && String(booking.tour_id).trim() !== '') return true;
  if (booking.tourId != null && String(booking.tourId).trim() !== '') return true;
  return false;
}

function normalizeItineraryDay(raw: Record<string, unknown>): TourItineraryDay | null {
  const day = Number(raw.day);
  /* CMS / tour editor sometimes uses day 0 for a single-day package */
  if (!Number.isFinite(day) || day < 0) return null;
  const title = String(raw.title ?? '').trim();
  const description = String(raw.description ?? '').trim();
  let activities: string[] = [];
  if (Array.isArray(raw.activities)) {
    activities = raw.activities.map((a) => String(a).trim()).filter(Boolean);
  }
  return { day, title, description, activities };
}

/**
 * Accepts itinerary from booking API: array, JSON string, or camelCase/snake_case field names.
 */
export function coalesceTourItinerary(booking: Booking): TourItineraryDay[] {
  const parseValue = (v: unknown): TourItineraryDay[] => {
    if (v == null) return [];
    if (typeof v === 'string' && v.trim() !== '') {
      try {
        return parseValue(JSON.parse(v) as unknown);
      } catch {
        return [];
      }
    }
    if (!Array.isArray(v)) return [];
    const out: TourItineraryDay[] = [];
    for (const item of v) {
      if (item && typeof item === 'object') {
        const n = normalizeItineraryDay(item as Record<string, unknown>);
        if (n) out.push(n);
      }
    }
    return out.sort((a, b) => a.day - b.day);
  };

  const b = booking as Booking & { tour_itinerary_json?: unknown };
  return parseValue(booking.tour_itinerary ?? booking.tourItinerary ?? b.tour_itinerary_json);
}

export function formatTourItineraryForWhatsApp(days: TourItineraryDay[]): string {
  if (!days.length) return '';
  return days
    .map((d) => {
      const titleLine = d.title ? `: *${d.title}*` : '';
      const desc = d.description ? `\n${d.description}` : '';
      const actLine =
        d.activities?.length && d.activities.some((a) => String(a).trim())
          ? `\n${d.activities.map((a) => `• ${String(a).trim()}`).filter(Boolean).join('\n')}`
          : '';
      return `📅 *Day ${d.day}*${titleLine}${desc}${actLine}`;
    })
    .join('\n\n');
}

/** UI fallback text — replace with real calendar length or catalog duration in confirmations */
export function isVagueTourDurationText(v: unknown): boolean {
  const t = String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return t === 'full day' || t === 'full-day' || t === 'fullday';
}

export function effectiveTourDayCount(booking: Booking): number {
  const d = booking.tourDays ?? booking.tour_days;
  if (d != null && Number(d) > 0) return Math.round(Number(d));
  const itin = coalesceTourItinerary(booking);
  if (!itin.length) return 0;
  const mx = Math.max(...itin.map((x) => x.day));
  if (mx > 0) return mx;
  return 1;
}

/** Prefer catalog / day count over generic "Full Day" in WhatsApp and similar. */
export function resolveTourDurationForConfirmation(booking: Booking): string {
  const rawLabel = String(booking.tourDurationLabel ?? '').trim();
  const rawDur = String(booking.tour_duration ?? booking.tourDuration ?? '').trim();
  const primary = rawLabel || rawDur;
  const days = effectiveTourDayCount(booking);

  if (primary && !isVagueTourDurationText(primary)) {
    return primary;
  }

  if (days === 1) return '1 day';
  if (days > 1) return `${days} days`;

  if (primary && isVagueTourDurationText(primary)) {
    return '';
  }
  return primary;
}

function coerceStringArray(a: unknown): string[] {
  if (a == null) return [];
  if (Array.isArray(a)) {
    return a.map((x) => String(x).trim()).filter((s) => s !== '');
  }
  if (typeof a === 'string' && a.trim() !== '') {
    try {
      const p = JSON.parse(a) as unknown;
      if (Array.isArray(p)) {
        return p.map((x) => String(x).trim()).filter(Boolean);
      }
    } catch {
      /* treat as plain text */
    }
    return a
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Fills missing tour title / itinerary / lists on a booking using live tour detail
 * (e.g. admin bookings that only stored tour_id, or legacy rows).
 */
export function mergeTourDetailIntoBooking(booking: Booking, detail: TourDetail): Booking {
  const name = String(booking.tour_name ?? booking.tourName ?? '').trim();
  const hasItin = coalesceTourItinerary(booking).length > 0;
  const inc = coalesceTourInclusionsExclusions(booking, 'inclusions');
  const exc = coalesceTourInclusionsExclusions(booking, 'exclusions');

  const out: Booking = { ...booking };
  if (!out.tour_id && detail.tourId) out.tour_id = detail.tourId;
  if (!out.tourId && detail.tourId) out.tourId = detail.tourId;
  if (!name) {
    out.tour_name = detail.tourName;
    out.tourName = detail.tourName;
  }
  if (!hasItin && Array.isArray(detail.itinerary) && detail.itinerary.length > 0) {
    out.tour_itinerary = detail.itinerary.map((d) => ({
      day: d.day,
      title: d.title,
      description: d.description,
      activities: Array.isArray(d.activities) ? d.activities : [],
    }));
  }
  if (!inc.length && detail.inclusions?.length) {
    out.tour_inclusions = detail.inclusions;
  }
  if (!exc.length && detail.exclusions?.length) {
    out.tour_exclusions = detail.exclusions;
  }
  if (out.tourDays == null && out.tour_days == null && detail.days != null) {
    out.tourDays = detail.days;
    out.tour_days = detail.days;
  }

  const existingDurLine = [
    out.tourDurationLabel,
    out.tour_duration,
    out.tourDuration,
  ]
    .map((x) => String(x ?? '').trim())
    .find((s) => s.length > 0);
  const vagueExisting = !existingDurLine || isVagueTourDurationText(existingDurLine);

  const dCat = (detail.duration || '').trim();
  const tCat = (detail.timeDuration || '').trim();
  let catalogPreferred = '';
  if (dCat && !isVagueTourDurationText(dCat)) catalogPreferred = dCat;
  else if (tCat && !isVagueTourDurationText(tCat)) catalogPreferred = tCat;
  else if (dCat) catalogPreferred = dCat;
  else if (tCat) catalogPreferred = tCat;

  const dayN = detail.days != null && Number(detail.days) > 0 ? Math.round(Number(detail.days)) : 0;
  const derivedFromDays = dayN === 1 ? '1 day' : dayN > 1 ? `${dayN} days` : '';

  if (vagueExisting && catalogPreferred && !isVagueTourDurationText(catalogPreferred)) {
    out.tourDurationLabel = catalogPreferred;
    out.tour_duration = catalogPreferred;
    out.tourDuration = catalogPreferred;
  } else if (vagueExisting && derivedFromDays) {
    out.tourDurationLabel = derivedFromDays;
    out.tour_duration = derivedFromDays;
    out.tourDuration = derivedFromDays;
  } else if (!existingDurLine && catalogPreferred) {
    out.tourDurationLabel = catalogPreferred;
    out.tour_duration = catalogPreferred;
    out.tourDuration = catalogPreferred;
  } else if (!String(out.tour_duration ?? out.tourDuration ?? '').trim() && dCat) {
    out.tour_duration = dCat;
    out.tourDuration = dCat;
  }
  if (!String(out.tourDurationLabel ?? '').trim() && catalogPreferred && vagueExisting) {
    out.tourDurationLabel = catalogPreferred;
  }
  return out;
}

export function coalesceTourInclusionsExclusions(
  booking: Booking,
  kind: 'inclusions' | 'exclusions'
): string[] {
  const b = booking as Booking & {
    tourInclusions?: string[];
    tourExclusions?: string[];
    tour_inclusions_json?: string;
    tour_exclusions_json?: string;
  };
  if (kind === 'inclusions') {
    const direct = coerceStringArray(
      booking.tour_inclusions ?? b.tourInclusions ?? b.tour_inclusions_json
    );
    if (direct.length) return direct;
    return coerceStringArray(booking.inclusions);
  }
  const direct = coerceStringArray(
    booking.tour_exclusions ?? b.tourExclusions ?? b.tour_exclusions_json
  );
  if (direct.length) return direct;
  return coerceStringArray(booking.exclusions);
}
