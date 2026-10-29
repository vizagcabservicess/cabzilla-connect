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

function isBlankTripMetric(value: string | null | undefined): boolean {
  const text = String(value ?? '').trim();
  return text === '' || text === '--' || text === '—' || text === '-';
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text !== '' && text !== '0000-00-00 00:00:00') return text;
  }
  return '';
}

function formatDrivenDuration(startRaw: string, endRaw: string): string {
  const from = new Date(startRaw).getTime();
  const to = new Date(endRaw).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return '';
  const mins = Math.floor((to - from) / 60000);
  if (mins <= 0) return '';
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  if (hours > 0 && rest > 0) return `${hours} hr ${rest} min`;
  if (hours > 0) return `${hours} hr`;
  return `${rest} min`;
}

export function getDefaultTripSummary(booking: Booking): TripSummaryOverrides {
  const raw = booking as Booking & Record<string, unknown>;

  let noOfHours = '--';
  const hours =
    raw.hoursIncluded ??
    raw.hours_included ??
    raw.no_of_hours ??
    raw.estimated_hours;
  if (hours != null && String(hours).trim() !== '' && !isBlankTripMetric(String(hours))) {
    noOfHours = String(hours);
  }
  if (isBlankTripMetric(noOfHours)) {
    const driven = formatDrivenDuration(
      firstText(raw.startOdometerAt, raw.tripStartedAt, raw.trip_started_at),
      firstText(raw.endOdometerAt, raw.completedAt, raw.completed_at)
    );
    if (driven) noOfHours = driven;
  }

  let noOfKilometers = '--';
  const km = raw.kmIncluded ?? raw.km_included ?? raw.distance;
  if (km != null && String(km).trim() !== '' && Number(km) > 0) {
    noOfKilometers = String(Math.round(Number(km)));
  }
  if (isBlankTripMetric(noOfKilometers)) {
    const startKm = Number(raw.startOdometer ?? raw.start_odometer);
    const endKm = Number(raw.endOdometer ?? raw.end_odometer);
    if (Number.isFinite(startKm) && Number.isFinite(endKm) && endKm > startKm) {
      noOfKilometers = String(Math.round(endKm - startKm));
    }
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
    noOfHours: !isBlankTripMetric(stored.noOfHours) ? String(stored.noOfHours) : defaults.noOfHours,
    noOfKilometers: !isBlankTripMetric(stored.noOfKilometers)
      ? String(stored.noOfKilometers)
      : defaults.noOfKilometers,
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
  if (!isBlankTripMetric(tripSummary.noOfHours)) {
    params.append('noOfHours', tripSummary.noOfHours.trim());
  }
  if (!isBlankTripMetric(tripSummary.noOfKilometers)) {
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
