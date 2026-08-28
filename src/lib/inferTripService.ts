import { isLocationInVizag } from '@/lib/locationUtils';
import type { Location } from '@/lib/locationData';

export type CustomerTripService = 'local' | 'airport' | 'outstation' | 'tour';

const SERVICE_PATH: Record<Exclude<CustomerTripService, 'tour'>, string> = {
  local: '/local-taxi',
  airport: '/airport-taxi',
  outstation: '/outstation-taxi',
};

/** Vizag city airport-transfer radius (from city center). */
export const AIRPORT_TRANSFER_MAX_KM = 35;

/** Bhogapuram Airport (ASR) — same coords as `vizag_airport` in locationData. */
export const BHOGAPURAM_AIRPORT = { lat: 17.97611, lng: 83.50389 };

/**
 * Destinations around the new airport (Vizianagaram town ~32 km road, Srikakulam ~67 km).
 * Measured from Bhogapuram, not Vizag city center — otherwise nearby district towns
 * are billed as outstation (300 km/day minimum).
 */
export const BHOGAPURAM_AIRPORT_CATCHMENT_KM = 80;

const AIRPORT_CATCHMENT_NAME_RE =
  /\b(vizianagaram|vijayanagaram|vizianagarm|srikakulam|bhogapuram|nellimarla|denkada)\b/i;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function locationTextBlob(location: Location): string {
  return [location.id, location.name, location.address, location.city, location.state]
    .filter(Boolean)
    .join(' ');
}

function hasReliableCoords(location: Location | null | undefined): boolean {
  if (!location) return false;
  if (typeof location.lat !== 'number' || typeof location.lng !== 'number') return false;
  if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng)) return false;
  return !(location.lat === 0 && location.lng === 0);
}

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
  const title = `${name} ${id}`;

  const looksLikeAirport =
    type === 'airport' ||
    id === 'vizag_airport' ||
    id === 'vizag_city_airport' ||
    name.includes('airport') ||
    /\bvtz\b/.test(name) ||
    name.includes('vizag international') ||
    // Google sometimes leaves the title empty and only fills formatted_address
    (!name && (address.includes('airport') || /\bvtz\b/.test(address)));

  if (!looksLikeAirport) return false;

  if (textLooksLikeVizagAirport(title) || id === 'vizag_airport' || id === 'vizag_city_airport') {
    return true;
  }

  if (!name && textLooksLikeVizagAirport(address)) {
    return true;
  }

  // Google place often named only "… International Airport" — treat as Vizag if inside city radius
  return isLocationInVizag(location);
}

export function isBhogapuramAirportLocation(location: Location | null | undefined): boolean {
  if (!isVizagAirportLocation(location) || !location) return false;
  const id = (location.id || '').toLowerCase();
  if (id === 'vizag_city_airport') return false;
  if (id === 'vizag_airport') return true;
  const blob = locationTextBlob(location).toLowerCase();
  return (
    blob.includes('alluri') ||
    blob.includes('alluru') ||
    blob.includes('sitaram') ||
    blob.includes('bhogapuram')
  );
}

/** Towns next to Bhogapuram Airport that should use airport fares, not outstation. */
export function isBhogapuramAirportCatchment(location: Location | null | undefined): boolean {
  if (!location) return false;
  if (AIRPORT_CATCHMENT_NAME_RE.test(locationTextBlob(location))) return true;
  if (!hasReliableCoords(location)) return false;
  return (
    haversineKm(location.lat, location.lng, BHOGAPURAM_AIRPORT.lat, BHOGAPURAM_AIRPORT.lng) <=
    BHOGAPURAM_AIRPORT_CATCHMENT_KM
  );
}

/**
 * Other end of an airport transfer: Vizag city (35 km) or Bhogapuram catchment
 * (Vizianagaram, Srikakulam, nearby).
 */
export function isAirportTransferOtherEnd(location: Location | null | undefined): boolean {
  if (!location) return false;
  if (isVizagAirportLocation(location) || isLocationInVizag(location)) return true;
  return isBhogapuramAirportCatchment(location);
}

/**
 * Infer the best customer booking service from pickup/drop.
 * Local (hourly rental) is never inferred from a From/To pair — only the Local tab.
 * - Airport: one end is a Vizag airport AND the other end is in Vizag city or the
 *   Bhogapuram catchment (Vizianagaram / Srikakulam / nearby).
 * - Outstation: other end outside that catchment (e.g. Airport → Kakinada).
 */
export function inferTripServiceType(
  pickup: Location | null | undefined,
  drop: Location | null | undefined
): CustomerTripService | null {
  if (!pickup && !drop) return null;

  const pickupIsAirport = isVizagAirportLocation(pickup);
  const dropIsAirport = isVizagAirportLocation(drop);
  const airportInvolved = pickupIsAirport || dropIsAirport;

  const otherEnd = pickupIsAirport ? drop : dropIsAirport ? pickup : null;
  const pickupInVizag = pickup ? isLocationInVizag(pickup) || pickupIsAirport : true;
  const dropInVizag = drop ? isLocationInVizag(drop) || dropIsAirport : false;

  if (airportInvolved) {
    // Airport pickup/drop alone is not enough — stay on the current tab until destination is known.
    if (!otherEnd) return null;
    if (isAirportTransferOtherEnd(otherEnd)) return 'airport';
    return 'outstation';
  }

  if (!drop) return null;

  // City-to-city is not an airport transfer. Hourly rental is only chosen via the Local tab.
  if (dropInVizag && pickupInVizag) return null;

  if (!dropInVizag || !pickupInVizag) return 'outstation';

  return null;
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
