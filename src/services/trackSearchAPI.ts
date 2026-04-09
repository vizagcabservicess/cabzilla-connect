import { API_BASE_URL } from '@/config';
import type { Location } from '@/types/location';
import type { TripMode, TripType } from '@/lib/tripTypes';

export type TrackVehicleFareLine = { name: string; fareText: string };

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
  /** Vehicle lines for the alert; each entry may be `Name: ₹…` so hosts that only join `carsShown` still show fares. */
  carsShown: string[];
  /** Per-vehicle fares for backends that render multi-line results (e.g. Node track-search server). */
  vehicleFares?: TrackVehicleFareLine[];
};

/** Stable id for pickup+drop so routed km is only reused for the same pair (avoids stale React `distance`). */
export function buildGuestTrackRouteKey(
  pickup: Location | null | undefined,
  drop: Location | null | undefined
): string {
  if (!pickup || !drop) return '';
  if (!Number.isFinite(pickup.lat) || !Number.isFinite(pickup.lng)) return '';
  if (!Number.isFinite(drop.lat) || !Number.isFinite(drop.lng)) return '';
  const p = pickup.placeId?.trim() || `${pickup.lat.toFixed(5)}:${pickup.lng.toFixed(5)}`;
  const d = drop.placeId?.trim() || `${drop.lat.toFixed(5)}:${drop.lng.toFixed(5)}`;
  return `${p}|${d}`;
}

const hourlyPackageOptions = [
  { value: '8hrs-80km', label: '8 Hours / 80 KM' },
  { value: '10hrs-100km', label: '10 Hours / 100 KM' },
];

export function formatDepartureForTrack(date: Date): string {
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
