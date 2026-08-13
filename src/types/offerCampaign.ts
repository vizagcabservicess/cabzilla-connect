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
