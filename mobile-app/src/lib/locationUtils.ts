/**
 * Location validation utilities - matches web app logic
 */
import type { Location } from '../types';

const VIZAG_LAT = 17.6868;
const VIZAG_LNG = 83.2185;
const VIZAG_RADIUS_KM = 35;
const TOUR_PICKUP_RADIUS_KM = 15;

export function getDistanceFromVizag(lat: number, lng: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat - VIZAG_LAT);
  const dLng = toRad(lng - VIZAG_LNG);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(VIZAG_LAT)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getDistanceBetween(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isWithinVizagRange(
  lat: number,
  lng: number,
  maxKm: number = VIZAG_RADIUS_KM
): boolean {
  return getDistanceFromVizag(lat, lng) <= maxKm;
}

// Matches web app vizagNames - localities and landmarks within Vizag
const VIZAG_NAMES = [
  'visakhapatnam', 'vizag', 'waltair',
  'kailasagiri', 'railway station', 'rtc complex', 'pendurthi', 'gajuwaka',
  'madhurawada', 'mvp colony', 'nad junction', 'dwaraka nagar', 'akkayyapalem',
  'gopalapatnam', 'simhachalam', 'bhimili', 'bhimli', 'yendada', 'rushikonda',
  'jagadamba', 'seethammadhara', 'dondaparthi', 'lawsons bay', 'siripuram',
  'ramnagar', 'hb colony', 'marripalem', 'rk beach', 'beach road', 'autonagar',
  'kommadi', 'anakapalle', 'elamanchili', 'paderu', 'narsipatnam', 'chintapalli',
  'isukathota', 'tatichetlapalem', 'kurmannapalem', 'sheela nagar', 'bhel',
];

function safeIncludes(s: string | undefined | null, sub: string): boolean {
  if (s == null || typeof s !== 'string') return false;
  return s.toLowerCase().includes(sub.toLowerCase());
}

const BHOGAPURAM_AIRPORT = { lat: 17.97611, lng: 83.50389 };
const BHOGAPURAM_CATCHMENT_KM = 80;
const AIRPORT_CATCHMENT_NAME_RE =
  /\b(vizianagaram|vijayanagaram|vizianagarm|srikakulam|bhogapuram|nellimarla|denkada)\b/i;

function hasReliableCoords(loc: Location | null): boolean {
  if (!loc) return false;
  if (typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return false;
  if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return false;
  return !(loc.lat === 0 && loc.lng === 0);
}

function locationBlob(loc: Location): string {
  return [loc.id, loc.name, loc.address, loc.city, loc.state].filter(Boolean).join(' ').toLowerCase();
}

/** Vizag city airport or Bhogapuram (Alluri Sitarama Raju). Ignores a stale isInVizag flag. */
export function isVizagAirportLocation(loc: Location | null): boolean {
  if (!loc) return false;
  const id = (loc.id || '').toLowerCase();
  if (id === 'vizag_airport' || id === 'vizag_city_airport') return true;
  const blob = locationBlob(loc);
  if (
    blob.includes('alluri') ||
    blob.includes('alluru') ||
    blob.includes('sitaram') ||
    blob.includes('bhogapuram') ||
    /\bvtz\b/.test(blob)
  ) {
    return true;
  }
  const looksLikeAirport = loc.type === 'airport' || blob.includes('airport');
  if (!looksLikeAirport) return false;
  return blob.includes('vizag') || blob.includes('visakhapatnam');
}

function isAirportTransferEnd(loc: Location): boolean {
  if (isVizagAirportLocation(loc)) return true;
  if (isLocationInVizag(loc)) return true;
  if (AIRPORT_CATCHMENT_NAME_RE.test(locationBlob(loc))) return true;
  if (
    hasReliableCoords(loc) &&
    getDistanceBetween(loc.lat, loc.lng, BHOGAPURAM_AIRPORT.lat, BHOGAPURAM_AIRPORT.lng) <=
      BHOGAPURAM_CATCHMENT_KM
  ) {
    return true;
  }
  return false;
}

/**
 * One stable tab for a From/To pair. Does not depend on the tab already selected,
 * so Outstation and Airport cannot flip each other.
 * City hops and airport trips inside the catchment use Airport. Anything farther is Outstation.
 */
export function inferOutstationOrAirport(
  pickup: Location | null,
  drop: Location | null,
): 'airport' | 'outstation' | null {
  if (!pickup || !drop) return null;

  const pickupIsAirport = isVizagAirportLocation(pickup);
  const dropIsAirport = isVizagAirportLocation(drop);
  if (pickupIsAirport || dropIsAirport) {
    const otherEnd = pickupIsAirport ? drop : pickup;
    return isAirportTransferEnd(otherEnd) ? 'airport' : 'outstation';
  }

  if (hasReliableCoords(pickup) && hasReliableCoords(drop)) {
    const km = getDistanceBetween(pickup.lat, pickup.lng, drop.lat, drop.lng);
    return km <= VIZAG_RADIUS_KM ? 'airport' : 'outstation';
  }

  const pickupInVizag = isLocationInVizag(pickup);
  const dropInVizag = isLocationInVizag(drop);
  if (pickupInVizag && dropInVizag) return 'airport';
  if (!pickupInVizag || !dropInVizag) return 'outstation';
  return null;
}

export function isLocationInVizag(loc: Location | null, maxKm = VIZAG_RADIUS_KM): boolean {
  if (!loc) return false;
  if (typeof loc.isInVizag === 'boolean') return loc.isInVizag;
  if (typeof loc.lat === 'number' && typeof loc.lng === 'number' && !isNaN(loc.lat) && !isNaN(loc.lng)) {
    if (isWithinVizagRange(loc.lat, loc.lng, maxKm)) return true;
  }
  const str = [loc.name, loc.address, loc.city].filter(Boolean).join(' ').toLowerCase();
  return VIZAG_NAMES.some((name) => str.includes(name.toLowerCase()));
}

/**
 * Get helper text for pickup/drop based on trip type - matches web getSubtitleText
 */
export function getLocationHelperText(
  isPickup: boolean,
  tripType: string
): string {
  const isAirport = tripType === 'airport';
  const isTour = tripType === 'tour';

  if (isPickup && isTour) {
    return 'Please select a location within 35km of Visakhapatnam';
  }
  if (isPickup) {
    return 'Please select a location within 35km of Visakhapatnam';
  }
  if (isAirport) {
    return 'Please select a location within 35km of Visakhapatnam';
  }
  return '';
}

export { VIZAG_RADIUS_KM, TOUR_PICKUP_RADIUS_KM };
