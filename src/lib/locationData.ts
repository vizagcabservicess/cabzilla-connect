import { CITY_LOOKUP } from './cityLookup';

export interface Location {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number; 
  type: 'airport' | 'train_station' | 'bus_station' | 'hotel' | 'landmark' | 'other';
  popularityScore: number;
  isPickupLocation?: boolean;
  isDropLocation?: boolean;
  isInVizag?: boolean;
  address: string;
}

export const vizagLocations: Location[] = [
  {
    id: 'vizag_rtc',
    name: 'Vizag RTC Complex',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    type: 'bus_station',
    popularityScore: 95,
    isPickupLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Vizag RTC Complex, Visakhapatnam'
  },
  {
    id: 'vizag_railway',
    name: 'Visakhapatnam Railway Station',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    type: 'train_station',
    popularityScore: 98,
    isPickupLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Visakhapatnam Railway Station, Visakhapatnam'
  },
  {
    id: 'vizag_airport',
    name: 'Alluri Sitarama Raju International Airport',
    city: 'Bhogapuram',
    state: 'Andhra Pradesh',
    type: 'airport',
    popularityScore: 99,
    isPickupLocation: true,
    lat: 17.97611,
    lng: 83.50389,
    address: 'Alluri Sitarama Raju International Airport, Bhogapuram, Vizianagaram District, Andhra Pradesh'
  },
  {
    id: 'vizag_city_airport',
    name: 'Vizag City Airport (NAD)',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    type: 'airport',
    popularityScore: 98,
    isPickupLocation: true,
    lat: 17.72111,
    lng: 83.22444,
    address: 'Vizag City Airport (NAD), Visakhapatnam, Andhra Pradesh'
  },
  {
    id: 'rk_beach',
    name: 'RK Beach',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 92,
    isPickupLocation: true,
    lat: 17.7175,
    lng: 83.3162,
    address: 'RK Beach, Visakhapatnam'
  },
  {
    id: 'jagadamba_junction',
    name: 'Jagadamba Junction',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 90,
    isPickupLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Jagadamba Junction, Visakhapatnam'
  },
  {
    id: 'mvp_colony',
    name: 'MVP Colony',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 88,
    isPickupLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'MVP Colony, Visakhapatnam'
  },
  {
    id: 'gajuwaka',
    name: 'Gajuwaka',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 85,
    isPickupLocation: true,
    lat: 17.7337,
    lng: 83.1385,
    address: 'Gajuwaka, Visakhapatnam'
  },
  {
    id: 'nad_junction',
    name: 'NAD Junction',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 83,
    isPickupLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'NAD Junction, Visakhapatnam'
  }
];

export const apDestinations: Location[] = [
  {
    id: 'araku_valley',
    name: 'Araku Valley',
    city: 'Araku Valley',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 95,
    isDropLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Araku Valley, Andhra Pradesh'
  },
  {
    id: 'srikakulam',
    name: 'Srikakulam',
    city: 'Srikakulam',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 88,
    isDropLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Srikakulam, Andhra Pradesh'
  },
  {
    id: 'rajahmundry',
    name: 'Rajahmundry',
    city: 'Rajahmundry',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 90,
    isDropLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Rajahmundry, Andhra Pradesh'
  },
  {
    id: 'vijayawada',
    name: 'Vijayawada',
    city: 'Vijayawada',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 92,
    isDropLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Vijayawada, Andhra Pradesh'
  },
  {
    id: 'tirupati',
    name: 'Tirupati',
    city: 'Tirupati',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 94,
    isDropLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Tirupati, Andhra Pradesh'
  },
  {
    id: 'kakinada',
    name: 'Kakinada',
    city: 'Kakinada',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 87,
    isDropLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Kakinada, Andhra Pradesh'
  },
  {
    id: 'guntur',
    name: 'Guntur',
    city: 'Guntur',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 89,
    isDropLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Guntur, Andhra Pradesh'
  },
  {
    id: 'ongole',
    name: 'Ongole',
    city: 'Ongole',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 83,
    isDropLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Ongole, Andhra Pradesh'
  },
  {
    id: 'kadapa',
    name: 'Kadapa',
    city: 'Kadapa',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 82,
    isDropLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Kadapa, Andhra Pradesh'
  },
  {
    id: 'nellore',
    name: 'Nellore',
    city: 'Nellore',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 84,
    isDropLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Nellore, Andhra Pradesh'
  }
];

// Replace Vizag placeholder coords on outstation destinations with real CITY_LOOKUP values
for (const loc of apDestinations) {
  const hit =
    CITY_LOOKUP[loc.name] ||
    CITY_LOOKUP[loc.city] ||
    Object.entries(CITY_LOOKUP).find(
      ([k]) => k.toLowerCase() === loc.name.toLowerCase() || k.toLowerCase() === loc.city.toLowerCase(),
    )?.[1];
  if (hit) {
    loc.lat = hit.lat;
    loc.lng = hit.lng;
    loc.state = hit.state || loc.state;
  }
}

export const popularLocations: Location[] = [
  ...vizagLocations,
  ...apDestinations
];

export function getVizagAirportLocations(): Location[] {
  return vizagLocations.filter((loc) => loc.type === 'airport');
}

function coordsKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  if (
    !Number.isFinite(aLat) ||
    !Number.isFinite(aLng) ||
    !Number.isFinite(bLat) ||
    !Number.isFinite(bLng)
  ) {
    return Number.POSITIVE_INFINITY;
  }
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sinLng * sinLng;
  return earthKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function isSameKnownAirport(location: Location, airport: Location): boolean {
  return (
    location.id === airport.id &&
    location.name === airport.name &&
    Math.abs(location.lat - airport.lat) < 0.0001 &&
    Math.abs(location.lng - airport.lng) < 0.0001
  );
}

function normalizeAirportText(text: string): string {
  return (text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function textHasCityAirportCampus(text: string): boolean {
  const blob = normalizeAirportText(text);
  if (!blob) return false;
  return (
    /\bnad\b/.test(blob) ||
    blob.includes('gajuwaka') ||
    blob.includes('ins dega') ||
    blob.includes('city airport') ||
    blob.includes('vizag city airport') ||
    blob.includes('vizag_city_airport')
  );
}

function textHasBhogapuramAirport(text: string): boolean {
  const blob = normalizeAirportText(text);
  return blob.includes('bhogapuram') || blob.includes('alluri') || blob.includes('sitaram');
}

function textHasGenericVizagAirport(text: string): boolean {
  const blob = normalizeAirportText(text);
  if (!blob) return false;
  const hasAirport = blob.includes('airport') || /\bvtz\b/.test(blob);
  if (!hasAirport) return false;
  return blob.includes('vizag') || blob.includes('visakhapatnam') || /\bvtz\b/.test(blob);
}

function pickKnownAirport(location: Location, airport: Location | undefined): Location {
  if (!airport) return location;
  return isSameKnownAirport(location, airport) ? location : { ...airport };
}

/**
 * Snap a Google/airport pick to Bhogapuram (Alluri) or the city NAD airport.
 * Guests typing "Vizag Airport" / "Vizag International Airport" always mean Alluri,
 * even when Google still returns the old NAD campus address.
 */
export function resolveCanonicalVizagAirport(location: Location, typedQuery = ''): Location {
  const airports = getVizagAirportLocations();
  if (airports.length === 0) return location;

  const bhogapuram = airports.find((airport) => airport.id === 'vizag_airport');
  const cityAirport = airports.find((airport) => airport.id === 'vizag_city_airport');
  const typed = typedQuery.trim();
  const name = location.name || '';
  const intentText = `${typed} ${name}`.trim();

  // NAD / city campus only when the guest typed it or the place TITLE says so —
  // Google's old VTZ formatted address still contains "NAD" and must not win.
  if (textHasCityAirportCampus(typed) || textHasCityAirportCampus(name)) {
    return pickKnownAirport(location, cityAirport);
  }
  if (
    location.id === 'vizag_city_airport' &&
    !textHasGenericVizagAirport(typed) &&
    !textHasGenericVizagAirport(name)
  ) {
    return pickKnownAirport(location, cityAirport);
  }

  if (
    textHasBhogapuramAirport(intentText) ||
    textHasGenericVizagAirport(typed) ||
    textHasGenericVizagAirport(name)
  ) {
    return pickKnownAirport(location, bhogapuram);
  }

  const byId = airports.find((airport) => airport.id === location.id);
  if (byId) return pickKnownAirport(location, byId);

  const titleLooksLikeAirport =
    location.type === 'airport' ||
    normalizeAirportText(name).includes('airport') ||
    /\bvtz\b/.test(normalizeAirportText(name));
  // Nearby villages such as Pusapatirega sit next to Bhogapuram — do not snap them.
  if (!titleLooksLikeAirport) return location;

  let nearest = airports[0];
  let nearestKm = Number.POSITIVE_INFINITY;
  for (const airport of airports) {
    const km = coordsKm(location.lat, location.lng, airport.lat, airport.lng);
    if (km < nearestKm) {
      nearestKm = km;
      nearest = airport;
    }
  }
  if (nearestKm <= 8) {
    return pickKnownAirport(location, nearest);
  }

  return location;
}

// Map URL slugs to known locations (for prefill from query params)
const SLUG_TO_LOCATION_ID: Record<string, string> = {
  'visakhapatnam-vtz-international-airport': 'vizag_airport',
  'vizag-international-airport': 'vizag_airport',
  'vizag-city-airport': 'vizag_city_airport',
  'vizag_city_airport': 'vizag_city_airport',
  'vizag-airport': 'vizag_airport',
  'vizag_airport': 'vizag_airport',
  'bhogapuram-airport': 'vizag_airport',
  'alluri-sitarama-raju-international-airport': 'vizag_airport',
  'mvp-colony': 'mvp_colony',
  'mvp_colony': 'mvp_colony',
  'rk-beach': 'rk_beach',
  'vizag-rtc': 'vizag_rtc',
  'vizag-railway': 'vizag_railway',
  'vizag-railway-station': 'vizag_railway',
  'jagadamba-junction': 'jagadamba_junction',
  'gajuwaka': 'gajuwaka',
  'nad-junction': 'nad_junction',
};

// Default Vizag center coords when slug doesn't match
const DEFAULT_VIZAG_LAT = 17.7215;
const DEFAULT_VIZAG_LNG = 83.2248;

export function getLocationBySlug(slug: string): Partial<Location> & { lat: number; lng: number } {
  const normalizedSlug = slug.toLowerCase().trim().replace(/_/g, '-');
  const locationId = SLUG_TO_LOCATION_ID[normalizedSlug] || SLUG_TO_LOCATION_ID[slug];
  const loc = locationId
    ? vizagLocations.find(l => l.id === locationId) || apDestinations.find(l => l.id === locationId)
    : null;
  if (loc) {
    return { ...loc, lat: loc.lat, lng: loc.lng };
  }
  return {
    lat: DEFAULT_VIZAG_LAT,
    lng: DEFAULT_VIZAG_LNG,
    name: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
  };
}

// Helper function to check if a location is within Visakhapatnam
export const isVizagLocation = (location: Location): boolean => {
  if (!location) return false;
  
  return location.city.toLowerCase() === 'visakhapatnam' || 
         location.name.toLowerCase().includes('visakhapatnam') ||
         location.name.toLowerCase().includes('vizag') ||
         // Check against known Vizag area IDs
         vizagLocations.some(vizagLoc => vizagLoc.id === location.id);
};

// Check if both pickup and drop locations are within Visakhapatnam
export const areBothLocationsInVizag = (pickup: Location | null, drop: Location | null): boolean => {
  if (!pickup || !drop) return false;
  return isVizagLocation(pickup) && isVizagLocation(drop);
};

/** Queries that should resolve to Vizag airport (includes common misspellings). */
export const VIZAG_AIRPORT_QUERY_ALIASES = [
  'alluri',
  'alluru',
  'sitaram',
  'sitarama',
  'bhogapuram',
  'vtz',
  'vizag airport',
  'vizag international',
  'vizag international airport',
  'visakhapatnam airport',
  'visakhapatnam international',
  'alluri sitarama raju',
  'alluri sitaram raju',
  'airport',
];

export function locationMatchesSearchQuery(location: Location, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (
    location.name.toLowerCase().includes(q) ||
    location.city.toLowerCase().includes(q) ||
    location.address.toLowerCase().includes(q)
  ) {
    return true;
  }
  if (location.type !== 'airport') return false;
  if (location.id === 'vizag_city_airport') {
    return textHasCityAirportCampus(q);
  }
  return VIZAG_AIRPORT_QUERY_ALIASES.some(
    (alias) => q.includes(alias) || (alias.length >= 8 && alias.includes(q))
  );
}

export const searchLocations = (query: string, isPickup: boolean = false): Location[] => {
  if (!query || query.length < 2) {
    if (isPickup) {
      return vizagLocations.sort((a, b) => b.popularityScore - a.popularityScore);
    }
    if (!isPickup) {
      return apDestinations.sort((a, b) => b.popularityScore - a.popularityScore);
    }
    return [];
  }
  
  let filteredLocations = popularLocations.filter((location) =>
    locationMatchesSearchQuery(location, query)
  );
  
  if (isPickup) {
    filteredLocations = filteredLocations.filter(loc => 
      isVizagLocation(loc) && loc.isPickupLocation !== false
    );
  } else {
    filteredLocations = filteredLocations.filter(loc => 
      loc.isDropLocation !== false
    );
  }
  
  return filteredLocations
    .sort((a, b) => b.popularityScore - a.popularityScore)
    .slice(0, 10);
};

// Updated distance calculation with consistent values
export const getDistanceBetweenLocations = (fromId: string, toId: string): number => {
  const distances: Record<string, Record<string, number>> = {
    'vizag_airport': {
      'araku_valley': 115,
      'srikakulam': 125,
      'rajahmundry': 190,
      'vijayawada': 350,
      'tirupati': 790,
      'kakinada': 170,
      'guntur': 370,
      'ongole': 460,
      'kadapa': 660,
      'nellore': 590
    },
    'vizag_city_airport': {
      'araku_valley': 112,
      'srikakulam': 100,
      'rajahmundry': 185,
      'vijayawada': 345,
      'tirupati': 785,
      'kakinada': 165,
      'guntur': 365,
      'ongole': 455,
      'kadapa': 655,
      'nellore': 585
    },
    'vizag_railway': {
      'araku_valley': 112,
      'srikakulam': 120,
      'rajahmundry': 185,
      'vijayawada': 345,
      'tirupati': 785,
      'kakinada': 165,
      'guntur': 365,
      'ongole': 455,
      'kadapa': 655,
      'nellore': 585
    },
    'vizag_rtc': {
      'araku_valley': 110,
      'srikakulam': 118,
      'rajahmundry': 183,
      'vijayawada': 343,
      'tirupati': 783,
      'kakinada': 163,
      'guntur': 363,
      'ongole': 453,
      'kadapa': 653,
      'nellore': 583
    }
  };
  
  if (distances[fromId] && distances[fromId][toId]) {
    return distances[fromId][toId];
  }
  
  if (fromId.includes('vizag') && toId.includes('vizag')) {
    return Math.floor(Math.random() * 20) + 5;
  }
  
  return Math.floor(Math.random() * 700) + 100;
};

// Calculate airport transfer fare based on distance and cab type
export const calculateAirportFare = (cabType: string, distance: number): number => {
  // Pricing tiers based on distance to/from airport
  if (cabType.toLowerCase() === 'sedan') {
    if (distance <= 15) return 840;
    if (distance <= 20) return 1000;
    if (distance <= 30) return 1200;
    if (distance <= 35) return 1500;
    return 1500 + (distance - 35) * 14; // Additional KM at ₹14/km
  } 
  else if (cabType.toLowerCase() === 'ertiga') {
    if (distance <= 15) return 1200;
    if (distance <= 20) return 1500;
    if (distance <= 30) return 1800;
    if (distance <= 35) return 2100;
    return 2100 + (distance - 35) * 18; // Additional KM at ₹18/km
  }
  else if (cabType.toLowerCase() === 'innova crysta') {
    if (distance <= 15) return 1500;
    if (distance <= 20) return 1800;
    if (distance <= 30) return 2100;
    if (distance <= 35) return 2500;
    return 2500 + (distance - 35) * 20; // Additional KM at ₹20/km
  }
  
  // Default fallback
  return distance * 20;
};

export const getEstimatedTravelTime = (distance: number): number => {
  const averageSpeed = 55;
  return Math.ceil((distance / averageSpeed) * 60);
};

export const formatTravelTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins} min`;
  } else if (mins === 0) {
    return `${hours} hr`;
  } else {
    return `${hours} hr ${mins} min`;
  }
};
