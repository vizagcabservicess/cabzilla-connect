import { searchLocations, vizagLocations } from '@/lib/locationData';
import type { Location } from '@/lib/locationData';
import type { TripMode, TripType } from '@/lib/tripTypes';
import { CITY_LOOKUP } from '@/lib/cityLookup';
import { AVAILABLE_TOUR_ROUTES, findTourRouteByKeywords, isKnownTourSlug } from '@/lib/availableTours';
import { getTourDisplayName } from '@/utils/tourUrlUtils';
import { scrollToBookingWidget } from '@/lib/bookingWidgetScroll';

export interface RoutePrefillPayload {
  pickupLocation: Location | null;
  dropLocation: Location | null;
  tripType: TripType;
  tripMode: TripMode;
  autoTriggerSearch?: boolean;
}

export type HeaderSearchAction =
  | { type: 'navigate'; path: string; label: string }
  | { type: 'prefill'; label: string; prefill: RoutePrefillPayload };

export interface HeaderSearchSuggestion {
  id: string;
  label: string;
  subtitle: string;
  action: HeaderSearchAction;
}

function locationFromCityName(cityName: string): Location {
  const data = CITY_LOOKUP[cityName];
  if (data) {
    return {
      id: `city_${cityName.toLowerCase().replace(/\s+/g, '_')}`,
      name: cityName,
      city: data.city,
      state: data.state,
      lat: data.lat,
      lng: data.lng,
      type: 'landmark',
      popularityScore: 90,
      address: `${cityName}, ${data.state}`,
    };
  }

  return {
    id: `search_${cityName.toLowerCase().replace(/\s+/g, '_')}`,
    name: cityName,
    city: cityName,
    state: 'Andhra Pradesh',
    lat: 0,
    lng: 0,
    type: 'other',
    popularityScore: 50,
    address: cityName,
  };
}

const DEFAULT_VIZAG_PICKUP: Location = locationFromCityName('Visakhapatnam');

const PAGE_ROUTES: { keywords: string[]; path: string; label: string }[] = [
  { keywords: ['carpool', 'carpooling', 'pooling', 'ride together'], path: '/shared-carpooling', label: 'Shared Carpooling' },
  { keywords: ['urbania'], path: '/vehicle/urbania', label: 'Urbania Rental' },
  { keywords: ['tempo traveller', 'tempo', 'mini bus'], path: '/tempo-traveller-rental-vizag', label: 'Tempo Traveller Rental' },
  { keywords: ['hire driver', 'driver hire'], path: '/hire-driver', label: 'Hire Driver' },
  { keywords: ['offer', 'offers', 'coupon', 'coupons', 'deal', 'deals'], path: '/offers', label: 'Offers' },
  { keywords: ['group tour', 'group tours'], path: '/group-tours', label: 'Group Tours' },
  { keywords: ['fleet', 'vehicles', 'cars'], path: '/fleet', label: 'Our Fleet' },
];

function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ');
}

function matchesKeywords(query: string, keywords: string[]): boolean {
  const lower = query.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

function findCityMatch(query: string): string | null {
  const lower = query.toLowerCase();
  const cityNames = Object.keys(CITY_LOOKUP);

  const exact = cityNames.find((name) => name.toLowerCase() === lower);
  if (exact) return exact;

  const contains = cityNames.find(
    (name) => name.toLowerCase().includes(lower) || lower.includes(name.toLowerCase()),
  );
  if (contains) return contains;

  const wordMatch = cityNames.find((name) => {
    const nameWords = name.toLowerCase().split(/\s+/);
    const queryWords = lower.split(/\s+/);
    return queryWords.every((word) => nameWords.some((part) => part.startsWith(word) || word.startsWith(part)));
  });
  return wordMatch ?? null;
}

function buildOutstationPrefill(dropName: string, autoTriggerSearch = true): HeaderSearchAction {
  return {
    type: 'prefill',
    label: `Cab to ${dropName}`,
    prefill: {
      pickupLocation: { ...DEFAULT_VIZAG_PICKUP },
      dropLocation: locationFromCityName(dropName),
      tripType: 'outstation',
      tripMode: 'one-way',
      autoTriggerSearch,
    },
  };
}

function buildLocalPrefill(pickup: Location): HeaderSearchAction {
  return {
    type: 'prefill',
    label: `Local cab in ${pickup.name}`,
    prefill: {
      pickupLocation: pickup,
      dropLocation: null,
      tripType: 'local',
      tripMode: 'one-way',
      autoTriggerSearch: false,
    },
  };
}

function buildAirportPrefill(pickup: Location, drop: Location | null): HeaderSearchAction {
  return {
    type: 'prefill',
    label: 'Airport transfer',
    prefill: {
      pickupLocation: pickup,
      dropLocation: drop,
      tripType: 'airport',
      tripMode: 'one-way',
      autoTriggerSearch: Boolean(pickup && drop),
    },
  };
}

export function resolveHeaderSearch(rawQuery: string): HeaderSearchAction | null {
  const query = normalizeQuery(rawQuery);
  if (query.length < 2) return null;

  const lower = query.toLowerCase();

  if (matchesKeywords(lower, ['airport', 'vtz', 'flight'])) {
    const airport =
      vizagLocations.find((loc) => loc.id === 'vizag_airport') ?? DEFAULT_VIZAG_PICKUP;
    const toAirport = lower.includes('to airport') || lower.includes('pickup to airport');
    const fromAirport = lower.includes('from airport') || lower.includes('airport pickup');
    if (fromAirport) {
      return buildAirportPrefill(airport, null);
    }
    if (toAirport) {
      return buildAirportPrefill({ ...DEFAULT_VIZAG_PICKUP }, airport);
    }
    return buildAirportPrefill({ ...DEFAULT_VIZAG_PICKUP }, airport);
  }

  if (matchesKeywords(lower, ['local', 'hourly', 'city cab', 'vizag cab'])) {
    return buildLocalPrefill({ ...DEFAULT_VIZAG_PICKUP });
  }

  if (matchesKeywords(lower, ['outstation', 'intercity', 'one way', 'round trip'])) {
    return {
      type: 'prefill',
      label: 'Outstation booking',
      prefill: {
        pickupLocation: { ...DEFAULT_VIZAG_PICKUP },
        dropLocation: null,
        tripType: 'outstation',
        tripMode: 'one-way',
        autoTriggerSearch: false,
      },
    };
  }

  if (lower.includes('tour') || lower.includes('package')) {
    const tour = findTourRouteByKeywords(lower);
    if (tour) {
      return { type: 'navigate', path: `/tours/${tour.slug}`, label: tour.label };
    }
    return { type: 'navigate', path: '/tours', label: 'Tour packages' };
  }

  const tourHint = findTourRouteByKeywords(lower);
  if (tourHint) {
    return { type: 'navigate', path: `/tours/${tourHint.slug}`, label: tourHint.label };
  }

  for (const page of PAGE_ROUTES) {
    if (matchesKeywords(lower, page.keywords)) {
      return { type: 'navigate', path: page.path, label: page.label };
    }
  }

  const cityMatch = findCityMatch(query);
  if (cityMatch) {
    if (cityMatch === 'Visakhapatnam') {
      return buildLocalPrefill(locationFromCityName(cityMatch));
    }
    return buildOutstationPrefill(cityMatch);
  }

  const pickupMatches = searchLocations(query, true);
  if (pickupMatches.length === 1 && pickupMatches[0].city.toLowerCase().includes('visakhapatnam')) {
    return buildLocalPrefill(pickupMatches[0]);
  }

  const dropMatches = searchLocations(query, false);
  if (dropMatches.length >= 1) {
    return buildOutstationPrefill(dropMatches[0].name);
  }

  if (pickupMatches.length >= 1) {
    return buildLocalPrefill(pickupMatches[0]);
  }

  // Unknown query — let the header UI show an empty-state widget
  return null;
}

export function getHeaderSearchSuggestions(rawQuery: string, limit = 6): HeaderSearchSuggestion[] {
  const query = normalizeQuery(rawQuery);
  if (query.length < 2) return [];

  const suggestions: HeaderSearchSuggestion[] = [];
  const seen = new Set<string>();

  const add = (suggestion: HeaderSearchSuggestion) => {
    if (seen.has(suggestion.id)) return;
    seen.add(suggestion.id);
    suggestions.push(suggestion);
  };

  const cityMatch = findCityMatch(query);
  if (cityMatch && cityMatch !== 'Visakhapatnam') {
    const action = buildOutstationPrefill(cityMatch, true);
    add({
      id: `city-${cityMatch}`,
      label: `Cab to ${cityMatch}`,
      subtitle: 'Outstation · from Visakhapatnam',
      action,
    });
  }

  for (const tour of AVAILABLE_TOUR_ROUTES) {
    if (matchesKeywords(query, tour.keywords)) {
      add({
        id: `tour-${tour.slug}`,
        label: tour.label,
        subtitle: 'Tour package',
        action: { type: 'navigate', path: `/tours/${tour.slug}`, label: tour.label },
      });
    }
  }

  searchLocations(query, false)
    .slice(0, 3)
    .forEach((loc) => {
      add({
        id: `drop-${loc.id}`,
        label: `Cab to ${loc.name}`,
        subtitle: 'Outstation · from Visakhapatnam',
        action: buildOutstationPrefill(loc.name, true),
      });
    });

  searchLocations(query, true)
    .slice(0, 2)
    .forEach((loc) => {
      add({
        id: `pickup-${loc.id}`,
        label: loc.name,
        subtitle: 'Local pickup in Vizag',
        action: buildLocalPrefill(loc),
      });
    });

  for (const page of PAGE_ROUTES) {
    if (matchesKeywords(query, page.keywords)) {
      add({
        id: `page-${page.path}`,
        label: page.label,
        subtitle: 'Service page',
        action: { type: 'navigate', path: page.path, label: page.label },
      });
    }
  }

  if (matchesKeywords(query, ['airport', 'vtz'])) {
    add({
      id: 'airport-transfer',
      label: 'Airport transfer',
      subtitle: 'Visakhapatnam International Airport',
      action: resolveHeaderSearch('airport transfer')!,
    });
  }

  return suggestions.slice(0, limit);
}

export function applyHeaderSearchAction(
  action: HeaderSearchAction,
  navigate: (path: string, options?: { state?: unknown; replace?: boolean }) => void,
): void {
  if (action.type === 'navigate') {
    const tourMatch = action.path.match(/^\/tours\/([^/]+)$/);
    if (tourMatch?.[1] && !isKnownTourSlug(tourMatch[1])) {
      navigate('/tours', {
        state: { tourNotFound: getTourDisplayName(tourMatch[1]) },
      });
      return;
    }

    navigate(action.path);
    return;
  }

  const payload = {
    ...action.prefill,
    pickupLocation: action.prefill.pickupLocation,
    dropLocation: action.prefill.dropLocation,
  };

  sessionStorage.setItem('routePrefillData', JSON.stringify(payload));
  sessionStorage.setItem('tripType', action.prefill.tripType);

  const dispatchPrefill = () => {
    window.dispatchEvent(new CustomEvent('routePrefill', { detail: payload }));
    window.requestAnimationFrame(() => {
      scrollToBookingWidget({ smooth: true });
    });
  };

  if (window.location.pathname !== '/') {
    navigate('/');
    window.setTimeout(dispatchPrefill, 350);
    return;
  }

  dispatchPrefill();
}
