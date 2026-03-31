import type { Booking, TourItineraryDay } from '@/types/api';

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
  if (!Number.isFinite(day) || day < 1) return null;
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
      const acts = d.activities?.length ? d.activities.join(', ') : '';
      const titleLine = d.title ? `: *${d.title}*` : '';
      const desc = d.description ? `\n${d.description}` : '';
      const actLine = acts ? `\n🎯 *Activities:* ${acts}` : '';
      return `📅 *Day ${d.day}*${titleLine}${desc}${actLine}`;
    })
    .join('\n\n');
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

/** Prefer tour-specific lists saved on the booking; else general inclusions/exclusions. */
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
