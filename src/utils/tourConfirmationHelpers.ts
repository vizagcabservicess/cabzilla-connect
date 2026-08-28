import type { Booking, TourItineraryDay } from '@/types/api';
import type { TourDetail, TourListItem } from '@/types/tour';
import { matchTourPackageFromLocationText } from '@/lib/availableTours';

export function isGenericTourName(name: string): boolean {
  const n = String(name || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
  return n === '' || n === 'tour' || n === 'package' || n === 'tour package' || n === 'tour packages';
}

function looksLikePackageNarrative(text: string): boolean {
  const s = String(text || '').trim();
  if (s.length < 60) return false;
  return /places\s+to\s+visit|day trip|padmapuram|katiki|borra caves/i.test(s);
}

/** Long package copy pasted into notes/inclusions (not a structured itinerary). */
export function packageNarrativeFromBooking(booking: Booking): string {
  const extra = booking as Booking & {
    admin_notes?: string;
    additional_requirements?: string;
    notes?: string;
    tour_notes?: string;
  };
  const chunks: string[] = [];
  const push = (v: unknown) => {
    if (v == null) return;
    const s = Array.isArray(v)
      ? v.map((x) => String(x).trim()).filter(Boolean).join('\n')
      : String(v).trim();
    if (looksLikePackageNarrative(s)) chunks.push(s);
  };
  push(booking.inclusions);
  push(booking.adminNotes);
  push(extra.admin_notes);
  push(booking.special_notes);
  push(booking.additionalRequirements);
  push(extra.additional_requirements);
  push(extra.notes);
  push(extra.tour_notes);
  if (typeof window !== 'undefined' && booking.id != null) {
    try {
      const stored = window.localStorage.getItem(`invoice-settings-${booking.id}`);
      if (stored) {
        const parsed = JSON.parse(stored) as { adminNotes?: string };
        push(parsed?.adminNotes);
      }
    } catch {
      /* ignore */
    }
  }
  if (!chunks.length) return '';
  return chunks.sort((a, b) => b.length - a.length)[0] ?? '';
}

export function itineraryFromPackageNarrative(text: string): TourItineraryDay[] {
  const raw = String(text || '').trim();
  if (!raw) return [];

  const placesIdx = raw.search(/places\s+to\s+visit/i);
  let title = '';
  let body = raw;
  if (placesIdx >= 0) {
    const before = raw
      .slice(0, placesIdx)
      .split('\n')
      .map((l) => l.replace(/[\u200b\u200c\u200d\u2060\u00a0]/g, ' ').trim())
      .filter(Boolean);
    title = (before[0] || '').replace(/\s*:\s*\(.*$/, '').replace(/:+$/, '').trim();
    body = raw.slice(placesIdx);
  }

  const activities: string[] = [];
  for (const line of body.split(/\n+/)) {
    const cleaned = line.replace(/[\u200b\u200c\u200d\u2060\u00a0]/g, ' ').trim();
    if (/^(pricing|note|notes|inclusions|exclusions)\b/i.test(cleaned)) break;
    const numbered = cleaned.match(/^\d+\s*[.)\-]\s*(.+)$/);
    if (numbered?.[1]) {
      const item = numbered[1].trim();
      if (item && !/^-{3,}$/.test(item)) activities.push(item);
    }
  }
  if (!activities.length) return [];
  return [
    {
      day: 1,
      title: title || 'Day plan',
      description: '',
      activities,
    },
  ];
}

function vehiclePriceFromTourPricing(
  pricing: Record<string, number> | undefined,
  vehicleLabel: string
): number | null {
  if (!pricing || typeof pricing !== 'object') return null;
  const vl = vehicleLabel.toLowerCase();
  const matchesKey = (key: string): boolean => {
    const k = key.toLowerCase();
    if (vl.includes('tempo') || vl.includes('traveller')) {
      return k.includes('tempo') || k.includes('traveller');
    }
    if (vl.includes('urbania') || /\bbus\b/.test(vl)) {
      return k.includes('bus') || k.includes('urbania');
    }
    if (vl.includes('crysta') || vl.includes('innova')) {
      return k.includes('innova') || k.includes('crysta');
    }
    if (vl.includes('ertiga')) {
      return k.includes('ertiga');
    }
    if (
      vl.includes('swift') ||
      vl.includes('dzire') ||
      vl.includes('amaze') ||
      vl.includes('sedan') ||
      vl.includes('glanza')
    ) {
      return (
        k.includes('sedan') ||
        k.includes('amaze') ||
        k.includes('toyota') ||
        k.includes('glanza')
      );
    }
    return false;
  };

  for (const [k, v] of Object.entries(pricing)) {
    if (!matchesKey(k)) continue;
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function bookingTourContextBlob(booking: Booking): string {
  const inc = booking.inclusions;
  const incText = Array.isArray(inc) ? inc.join('\n') : String(inc ?? '');
  const exc = booking.exclusions;
  const excText = Array.isArray(exc) ? exc.join('\n') : String(exc ?? '');
  const extra = booking as Booking & {
    admin_notes?: string;
    additional_requirements?: string;
    notes?: string;
    tour_notes?: string;
  };
  return [
    booking.adminNotes,
    extra.admin_notes,
    booking.special_notes,
    booking.additionalRequirements,
    extra.additional_requirements,
    extra.notes,
    extra.tour_notes,
    booking.tour_name,
    booking.tourName,
    typeof booking.dropLocation === 'string' ? booking.dropLocation : '',
    typeof booking.drop_location === 'string' ? booking.drop_location : '',
    incText,
    excText,
    packageNarrativeFromBooking(booking),
  ]
    .map((x) => (x == null ? '' : String(x)))
    .join('\n');
}

function narrowToursByAdminNotes(candidates: TourListItem[], booking: Booking): TourListItem | null {
  if (candidates.length < 2) return null;
  const blob = bookingTourContextBlob(booking).toLowerCase();
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
 * published vehicle price vs booked fare, and optional admin/note hints.
 */
export function pickTourListItemFromBookingContext(
  tours: TourListItem[],
  booking: Booking
): TourListItem | null {
  if (!Array.isArray(tours) || tours.length === 0) return null;

  const blob = bookingTourContextBlob(booking);
  const fromScore = scoreToursAgainstBlob(tours, blob);
  if (fromScore) return fromScore;

  const fromNotes = matchTourPackageFromLocationText(blob, tours);
  if (fromNotes) return fromNotes;

  const d = Math.round(Number(booking.distance) || 0);
  if (d <= 0) return null;

  const kmTol = 8;
  const byKm = tours.filter((t) => {
    const td = Math.round(Number(t.distance) || 0);
    if (td <= 0) return false;
    return (
      Math.abs(td - d) <= kmTol ||
      Math.abs(td * 2 - d) <= Math.max(kmTol, Math.round(d * 0.12)) ||
      Math.abs(td - Math.round(d / 2)) <= Math.max(kmTol, Math.round(td * 0.12))
    );
  });
  if (byKm.length === 0) return null;
  if (byKm.length === 1) return byKm[0];

  let candidates = byKm;
  const vehicleLabel = String(booking.vehicle_type ?? booking.cabType ?? '');
  const fare = Number(booking.fare ?? booking.totalAmount ?? 0) || 0;

  if (fare > 0) {
    const tol = Math.max(100, fare * 0.06);
    const byPublishedVehicle = candidates.filter((t) => {
      const p = vehiclePriceFromTourPricing(t.pricing as Record<string, number>, vehicleLabel);
      return p != null && Math.abs(p - fare) <= tol;
    });
    if (byPublishedVehicle.length === 1) return byPublishedVehicle[0];
    if (byPublishedVehicle.length > 1) candidates = byPublishedVehicle;

    if (byPublishedVehicle.length === 0) {
      const byMin = candidates.filter((t) => {
        const mp = Number(t.minPrice) || 0;
        return mp > 0 && Math.abs(mp - fare) <= tol;
      });
      if (byMin.length === 1) return byMin[0];
      if (byMin.length > 1) candidates = byMin;

      const byAnyVehiclePrice = candidates.filter((t) => {
        const p = t.pricing as Record<string, number>;
        if (!p || typeof p !== 'object') return false;
        return Object.values(p).some((v) => {
          const n = Number(v);
          return Number.isFinite(n) && n > 0 && Math.abs(n - fare) <= tol;
        });
      });
      if (byAnyVehiclePrice.length === 1) return byAnyVehiclePrice[0];
      if (byAnyVehiclePrice.length > 1) candidates = byAnyVehiclePrice;
    }
  }

  const fromCandidates = matchTourPackageFromLocationText(
    bookingTourContextBlob(booking),
    candidates
  );
  if (fromCandidates) return fromCandidates;

  const byNotes = narrowToursByAdminNotes(candidates, booking);
  if (byNotes) return byNotes;

  const scored = scoreToursAgainstBlob(candidates, bookingTourContextBlob(booking));
  if (scored) return scored;

  return null;
}

const TOUR_PLACE_HINTS: { test: (blob: string) => boolean; match: (t: TourListItem) => boolean }[] = [
  {
    test: (blob) =>
      /araku|borra|padmapuram|katiki|damuku|galikonda|chaparai|ananthagiri|anantagiri/.test(blob),
    match: (t) => {
      const id = t.tourId.toLowerCase();
      const name = t.tourName.toLowerCase();
      return (id === 'araku' || name.includes('araku valley')) && !/3\s*d|3\s*day/.test(name);
    },
  },
  {
    test: (blob) => /lambasingi|kothapalli/.test(blob),
    match: (t) => t.tourName.toLowerCase().includes('lambasingi') || t.tourId.toLowerCase().includes('lambasingi'),
  },
  {
    test: (blob) => /vanajangi|paderu/.test(blob),
    match: (t) => t.tourName.toLowerCase().includes('vanajangi') || t.tourId.toLowerCase().includes('vanajangi'),
  },
];

function scoreToursAgainstBlob(candidates: TourListItem[], blob: string): TourListItem | null {
  const lower = blob.toLowerCase();
  if (!lower.trim() || candidates.length === 0) return null;
  for (const hint of TOUR_PLACE_HINTS) {
    if (!hint.test(lower)) continue;
    const hits = candidates.filter(hint.match);
    if (hits.length === 1) return hits[0] ?? null;
  }
  return null;
}

/**
 * Resolve catalog tour from saved title and/or drop (when DB never stored tour_id).
 */
export function pickTourListItemByName(tours: TourListItem[], booking: Booking): TourListItem | null {
  if (!Array.isArray(tours) || tours.length === 0) return null;

  const chunks: string[] = [];
  const tn = String(booking.tour_name ?? booking.tourName ?? '').trim();
  if (tn && !isGenericTourName(tn)) chunks.push(tn);
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
    if (n === 'tour package' || n === 'tour' || n === 'package') continue;
    const exact = tours.find((t) => norm(t.tourName) === n);
    if (exact) return exact;
  }

  for (const raw of chunks) {
    if (!raw) continue;
    const n = norm(raw);
    if (n === 'tour package' || n === 'tour' || n === 'package') continue;
    const hits = tours.filter(
      (t) => {
        const tn2 = norm(t.tourName);
        return tn2.includes(n) || n.includes(tn2);
      }
    );
    if (hits.length === 1) return hits[0];
  }

  return matchTourPackageFromLocationText(bookingTourContextBlob(booking), tours);
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
    activities = raw.activities
      .map((a) => String(a).trim())
      .filter((a) => a && !/^-{3,}$/.test(a));
  }
  return { day, title, description, activities };
}

function parseStructuredItineraryValue(v: unknown): TourItineraryDay[] {
  if (v == null) return [];
  if (typeof v === 'string' && v.trim() !== '') {
    try {
      return parseStructuredItineraryValue(JSON.parse(v) as unknown);
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
}

/** Structured days stored on the booking row (not package-note fallback). */
export function coalesceStructuredTourItinerary(booking: Booking): TourItineraryDay[] {
  const b = booking as Booking & { tour_itinerary_json?: unknown };
  return parseStructuredItineraryValue(
    booking.tour_itinerary ?? booking.tourItinerary ?? b.tour_itinerary_json
  );
}

/**
 * Accepts itinerary from booking API: array, JSON string, or camelCase/snake_case field names.
 * Falls back to a "Places to Visit" list pasted into notes/inclusions.
 */
export function coalesceTourItinerary(booking: Booking): TourItineraryDay[] {
  const structured = coalesceStructuredTourItinerary(booking);
  if (structured.length) return structured;
  return itineraryFromPackageNarrative(packageNarrativeFromBooking(booking));
}

export function formatTourItineraryForWhatsApp(days: TourItineraryDay[]): string {
  if (!days.length) return '';
  return days
    .map((d) => {
      const labelDay = d.day < 1 ? 1 : d.day;
      const titleLine = d.title ? `: *${d.title}*` : '';
      const desc = d.description ? `\n${d.description}` : '';
      const actLine =
        d.activities?.length && d.activities.some((a) => String(a).trim())
          ? `\n${d.activities
              .map((a) => `• ${String(a).trim()}`)
              .filter((a) => a && !/^• -{3,}$/.test(a))
              .join('\n')}`
          : '';
      return `📅 *Day ${labelDay}*${titleLine}${desc}${actLine}`;
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
  const hasStructuredItin = coalesceStructuredTourItinerary(booking).length > 0;
  const inc = coalesceTourInclusionsExclusions(booking, 'inclusions');
  const exc = coalesceTourInclusionsExclusions(booking, 'exclusions');

  const out: Booking = { ...booking };
  if (!out.tour_id && detail.tourId) out.tour_id = detail.tourId;
  if (!out.tourId && detail.tourId) out.tourId = detail.tourId;
  if (!name || isGenericTourName(name)) {
    out.tour_name = detail.tourName;
    out.tourName = detail.tourName;
  }
  if (!hasStructuredItin && Array.isArray(detail.itinerary) && detail.itinerary.length > 0) {
    out.tour_itinerary = detail.itinerary.map((d) => ({
      day: d.day,
      title: d.title,
      description: d.description,
      activities: Array.isArray(d.activities) ? d.activities : [],
    }));
  }
  const genericInc =
    inc.length > 0 &&
    inc.every((item) => item.length < 80) &&
    /driver/i.test(inc.join(' ')) &&
    /fuel/i.test(inc.join(' '));
  if ((!inc.length || genericInc) && detail.inclusions?.length) {
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

function looksLikeInclusionNarrativeList(items: string[]): boolean {
  const joined = items.join('\n');
  return looksLikePackageNarrative(joined);
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
    if (direct.length && !looksLikeInclusionNarrativeList(direct)) return direct;
    const fromInc = coerceStringArray(booking.inclusions);
    if (looksLikeInclusionNarrativeList(fromInc)) return [];
    return fromInc;
  }
  const direct = coerceStringArray(
    booking.tour_exclusions ?? b.tourExclusions ?? b.tour_exclusions_json
  );
  if (direct.length) return direct;
  return coerceStringArray(booking.exclusions);
}
