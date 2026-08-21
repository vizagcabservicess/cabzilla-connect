/** Offer / Campaign Management types */

export type OfferCampaignCategory =
  | 'airport'
  | 'local'
  | 'tour'
  | 'outstation_one_way'
  | 'outstation_round_trip'
  /** @deprecated Prefer outstation_one_way / outstation_round_trip */
  | 'outstation';

/** Categories selectable in admin + customer booking offers. */
export const OFFER_CAMPAIGN_CATEGORIES: OfferCampaignCategory[] = [
  'airport',
  'local',
  'tour',
  'outstation_one_way',
  'outstation_round_trip',
];

export type OfferCampaignType =
  | 'todays_offer'
  | 'weekend_offer'
  | 'festival_offer'
  | 'corporate_offer'
  | 'flash_sale'
  | 'happy_hour'
  | 'seasonal_offer'
  | 'custom';

export type OfferCampaignOfferType = 'flat' | 'percentage' | 'fixed_fare';
export type OfferCampaignPriority = 'high' | 'medium' | 'low';
export type OfferCampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'expired'
  | 'cancelled';
export type OfferAbsorbBy = 'company' | 'owner';
export type OfferVehicleStatus = 'available' | 'busy' | 'offline';

export interface OfferCampaignPricing {
  website_fare: number;
  offer_fare: number;
  savings: number;
}

export interface OfferCampaign {
  id: number;
  name: string;
  campaign_type: OfferCampaignType | string;
  category: OfferCampaignCategory;
  offer_type: OfferCampaignOfferType;
  offer_value: number;
  coupon_code: string;
  eligible_own_fleet: boolean;
  eligible_attached_fleet: boolean;
  absorb_own: OfferAbsorbBy;
  absorb_attached: OfferAbsorbBy;
  starts_at: string;
  ends_at: string;
  /** Eligible trip pickup dates (Y-m-d). Null = any travel date. */
  travel_date_from?: string | null;
  travel_date_to?: string | null;
  /** Earliest trip pickup clock time (HH:MM[:SS]). Null = any time. */
  travel_time_from?: string | null;
  /** Offer route — mainly airport / outstation. Null = not shown. */
  pickup_location?: string | null;
  drop_location?: string | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  drop_lat?: number | null;
  drop_lng?: number | null;
  max_redemptions: number | null;
  max_per_customer: number;
  popup_enabled: boolean;
  priority: OfferCampaignPriority;
  status: OfferCampaignStatus;
  redemption_count: number;
  participating_vehicles?: number;
  target_vehicle_ids?: string[];
  target_tour_ids?: string[];
  target_vehicle_count?: number;
  target_tour_count?: number;
  bookings?: number;
  revenue?: number;
  popup_view_count?: number;
  popup_close_count?: number;
  copy_count?: number;
  apply_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Customer-facing campaign (includes coupon + pricing). */
export interface OfferCampaignPublic {
  id: number;
  name: string;
  campaign_type: string;
  category: OfferCampaignCategory;
  offer_type: OfferCampaignOfferType;
  offer_value: number;
  coupon_code: string;
  starts_at: string;
  ends_at: string;
  travel_date_from?: string | null;
  travel_date_to?: string | null;
  travel_time_from?: string | null;
  pickup_location?: string | null;
  drop_location?: string | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  drop_lat?: number | null;
  drop_lng?: number | null;
  popup_enabled: boolean;
  priority: OfferCampaignPriority;
  status: OfferCampaignStatus;
  pricing?: OfferCampaignPricing | null;
}

/** Vendor/driver-facing — no coupon code; offer size shown for payout clarity. */
export interface OfferCampaignForParticipant {
  id: number;
  name: string;
  campaign_type: string;
  category: OfferCampaignCategory;
  offer_type?: OfferCampaignOfferType;
  offer_value?: number;
  starts_at: string;
  ends_at: string;
  seconds_left: number;
  priority: OfferCampaignPriority;
  status: OfferCampaignStatus;
  absorb_attached: OfferAbsorbBy;
  eligible_attached_fleet: boolean;
  eligible_own_fleet: boolean;
  participation: {
    id: number;
    status: string;
    vehicle_status: OfferVehicleStatus | string;
    joined_at?: string | null;
  } | null;
}

export interface OfferCampaignDashboard {
  totals: {
    active_campaigns: number;
    participating_vehicles: number;
    campaign_bookings: number;
    campaign_revenue: number;
    conversion_rate: number;
  };
  category_cards: Array<{
    category: OfferCampaignCategory;
    campaign: OfferCampaign | null;
  }>;
}

export interface OfferCampaignParticipant {
  id: number;
  campaign_id: number;
  fleet_type: 'own' | 'attached' | string;
  vehicle_id?: number | null;
  driver_id?: number | null;
  vendor_id?: number | null;
  vehicle_number?: string | null;
  vehicle_type?: string | null;
  participant_label?: string | null;
  participation_status: string;
  vehicle_status: string;
  joined_at?: string | null;
  removed_at?: string | null;
}

export interface CreateOfferCampaignInput {
  name: string;
  campaign_type: OfferCampaignType | string;
  category: OfferCampaignCategory;
  offer_type: OfferCampaignOfferType;
  offer_value: number;
  coupon_mode?: 'auto' | 'manual';
  coupon_code?: string;
  eligible_own_fleet: boolean;
  eligible_attached_fleet: boolean;
  absorb_own: OfferAbsorbBy;
  absorb_attached: OfferAbsorbBy;
  starts_at: string;
  ends_at: string;
  /** Trip pickup dates this offer applies to (Y-m-d). Blank = any date. */
  travel_date_from?: string | null;
  travel_date_to?: string | null;
  /** Earliest trip pickup time (HH:MM). Blank = any time. */
  travel_time_from?: string | null;
  pickup_location?: string | null;
  drop_location?: string | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  drop_lat?: number | null;
  drop_lng?: number | null;
  max_redemptions?: number | null;
  max_per_customer?: number;
  popup_enabled?: boolean;
  priority?: OfferCampaignPriority;
  publish?: boolean;
  /** Limit offer to these vehicle slugs/ids. Empty = all vehicles in category. */
  target_vehicle_ids?: string[];
  /** Limit offer to these tour ids. Empty = all tours in category. */
  target_tour_ids?: string[];
}

/** Fields accepted by admin updateCampaign (category & coupon are immutable). */
export interface UpdateOfferCampaignInput {
  campaign_id: number;
  name: string;
  campaign_type: OfferCampaignType | string;
  offer_type: OfferCampaignOfferType;
  offer_value: number;
  eligible_own_fleet: boolean;
  eligible_attached_fleet: boolean;
  absorb_own: OfferAbsorbBy;
  absorb_attached: OfferAbsorbBy;
  starts_at: string;
  ends_at: string;
  travel_date_from?: string | null;
  travel_date_to?: string | null;
  travel_time_from?: string | null;
  pickup_location?: string | null;
  drop_location?: string | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  drop_lat?: number | null;
  drop_lng?: number | null;
  max_redemptions?: number | null;
  max_per_customer?: number;
  popup_enabled?: boolean;
  priority?: OfferCampaignPriority;
  target_vehicle_ids?: string[];
  target_tour_ids?: string[];
}

export interface ApplyOfferCouponResult {
  ok: boolean;
  redemption_id: number;
  campaign: OfferCampaignPublic;
  pricing: OfferCampaignPricing;
  grace_window_minutes: number;
  applied_at: string;
}

export const OFFER_CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  todays_offer: "Today's Offer",
  weekend_offer: 'Weekend Offer',
  festival_offer: 'Festival Offer',
  corporate_offer: 'Corporate Offer',
  flash_sale: 'Flash Sale',
  happy_hour: 'Happy Hour',
  seasonal_offer: 'Seasonal Offer',
  custom: 'Custom Campaign',
};

export const OFFER_CATEGORY_LABELS: Record<string, string> = {
  airport: 'Airport',
  local: 'Local',
  tour: 'Tour',
  outstation_one_way: 'Outstation · One way',
  outstation_round_trip: 'Outstation · Round trip',
  outstation: 'Outstation',
};

/** Map booking trip type (+ mode) to a campaign category. */
export function resolveOfferCampaignCategory(
  tripType: string,
  tripMode?: string | null
): OfferCampaignCategory | null {
  switch (tripType) {
    case 'airport':
      return 'airport';
    case 'local':
      return 'local';
    case 'tour':
      return 'tour';
    case 'outstation':
      return tripMode === 'round-trip' ? 'outstation_round_trip' : 'outstation_one_way';
    default:
      return null;
  }
}

export function isOfferCampaignCategory(value: string): value is OfferCampaignCategory {
  return (
    value === 'airport' ||
    value === 'local' ||
    value === 'tour' ||
    value === 'outstation_one_way' ||
    value === 'outstation_round_trip' ||
    value === 'outstation'
  );
}

/** Format Y-m-d for display. */
export function formatOfferTravelDateRange(
  from?: string | null,
  to?: string | null
): string | null {
  if (!from && !to) return null;
  const fmt = (ymd: string) => {
    const d = new Date(ymd.includes('T') ? ymd : `${ymd}T12:00:00`);
    if (Number.isNaN(d.getTime())) return ymd;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };
  if (from && to) {
    if (from === to) return fmt(from);
    return `${fmt(from)} – ${fmt(to)}`;
  }
  if (from) return `from ${fmt(from)}`;
  return `until ${fmt(to!)}`;
}

/** Normalize clock time to HH:MM:SS, or null. Date-only strings have no time. */
export function normalizeOfferTravelTime(raw?: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s || /^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const m = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
}

/** Pickup clock time from a Date (local). Date-only Y-m-d strings return null. */
export function toOfferTravelTimeHm(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  if (typeof date === 'string') {
    const s = date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return normalizeOfferTravelTime(s);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  }
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

export function isOfferTravelTimeEligible(
  campaign: { travel_time_from?: string | null },
  tripHm: string | null,
  requireWhenSet = true
): boolean {
  const from = normalizeOfferTravelTime(campaign.travel_time_from);
  if (!from) return true;
  if (!tripHm) return !requireWhenSet;
  const trip = normalizeOfferTravelTime(tripHm);
  if (!trip) return !requireWhenSet;
  return trip >= from;
}

/** e.g. "from 8:00 AM" */
export function formatOfferTravelTimeFrom(raw?: string | null): string | null {
  const t = normalizeOfferTravelTime(raw);
  if (!t) return null;
  const h = Number(t.slice(0, 2));
  const min = Number(t.slice(3, 5));
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `from ${h12}:${String(min).padStart(2, '0')} ${ampm}`;
}

/** e.g. "trips on 22 Aug 2026, pickups from 8:00 AM" */
export function formatOfferCouponWorksOn(campaign: {
  travel_date_from?: string | null;
  travel_date_to?: string | null;
  travel_time_from?: string | null;
}): string | null {
  const parts: string[] = [];
  const range = formatOfferTravelDateRange(
    campaign.travel_date_from,
    campaign.travel_date_to
  );
  if (range) parts.push(`trips on ${range}`);
  const time = formatOfferTravelTimeFrom(campaign.travel_time_from);
  if (time) parts.push(`pickups ${time}`);
  return parts.length > 0 ? parts.join(', ') : null;
}

export function offerCouponNotValidForTripMessage(campaign: {
  travel_date_from?: string | null;
  travel_date_to?: string | null;
  travel_time_from?: string | null;
}): string {
  const when = formatOfferCouponWorksOn(campaign);
  return when
    ? `Invalid or expired coupon for this trip. This code works for ${when}.`
    : 'Invalid or expired coupon for this trip';
}

export function formatOfferRoute(
  pickup?: string | null,
  drop?: string | null
): string | null {
  const from = (pickup || '').trim();
  const to = (drop || '').trim();
  if (!from && !to) return null;
  if (from && to) return `${from} → ${to}`;
  return from || to;
}

/** Customer-facing route: Visakhapatnam as destination means anywhere in the city. */
export function formatOfferRouteScope(campaign: {
  pickup_location?: string | null;
  drop_location?: string | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  drop_lat?: number | null;
  drop_lng?: number | null;
}): string | null {
  const from = (campaign.pickup_location || '').trim();
  const to = (campaign.drop_location || '').trim();
  if (!from && !to) return null;
  const pickupCity = isOfferVizagCityPlace(from, campaign.pickup_lat, campaign.pickup_lng);
  const dropCity = isOfferVizagCityPlace(to, campaign.drop_lat, campaign.drop_lng);
  const pickupAir = offerPlaceLooksLikeAirport(normalizeOfferPlaceName(from));
  const dropAir = offerPlaceLooksLikeAirport(normalizeOfferPlaceName(to));
  if (from && to && pickupAir && dropCity) {
    return `${from} → any place in Visakhapatnam`;
  }
  if (from && to && pickupCity && dropAir) {
    return `any place in Visakhapatnam → ${to}`;
  }
  if (from && to && pickupCity && dropCity) {
    return 'any place in Visakhapatnam';
  }
  return formatOfferRoute(from, to);
}

export function campaignShowsRoute(category: string): boolean {
  switch (category) {
    case 'airport':
    case 'outstation':
    case 'outstation_one_way':
    case 'outstation_round_trip':
      return true;
    case 'local':
    case 'tour':
      return false;
    default:
      return false;
  }
}

/** Customer trip used to check campaign pickup → destination. */
export interface OfferTripRoute {
  pickup_location?: string | null;
  drop_location?: string | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  drop_lat?: number | null;
  drop_lng?: number | null;
}

const OFFER_ROUTE_MATCH_KM = 5;

function offerCoord(n?: number | null): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  if (n === 0) return null;
  return n;
}

function offerHaversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeOfferPlaceName(raw?: string | null): string {
  return (raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(india|andhra pradesh|district|international)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function offerPlaceLooksLikeAirport(name: string): boolean {
  return name.includes('airport');
}

const VIZAG_CITY_CENTER = { lat: 17.6868, lng: 83.2185 };
const VIZAG_CITY_RADIUS_KM = 35;

/** True for a Visakhapatnam city place (not the airport) — any in-city drop can match. */
function isOfferVizagCityPlace(
  name?: string | null,
  lat?: number | null,
  lng?: number | null
): boolean {
  const n = normalizeOfferPlaceName(name);
  if (offerPlaceLooksLikeAirport(n)) return false;
  const pLat = offerCoord(lat);
  const pLng = offerCoord(lng);
  if (pLat != null && pLng != null) {
    return offerHaversineKm(pLat, pLng, VIZAG_CITY_CENTER.lat, VIZAG_CITY_CENTER.lng) <= VIZAG_CITY_RADIUS_KM;
  }
  return /\b(visakhapatnam|vizag|waltair)\b/.test(n);
}

function offerNamesMatch(cName: string, tName: string): boolean {
  if (!cName || !tName) return false;
  if (cName === tName) return true;
  const shorter = cName.length <= tName.length ? cName : tName;
  const longer = cName.length <= tName.length ? tName : cName;
  if (shorter.length >= 10 && longer.includes(shorter)) return true;
  if (offerPlaceLooksLikeAirport(cName) && offerPlaceLooksLikeAirport(tName)) {
    const vizagAir =
      /alluri|bhogapuram|vizag|visakhapatnam|nad/.test(cName) &&
      /alluri|bhogapuram|vizag|visakhapatnam|nad/.test(tName);
    if (vizagAir) return true;
  }
  return false;
}

function offerPlacesMatch(
  campaignName?: string | null,
  campaignLat?: number | null,
  campaignLng?: number | null,
  tripName?: string | null,
  tripLat?: number | null,
  tripLng?: number | null
): boolean {
  const cName = normalizeOfferPlaceName(campaignName);
  const tName = normalizeOfferPlaceName(tripName);
  const cLat = offerCoord(campaignLat);
  const cLng = offerCoord(campaignLng);
  const tLat = offerCoord(tripLat);
  const tLng = offerCoord(tripLng);
  if (!cName && cLat == null) return false;
  if (
    isOfferVizagCityPlace(campaignName, campaignLat, campaignLng) &&
    isOfferVizagCityPlace(tripName, tripLat, tripLng)
  ) {
    return true;
  }
  if (cLat != null && cLng != null && tLat != null && tLng != null) {
    return offerHaversineKm(cLat, cLng, tLat, tLng) <= OFFER_ROUTE_MATCH_KM;
  }
  return offerNamesMatch(cName, tName);
}

export function campaignHasOfferRoute(campaign: {
  pickup_location?: string | null;
  drop_location?: string | null;
  pickup_lat?: number | null;
  drop_lat?: number | null;
}): boolean {
  const hasPickup = Boolean((campaign.pickup_location || '').trim() || offerCoord(campaign.pickup_lat));
  const hasDrop = Boolean((campaign.drop_location || '').trim() || offerCoord(campaign.drop_lat));
  return hasPickup && hasDrop;
}

/** True when the trip pickup and destination match this campaign's route (same direction). */
export function isOfferRouteEligible(
  campaign: {
    pickup_location?: string | null;
    drop_location?: string | null;
    pickup_lat?: number | null;
    pickup_lng?: number | null;
    drop_lat?: number | null;
    drop_lng?: number | null;
  },
  trip: OfferTripRoute | null | undefined,
  requireTripWhenRouted = false
): boolean {
  if (!campaignHasOfferRoute(campaign)) return true;
  const hasTrip = Boolean(
    trip &&
      ((trip.pickup_location || '').trim() ||
        (trip.drop_location || '').trim() ||
        offerCoord(trip.pickup_lat) ||
        offerCoord(trip.drop_lat))
  );
  if (!hasTrip || !trip) return !requireTripWhenRouted;
  return (
    offerPlacesMatch(
      campaign.pickup_location,
      campaign.pickup_lat,
      campaign.pickup_lng,
      trip.pickup_location,
      trip.pickup_lat,
      trip.pickup_lng
    ) &&
    offerPlacesMatch(
      campaign.drop_location,
      campaign.drop_lat,
      campaign.drop_lng,
      trip.drop_location,
      trip.drop_lat,
      trip.drop_lng
    )
  );
}

export function toOfferTripRoute(
  pickup?: { name?: string; address?: string; lat?: number; lng?: number } | null,
  drop?: { name?: string; address?: string; lat?: number; lng?: number } | null
): OfferTripRoute | null {
  if (!pickup && !drop) return null;
  return {
    pickup_location: pickup?.name || pickup?.address || null,
    drop_location: drop?.name || drop?.address || null,
    pickup_lat: offerCoord(pickup?.lat ?? null),
    pickup_lng: offerCoord(pickup?.lng ?? null),
    drop_lat: offerCoord(drop?.lat ?? null),
    drop_lng: offerCoord(drop?.lng ?? null),
  };
}

export function toOfferTravelDateYmd(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isOfferTravelDateEligible(
  campaign: { travel_date_from?: string | null; travel_date_to?: string | null },
  travelYmd: string | null
): boolean {
  const from = campaign.travel_date_from || null;
  const to = campaign.travel_date_to || null;
  if (!from && !to) return true;
  if (!travelYmd) return false;
  if (from && travelYmd < from) return false;
  if (to && travelYmd > to) return false;
  return true;
}

/** Normalize vehicle/tour id for campaign target matching. */
export function normalizeOfferTargetId(raw?: string | null): string | null {
  if (!raw) return null;
  const id = raw.trim().toLowerCase();
  if (!id) return null;
  return id.startsWith('tour_') ? id.slice(5) : id;
}
