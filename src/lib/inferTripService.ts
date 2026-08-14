import { isLocationInVizag } from '@/lib/locationUtils';
import type { Location } from '@/lib/locationData';

export type CustomerTripService = 'local' | 'airport' | 'outstation' | 'tour';

const SERVICE_PATH: Record<Exclude<CustomerTripService, 'tour'>, string> = {
  local: '/local-taxi',
  airport: '/airport-taxi',
  outstation: '/outstation-taxi',
};

export function textLooksLikeVizagAirport(text: string): boolean {
  const blob = (text || '').toLowerCase();
  if (!blob.trim()) return false;

  if (
    blob.includes('alluri') ||
    blob.includes('alluru') ||
    blob.includes('sitaram') ||
    blob.includes('bhogapuram') ||
    /\bvtz\b/.test(blob)
  ) {
    return true;
  }

  const looksLikeAirport =
    blob.includes('airport') ||
    blob.includes('vizag_airport') ||
    blob.includes('vizag_city_airport') ||
    blob.includes('vizag international');
  if (!looksLikeAirport) return false;

  return (
    blob.includes('vizag_airport') ||
    blob.includes('vizag_city_airport') ||
    blob.includes('vizag') ||
    blob.includes('visakhapatnam') ||
    blob.includes('alluri') ||
    blob.includes('sitaram') ||
    blob.includes('bhogapuram')
  );
}

export function isVizagAirportLocation(location: Location | null | undefined): boolean {
  if (!location) return false;
  const name = (location.name || '').toLowerCase();
  const address = (location.address || '').toLowerCase();
  const id = (location.id || '').toLowerCase();
  const type = String((location as { type?: string }).type || '').toLowerCase();
  const blob = `${name} ${address} ${id}`;

  const looksLikeAirport =
    type === 'airport' ||
    id === 'vizag_airport' ||
    id === 'vizag_city_airport' ||
    blob.includes('airport') ||
    /\bvtz\b/.test(blob);

  if (!looksLikeAirport) return false;

  if (textLooksLikeVizagAirport(blob) || id === 'vizag_airport' || id === 'vizag_city_airport') {
    return true;
  }

  // Google place often named only "… International Airport" — treat as Vizag if inside city radius
  return isLocationInVizag(location);
}

/** Airport tab vs outstation: road/haversine km at or under this stays an airport transfer. */
export const AIRPORT_TRANSFER_MAX_KM = 35;

function haversineKm(a: Location, b: Location): number | null {
  if (
    !Number.isFinite(a.lat) ||
    !Number.isFinite(a.lng) ||
    !Number.isFinite(b.lat) ||
    !Number.isFinite(b.lng) ||
    (a.lat === 0 && a.lng === 0) ||
    (b.lat === 0 && b.lng === 0)
  ) {
    return null;
  }
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Infer the best customer booking service from pickup/drop.
 * - Airport: one end is Vizag airport AND the other is in the Vizag area, or the hop is ≤35 km
 *   (Bhogapuram airport itself sits outside the city 35 km circle)
 * - Local: both ends inside Vizag
 * - Outstation: other end outside Vizag (e.g. Airport → Kakinada, Vizag → Hyderabad)
 */
export function inferTripServiceType(
  pickup: Location | null | undefined,
  drop: Location | null | undefined
): CustomerTripService | null {
  if (!pickup && !drop) return null;

  const pickupIsAirport = isVizagAirportLocation(pickup);
  const dropIsAirport = isVizagAirportLocation(drop);
  const airportInvolved = pickupIsAirport || dropIsAirport;

  // Need the non-airport end (or both city ends) before deciding
  if (!drop && !pickupIsAirport) return null;
  if (!pickup && !dropIsAirport && !drop) return null;

  const otherEnd = pickupIsAirport ? drop : dropIsAirport ? pickup : null;
  const pickupInVizag = pickup ? isLocationInVizag(pickup) || pickupIsAirport : true;
  const dropInVizag = drop ? isLocationInVizag(drop) || dropIsAirport : false;
  const km = pickup && drop ? haversineKm(pickup, drop) : null;

  if (airportInvolved) {
    if (otherEnd && isLocationInVizag(otherEnd)) return 'airport';
    if (km != null && km <= AIRPORT_TRANSFER_MAX_KM) return 'airport';
    if (otherEnd && !isLocationInVizag(otherEnd)) return 'outstation';
    if (!otherEnd) return 'airport';
  }

  if (!drop) return null;

  if (dropInVizag && pickupInVizag) {
    if (km == null || km <= 45) return 'local';
    return 'outstation';
  }

  if (!dropInVizag) return 'outstation';

  if (dropInVizag && !pickup) return 'local';

  return 'outstation';
}

export function getServicePathForTripType(type: CustomerTripService): string | null {
  if (type === 'tour') return '/tours';
  return SERVICE_PATH[type] ?? null;
}

export function tripTypeFromPathname(pathname: string): CustomerTripService | null {
  if (pathname.startsWith('/local-taxi')) return 'local';
  if (pathname.startsWith('/airport-taxi')) return 'airport';
  if (pathname.startsWith('/outstation-taxi')) return 'outstation';
  if (pathname.startsWith('/araku-tour-packages') || pathname.startsWith('/tours')) return 'tour';
  return null;
}
