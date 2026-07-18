import { format } from 'date-fns';
import {
  normalizeGuestPhone,
  parseSearchAlertDeparture,
} from '@/services/api/aiBookingAPI';
import type { SearchAlert } from '@/services/api/searchAlertsAPI';
import {
  SMART_BUDGET_DEFAULTS,
  type CreateSmartBudgetSessionInput,
} from '@/types/smartBudget';

function parseFareAmount(fareText: string): number | null {
  const digits = fareText.replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export type SearchResultVehicleOption = {
  name: string;
  fareText: string;
  fareAmount: number | null;
  /** Seating capacity from website fleet when known. */
  capacity?: number;
};

/**
 * Parse "Search results: Swift Dzire: ₹2,250, Ertiga: ₹3,750" from special_requests
 * (used on the customer Smart Budget link so Vehicle can be a dropdown).
 */
export function parseVehicleOptionsFromSpecialRequests(
  special: string | null | undefined
): SearchResultVehicleOption[] {
  if (!special?.trim()) return [];

  const labeled = special.match(
    /Search results\s*:\s*([\s\S]+?)(?=\s*·\s*(?:Trip|Mode|Distance|Website fare|Source|Package|Return|Itinerary)\s*:|$)/i
  );
  const blob = (labeled?.[1] || '')
    .trim()
    .replace(/[\r\n]+/g, ', ')
    .replace(/\s*·\s*/g, ', ');
  if (!blob || blob === '—') return [];

  const options: SearchResultVehicleOption[] = [];
  // Fare must end on a digit so the comma between "₹2,250, Ertiga" is not swallowed.
  const withFare =
    /([^:·,]+?):\s*(₹\s*[\d,]*\d|Rs\.?\s*[\d,]*\d|INR\s*[\d,]*\d|[\d,]*\d|—|-)/gi;
  let match: RegExpExecArray | null;
  while ((match = withFare.exec(blob)) !== null) {
    const name = match[1].trim().replace(/^[,·\s]+|[·\s]+$/g, '');
    const fareText = match[2].trim();
    if (!name) continue;
    options.push({
      name,
      fareText,
      fareAmount: parseFareAmount(fareText),
    });
  }
  if (options.length > 0) return options;

  // carsShown-only style: "Swift Dzire, Ertiga, Innova Crysta"
  return blob
    .split(/,\s*/)
    .map((part) => part.trim())
    .filter((name) => name.length > 0 && name !== '—')
    .map((name) => ({ name, fareText: '—', fareAmount: null }));
}

/** Convert search-alert departure text into `yyyy-MM-dd'T'HH:mm`. */
export function searchAlertDepartureToIso(departure: string): string {
  const { date, time } = parseSearchAlertDeparture(departure);
  if (!date) {
    return format(new Date(), "yyyy-MM-dd'T'HH:mm");
  }

  let hours = 12;
  let minutes = 0;
  const tm = time.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (tm) {
    hours = Number(tm[1]);
    minutes = Number(tm[2]);
    const ap = (tm[3] || '').toLowerCase();
    if (ap === 'pm' && hours < 12) hours += 12;
    if (ap === 'am' && hours === 12) hours = 0;
  }

  return `${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function isRoundTripAlert(alert: SearchAlert): boolean {
  const blob = `${alert.tripType || ''} ${alert.tripMode || ''}`.toLowerCase();
  return blob.includes('round');
}

function buildSpecialRequests(alert: SearchAlert): string {
  const parts: string[] = [];
  if (alert.tripType?.trim()) parts.push(`Trip: ${alert.tripType.trim()}`);
  if (alert.tripMode?.trim()) {
    const mode = alert.tripMode.toLowerCase();
    parts.push(
      mode.includes('round') ? 'Mode: round trip' : mode.includes('one') ? 'Mode: one way' : `Mode: ${alert.tripMode}`
    );
  }
  if (alert.distanceKmOneWay != null && alert.distanceKmOneWay > 0) {
    const oneWay = Math.round(alert.distanceKmOneWay);
    if (isRoundTripAlert(alert)) {
      parts.push(`Distance: ~${oneWay * 2} km (round trip · ${oneWay} km one way)`);
    } else {
      parts.push(`Distance: ~${oneWay} km`);
    }
  }
  if (alert.resultsShown?.trim()) {
    parts.push(`Search results: ${alert.resultsShown.trim()}`);
  }
  parts.push('Source: Search alert');
  return parts.join(' · ');
}

/** Map a Search Alert row → admin `createSession` payload (prefilled Smart Budget link). */
export function mapSearchAlertToSmartBudgetSession(
  alert: SearchAlert
): CreateSmartBudgetSessionInput {
  const phone = normalizeGuestPhone(alert.guestPhone);
  const vehicle =
    alert.vehicleFares?.find((v) => v.name?.trim())?.name?.trim() || 'Sedan';
  const quoted =
    alert.vehicleFares
      ?.map((v) => parseFareAmount(v.fareText))
      .find((n): n is number => n != null) ?? null;
  const pickup = (alert.pickup || '').trim() || 'Visakhapatnam';
  const drop = (alert.drop || '').trim() || pickup;

  return {
    pickup,
    drop_location: drop,
    trip_datetime: searchAlertDepartureToIso(alert.departure),
    vehicle_type: vehicle,
    passengers: 4,
    quoted_fare: quoted,
    customer_name: 'Guest',
    customer_phone: phone || null,
    special_requests: buildSpecialRequests(alert),
    link_ttl_minutes: SMART_BUDGET_DEFAULTS.linkTtlMinutes,
    admin_priority_minutes: SMART_BUDGET_DEFAULTS.adminPriorityMinutes,
  };
}

export function smartBudgetCustomerSessionUrl(token: string): string {
  if (typeof window === 'undefined') return `/smart-budget/s/${token}`;
  return `${window.location.origin}/smart-budget/s/${token}`;
}

export function smartBudgetWhatsAppShareUrl(opts: {
  token: string;
  customerUrl?: string | null;
  customerPhone?: string | null;
}): string {
  const url = opts.customerUrl || smartBudgetCustomerSessionUrl(opts.token);
  const text = encodeURIComponent(
    `Hi! Here is your Vizag Taxi Hub Smart Budget link. Review the trip, set your budget, and confirm with WhatsApp OTP:\n${url}`
  );
  const phone = (opts.customerPhone || '').replace(/\D/g, '');
  const waPhone =
    phone.length === 10 ? `91${phone}` : phone.length >= 10 ? phone : '';
  return waPhone ? `https://wa.me/${waPhone}?text=${text}` : `https://wa.me/?text=${text}`;
}
