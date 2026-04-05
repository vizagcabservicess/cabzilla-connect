import { API_BASE_URL } from '@/config';
import type { TripMode, TripType } from '@/lib/tripTypes';

export type TrackSearchPayload = {
  guestPhone: string;
  pickup: string;
  drop: string;
  tripType: string;
  departure: string;
  carsShown: string[];
};

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
  if (tripType === 'airport') {
    const mode = tripMode === 'round-trip' ? 'Round Trip' : 'One Way';
    const dir = airportDirectionLabel ? `${airportDirectionLabel} · ` : '';
    return `${dir}${mode}`;
  }
  return tripMode === 'round-trip' ? 'Round Trip' : 'One Way';
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
