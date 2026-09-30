import { API_BASE_URL } from '@/config';
import type { Location } from '@/types/location';
import type { TripMode, TripType } from '@/lib/tripTypes';

export type TrackVehicleFareLine = { name: string; fareText: string };

/** Session: guest WhatsApp (E.164) after first successful entry — skip modal on later searches in this tab. */
export const SESSION_GUEST_TRACK_PHONE_KEY = 'guestTrackWhatsAppE164';

export type TrackSearchPayload = {
  guestPhone: string;
  pickup: string;
  drop: string;
  tripType: string;
  departure: string;
  /** One-way km used to compute fares (same as Hero/CabList pricing distance). */
  distanceKmOneWay?: number;
  /** One-way driving duration from Distance Matrix (minutes), for WhatsApp journey line. */
  durationMinutesOneWay?: number;
  /** Echo trip mode so templates can show round-trip total km. */
  tripModeTrack?: TripMode;
  /** Outstation intermediate stops, e.g. "Anakapalle → Tuni". */
  viaStops?: string;
  /** Vehicle lines for the alert; each entry may be `Name: ₹…` so hosts that only join `carsShown` still show fares. */
  carsShown: string[];
  /** Per-vehicle fares for backends that render multi-line results (e.g. Node track-search server). */
  vehicleFares?: TrackVehicleFareLine[];
  /** Website URL that reopens this search (pickup, drop, date). */
  searchSummaryUrl?: string;
};

function publicSiteOrigin(): string {
  if (typeof window === 'undefined') return 'https://vizagtaxihub.com';
  return window.location.origin.includes('localhost')
    ? 'https://vizagtaxihub.com'
    : window.location.origin.replace(/\/$/, '');
}

function slugifyPlaceName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function hasMapCoords(place?: { lat?: number; lng?: number } | null): boolean {
  return Boolean(
    place &&
      Number.isFinite(place.lat) &&
      Number.isFinite(place.lng) &&
      !(place.lat === 0 && place.lng === 0)
  );
}

function applyPlaceCoords(
  url: URL,
  pickup?: { lat?: number; lng?: number } | null,
  drop?: { lat?: number; lng?: number } | null
): void {
  if (hasMapCoords(pickup) && pickup) {
    url.searchParams.set('fromLat', String(pickup.lat));
    url.searchParams.set('fromLng', String(pickup.lng));
  }
  if (hasMapCoords(drop) && drop) {
    url.searchParams.set('toLat', String(drop.lat));
    url.searchParams.set('toLng', String(drop.lng));
  }
}

/** Prefill URL so WhatsApp “Search summary” opens the same trip on the website. */
export function buildGuestSearchSummaryUrl(args: {
  tripType: TripType;
  tripMode?: TripMode;
  pickup?: { name?: string; lat?: number; lng?: number } | null;
  drop?: { name?: string; lat?: number; lng?: number } | null;
  pickupDate?: Date | null;
  returnDate?: Date | null;
  hourlyPackage?: string;
  tourHref?: string;
  viaStops?: Array<{ name?: string; lat?: number; lng?: number } | null | undefined>;
}): string {
  const origin = publicSiteOrigin();
  const pickupName = args.pickup?.name?.trim() || '';
  const dropName = args.drop?.name?.trim() || pickupName;
  const fromSlug = slugifyPlaceName(pickupName);
  const toSlug = slugifyPlaceName(dropName);
  const pickupDate = args.pickupDate instanceof Date && !Number.isNaN(args.pickupDate.getTime())
    ? args.pickupDate
    : null;
  const returnDate = args.returnDate instanceof Date && !Number.isNaN(args.returnDate.getTime())
    ? args.returnDate
    : null;

  switch (args.tripType) {
    case 'outstation': {
      const path = fromSlug && toSlug ? `/outstation-taxi/${fromSlug}-to-${toSlug}` : '/outstation-taxi';
      const url = new URL(`${origin}${path}`);
      applyPlaceCoords(url, args.pickup, args.drop);
      if (pickupName) url.searchParams.set('fromName', pickupName);
      if (dropName) url.searchParams.set('toName', dropName);
      if (pickupDate) url.searchParams.set('date', pickupDate.toISOString());
      if (args.tripMode) url.searchParams.set('mode', args.tripMode);
      if (args.tripMode === 'round-trip' && returnDate) {
        url.searchParams.set('returnDate', returnDate.toISOString());
      }
      const vias = (args.viaStops || [])
        .filter((stop): stop is { name?: string; lat?: number; lng?: number } =>
          Boolean(stop && String(stop.name || '').trim())
        )
        .map((stop) => ({
          name: String(stop.name).trim(),
          lat: Number(stop.lat) || 0,
          lng: Number(stop.lng) || 0,
        }));
      if (vias.length > 0) {
        url.searchParams.set('via', JSON.stringify(vias));
      }
      url.searchParams.set('auto', '1');
      return url.toString();
    }
    case 'local': {
      const url = new URL(`${origin}/local-taxi`);
      if (fromSlug) url.searchParams.set('from', fromSlug);
      if (toSlug) url.searchParams.set('to', toSlug);
      applyPlaceCoords(url, args.pickup, args.drop);
      if (pickupName) url.searchParams.set('fromName', pickupName);
      if (dropName) url.searchParams.set('toName', dropName);
      if (pickupDate) url.searchParams.set('date', pickupDate.toISOString());
      if (args.hourlyPackage) url.searchParams.set('package', args.hourlyPackage);
      url.searchParams.set('auto', '1');
      return url.toString();
    }
    case 'airport': {
      const url = new URL(`${origin}/airport-taxi`);
      if (fromSlug) url.searchParams.set('from', fromSlug);
      if (toSlug) url.searchParams.set('to', toSlug);
      applyPlaceCoords(url, args.pickup, args.drop);
      if (pickupName) url.searchParams.set('fromName', pickupName);
      if (dropName) url.searchParams.set('toName', dropName);
      if (pickupDate) url.searchParams.set('date', pickupDate.toISOString());
      if (args.tripMode) url.searchParams.set('mode', args.tripMode);
      url.searchParams.set('auto', '1');
      return url.toString();
    }
    case 'tour':
      return args.tourHref?.startsWith('http')
        ? args.tourHref
        : `${origin}${args.tourHref || '/tours'}`;
    case 'custom':
    case 'admin':
      return `${origin}/`;
    default: {
      const unused: never = args.tripType;
      return unused;
    }
  }
}

/** Stable id for pickup+drop so routed km is only reused for the same pair (avoids stale React `distance`). */
export function buildGuestTrackRouteKey(
  pickup: Location | null | undefined,
  drop: Location | null | undefined,
  waypoints?: Array<Location | null | undefined> | null,
  tripMode?: TripMode | null
): string {
  if (!pickup || !drop) return '';
  if (!Number.isFinite(pickup.lat) || !Number.isFinite(pickup.lng)) return '';
  if (!Number.isFinite(drop.lat) || !Number.isFinite(drop.lng)) return '';
  const p = pickup.placeId?.trim() || `${pickup.lat.toFixed(5)}:${pickup.lng.toFixed(5)}`;
  const d = drop.placeId?.trim() || `${drop.lat.toFixed(5)}:${drop.lng.toFixed(5)}`;
  const via = (waypoints ?? [])
    .filter((stop): stop is Location => Boolean(stop && Number.isFinite(stop.lat) && Number.isFinite(stop.lng)))
    .map((stop) => stop.placeId?.trim() || `${stop.lat.toFixed(5)}:${stop.lng.toFixed(5)}`)
    .join('|');
  const base = via ? `${p}|via:${via}|${d}` : `${p}|${d}`;
  return tripMode ? `${base}|mode:${tripMode}` : base;
}

const hourlyPackageOptions = [
  { value: '8hrs-80km', label: '8 Hours / 80 KM' },
  { value: '10hrs-100km', label: '10 Hours / 100 KM' },
];

export function formatDepartureForTrack(date: Date | null | undefined): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function buildTripTypeLabelForTrack(
  tripType: TripType,
  tripMode: TripMode,
  hourlyPackage: string,
  airportDirectionLabel: string
): string {
  if (tripType === 'tour') return 'Tour';
  if (tripType === 'local') {
    const pkg = hourlyPackageOptions.find((p) => p.value === hourlyPackage)?.label ?? hourlyPackage;
    return `Local (${pkg})`;
  }
  const mode = tripMode === 'round-trip' ? 'Round Trip' : 'One Way';
  if (tripType === 'airport') {
    if (airportDirectionLabel) {
      return `Airport · ${airportDirectionLabel} · ${mode}`;
    }
    return `Airport · ${mode}`;
  }
  if (tripType === 'outstation') {
    return `Outstation · ${mode}`;
  }
  return mode;
}

function formatDurationForWhatsAppRoute(totalMinutes: number): string {
  const m = Math.round(Number(totalMinutes));
  if (!Number.isFinite(m) || m <= 0) return '';
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `~${r} min`;
  if (r === 0) return `~${h} hr`;
  return `~${h} hr ${r} min`;
}

/**
 * Route line(s) for WhatsApp. Production `track-search.php` often ignores extra JSON keys
 * (`distanceKmOneWay`, …); embedding this via {@link buildTripTypeFieldForGuestTrack} ensures km & hours show up.
 */
export function buildRouteSummaryLinesForTripTypeField(
  distanceKmOneWay: number | undefined,
  durationMinutesOneWay: number | undefined,
  tripMode: TripMode
): string | undefined {
  const kmOk =
    typeof distanceKmOneWay === 'number' && Number.isFinite(distanceKmOneWay) && distanceKmOneWay > 0;
  const durOk =
    typeof durationMinutesOneWay === 'number' &&
    Number.isFinite(durationMinutesOneWay) &&
    durationMinutesOneWay > 0;
  if (!kmOk && !durOk) return undefined;

  const kmPart = kmOk ? `~${Math.round(Number(distanceKmOneWay))} km` : '';
  const durPart = durOk ? formatDurationForWhatsAppRoute(Number(durationMinutesOneWay)) : '';
  const owDetail = [kmPart, durPart].filter(Boolean).join(' · ');
  if (!owDetail) return undefined;

  if (tripMode === 'round-trip') {
    const rtKm = kmOk ? `~${Math.round(Number(distanceKmOneWay) * 2)} km` : '';
    const rtDur =
      durOk && durationMinutesOneWay != null
        ? formatDurationForWhatsAppRoute(Math.round(Number(durationMinutesOneWay) * 2))
        : '';
    const rtDetail = [rtKm, rtDur].filter(Boolean).join(' · ');
    return `📏 *One-way:* Approx. route: ${owDetail}\n📏 *Round-trip (approx):* Approx. route: ${rtDetail}`;
  }
  return `📏 *One-way:* Approx. route: ${owDetail}`;
}

/** Production PHP prints pickup/drop as-is — keep stops on the Drop line (newlines are often stripped). */
export function formatGuestTrackDropField(drop: string, viaStopsLabel?: string): string {
  const destination = (drop || '').trim();
  const via = (viaStopsLabel || '').trim();
  if (!via) return destination;
  return destination ? `${destination} (via ${via})` : `(via ${via})`;
}

/** Value sent as JSON `tripType` so legacy PHP templates include route text without separate fields. */
export function buildTripTypeFieldForGuestTrack(
  tripTypeLabel: string,
  distanceKmOneWay: number | undefined,
  durationMinutesOneWay: number | undefined,
  tripMode: TripMode
): string {
  const route = buildRouteSummaryLinesForTripTypeField(
    distanceKmOneWay,
    durationMinutesOneWay,
    tripMode
  );
  return route ? `${tripTypeLabel}\n${route}` : tripTypeLabel;
}

export function trackGuestSearch(payload: TrackSearchPayload): void {
  /** Same host as the page (fixes www vs non-www and wrong VITE_API_BASE_URL). */
  const url =
    typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin.replace(/\/$/, '')}/api/track-search.php`
      : `${String(API_BASE_URL).replace(/\/$/, '')}/api/track-search.php`;

  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    mode: 'cors',
    cache: 'no-store',
  })
    .then(async (r) => {
      if (!r.ok) {
        let detail = '';
        try {
          detail = await r.text();
        } catch {
          /* ignore */
        }
        console.warn('[track-search] request failed', url, r.status, detail);
        return;
      }
      if (import.meta.env.DEV) {
        console.info('[track-search] ok', url);
      }
    })
    .catch((e) => console.warn('[track-search] network error', url, e));
}
