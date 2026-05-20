import type { SharedRide } from './constants';
import type { CarpoolSearchParams } from './types';

export type RideRequestSubmittedState = {
  bookingId: number;
  ride: SharedRide;
  search: CarpoolSearchParams;
  submittedAt: string;
  phone?: string;
  deduplicated?: boolean;
};

const STORAGE_KEY = 'carpool_last_ride_request';

export function saveRideRequestState(state: RideRequestSubmittedState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
}

export function readRideRequestState(
  locationState: unknown,
): RideRequestSubmittedState | null {
  const fromNav = locationState as RideRequestSubmittedState | null;
  if (fromNav?.bookingId && fromNav?.ride?.id) {
    saveRideRequestState(fromNav);
    return fromNav;
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RideRequestSubmittedState;
    if (parsed?.bookingId && parsed?.ride?.id) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function formatRequestId(bookingId: number): string {
  return `REQ${String(bookingId).padStart(5, '0')}`;
}

export function formatSubmittedDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function groupPreferenceLabel(pref: CarpoolSearchParams['groupPreference']): string {
  if (pref === 'mixed') return 'Mixed Group';
  if (pref === 'men') return 'Men Only';
  return 'Women Only';
}
