import type { Location } from '@/lib/locationData';
import { getVizagAirportLocations, resolveCanonicalVizagAirport } from '@/lib/locationData';
import { isLocationInVizag } from '@/lib/locationUtils';
import { isVizagAirportLocation } from '@/lib/inferTripService';
import { locationFromPlaceName } from '@/lib/vthAiCheckoutPrefill';
import { scrollToBookingWidget } from '@/lib/bookingWidgetScroll';
import type { RoutePrefillPayload } from '@/lib/headerSearchResolver';
import type { TripMode, TripType } from '@/lib/tripTypes';
import type { OfferCampaignPublic } from '@/types/offerCampaign';
import { isOfferCampaignCategory, normalizeOfferTravelTime } from '@/types/offerCampaign';
import { saveHomePendingOffer } from '@/components/offers/OfferCampaignPopup';

function readStoredLocation(key: string): Location | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Location;
    if (!parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

function hasUsableCoords(lat?: number | null, lng?: number | null): boolean {
  if (lat == null || lng == null) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return !(lat === 0 && lng === 0);
}

function isGenericVizagCityLabel(name?: string | null): boolean {
  const n = (name || '').trim().toLowerCase();
  if (!n) return false;
  return /^(visakhapatnam|vizag|waltair)(\s*,.*)?$/.test(n);
}

function locationHasName(location: Location | null | undefined): location is Location {
  return Boolean(location?.name?.trim());
}

function campaignPlaceToLocation(
  name: string | null | undefined,
  lat: number | null | undefined,
  lng: number | null | undefined,
  id: string
): Location | null {
  const trimmed = (name || '').trim();
  if (!trimmed && !hasUsableCoords(lat, lng)) return null;

  const fromName = trimmed
    ? locationFromPlaceName(trimmed, id)
    : {
        id,
        name: 'Selected location',
        address: '',
        city: 'Visakhapatnam',
        state: 'Andhra Pradesh',
        lat: lat ?? 0,
        lng: lng ?? 0,
        type: 'other' as const,
        popularityScore: 50,
      };

  if (hasUsableCoords(lat, lng)) {
    fromName.lat = lat as number;
    fromName.lng = lng as number;
  }

  const resolved = resolveCanonicalVizagAirport(fromName, trimmed);
  if (isVizagAirportLocation(resolved)) {
    const airports = getVizagAirportLocations();
    const byId = airports.find((airport) => airport.id === resolved.id);
    return byId ? { ...byId } : resolved;
  }
  return resolved;
}

function tripFromCategory(category: string): {
  tripType: TripType;
  tripMode: TripMode;
} {
  if (!isOfferCampaignCategory(category)) {
    return { tripType: 'outstation', tripMode: 'one-way' };
  }
  switch (category) {
    case 'airport':
      return { tripType: 'airport', tripMode: 'one-way' };
    case 'local':
      return { tripType: 'local', tripMode: 'one-way' };
    case 'tour':
      return { tripType: 'tour', tripMode: 'one-way' };
    case 'outstation_round_trip':
      return { tripType: 'outstation', tripMode: 'round-trip' };
    case 'outstation_one_way':
    case 'outstation':
      return { tripType: 'outstation', tripMode: 'one-way' };
    default: {
      const _exhaustive: never = category;
      return _exhaustive;
    }
  }
}

function parseYmd(raw?: string | null): { y: number; m: number; d: number } | null {
  const m = (raw || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/** Offer travel date + earliest pickup time, never earlier than now + 1 hour. */
export function pickupDateFromOfferCampaign(campaign: OfferCampaignPublic): Date {
  const min = new Date(Date.now() + 60 * 60 * 1000);
  const ymd = parseYmd(campaign.travel_date_from || campaign.travel_date_to);
  const time = normalizeOfferTravelTime(campaign.travel_time_from);
  const next = new Date();

  if (ymd) {
    next.setFullYear(ymd.y, ymd.m - 1, ymd.d);
  }

  if (time) {
    next.setHours(Number(time.slice(0, 2)), Number(time.slice(3, 5)), 0, 0);
  } else if (ymd) {
    next.setHours(8, 0, 0, 0);
  } else {
    return min;
  }

  return next.getTime() < min.getTime() ? min : next;
}

function keepCityPickup(existing: Location | null): Location | null {
  if (!locationHasName(existing)) return null;
  if (isVizagAirportLocation(existing)) return null;
  if (!isLocationInVizag(existing)) return null;
  return existing;
}

function locationsForOffer(
  campaign: OfferCampaignPublic,
  existingPickup: Location | null,
  existingDrop: Location | null
): {
  pickup: Location | null;
  drop: Location | null;
  airportDirection?: 'From Airport' | 'To Airport';
} {
  const campPickup = campaignPlaceToLocation(
    campaign.pickup_location,
    campaign.pickup_lat,
    campaign.pickup_lng,
    'offer-pickup'
  );
  const campDrop = campaignPlaceToLocation(
    campaign.drop_location,
    campaign.drop_lat,
    campaign.drop_lng,
    'offer-drop'
  );

  const pickupAirport = Boolean(campPickup && isVizagAirportLocation(campPickup));
  const dropAirport = Boolean(campDrop && isVizagAirportLocation(campDrop));
  const keptCityPickup = keepCityPickup(existingPickup);
  const keptCityDrop = keepCityPickup(existingDrop);

  if (campaign.category === 'airport') {
    if (dropAirport) {
      const campaignPickupIsGeneric =
        pickupAirport ||
        isGenericVizagCityLabel(campaign.pickup_location) ||
        (campPickup != null && !isLocationInVizag(campPickup));
      return {
        pickup: keptCityPickup ?? (campaignPickupIsGeneric ? null : campPickup),
        drop: campDrop,
        airportDirection: 'To Airport',
      };
    }
    if (pickupAirport) {
      const campaignDropIsGeneric = isGenericVizagCityLabel(campaign.drop_location);
      return {
        pickup: campPickup,
        drop: keptCityDrop ?? (campaignDropIsGeneric ? null : campDrop),
        airportDirection: 'From Airport',
      };
    }
  }

  return {
    pickup: keptCityPickup ?? (isGenericVizagCityLabel(campaign.pickup_location) ? null : campPickup) ?? existingPickup,
    drop: campDrop ?? existingDrop,
  };
}

/**
 * Save the coupon, then open the home booking widget on the matching tab
 * with offer date/time (and airport drop) prefilled. Drop is focused so the
 * guest can keep the offer route or edit it.
 */
export function applyHomeOfferBookingPrefill(
  campaign: OfferCampaignPublic,
  navigate: (path: string) => void
): void {
  saveHomePendingOffer(campaign);

  const { tripType, tripMode } = tripFromCategory(campaign.category);
  const pickupDate = pickupDateFromOfferCampaign(campaign);
  const { pickup, drop, airportDirection } = locationsForOffer(
    campaign,
    readStoredLocation('pickupLocation'),
    readStoredLocation('dropLocation')
  );

  const payload: RoutePrefillPayload = {
    pickupLocation: pickup,
    dropLocation: drop,
    tripType,
    tripMode,
    pickupDate: pickupDate.toISOString(),
    autoTriggerSearch: false,
    focusField: 'drop',
    skipAirportAutoFill: true,
    airportDirection,
  };

  try {
    sessionStorage.setItem('routePrefillData', JSON.stringify(payload));
    sessionStorage.setItem('tripType', tripType);
    sessionStorage.setItem('tripMode', tripMode);
    sessionStorage.setItem('pickupDate', JSON.stringify(pickupDate));
    if (pickup) {
      sessionStorage.setItem('pickupLocation', JSON.stringify(pickup));
    } else {
      sessionStorage.removeItem('pickupLocation');
    }
    if (drop) {
      sessionStorage.setItem('dropLocation', JSON.stringify(drop));
    } else {
      sessionStorage.removeItem('dropLocation');
    }
    sessionStorage.setItem('userClearedDropLocation', 'true');
  } catch {
    /* ignore quota / private mode */
  }

  const dispatchPrefill = () => {
    window.dispatchEvent(new CustomEvent('routePrefill', { detail: payload }));
    window.requestAnimationFrame(() => {
      scrollToBookingWidget({ smooth: true });
    });
  };

  const onHome =
    typeof window !== 'undefined' &&
    window.location.pathname === '/' &&
    !new URLSearchParams(window.location.search).get('search');

  if (!onHome) {
    navigate('/');
    window.setTimeout(dispatchPrefill, 350);
    return;
  }

  dispatchPrefill();
}
