import type { CabType, AirportFare } from '@/types/cab';
import { normalizeVehicleId } from '@/utils/safeStringUtils';

/**
 * Sync airport transfer total for a vehicle + one-way distance (km).
 * Matches `useFare` airport math + `CabList` (base + airportFee + extra distance),
 * using `cab.airportFares`, then `localStorage` `airport_fares` (API cache), then
 * the same defaults as `fareService.generateDefaultAirportFare` (extended with `name`
 * so ids like `swift_dzire` resolve like DB rows).
 */

function readStoredAirportFare(normId: string): number {
  if (typeof localStorage === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(`fare_airport_${normId}`);
    if (!raw) return 0;
    const obj = JSON.parse(raw) as { fare?: number };
    if (typeof obj.fare === 'number' && obj.fare > 0) return obj.fare;
  } catch {
    /* ignore */
  }
  return 0;
}

/** Bulk cache written by `getAirportFaresForVehicle` — same key resolution as fareService error path. */
function readCachedAirportFareRecord(vehicleId: string): AirportFare | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem('airport_fares');
    if (!raw) return null;
    const fares = JSON.parse(raw) as Record<string, AirportFare>;
    const nid = normalizeVehicleId(vehicleId);
    if (fares[vehicleId]) return fares[vehicleId];
    if (fares[nid]) return fares[nid];
    const keys = Object.keys(fares);
    const k = keys.find(
      (x) =>
        x.toLowerCase() === String(vehicleId).toLowerCase() || x.toLowerCase() === nid.toLowerCase()
    );
    return k ? fares[k] : null;
  } catch {
    return null;
  }
}

function pickTier(
  a: number | undefined,
  b: number | undefined,
  d: number
): number {
  if (typeof a === 'number' && !Number.isNaN(a) && a > 0) return a;
  if (typeof b === 'number' && !Number.isNaN(b) && b > 0) return b;
  return d;
}

/** Mirrors `fareService.generateDefaultAirportFare`, with `name` hints when id is opaque. */
function defaultAirportFareForCab(cab: CabType): AirportFare {
  const normalizedId = normalizeVehicleId(cab.id);
  const name = (cab.name || '').toLowerCase();
  const sedanName =
    name.includes('dzire') ||
    name.includes('amaze') ||
    name.includes('etios') ||
    name.includes('glanza') ||
    (name.includes('swift') && !name.includes('dzire'));

  if (
    normalizedId.includes('sedan') ||
    normalizedId === 'toyota' ||
    normalizedId.includes('dzire_cng') ||
    sedanName
  ) {
    return {
      basePrice: 800,
      pricePerKm: 14,
      pickupPrice: 800,
      dropPrice: 800,
      tier1Price: 800,
      tier2Price: 1000,
      tier3Price: 1000,
      tier4Price: 1200,
      extraKmCharge: 12,
    };
  }
  if (normalizedId.includes('ertiga') || name.includes('ertiga')) {
    return {
      basePrice: 1000,
      pricePerKm: 15,
      pickupPrice: 1000,
      dropPrice: 1000,
      tier1Price: 800,
      tier2Price: 1000,
      tier3Price: 1200,
      tier4Price: 1400,
      extraKmCharge: 15,
    };
  }
  if (normalizedId.includes('innova') || normalizedId === 'mpv' || name.includes('crysta')) {
    return {
      basePrice: 1200,
      pricePerKm: 17,
      pickupPrice: 1200,
      dropPrice: 1200,
      tier1Price: 1000,
      tier2Price: 1200,
      tier3Price: 1400,
      tier4Price: 1600,
      extraKmCharge: 17,
    };
  }
  if (normalizedId.includes('tempo') || name.includes('tempo') || name.includes('traveller')) {
    return {
      basePrice: 2000,
      pricePerKm: 19,
      pickupPrice: 2000,
      dropPrice: 2000,
      tier1Price: 1600,
      tier2Price: 1800,
      tier3Price: 2000,
      tier4Price: 2500,
      extraKmCharge: 19,
    };
  }

  return {
    basePrice: 1000,
    pricePerKm: 15,
    pickupPrice: 1000,
    dropPrice: 1000,
    tier1Price: 1000,
    tier2Price: 1200,
    tier3Price: 1400,
    tier4Price: 1600,
    extraKmCharge: 15,
  };
}

function mergeAirportFareLayers(
  cabAf: CabType['airportFares'] | undefined,
  cached: AirportFare | null,
  defaults: AirportFare
): AirportFare {
  const a = cabAf;
  const c = cached;
  const d = defaults;
  return {
    basePrice: pickTier(a?.basePrice, c?.basePrice, d.basePrice),
    pricePerKm: pickTier(a?.pricePerKm, c?.pricePerKm, d.pricePerKm),
    pickupPrice: pickTier(a?.pickupPrice, c?.pickupPrice, d.pickupPrice),
    dropPrice: pickTier(a?.dropPrice, c?.dropPrice, d.dropPrice),
    tier1Price: pickTier(a?.tier1Price, c?.tier1Price, d.tier1Price),
    tier2Price: pickTier(a?.tier2Price, c?.tier2Price, d.tier2Price),
    tier3Price: pickTier(a?.tier3Price, c?.tier3Price, d.tier3Price),
    tier4Price: pickTier(a?.tier4Price, c?.tier4Price, d.tier4Price),
    extraKmCharge: pickTier(a?.extraKmCharge, c?.extraKmCharge, d.extraKmCharge),
    airportFee:
      typeof a?.airportFee === 'number' && a.airportFee > 0
        ? a.airportFee
        : typeof c?.airportFee === 'number' && c.airportFee > 0
          ? c.airportFee
          : undefined,
  };
}

/**
 * Total airport transfer fare (₹), rounded up to nearest ₹10 — same rounding as Hero `calculatePrice`.
 */
export function getAirportTransferFare(cab: CabType, distance: number): number {
  if (distance <= 0) return 0;

  const normId = normalizeVehicleId(cab.id);
  const cachedTotal = readStoredAirportFare(normId);
  if (cachedTotal > 0) return Math.ceil(cachedTotal / 10) * 10;

  const defaults = defaultAirportFareForCab(cab);
  const fromBlob = readCachedAirportFareRecord(cab.id);
  const af = mergeAirportFareLayers(cab.airportFares, fromBlob, defaults);

  let extraKmCharge = af.extraKmCharge;
  if (!extraKmCharge || Number.isNaN(extraKmCharge)) {
    if (normId.includes('ertiga')) extraKmCharge = 18;
    else extraKmCharge = 14;
  }

  let basePrice = 0;
  let fare = 0;

  if (distance <= 10) basePrice = af.tier1Price || 1200;
  else if (distance <= 20) basePrice = af.tier2Price || 1800;
  else if (distance <= 30) basePrice = af.tier3Price || 2400;
  else if (distance <= 40) basePrice = af.tier4Price || 1500;
  else {
    basePrice = af.tier4Price || 1500;
    const extraKm = distance - 40;
    fare = basePrice + extraKm * extraKmCharge;
  }

  if (distance <= 40) fare = basePrice;

  const airportFee = typeof af.airportFee === 'number' && af.airportFee > 0 ? af.airportFee : 0;
  fare += airportFee;

  return Math.ceil(fare / 10) * 10;
}
