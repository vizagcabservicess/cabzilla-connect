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
