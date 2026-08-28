import type { CabType } from '@/types/cab';
import type { LocalFare, AirportFare } from '@/types/cab';
import type { TripMode, TripType } from '@/lib/tripTypes';
import { differenceInCalendarDays } from 'date-fns';
import { normalizeVehicleId } from '@/utils/safeStringUtils';
import { calculateOutstationRoundTripFare, oneWayOutstationExtra } from '@/lib/fareCalculationService';
import { fetchAllOutstationFares, type OutstationFareData } from '@/services/outstationFareService';
import { getLocalFares, getAirportFaresForVehicle } from '@/services/fareService';
import { getAirportTransferFare } from '@/lib/airportFareForBooking';

export type VehicleFareLine = { name: string; fareText: string };

/** Match CabList / `useFare` totals — avoid `Math.ceil(.../10)*10`, which nudged fares (e.g. ₹16,854 → ₹16,860). */
function formatTrackFareRupee(fare: number): string {
  return `₹${Math.round(fare).toLocaleString('en-IN')}`;
}

function defaultOutstationFareRow(vehicleId: string): OutstationFareData {
  return {
    vehicleId,
    oneWayBasePrice: 0,
    oneWayPricePerKm: 0,
    roundTripBasePrice: 0,
    roundTripPricePerKm: 0,
    driverAllowance: 300,
    nightHaltCharge: 700,
    tier1Price: 3500,
    tier2Price: 4200,
    tier3Price: 4900,
    tier4Price: 5600,
    extraKmCharge: 14,
    tier1MinKm: 35,
    tier1MaxKm: 50,
    tier2MinKm: 51,
    tier2MaxKm: 75,
    tier3MinKm: 76,
    tier3MaxKm: 100,
    tier4MinKm: 101,
    tier4MaxKm: 149,
  };
}

function resolveOutstationFareRow(
  all: Record<string, OutstationFareData>,
  vehicleId: string
): OutstationFareData {
  const nid = normalizeVehicleId(vehicleId);
  if (!nid) return defaultOutstationFareRow(vehicleId);
  if (all[nid]) return all[nid];
  if (all[vehicleId]) return all[vehicleId];
  const keys = Object.keys(all);
  const matchKey = keys.find(
    (k) => k.toLowerCase() === nid.toLowerCase() || k.toLowerCase() === String(vehicleId).toLowerCase()
  );
  if (matchKey) return all[matchKey];
  return defaultOutstationFareRow(vehicleId);
}

/** Mirrors `useFare` one-way outstation tier + traditional branches (guest search / CabList). */
export function computeOutstationOneWayFareFromRow(
  outstationFares: OutstationFareData,
  distance: number,
  viaStops: boolean = false
): number {
  if (distance <= 0) return 0;

  let basePrice = 0;
  let driverAllowance = outstationFares.driverAllowance ?? 250;
  let extraDistanceFare = 0;
  let extraKmCharge = outstationFares.extraKmCharge ?? 14;

  const tier1Min = outstationFares.tier1MinKm || 35;
  const tier1Max = outstationFares.tier1MaxKm || 50;
  const tier2Min = outstationFares.tier2MinKm || 51;
  const tier2Max = outstationFares.tier2MaxKm || 75;
  const tier3Min = outstationFares.tier3MinKm || 76;
  const tier3Max = outstationFares.tier3MaxKm || 100;
  const tier4Min = outstationFares.tier4MinKm || 101;
  const tier4Max = outstationFares.tier4MaxKm || 149;

  const obp = outstationFares.oneWayBasePrice || 0;
  const legacyBase = (outstationFares as { basePrice?: number }).basePrice || 0;

  if (distance >= tier1Min && distance <= tier1Max) {
    basePrice = outstationFares.tier1Price || legacyBase || obp;
  } else if (distance >= tier2Min && distance <= tier2Max) {
    basePrice = outstationFares.tier2Price || (obp > 0 ? obp * 1.2 : legacyBase);
  } else if (distance >= tier3Min && distance <= tier3Max) {
    basePrice = outstationFares.tier3Price || (obp > 0 ? obp * 1.4 : legacyBase);
  } else if (distance >= tier4Min && distance <= tier4Max) {
    basePrice = outstationFares.tier4Price || (obp > 0 ? obp * 1.6 : legacyBase);
  } else if (distance > tier4Max) {
    basePrice = outstationFares.oneWayBasePrice;
    extraDistanceFare = oneWayOutstationExtra(distance, extraKmCharge, viaStops).extraDistanceFare;
  } else {
    basePrice = outstationFares.oneWayBasePrice;
    const extraKm = Math.max(0, distance - tier1Min);
    extraDistanceFare = extraKm * extraKmCharge;
  }

  return basePrice + extraDistanceFare + driverAllowance;
}

function validateLocalFareAmount(fare: number, cabId: string): boolean {
  if (isNaN(fare) || fare <= 0) return false;
  const normalizedId = normalizeVehicleId(cabId);
  let minFare = 1000;
  let maxFare = 20000;
  if (normalizedId.includes('sedan')) {
    minFare = 1000;
    maxFare = 8000;
  } else if (normalizedId.includes('ertiga') || normalizedId.includes('suv')) {
    minFare = 1500;
    maxFare = 12000;
  } else if (normalizedId.includes('innova') || normalizedId.includes('crysta') || normalizedId.includes('mpv')) {
    minFare = 2000;
    maxFare = 15000;
  } else if (normalizedId.includes('luxury')) {
    minFare = 3000;
    maxFare = 20000;
  }
  return fare >= minFare && fare <= maxFare;
}

function readStoredLocalFare(normId: string, packageType: string): number {
  if (typeof localStorage === 'undefined') return 0;
  try {
    const key = `fare_local_${normId}_${packageType || ''}`;
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const obj = JSON.parse(raw) as { fare?: number };
    if (typeof obj.fare === 'number' && obj.fare > 0) return obj.fare;
  } catch {
    /* ignore */
  }
  return 0;
}

function resolveLocalFareRow(
  all: Record<string, LocalFare>,
  vehicleId: string
): LocalFare | undefined {
  const n = normalizeVehicleId(vehicleId);
  if (all[n]) return all[n];
  if (all[vehicleId]) return all[vehicleId];
  const keys = Object.keys(all);
  const k = keys.find(
    (x) =>
      x.toLowerCase() === n.toLowerCase() ||
      x.toLowerCase() === String(vehicleId).toLowerCase()
  );
  return k ? all[k] : undefined;
}

/** Local total: DB/saved package base + extra km — matches `useFare` + `CabList`. */
function computeLocalFareForCab(
  lf: LocalFare | undefined,
  cab: CabType,
  hourlyPackage: string,
  distance: number
): number {
  const normId = normalizeVehicleId(cab.id);
  const packageMap: Record<string, keyof LocalFare> = {
    '8hrs-80km': 'price8hrs80km',
    '4hrs-40km': 'price4hrs40km',
    '10hrs-100km': 'price10hrs100km',
  };
  const key = packageMap[hourlyPackage];
  let fare = 0;
  let databaseFareFound = false;

  if (lf && key) {
    const dbFare = Number(lf[key] || 0);
    if (dbFare > 0 && validateLocalFareAmount(dbFare, cab.id)) {
      fare = dbFare;
      databaseFareFound = true;
    }
  }

  if (!databaseFareFound) {
    const stored = readStoredLocalFare(normId, hourlyPackage);
    if (stored > 0 && validateLocalFareAmount(stored, cab.id)) {
      fare = stored;
    } else {
      if (normId.includes('sedan')) fare = 2400;
      else if (normId.includes('ertiga') || normId.includes('suv')) fare = 3000;
      else if (normId.includes('innova') || normId.includes('crysta') || normId.includes('mpv'))
        fare = 4000;
      else if (normId.includes('luxury')) fare = 5000;
      else fare = 3000;
    }
  }

  const localPackageLimits: Record<string, { km: number }> = {
    '4hrs-40km': { km: 40 },
    '8hrs-80km': { km: 80 },
    '10hrs-100km': { km: 100 },
  };
  const selectedPackage = localPackageLimits[hourlyPackage || '8hrs-80km'] || { km: 80 };
  const extraKm = Math.max(0, distance - selectedPackage.km);
  const extraKmCharge =
    lf?.priceExtraKm ||
    lf?.extraKmRate ||
    lf?.extra_km_charge ||
    lf?.price_extra_km ||
    cab.pricePerKm ||
    14;

  return fare + extraKm * Number(extraKmCharge);
}

/** Same tier + extra-km math as `useFare` airport branch. */
function computeAirportFareFromRow(airportFares: AirportFare, normalizedCabId: string, distance: number): number {
  if (distance <= 0) return 0;

  let extraKmCharge = airportFares.extraKmCharge;
  if (!extraKmCharge || isNaN(extraKmCharge)) {
    if (normalizedCabId.includes('ertiga')) extraKmCharge = 18;
    else extraKmCharge = 14;
  }

  let basePrice = 0;
  let fare = 0;

  if (distance <= 10) {
    basePrice = airportFares.tier1Price || 1200;
  } else if (distance <= 20) {
    basePrice = airportFares.tier2Price || 1800;
  } else if (distance <= 30) {
    basePrice = airportFares.tier3Price || 2400;
  } else if (distance <= 40) {
    basePrice = airportFares.tier4Price || 1500;
  } else {
    basePrice = airportFares.tier4Price || 1500;
    const extraKm = distance - 40;
    fare = basePrice + extraKm * extraKmCharge;
  }

  if (distance <= 40) {
    fare = basePrice;
  }

  const airportFee =
    typeof airportFares.airportFee === 'number' && airportFares.airportFee > 0
      ? airportFares.airportFee
      : 0;
  return fare + airportFee;
}

function computeOutstationRoundTripFromRow(
  row: OutstationFareData,
  distance: number,
  pickupDate: Date,
  returnDate: Date
): number {
  if (distance <= 0) return 0;
  const perKmRate = row.roundTripPricePerKm || row.oneWayPricePerKm || 15;
  const nightAllowancePerNight = row.nightHaltCharge ?? 0;
  const driverAllowancePerDay = row.driverAllowance ?? 250;
  const actualDistance = distance * 2;
  const fareResult = calculateOutstationRoundTripFare({
    pickupDate,
    returnDate,
    actualDistance,
    perKmRate,
    nightAllowancePerNight,
    driverAllowancePerDay,
  });
  return fareResult.totalFare;
}

function outstationRoundTripFallbackTraditional(
  row: OutstationFareData,
  distance: number,
  pickupDate: Date
): number {
  const baseKms = 300;
  let basePrice = row.roundTripBasePrice || row.oneWayBasePrice || 0;
  let pricePerKm = row.roundTripPricePerKm || row.oneWayPricePerKm || 0;
  let driverAllowance = row.driverAllowance ?? 250;
  let nightCharges = 0;

  let effectiveDistance = distance * 2;
  pricePerKm = row.roundTripPricePerKm || row.oneWayPricePerKm || pricePerKm;
  basePrice = row.roundTripBasePrice || row.oneWayBasePrice || basePrice;
  effectiveDistance = Math.max(distance * 2, baseKms);
  if (effectiveDistance < baseKms) {
    effectiveDistance = baseKms;
  }

  let extraDistanceFare = 0;
  if (effectiveDistance > baseKms) {
    const extraKms = effectiveDistance - baseKms;
    extraDistanceFare = extraKms * pricePerKm;
  }

  let fare = basePrice + extraDistanceFare + driverAllowance;
  if (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) {
    nightCharges = Math.round(basePrice * 0.1);
    fare += nightCharges;
  }
  return fare;
}

export type GuestSearchFareContext = {
  tripType: TripType;
  tripMode: TripMode;
  hourlyPackage: string;
  distance: number;
  pickupDate: Date;
  returnDate: Date | null | undefined;
  viaStops?: boolean;
};

/**
 * Fetches the same fare tables as `useFare` / `CabList` and builds per-vehicle lines for the owner WhatsApp alert.
 */
export async function buildVehicleFareLinesForGuestTrack(
  cabs: CabType[],
  ctx: GuestSearchFareContext
): Promise<VehicleFareLine[]> {
  const { tripType, tripMode, hourlyPackage, distance, pickupDate, returnDate, viaStops = false } = ctx;

  let outstationAll: Record<string, OutstationFareData> = {};
  let localAll: Record<string, LocalFare> = {};

  if (tripType === 'outstation') {
    try {
      outstationAll = await fetchAllOutstationFares();
    } catch {
      outstationAll = {};
    }
  } else if (tripType === 'local') {
    try {
      localAll = await getLocalFares();
    } catch {
      localAll = {};
    }
  }

  if (
    tripType === 'tour' &&
    distance > 0 &&
    cabs.some((c) => !(typeof c.price === 'number' && c.price > 0))
  ) {
    try {
      outstationAll = await fetchAllOutstationFares();
    } catch {
      outstationAll = {};
    }
  }

  const airportFetches =
    tripType === 'airport' && distance > 0
      ? await Promise.all(
          cabs.map(async (cab) => {
            const nid = normalizeVehicleId(cab.id);
            try {
              const af = await getAirportFaresForVehicle(nid || cab.id);
              return { cabId: cab.id, af };
            } catch {
              return { cabId: cab.id, af: null as AirportFare | null };
            }
          })
        )
      : [];

  const airportById = new Map(airportFetches.map((x) => [x.cabId, x.af]));

  return cabs.map((cab) => {
    let fare = 0;

    if (tripType === 'local') {
      const lf = resolveLocalFareRow(localAll, cab.id);
      fare = computeLocalFareForCab(lf, cab, hourlyPackage, distance);
    } else if (tripType === 'outstation') {
      const row = resolveOutstationFareRow(outstationAll, cab.id);
      if (tripMode === 'round-trip' && returnDate) {
        return {
          name: cab.name,
          fareText:
            distance > 0
              ? formatTrackFareRupee(computeOutstationRoundTripFromRow(row, distance, pickupDate, returnDate))
              : 'Fare n/a',
        };
      }
      if (tripMode === 'round-trip' && !returnDate && distance > 0) {
        fare = outstationRoundTripFallbackTraditional(row, distance, pickupDate);
      } else {
        fare = computeOutstationOneWayFareFromRow(row, distance, viaStops);
      }
    } else if (tripType === 'airport') {
      const af = airportById.get(cab.id);
      const nid = normalizeVehicleId(cab.id);
      if (distance > 0) {
        fare = af
          ? computeAirportFareFromRow(af, nid, distance)
          : getAirportTransferFare(cab, distance);
      }
    } else if (tripType === 'tour') {
      fare =
        typeof cab.price === 'number' && cab.price > 0
          ? cab.price
          : (() => {
              const row = resolveOutstationFareRow(outstationAll, cab.id);
              return computeOutstationOneWayFareFromRow(row, distance);
            })();
    }

    const fareText = fare > 0 ? formatTrackFareRupee(fare) : 'Fare n/a';
    return { name: cab.name, fareText };
  });
}
