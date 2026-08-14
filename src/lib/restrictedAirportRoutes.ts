import { isVizagAirportLocation } from '@/lib/inferTripService';
import type { Location } from '@/lib/locationData';

/** Set to false to lift this temporary restriction. */
export const RESTRICTED_AIRPORT_ROUTES_ENABLED = false;

export const RESTRICTED_AIRPORT_ROUTE_MESSAGE =
  "We're currently unable to provide airport transfers to this destination temporarily. Please contact us at +91 99663 63662 for alternate arrangements.";

export const RESTRICTED_AIRPORT_ROUTE_PHONE_DISPLAY = '+91 99663 63662';
export const RESTRICTED_AIRPORT_ROUTE_PHONE_TEL = '+919966363662';

export const RESTRICTED_DROP_STATES = ['odisha', 'orissa'];

export const RESTRICTED_DROP_DISTRICT_KEYWORDS = [
  'vizianagaram',
  'vijayanagaram',
  'vizianagarm',
  'srikakulam',
];

export const RESTRICTED_DROP_TOWNS = [
  // Srikakulam district
  'palasa',
  'sompeta',
  'ichchapuram',
  'palakonda',
  'amadalavalasa',
  'razam',
  'rajam',
  'narasannapeta',
  'arasavalli',
  'srimukhalingam',
  // Vizianagaram district
  'bobbili',
  'parvathipuram',
];

export type RestrictedRouteLocation = Location | string | null | undefined;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function blobContainsTerm(blob: string, term: string): boolean {
  const escaped = escapeRegExp(term.toLowerCase());
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`).test(blob);
}

function locationTextBlob(location: RestrictedRouteLocation): string {
  if (!location) return '';
  if (typeof location === 'string') return location.toLowerCase();
  return [
    location.id,
    location.name,
    location.address,
    location.city,
    location.state,
    String(location.type || ''),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function asLocation(location: RestrictedRouteLocation): Location | null {
  if (!location) return null;
  if (typeof location !== 'string') return location;
  const text = location.trim();
  if (!text) return null;
  return {
    id: '',
    name: text,
    address: text,
    city: '',
    state: '',
    lat: 0,
    lng: 0,
    type: text.toLowerCase().includes('airport') ? 'airport' : 'other',
    popularityScore: 0,
  };
}

export function isRestrictedAirportPickup(location: RestrictedRouteLocation): boolean {
  const loc = asLocation(location);
  if (!loc) return false;
  return isVizagAirportLocation(loc);
}

export function isRestrictedAirportDrop(location: RestrictedRouteLocation): boolean {
  if (!RESTRICTED_AIRPORT_ROUTES_ENABLED) return false;
  if (!location) return false;
  const blob = locationTextBlob(location);
  if (!blob.trim()) return false;

  const state =
    typeof location === 'string' ? '' : (location.state || '').toLowerCase().trim();
  if (state && RESTRICTED_DROP_STATES.some((s) => state === s || state.includes(s))) {
    return true;
  }

  if (RESTRICTED_DROP_STATES.some((s) => blobContainsTerm(blob, s))) {
    return true;
  }

  if (RESTRICTED_DROP_DISTRICT_KEYWORDS.some((term) => blobContainsTerm(blob, term))) {
    return true;
  }

  return RESTRICTED_DROP_TOWNS.some((term) => blobContainsTerm(blob, term));
}

export function getRestrictedAirportRouteBlock(
  pickup: RestrictedRouteLocation,
  drop: RestrictedRouteLocation,
  tripType?: string | null
): string | null {
  if (!RESTRICTED_AIRPORT_ROUTES_ENABLED) return null;
  if (tripType && tripType !== 'airport') return null;
  if (!isRestrictedAirportPickup(pickup)) return null;
  if (!isRestrictedAirportDrop(drop)) return null;
  return RESTRICTED_AIRPORT_ROUTE_MESSAGE;
}
