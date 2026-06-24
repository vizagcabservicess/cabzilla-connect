import { getInvoiceTripTypeDisplay } from '@/utils/invoiceTripTypeDisplay';
import type { Booking } from '@/types/api';

export interface TripSummaryOverrides {
  tripType: string;
  vehicleType: string;
  vehicleNumber: string;
  tripDate: string;
  noOfHours: string;
  noOfKilometers: string;
}

export function formatInvoiceTripDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function getDefaultTripSummary(booking: Booking): TripSummaryOverrides {
  const raw = booking as Booking & Record<string, unknown>;

  let noOfHours = '--';
  const hours =
    raw.hoursIncluded ??
    raw.hours_included ??
    raw.no_of_hours ??
    raw.estimated_hours;
  if (hours != null && String(hours).trim() !== '') {
    noOfHours = String(hours);
  }

  let noOfKilometers = '--';
  const km = raw.kmIncluded ?? raw.km_included ?? raw.distance;
  if (km != null && String(km).trim() !== '' && Number(km) > 0) {
    noOfKilometers = String(Math.round(Number(km)));
  }

  return {
    tripType: getInvoiceTripTypeDisplay(booking),
    vehicleType: String(booking.cabType ?? raw.cab_type ?? raw.vehicle_type ?? ''),
    vehicleNumber: String(booking.vehicleNumber ?? raw.vehicle_number ?? '').trim(),
    tripDate: formatInvoiceTripDate(booking.pickupDate ?? String(raw.pickup_date ?? '')),
    noOfHours,
    noOfKilometers,
  };
}

export function mergeTripSummary(
  stored: Partial<TripSummaryOverrides> | undefined,
  booking: Booking
): TripSummaryOverrides {
  const defaults = getDefaultTripSummary(booking);
  if (!stored) return defaults;
  return {
    tripType: stored.tripType ?? defaults.tripType,
    vehicleType: stored.vehicleType ?? defaults.vehicleType,
    vehicleNumber:
      stored.vehicleNumber !== undefined ? stored.vehicleNumber : defaults.vehicleNumber,
    tripDate: stored.tripDate ?? defaults.tripDate,
    noOfHours: stored.noOfHours ?? defaults.noOfHours,
    noOfKilometers: stored.noOfKilometers ?? defaults.noOfKilometers,
  };
}

export function appendTripSummaryParams(
  params: URLSearchParams,
  tripSummary: TripSummaryOverrides
): void {
  if (tripSummary.tripType.trim()) {
    params.append('tripType', tripSummary.tripType.trim());
  }
  if (tripSummary.vehicleType.trim()) {
    params.append('vehicleType', tripSummary.vehicleType.trim());
  }
  if (tripSummary.tripDate.trim()) {
    params.append('tripDate', tripSummary.tripDate.trim());
  }
  if (tripSummary.noOfHours.trim()) {
    params.append('noOfHours', tripSummary.noOfHours.trim());
  }
  if (tripSummary.noOfKilometers.trim()) {
    params.append('noOfKm', tripSummary.noOfKilometers.trim());
  }
  params.append('vehicleNumber', tripSummary.vehicleNumber.trim());
}

export function tripSummaryForApiBody(tripSummary: TripSummaryOverrides): Record<string, string> {
  return {
    tripType: tripSummary.tripType.trim(),
    vehicleType: tripSummary.vehicleType.trim(),
    vehicleNumber: tripSummary.vehicleNumber.trim(),
    tripDate: tripSummary.tripDate.trim(),
    noOfHours: tripSummary.noOfHours.trim(),
    noOfKilometers: tripSummary.noOfKilometers.trim(),
  };
}

export function getDefaultBillingAddress(booking: Booking): string {
  const raw = booking as Booking & Record<string, unknown>;
  return String(booking.billingAddress ?? raw.billing_address ?? '').trim();
}

export function readStoredInvoiceSettings(bookingId: number): Partial<StoredInvoiceSettings> | null {
  try {
    const raw = localStorage.getItem(`invoice-settings-${bookingId}`);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<StoredInvoiceSettings>;
  } catch {
    return null;
  }
}

export interface StoredInvoiceSettings {
  customInvoiceNumber?: string;
  billingAddress?: string;
  tripSummary?: Partial<TripSummaryOverrides>;
}
