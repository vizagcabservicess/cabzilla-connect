import { bookingAPI } from '@/services/api/bookingAPI';
import type { Booking } from '@/types/api';
import type { CabType } from '@/types/cab';
import { enrichTourBookingFromCatalog } from '@/utils/enrichTourBookingForConfirmation';
import { getVehicleData } from '@/services/vehicleDataService';
import {
  fetchAllOutstationFares,
  type OutstationFareData,
} from '@/services/outstationFareService';
import { normalizeVehicleId } from '@/utils/safeStringUtils';
import { computeOutstationRoundTripIncludedKm } from '@/utils/outstationRoundTripLimits';
import {
  resolveBookingAdvanceAmount,
  resolveBookingPaymentMethod,
} from '@/utils/bookingPaymentFields';
import axios from 'axios';
import { API_BASE_URL } from '@/config';

/** Parse seat count from labels like "Urbania 17 seater" or "Tempo Traveller 12-seater". */
export function parseSeatsFromVehicleLabel(label: string): number | null {
  const trimmed = String(label || '').trim();
  if (!trimmed) return null;

  const explicit = trimmed.match(/(\d{1,2})\s*-?\s*(?:seater|seaters|seats|passengers?|pax)/i);
  if (explicit) {
    const n = parseInt(explicit[1]!, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  if (/urbania|tempo|traveller|bus/i.test(trimmed)) {
    const embedded = trimmed.match(/\b(9|10|11|12|13|14|15|16|17|18)\b/);
    if (embedded) {
      return parseInt(embedded[1]!, 10);
    }
  }

  return null;
}

function isLargeGroupVehicleLabel(label: string): boolean {
  const v = label.toLowerCase();
  return (
    v.includes('urbania') ||
    v.includes('tempo') ||
    v.includes('traveller') ||
    v.includes('mini bus') ||
    v.includes('minibus')
  );
}

function resolveVehicleIdCandidates(cabLabel: string, catalogVehicle?: CabType | null): string[] {
  const candidates = new Set<string>();
  const label = cabLabel.toLowerCase().trim();

  if (catalogVehicle?.id) {
    candidates.add(normalizeVehicleId(catalogVehicle.id));
  }

  if (label.includes('urbania')) {
    candidates.add('bus');
    candidates.add('urbania');
  } else if (label.includes('tempo') || label.includes('traveller')) {
    candidates.add('tempo_traveller');
    candidates.add('tempo');
    candidates.add('traveller');
  } else if (label.includes('crysta')) {
    candidates.add('innova_crysta');
    candidates.add('crysta');
  } else if (label.includes('innova')) {
    candidates.add('innova_crysta');
    candidates.add('innova');
  } else if (label.includes('ertiga')) {
    candidates.add('ertiga');
  } else if (label.includes('swift') || label.includes('dzire') || label.includes('amaze')) {
    candidates.add('sedan');
  }

  const normalizedLabel = normalizeVehicleId(label.replace(/\s+/g, '_'));
  if (normalizedLabel) candidates.add(normalizedLabel);

  return [...candidates].filter(Boolean);
}

function findVehicleInCatalog(vehicles: CabType[], cabLabel: string): CabType | undefined {
  const needle = cabLabel.toLowerCase().trim();
  if (!needle) return undefined;

  const exact = vehicles.find((v) => String(v.name || '').toLowerCase().trim() === needle);
  if (exact) return exact;

  const partial = vehicles.find((v) => {
    const name = String(v.name || '').toLowerCase();
    const id = normalizeVehicleId(v.id);
    return (
      name.includes(needle) ||
      needle.includes(name) ||
      id === needle ||
      (needle.includes('urbania') && (id === 'bus' || id === 'urbania' || name.includes('urbania')))
    );
  });
  return partial;
}

function findOutstationFareRow(
  allFares: Record<string, OutstationFareData>,
  candidates: string[]
): OutstationFareData | undefined {
  for (const id of candidates) {
    const normalized = normalizeVehicleId(id);
    if (allFares[normalized]) return allFares[normalized];
    if (allFares[id]) return allFares[id];
  }

  const keys = Object.keys(allFares);
  for (const id of candidates) {
    const normalized = normalizeVehicleId(id);
    const matchKey = keys.find((k) => normalizeVehicleId(k) === normalized);
    if (matchKey) return allFares[matchKey];
  }

  return undefined;
}

function resolveOutstationPerKmRate(
  fareRow: OutstationFareData | undefined,
  catalogVehicle: CabType | undefined
): number | null {
  const fromFare =
    fareRow?.roundTripPricePerKm ??
    fareRow?.oneWayPricePerKm ??
    fareRow?.extraKmCharge ??
    null;
  if (fromFare != null && Number(fromFare) > 0) return Number(fromFare);

  const fromVehicle = catalogVehicle?.pricePerKm ?? (catalogVehicle as CabType & { price_per_km?: number })?.price_per_km;
  if (fromVehicle != null && Number(fromVehicle) > 0) return Number(fromVehicle);

  return null;
}

function shouldPreferCatalogCapacity(
  cabLabel: string,
  existingCapacity: number,
  catalogCapacity: number | null | undefined
): boolean {
  if (!catalogCapacity || catalogCapacity <= 0) return false;
  if (!Number.isFinite(existingCapacity) || existingCapacity <= 0) return true;
  if (isLargeGroupVehicleLabel(cabLabel) && existingCapacity <= 7 && catalogCapacity >= 9) return true;
  return catalogCapacity > existingCapacity;
}

function hasPositiveNumber(v: unknown): boolean {
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
}

async function fetchPaymentsPaidAmount(booking: Booking): Promise<number> {
  const bookingNumber = String(booking.bookingNumber || '').trim();
  const bookingId = Number(booking.id);
  const search = bookingNumber || (Number.isFinite(bookingId) ? String(bookingId) : '');
  if (!search) return 0;

  try {
    const response = await axios.get(`${API_BASE_URL}/api/admin/payments.php`, {
      params: { search },
      timeout: 8000,
    });
    const payments = response.data?.data?.payments;
    if (!Array.isArray(payments)) return 0;

    const match = payments.find((row: Record<string, unknown>) => {
      const number = String(row.bookingNumber ?? row.booking_number ?? '');
      const id = Number(row.bookingId ?? row.booking_id);
      return (
        (bookingNumber !== '' && number === bookingNumber) ||
        (Number.isFinite(bookingId) && bookingId > 0 && id === bookingId)
      );
    }) as Record<string, unknown> | undefined;

    const paid = Number(match?.paidAmount ?? match?.paid_amount ?? 0);
    return Number.isFinite(paid) && paid > 0 ? Math.round(paid) : 0;
  } catch {
    return 0;
  }
}

export async function enrichBookingForWhatsApp(booking: Booking): Promise<Booking> {
  let merged: Booking = { ...booking };

  const bookingId = Number((booking as Booking & { id?: number }).id);
  if (Number.isFinite(bookingId) && bookingId > 0) {
    try {
      const full = await bookingAPI.getBookingById(bookingId);
      if (full && typeof full === 'object') {
        merged = { ...merged, ...(full as Booking) };
      }
    } catch {
      /* keep list/summary booking */
    }
  }

  const paidFromPayments = await fetchPaymentsPaidAmount(merged);
  if (paidFromPayments > 0 && !hasPositiveNumber((merged as Booking & Record<string, unknown>).advance_paid_amount)
    && !hasPositiveNumber((merged as Booking & Record<string, unknown>).advancePaidAmount)) {
    merged = {
      ...merged,
      advance_paid_amount: paidFromPayments,
      advancePaidAmount: paidFromPayments,
    };
  }

  try {
    merged = await enrichTourBookingFromCatalog(merged);
  } catch {
    /* keep merged */
  }

  const raw = merged as Booking & Record<string, unknown>;
  const vehicleLabel = String(
    merged.cabType ?? raw.cab_type ?? raw.vehicle_type ?? ''
  ).trim();

  let catalogVehicle: CabType | undefined;
  let outstationFare: OutstationFareData | undefined;

  try {
    const [vehicles, allFares] = await Promise.all([
      getVehicleData(true, true),
      fetchAllOutstationFares(true).catch(() => ({} as Record<string, OutstationFareData>)),
    ]);

    catalogVehicle = findVehicleInCatalog(vehicles, vehicleLabel);
    const fareCandidates = resolveVehicleIdCandidates(vehicleLabel, catalogVehicle);
    outstationFare = findOutstationFareRow(allFares, fareCandidates);
  } catch {
    /* catalog enrichment optional */
  }

  const existingCapacity = Number(
    raw.vehicleCapacity ?? raw.vehicle_capacity ?? raw.seatingCapacity ?? raw.seating_capacity ?? 0
  );

  const catalogCapacity = catalogVehicle?.capacity ?? null;
  const parsedFromLabel = parseSeatsFromVehicleLabel(vehicleLabel);

  let capacity: number | null = null;
  if (shouldPreferCatalogCapacity(vehicleLabel, existingCapacity, catalogCapacity)) {
    capacity = catalogCapacity!;
  } else if (hasPositiveNumber(existingCapacity)) {
    capacity = existingCapacity;
  } else if (parsedFromLabel) {
    capacity = parsedFromLabel;
  } else if (catalogCapacity) {
    capacity = catalogCapacity;
  }

  const tripType = String(merged.tripType ?? raw.trip_type ?? '').toLowerCase();
  const tripMode = String(merged.tripMode ?? raw.trip_mode ?? '').toLowerCase();
  const isOutstationRoundTrip = tripType === 'outstation' && tripMode === 'round-trip';

  const perKmRate = resolveOutstationPerKmRate(outstationFare, catalogVehicle);

  const resolvedAdvance = resolveBookingAdvanceAmount(merged);
  const resolvedMethod = resolveBookingPaymentMethod(merged);

  const patch: Record<string, unknown> = {};

  if (resolvedAdvance > 0) {
    patch.advance_paid_amount = resolvedAdvance;
    patch.advancePaidAmount = resolvedAdvance;
  }
  if (resolvedMethod && resolvedMethod !== 'N/A') {
    patch.payment_method = resolvedMethod;
    patch.paymentMethod = resolvedMethod;
  }

  if (capacity && capacity > 0) {
    patch.vehicleCapacity = capacity;
    patch.seating_capacity = capacity;
    patch.vehicle_capacity = capacity;
    patch.seatingCapacity = capacity;
  }

  if (isOutstationRoundTrip) {
    const pickup = merged.pickupDate ?? merged.pickup_date;
    const returnDate =
      merged.return_date ??
      (merged as Booking & { returnDate?: string }).returnDate;
    if (!hasPositiveNumber(raw.km_included) && !hasPositiveNumber(raw.kmIncluded)) {
      const includedKm = computeOutstationRoundTripIncludedKm(pickup, returnDate);
      patch.km_included = includedKm;
      patch.kmIncluded = includedKm;
    }
  }

  if (
    tripType === 'outstation' &&
    perKmRate != null &&
    !hasPositiveNumber(raw.extra_per_km) &&
    !hasPositiveNumber(raw.extraPerKm)
  ) {
    patch.extra_per_km = perKmRate;
    patch.extraPerKm = perKmRate;
    patch.price_per_km = perKmRate;
  }

  if (Object.keys(patch).length > 0) {
    merged = { ...merged, ...(patch as Partial<Booking>) };
  }

  return merged;
}
