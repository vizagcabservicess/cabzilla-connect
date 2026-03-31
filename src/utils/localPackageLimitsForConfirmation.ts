import { hourlyPackages } from '@/lib/packageData';
import type { Booking } from '@/types/api';

/**
 * Hours/km from hourly package id only (8hrs-80km, etc.). Does not use DB columns
 * so bad persisted 10/100 rows do not skip fare-based repair.
 */
export function resolveLocalHoursKmFromHourlyPackageField(booking: Booking): { hours: string; km: string } | null {
  const raw = booking.hourlyPackage ?? booking.hourly_package;
  if (raw == null || String(raw).trim() === '') {
    return null;
  }
  const id = String(raw).trim().toLowerCase();
  const byId = hourlyPackages.find((p) => p.id.toLowerCase() === id);
  if (byId) {
    return { hours: String(byId.hours), km: String(byId.kilometers) };
  }
  const stripLeadingZeros = (s: string) => s.replace(/^0+(?=\d)/, '');
  const alt = hourlyPackages.find(
    (p) => stripLeadingZeros(p.id).toLowerCase() === stripLeadingZeros(id)
  );
  if (alt) {
    return { hours: String(alt.hours), km: String(alt.kilometers) };
  }
  const m = id.match(/(\d+)\s*hrs?[/-](\d+)\s*km/i);
  if (m) {
    return { hours: m[1], km: m[2] };
  }
  return null;
}

/**
 * Normalize API trip_type strings so local hourly logic always runs.
 */
export function normalizeTripTypeForConfirmation(tripTypeRaw: string, booking: Booking): string {
  const tourRef = booking.tour_id ?? booking.tourId;
  if (!tourRef && (booking.hourlyPackage ?? booking.hourly_package)) {
    return 'local';
  }

  let t = String(tripTypeRaw || '').trim();
  if (!t) {
    return '';
  }
  const collapsed = t.toLowerCase().replace(/[\s_-]+/g, '');
  const lower = t.toLowerCase();
  if (
    lower === 'local' ||
    lower === 'local city ride' ||
    collapsed === 'localcityride' ||
    lower.includes('hourly')
  ) {
    return 'local';
  }

  const dropStr = String(
    typeof booking.drop_location === 'string'
      ? booking.drop_location
      : (booking.drop_location as { city?: string } | undefined)?.city ??
          booking.dropLocation ??
          ''
  ).toLowerCase();
  if (!tourRef && dropStr.includes('local city ride')) {
    return 'local';
  }

  return t;
}
