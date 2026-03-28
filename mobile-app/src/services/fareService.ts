/**
 * Fare calculation - same logic as web app (tiered pricing)
 * Uses same API base as adminAPI: API_BASE_URL or WEB_APP_BASE_URL
 */
import { Platform } from 'react-native';
import { API_BASE_URL, WEB_APP_BASE_URL } from '../config';
import { authAPI } from './authAPI';

const getBase = () => {
  if (API_BASE_URL) return API_BASE_URL;
  if (Platform.OS === 'web') return '';
  return WEB_APP_BASE_URL || 'https://www.vizagtaxihub.com';
};

const resolveBase = () =>
  (getBase() || 'https://www.vizagtaxihub.com').replace(/\/$/, '');

async function getFareUpdateHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Admin-Mode': 'true',
    'X-Force-Refresh': 'true',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Accept': 'application/json',
  };
  const token = await authAPI.getStoredToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/** POST JSON to URL - matches web directVehicleOperation exactly */
async function fareUpdatePost(
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string>
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const text = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      const snippet = text.includes('<!') ? 'HTML response' : text.slice(0, 100);
      return {
        ok: false,
        message: `HTTP ${res.status}. ${snippet}`,
      };
    }
    // Only treat as update success if we have update confirmation - NOT just a fares list
    // /api/outstation-fares.php returns {status, fares} - does NOT persist, so we must skip it
    const msg = (data?.message as string) || (data?.error as string);
    const statusOk = data?.status === 'success' || data?.success === true;
    const hasUpdateConfirm =
      (typeof msg === 'string' && /updated/i.test(msg)) ||
      (data?.data != null && typeof data.data === 'object');
    const success = statusOk && hasUpdateConfirm;
    return { ok: !!success, message: msg };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return { ok: false, message: err };
  }
}

export interface OutstationFare {
  basePrice: number;
  pricePerKm: number;
  driverAllowance: number;
  nightHaltCharge?: number;
  roundTripBasePrice?: number;
  roundTripPricePerKm?: number;
  /** Extra charge per km for distances beyond tier4 (149km) - matches web fareCalculationService */
  extraKmCharge?: number;
  tier1MinKm?: number;
  tier1MaxKm?: number;
  tier2MinKm?: number;
  tier2MaxKm?: number;
  tier3MinKm?: number;
  tier3MaxKm?: number;
  tier4MinKm?: number;
  tier4MaxKm?: number;
  tier1Price?: number;
  tier2Price?: number;
  tier3Price?: number;
  tier4Price?: number;
}

// Native: try primary URL first, then www/non-www fallback (API may live on different subdomain).
const getOutstationBaseUrls = (): string[] => {
  const base = getBase();
  if (Platform.OS === 'web' || !base) return [base || ''];
  const bases: string[] = [base];
  if (base.includes('vizagtaxihub.com')) {
    const alt = base.includes('www.') ? base.replace('www.', '') : base.replace('//', '//www.');
    if (alt !== base) bases.push(alt);
  }
  return bases;
};

// Admin Fares screen: fetch from SAME endpoint we write to (outstation-fares-update) for read-your-writes consistency.
// direct-outstation-fares uses PDO + JOIN; outstation-fares-update uses mysqli + same table we POST to.
// Putting update endpoint first ensures saved fares show correctly after save/refresh.
const OUTSTATION_PATHS = [
  '/api/admin/outstation-fares-update.php',
  '/api/admin/direct-outstation-fares.php',
  '/api/outstation-fares-proxy.php',
  '/api/outstation-fares.php',
];

// Web app Outstation Fare Management: Swift Dzire, Ertiga, Toyota Glanza, Innova Crysta, Tempo Traveller, Honda Amaze
const WEBAPP_VEHICLES = ['sedan', 'ertiga', 'toyota_glanza', 'innova_crysta', 'tempo_traveller', 'amaze'] as const;
const WEBAPP_VEHICLES_SET = new Set(WEBAPP_VEHICLES);
const VEHICLE_ALIAS_TO_CANONICAL: Record<string, string> = {
  swift_dzire: 'sedan',
  swiftdzire: 'sedan',
  toyota: 'toyota_glanza',
  glanza: 'toyota_glanza',
  innova: 'innova_crysta',
  tempo: 'tempo_traveller',
};

function filterToWebappVehicles<T>(obj: Record<string, T>): Record<string, T> {
  const result: Record<string, T> = {};
  for (const [k, v] of Object.entries(obj)) {
    const norm = k.toLowerCase().replace(/-/g, '_').trim();
    const canon = VEHICLE_ALIAS_TO_CANONICAL[norm] ?? (WEBAPP_VEHICLES_SET.has(norm as any) ? norm : null);
    // Prefer exact-key value over alias: if both "tempo" and "tempo_traveller" exist,
    // tempo_traveller's value should win (fixes local fare revert when DB has both rows)
    if (canon && (!(canon in result) || norm === canon)) result[canon] = v;
  }
  return result;
}

// Tier prices match web app generateDefaultOutstationFares (51–75 km tier2, etc.)
const FALLBACK_FARES: Record<string, OutstationFare> = {
  sedan: {
    basePrice: 4200,
    pricePerKm: 14,
    driverAllowance: 250,
    nightHaltCharge: 700,
    extraKmCharge: 14,
    tier1Price: 3500,
    tier2Price: 4200,
    tier3Price: 4900,
    tier4Price: 5600,
    tier1MinKm: 35,
    tier1MaxKm: 50,
    tier2MinKm: 51,
    tier2MaxKm: 75,
    tier3MinKm: 76,
    tier3MaxKm: 100,
    tier4MinKm: 101,
    tier4MaxKm: 149,
  },
  ertiga: {
    basePrice: 5400,
    pricePerKm: 18,
    driverAllowance: 250,
    nightHaltCharge: 1000,
    extraKmCharge: 18,
    tier1Price: 4500,
    tier2Price: 5400,
    tier3Price: 6300,
    tier4Price: 7200,
    tier1MinKm: 35,
    tier1MaxKm: 50,
    tier2MinKm: 51,
    tier2MaxKm: 75,
    tier3MinKm: 76,
    tier3MaxKm: 100,
    tier4MinKm: 101,
    tier4MaxKm: 149,
  },
  innova_crysta: {
    basePrice: 6000,
    pricePerKm: 20,
    driverAllowance: 250,
    nightHaltCharge: 1000,
    extraKmCharge: 20,
    tier1Price: 5500,
    tier2Price: 6500,
    tier3Price: 7500,
    tier4Price: 8500,
    tier1MinKm: 35,
    tier1MaxKm: 50,
    tier2MinKm: 51,
    tier2MaxKm: 75,
    tier3MinKm: 76,
    tier3MaxKm: 100,
    tier4MinKm: 101,
    tier4MaxKm: 149,
  },
  tempo_traveller: {
    basePrice: 10500,
    pricePerKm: 35,
    driverAllowance: 300,
    nightHaltCharge: 1500,
    extraKmCharge: 35,
    tier1Price: 6500,
    tier2Price: 7800,
    tier3Price: 9100,
    tier4Price: 10400,
    tier1MinKm: 35,
    tier1MaxKm: 50,
    tier2MinKm: 51,
    tier2MaxKm: 75,
    tier3MinKm: 76,
    tier3MaxKm: 100,
    tier4MinKm: 101,
    tier4MaxKm: 149,
  },
  tempo: {
    basePrice: 9000,
    pricePerKm: 22,
    driverAllowance: 300,
    nightHaltCharge: 1500,
    tier1Price: 6500,
    tier2Price: 7800,
    tier3Price: 9100,
    tier4Price: 10400,
    tier1MinKm: 35,
    tier1MaxKm: 50,
    tier2MinKm: 51,
    tier2MaxKm: 75,
    tier3MinKm: 76,
    tier3MaxKm: 100,
    tier4MinKm: 101,
    tier4MaxKm: 149,
  },
  toyota: {
    basePrice: 4200,
    pricePerKm: 14,
    driverAllowance: 250,
    nightHaltCharge: 700,
    tier1Price: 3500,
    tier2Price: 4200,
    tier3Price: 4900,
    tier4Price: 5600,
    tier1MinKm: 35,
    tier1MaxKm: 50,
    tier2MinKm: 51,
    tier2MaxKm: 75,
    tier3MinKm: 76,
    tier3MaxKm: 100,
    tier4MinKm: 101,
    tier4MaxKm: 149,
  },
  toyota_glanza: {
    basePrice: 4200,
    pricePerKm: 14,
    driverAllowance: 250,
    nightHaltCharge: 700,
    tier1Price: 3500,
    tier2Price: 4200,
    tier3Price: 4900,
    tier4Price: 5600,
    tier1MinKm: 35,
    tier1MaxKm: 50,
    tier2MinKm: 51,
    tier2MaxKm: 75,
    tier3MinKm: 76,
    tier3MaxKm: 100,
    tier4MinKm: 101,
    tier4MaxKm: 149,
  },
  glanza: {
    basePrice: 4200,
    pricePerKm: 14,
    driverAllowance: 250,
    nightHaltCharge: 700,
    tier1Price: 3500,
    tier2Price: 4200,
    tier3Price: 4900,
    tier4Price: 5600,
    tier1MinKm: 35,
    tier1MaxKm: 50,
    tier2MinKm: 51,
    tier2MaxKm: 75,
    tier3MinKm: 76,
    tier3MaxKm: 100,
    tier4MinKm: 101,
    tier4MaxKm: 149,
  },
  amaze: {
    basePrice: 4200,
    pricePerKm: 14,
    driverAllowance: 300,
    nightHaltCharge: 700,
    tier1Price: 3500,
    tier2Price: 4200,
    tier3Price: 4900,
    tier4Price: 5600,
    tier1MinKm: 35,
    tier1MaxKm: 50,
    tier2MinKm: 51,
    tier2MaxKm: 75,
    tier3MinKm: 76,
    tier3MaxKm: 100,
    tier4MinKm: 101,
    tier4MaxKm: 149,
  },
  luxury: {
    basePrice: 10500,
    pricePerKm: 25,
    driverAllowance: 300,
    nightHaltCharge: 1000,
    tier1Price: 6500,
    tier2Price: 7800,
    tier3Price: 9100,
    tier4Price: 10400,
    tier1MinKm: 35,
    tier1MaxKm: 50,
    tier2MinKm: 51,
    tier2MaxKm: 75,
    tier3MinKm: 76,
    tier3MaxKm: 100,
    tier4MinKm: 101,
    tier4MaxKm: 149,
  },
  innova: {
    basePrice: 6000,
    pricePerKm: 20,
    driverAllowance: 250,
    nightHaltCharge: 1000,
    tier1Price: 5000,
    tier2Price: 6000,
    tier3Price: 7000,
    tier4Price: 8000,
    tier1MinKm: 35,
    tier1MaxKm: 50,
    tier2MinKm: 51,
    tier2MaxKm: 75,
    tier3MinKm: 76,
    tier3MaxKm: 100,
    tier4MinKm: 101,
    tier4MaxKm: 149,
  },
};

// Resolve fallback fare for a vehicle key (e.g. swift_dzire -> sedan)
function getFallbackForKey(key: string): OutstationFare {
  const fb = FALLBACK_FARES[key as keyof typeof FALLBACK_FARES];
  if (fb) return fb;
  if (key.includes('swift') || key.includes('dzire') || key.includes('glanza') || key.includes('amaze') || key.includes('etios'))
    return FALLBACK_FARES.sedan;
  if (key.includes('ertiga')) return FALLBACK_FARES.ertiga;
  if (key.includes('innova') || key.includes('crysta')) return FALLBACK_FARES.innova_crysta;
  if (key.includes('tempo') || key.includes('traveller')) return FALLBACK_FARES.tempo_traveller;
  return FALLBACK_FARES.sedan;
}

/** Fleet DB primary keys (e.g. "3") must not index into fare maps built from array responses (keys "0","1","2"). */
export function isNumericFleetIdOnly(id: string): boolean {
  const s = String(id ?? '').trim();
  return s.length > 0 && /^\d+$/.test(s);
}

function inferVehicleSlugFromFareRow(row: Record<string, unknown>): string {
  const name = String(row.name ?? row.displayName ?? '').toLowerCase();
  if (name.includes('glanza')) return 'toyota_glanza';
  if (name.includes('swift') || name.includes('dzire')) return 'sedan';
  if (name.includes('amaze')) return 'amaze';
  if (name.includes('ertiga')) return 'ertiga';
  if (name.includes('innova') || name.includes('crysta')) return 'innova_crysta';
  if (name.includes('tempo') || name.includes('traveller')) return 'tempo_traveller';
  return '';
}

function parseFares(raw: any): Record<string, OutstationFare> {
  const faresRaw = raw?.fares ?? raw;
  if (faresRaw == null || typeof faresRaw !== 'object') return {};

  let entryPairs: [string, any][];
  if (Array.isArray(faresRaw)) {
    entryPairs = [];
    for (const item of faresRaw) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      let key = String(row.vehicleId ?? row.vehicle_id ?? row.vehicleType ?? row.vehicle_type ?? '')
        .toLowerCase()
        .replace(/-/g, '_')
        .replace(/\s+/g, '_')
        .trim();
      if (!key || isNumericFleetIdOnly(key)) {
        key = inferVehicleSlugFromFareRow(row);
      }
      if (!key) continue;
      entryPairs.push([key, item]);
    }
  } else {
    // Drop pure numeric keys — same collision as array indices when a client mistakes row order for vehicle id.
    entryPairs = Object.entries(faresRaw).filter(([k]) => !isNumericFleetIdOnly(String(k)));
  }

  return Object.fromEntries(
    entryPairs.map(([k, v]: [string, any]) => {
      const key = String(k).toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_').trim();
      const fallback = getFallbackForKey(key);
      // direct-outstation-fares uses oneWayBasePrice; outstation-fares uses base_price
      const basePrice = Number(v.basePrice ?? v.base_fare ?? v.oneWayBasePrice ?? 0);
      const pricePerKm = Number(v.pricePerKm ?? v.price_per_km ?? v.oneWayPricePerKm ?? 0);
      const driverAllowance = Number(v.driverAllowance ?? v.driver_allowance ?? 250);
      const nightHaltCharge = Number(v.nightHaltCharge ?? v.night_halt_charge ?? 700);
      const roundTripBasePrice = Number(v.roundTripBasePrice ?? v.roundtrip_base_price ?? 0);
      const roundTripPricePerKm = Number(v.roundTripPricePerKm ?? v.roundtrip_price_per_km ?? 0);
      if (basePrice <= 0 && pricePerKm <= 0) {
        return [key, fallback];
      }
      // Read tier prices (camelCase and snake_case) - only include when API provides them
      const tier1 = Number(v.tier1Price ?? v.tier1_price ?? 0) || undefined;
      const tier2 = Number(v.tier2Price ?? v.tier2_price ?? 0) || undefined;
      const tier3 = Number(v.tier3Price ?? v.tier3_price ?? 0) || undefined;
      const tier4 = Number(v.tier4Price ?? v.tier4_price ?? 0) || undefined;
      const extraKmChargeVal = Number(v.extraKmCharge ?? v.extra_km_charge ?? 0) || undefined;
      const parsed: OutstationFare = {
        basePrice,
        pricePerKm,
        driverAllowance,
        nightHaltCharge: nightHaltCharge || undefined,
        roundTripBasePrice: roundTripBasePrice || undefined,
        roundTripPricePerKm: roundTripPricePerKm || undefined,
        extraKmCharge: extraKmChargeVal ?? fallback.extraKmCharge,
        tier1MinKm: v.tier1MinKm ?? v.tier1_min_km ?? fallback.tier1MinKm,
        tier1MaxKm: v.tier1MaxKm ?? v.tier1_max_km ?? fallback.tier1MaxKm,
        tier2MinKm: v.tier2MinKm ?? v.tier2_min_km ?? fallback.tier2MinKm,
        tier2MaxKm: v.tier2MaxKm ?? v.tier2_max_km ?? fallback.tier2MaxKm,
        tier3MinKm: v.tier3MinKm ?? v.tier3_min_km ?? fallback.tier3MinKm,
        tier3MaxKm: v.tier3MaxKm ?? v.tier3_max_km ?? fallback.tier3MaxKm,
        tier4MinKm: v.tier4MinKm ?? v.tier4_min_km ?? fallback.tier4MinKm,
        tier4MaxKm: v.tier4MaxKm ?? v.tier4_max_km ?? fallback.tier4MaxKm,
      };
      // Only overwrite tier prices when API provides them; otherwise keep fallback values
      if (tier1 != null && tier1 > 0) parsed.tier1Price = tier1;
      if (tier2 != null && tier2 > 0) parsed.tier2Price = tier2;
      if (tier3 != null && tier3 > 0) parsed.tier3Price = tier3;
      if (tier4 != null && tier4 > 0) parsed.tier4Price = tier4;
      // Merge with fallback so missing tier prices use web app defaults
      return [key, { ...fallback, ...parsed }];
    })
  );
}

// Vehicle ID aliases: API may key by "sedan" or "swift_dzire" - ensure both find the same fare
const SEDAN_ALIASES = ['sedan', 'swift_dzire', 'swift', 'dzire', 'glanza', 'toyota_glanza', 'amaze', 'etios'];
const ERTIGA_ALIASES = ['ertiga'];
const INNOVA_ALIASES = ['innova_crysta', 'innova'];
const TEMPO_ALIASES = ['tempo_traveller', 'tempo'];

function expandVehicleAliases(
  fares: Record<string, OutstationFare>,
  fromApi?: Set<string>
): Record<string, OutstationFare> {
  const result = { ...fares };
  const apiKeys = fromApi ?? new Set<string>();
  for (const group of [SEDAN_ALIASES, ERTIGA_ALIASES, INNOVA_ALIASES, TEMPO_ALIASES]) {
    // Prefer API-sourced fare (has tier prices from DB) over FALLBACK
    const withData = group.filter((k) => result[k] && (result[k].tier2Price != null || result[k].basePrice > 0));
    const sedanHasData =
      group === SEDAN_ALIASES &&
      result['sedan'] &&
      (result['sedan'].tier2Price != null || result['sedan'].basePrice > 0);
    const best =
      (sedanHasData ? 'sedan' : undefined) ??
      withData.find((k) => apiKeys.has(k)) ?? // Prefer API key
      withData[0]; // Else use first with data
    if (best && result[best]) {
      for (const alias of group) {
        const aliasFare = result[alias];
        const missingTier = aliasFare?.tier2Price == null && result[best].tier2Price != null;
        const apiOverridesFallback = apiKeys.has(best) && !apiKeys.has(alias);
        if (!aliasFare || missingTier || (apiOverridesFallback && aliasFare.basePrice === result[best].basePrice)) {
          result[alias] = result[best];
        }
      }
      // DB often has mis-tiered toyota_glanza while sedan/swift_dzire are correct — always align Glanza to sedan tier.
      if (group === SEDAN_ALIASES && best === 'sedan') {
        result['glanza'] = result['sedan'];
        result['toyota_glanza'] = result['sedan'];
      }
    }
  }
  return result;
}

// Headers matching web outstationFareService.fetchAllOutstationFares - some APIs expect these.
const OUTSTATION_HEADERS: Record<string, string> = {
  'X-Requested-With': 'XMLHttpRequest',
  'X-Admin-Mode': 'true',
  'X-Force-Refresh': 'true',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
};

export async function getOutstationFares(): Promise<Record<string, OutstationFare>> {
  const bases = getOutstationBaseUrls();
  const ts = Date.now();
  const rnd = Math.random().toString(36).slice(2, 8);
  for (const base of bases) {
    for (const path of OUTSTATION_PATHS) {
      try {
        const isDirect = path.includes('direct-outstation');
        const queryObj: Record<string, string> = {
          force: 'true',
          _t: String(ts),
          _r: rnd,
          force_refresh: 'true',
        };
        if (isDirect) {
          queryObj.includeInactive = 'true';
        }
        const params = new URLSearchParams(queryObj);
        const url = `${base}${path}?${params.toString()}`;
        const res = await fetch(url, { headers: OUTSTATION_HEADERS, cache: 'no-store' });
        if (!res.ok) continue;
        const text = await res.text();
        const data = JSON.parse(text.trim());
        const parsed = parseFares(data);
        if (Object.keys(parsed).length > 0) {
          return filterToWebappVehicles(
            expandVehicleAliases(
              { ...FALLBACK_FARES, ...parsed },
              new Set(Object.keys(parsed))
            )
          );
        }
      } catch {
        continue;
      }
    }
  }
  return filterToWebappVehicles(expandVehicleAliases({ ...FALLBACK_FARES }));
}

/**
 * Outstation one-way fare - matches web useFare.ts one-way logic exactly.
 * - Tier ranges: tier1 35–50, tier2 51–75, tier3 76–100, tier4 101–149 km
 * - Beyond tier4: oneWayBasePrice + (distance - 150) * 2 * extraKmCharge (web uses baseDistance 150 and roundTripExtraKm)
 * - Below tier1: oneWayBasePrice + max(0, distance - tier1Min) * extraKmCharge
 */
export function calculateOutstationFare(fare: OutstationFare, distanceKm: number): number {
  const driverAllowance = fare.driverAllowance ?? 250;
  const extraKmCharge = fare.extraKmCharge ?? fare.pricePerKm ?? 0;
  const tier1Min = fare.tier1MinKm ?? 35;
  const tier1Max = fare.tier1MaxKm ?? 50;
  const tier2Min = fare.tier2MinKm ?? 51;
  const tier2Max = fare.tier2MaxKm ?? 75;
  const tier3Min = fare.tier3MinKm ?? 76;
  const tier3Max = fare.tier3MaxKm ?? 100;
  const tier4Min = fare.tier4MinKm ?? 101;
  const tier4Max = fare.tier4MaxKm ?? 149;
  const basePrice = fare.basePrice ?? 0;

  let totalBase = 0;
  let extraDistanceFare = 0;

  if (distanceKm >= tier1Min && distanceKm <= tier1Max) {
    totalBase = fare.tier1Price ?? basePrice;
  } else if (distanceKm >= tier2Min && distanceKm <= tier2Max) {
    totalBase = fare.tier2Price ?? basePrice * 1.2;
  } else if (distanceKm >= tier3Min && distanceKm <= tier3Max) {
    totalBase = fare.tier3Price ?? basePrice * 1.4;
  } else if (distanceKm >= tier4Min && distanceKm <= tier4Max) {
    totalBase = fare.tier4Price ?? basePrice * 1.6;
  } else if (distanceKm > tier4Max) {
    // Web useFare: baseDistance=150, extraKm*2 (roundTripExtraKm), oneWayBasePrice
    totalBase = basePrice;
    const baseDistance = 150;
    const extraKm = Math.max(0, distanceKm - baseDistance);
    const roundTripExtraKm = extraKm * 2;
    extraDistanceFare = roundTripExtraKm * extraKmCharge;
  } else {
    totalBase = basePrice;
    const extraKm = Math.max(0, distanceKm - tier1Min);
    extraDistanceFare = extraKm * extraKmCharge;
  }

  return Math.round(totalBase + extraDistanceFare + driverAllowance);
}

/**
 * Round-trip fare breakdown - matches web app fareCalculationService exactly:
 * - includedKM = calendarDays × 300
 * - baseFare = includedKM × perKmRate (one-way rate)
 * - extraDistance = max(0, actualDistance - includedKM)
 * - extraDistanceCharges = extraDistance × perKmRate
 * - nightAllowance = (calendarDays - 1) × nightHaltCharge
 * - driverAllowance = calendarDays × driverAllowancePerDay
 */
export interface OutstationRoundTripBreakdown {
  calendarDays: number;
  includedKM: number;
  baseFare: number;
  extraDistance: number;
  extraDistanceCharges: number;
  nightAllowance: number;
  driverAllowance: number;
  totalFare: number;
}

export function calculateOutstationRoundTripFare(
  fare: OutstationFare,
  oneWayDistanceKm: number,
  pickupDate?: Date,
  returnDate?: Date
): number {
  const b = calculateOutstationRoundTripBreakdown(
    fare,
    oneWayDistanceKm,
    pickupDate ?? new Date(),
    returnDate ?? new Date()
  );
  return Math.round(b.totalFare);
}

export function calculateOutstationRoundTripBreakdown(
  fare: OutstationFare,
  oneWayDistanceKm: number,
  pickupDate: Date,
  returnDate: Date
): OutstationRoundTripBreakdown {
  const perKmRate = fare.pricePerKm ?? 14;
  const nightAllowancePerNight = fare.nightHaltCharge ?? 700;
  const driverAllowancePerDay = fare.driverAllowance ?? 250;
  const actualDistance = oneWayDistanceKm * 2;

  const pickupDateOnly = new Date(pickupDate.getFullYear(), pickupDate.getMonth(), pickupDate.getDate());
  const returnDateOnly = new Date(returnDate.getFullYear(), returnDate.getMonth(), returnDate.getDate());
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const dayDiff = Math.floor((returnDateOnly.getTime() - pickupDateOnly.getTime()) / MS_PER_DAY);
  const calendarDays = Math.max(1, dayDiff + 1);

  const includedKM = calendarDays * 300;
  const baseFare = includedKM * perKmRate;
  const extraDistance = Math.max(0, actualDistance - includedKM);
  const extraDistanceCharges = extraDistance * perKmRate;
  const nightAllowance = (calendarDays - 1) * nightAllowancePerNight;
  const driverAllowance = calendarDays * driverAllowancePerDay;
  const totalFare = baseFare + extraDistanceCharges + nightAllowance + driverAllowance;

  return {
    calendarDays,
    includedKM,
    baseFare,
    extraDistance,
    extraDistanceCharges,
    nightAllowance,
    driverAllowance,
    totalFare,
  };
}

export interface OutstationFareBreakdown {
  basePrice: number;
  driverAllowance: number;
  extraDistanceFare: number;
  extraKmDisplay: number; // km shown in "Extra distance charges (X KM)"
  total: number;
}

// --- Local package fares (matches web packageData.ts) ---
export type LocalPackageMatrix = Record<string, Record<string, number>>;

// Must match web app & local_package_fares.php defaults (Swift Dzire ₹2500, Ertiga ₹3000, Innova Crysta ₹3800)
const DEFAULT_LOCAL_MATRIX: LocalPackageMatrix = {
  '4hrs-40km': {
    sedan: 1500,
    swift_dzire: 1500,
    swiftdzire: 1500,
    ertiga: 1800,
    innova_crysta: 2300,
    innova: 2300,
    tempo: 2700,
    tempo_traveller: 2700,
    luxury: 3300,
    amaze: 1500,
    dzire: 1500,
    swift: 1500,
    glanza: 1500,
    toyota_glanza: 1500,
    toyota: 1500,
    etios: 1500,
  },
  '8hrs-80km': {
    sedan: 2500,
    swift_dzire: 2500,
    swiftdzire: 2500,
    ertiga: 3000,
    innova_crysta: 3800,
    innova: 3800,
    tempo: 4500,
    tempo_traveller: 4500,
    luxury: 5500,
    amaze: 2500,
    dzire: 2500,
    swift: 2500,
    glanza: 2500,
    toyota_glanza: 2500,
    toyota: 2500,
    etios: 2500,
  },
  '10hrs-100km': {
    sedan: 3000,
    swift_dzire: 3000,
    swiftdzire: 3000,
    ertiga: 3600,
    innova_crysta: 4500,
    innova: 4500,
    tempo: 5500,
    tempo_traveller: 5500,
    luxury: 6500,
    amaze: 3000,
    dzire: 3000,
    swift: 3000,
    glanza: 3000,
    toyota_glanza: 3000,
    toyota: 3000,
    etios: 3000,
  },
};

// MUST read from same source we WRITE to (admin/direct-local-fares.php) for read-your-writes consistency.
// Avoid local-fares.php which can fall back to vehicle_pricing (stale after our direct-local-fares POST).
const LOCAL_FARE_PATHS: { path: string; params: Record<string, string> }[] = [
  { path: '/api/admin/direct-local-fares.php', params: {} },
  { path: '/api/direct-local-fares.php', params: {} },
  { path: '/api/local-package-fares.php', params: {} },
  { path: '/api/local-fares.php', params: { force: 'true', source: 'local_package_fares' } },
];

const LOCAL_HEADERS: Record<string, string> = {
  'X-Requested-With': 'XMLHttpRequest',
  'X-Admin-Mode': 'true',
  'X-Force-Refresh': 'true',
  'Accept': 'application/json',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
};

export type LocalFareExtras = Record<string, { extraKm: number; extraHour: number }>;

function parseLocalFaresFromApi(data: unknown): { matrix: LocalPackageMatrix; extras: LocalFareExtras } | null {
  const d = data as Record<string, unknown> | null | undefined;
  const fares = d?.fares ?? d?.matrix ?? d?.data ?? data;
  if (!fares || typeof fares !== 'object') return null;

  const parsed: LocalPackageMatrix = { '4hrs-40km': {}, '8hrs-80km': {}, '10hrs-100km': {} };
  const extras: LocalFareExtras = {};

  // direct-local-fares.php returns fares as array; local-fares.php returns object keyed by vehicle_id
  if (Array.isArray(fares)) {
    for (const row of fares) {
      const r = row as Record<string, unknown>;
      const vehicleId = String(r?.vehicle_id ?? r?.vehicleId ?? r?.id ?? '').toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_').trim();
      if (!vehicleId) continue;
      const p4 = Number(r?.price_4hrs_40km ?? r?.price4hrs40km ?? r?.price_4hr_40km ?? r?.package4hr40km ?? 0);
      const p8 = Number(r?.price_8hrs_80km ?? r?.price8hrs80km ?? r?.price_8hr_80km ?? r?.package8hr80km ?? r?.local_package_8hr ?? 0);
      const p10 = Number(r?.price_10hrs_100km ?? r?.price10hrs100km ?? r?.price_10hr_100km ?? 0);
      const extraKm = Number(r?.price_extra_km ?? r?.priceExtraKm ?? r?.extraKmRate ?? r?.extra_km_charge ?? 0);
      const extraHour = Number(r?.price_extra_hour ?? r?.priceExtraHour ?? r?.extraHourRate ?? r?.extra_hour_charge ?? 0);
      if (p4 >= 0) parsed['4hrs-40km'][vehicleId] = p4;
      if (p8 > 0) parsed['8hrs-80km'][vehicleId] = p8;
      if (p10 > 0) parsed['10hrs-100km'][vehicleId] = p10;
      if (extraKm > 0 || extraHour > 0) extras[vehicleId] = { extraKm: extraKm || 15, extraHour: extraHour || 250 };
    }
  } else {
    const entries = Object.entries(fares as Record<string, unknown>);
    const firstVal = entries[0]?.[1];
    if (typeof firstVal === 'object' && firstVal !== null && ('price8hrs80km' in firstVal || 'price_8hr_80km' in firstVal)) {
      for (const [vehicleId, row] of entries) {
        const v = row as Record<string, unknown>;
        const vid = String(vehicleId).toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_').trim();
        const p4 = Number(v?.price_4hrs_40km ?? v?.price4hrs40km ?? 0);
        const p8 = Number(v?.price_8hrs_80km ?? v?.price8hrs80km ?? v?.price_8hr_80km ?? v?.package8hr80km ?? v?.local_package_8hr ?? 0);
        const p10 = Number(v?.price_10hrs_100km ?? v?.price10hrs100km ?? v?.price_10hr_100km ?? 0);
        const extraKm = Number(v?.price_extra_km ?? v?.priceExtraKm ?? 0);
        const extraHour = Number(v?.price_extra_hour ?? v?.priceExtraHour ?? 0);
        if (p4 > 0) parsed['4hrs-40km'][vid] = p4;
        if (p8 > 0) parsed['8hrs-80km'][vid] = p8;
        if (p10 > 0) parsed['10hrs-100km'][vid] = p10;
        if (extraKm > 0 || extraHour > 0) extras[vid] = { extraKm: extraKm || 15, extraHour: extraHour || 250 };
      }
    } else {
      for (const [pkgId, cabMap] of entries) {
        const nid = normalizePackageId(String(pkgId));
        parsed[nid] = parsed[nid] || {};
        if (cabMap && typeof cabMap === 'object') {
          for (const [cab, price] of Object.entries(cabMap as Record<string, unknown>)) {
            const cabKey = String(cab).toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_').trim();
            parsed[nid][cabKey] = Number(price) || 0;
          }
        }
      }
    }
  }

  const hasData =
    Object.keys(parsed['4hrs-40km'] || {}).length > 0 ||
    Object.keys(parsed['8hrs-80km']).length > 0 ||
    Object.keys(parsed['10hrs-100km']).length > 0;
  return hasData ? { matrix: parsed, extras } : null;
}

// Merge API data with defaults. Only use API values when reasonable (avoid mock/bad data overwriting).
const MIN_VALID_4HR = 0; // Allow 0 for "no 4hr package"
const MIN_VALID_8HR = 1000;
const MIN_VALID_10HR = 1200;
function mergeLocalFaresWithDefaults(parsed: LocalPackageMatrix): LocalPackageMatrix {
  const sanitize = (apiMap: Record<string, number>, defaultMap: Record<string, number>, minValid: number) => {
    const out = { ...defaultMap };
    for (const [k, v] of Object.entries(apiMap)) {
      if (typeof v === 'number' && v >= minValid) out[k] = v;
    }
    return out;
  };
  return {
    '4hrs-40km': sanitize(parsed['4hrs-40km'] || {}, DEFAULT_LOCAL_MATRIX['4hrs-40km'] || {}, MIN_VALID_4HR),
    '8hrs-80km': sanitize(parsed['8hrs-80km'] || {}, DEFAULT_LOCAL_MATRIX['8hrs-80km'], MIN_VALID_8HR),
    '10hrs-100km': sanitize(parsed['10hrs-100km'] || {}, DEFAULT_LOCAL_MATRIX['10hrs-100km'], MIN_VALID_10HR),
  };
}

export type LocalFaresResult = { matrix: LocalPackageMatrix; extras: LocalFareExtras };

export async function getLocalPackageFares(): Promise<LocalFaresResult> {
  const bases = getOutstationBaseUrls();
  for (const base of bases) {
    for (const { path, params } of LOCAL_FARE_PATHS) {
      try {
        const targetUrl = base.replace(/\/$/, '') + path;
        const queryParams: Record<string, string> = {
          _t: Date.now().toString(),
          _r: Math.random().toString(36).slice(2),
          force_refresh: 'true',
        };
        if (params) for (const [k, v] of Object.entries(params)) if (typeof v === 'string') queryParams[k] = v;
        const qs = new URLSearchParams(queryParams);
        const res = await fetch(`${targetUrl}?${qs.toString()}`, {
          headers: LOCAL_HEADERS,
          cache: 'no-store',
        });
        if (!res.ok) continue;
        const data = await res.json();
        const parsed = parseLocalFaresFromApi(data);
        if (parsed) {
          const mergedMatrix = mergeLocalFaresWithDefaults(parsed.matrix);
          const filtered: LocalPackageMatrix = {};
          for (const [pkg, cabMap] of Object.entries(mergedMatrix)) {
            filtered[pkg] = filterToWebappVehicles(cabMap);
          }
          return { matrix: filtered, extras: parsed.extras };
        }
      } catch {
        continue;
      }
    }
  }
  return { matrix: { ...DEFAULT_LOCAL_MATRIX }, extras: {} };
}

function normalizeCabForLocal(cabName: string): string[] {
  const n = cabName.toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_').trim();
  const keys: string[] = [n];
  if (n.includes('swift') || n.includes('dzire') || n.includes('amaze') || n.includes('glanza') || n.includes('etios')) keys.push('sedan', 'toyota_glanza', 'glanza');
  if (n.includes('ertiga')) keys.push('ertiga');
  if (n.includes('innova')) keys.push('innova_crysta', 'innova');
  if (n.includes('tempo')) keys.push('tempo_traveller', 'tempo');
  if (n.includes('luxury')) keys.push('luxury');
  return keys;
}

function normalizePackageId(pkg: string): string {
  const l = (pkg || '').toLowerCase();
  if (l.includes('10hr') || l.includes('10 hr')) return '10hrs-100km';
  if (l.includes('8hr') || l.includes('08hr') || l.includes('8 hr')) return '8hrs-80km';
  return '8hrs-80km';
}

// Fleet API may return "tempo" but fares are stored as "tempo_traveller" - try both
const LOCAL_VEHICLE_ID_ALIASES: Record<string, string[]> = {
  tempo: ['tempo_traveller', 'tempo'],
  tempo_traveller: ['tempo_traveller', 'tempo'],
  innova: ['innova_crysta', 'innova'],
  innova_crysta: ['innova_crysta', 'innova'],
  glanza: ['toyota_glanza', 'glanza'],
  toyota_glanza: ['toyota_glanza', 'glanza'],
  swift_dzire: ['sedan', 'swift_dzire'],
  sedan: ['sedan', 'swift_dzire'],
};

export function calculateLocalFare(
  matrix: LocalPackageMatrix,
  packageId: string,
  cabName: string,
  vehicleId?: string
): number {
  const pkg = normalizePackageId(packageId);
  const pkgMap = matrix[pkg] || matrix['8hrs-80km'];
  // Try vehicle ID first - use aliases so "tempo" from fleet finds "tempo_traveller" in fare matrix
  if (vehicleId) {
    const vid = String(vehicleId).toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_').trim();
    if (vid && !isNumericFleetIdOnly(vid)) {
      const keysToTry = LOCAL_VEHICLE_ID_ALIASES[vid] ?? [vid];
      for (const k of keysToTry) {
        const price = pkgMap?.[k];
        if (typeof price === 'number' && price > 0) return price;
      }
    }
  }
  const cabKeys = normalizeCabForLocal(cabName);
  for (const k of cabKeys) {
    const price = pkgMap?.[k];
    if (typeof price === 'number' && price > 0) return price;
  }
  return pkgMap?.sedan ?? pkgMap?.ertiga ?? 2500;
}

// --- Airport fares (MUST match web useFare.ts + fareCalculationService) ---
// Web uses getAirportFaresForVehicle → tiers ≤10, ≤20, ≤30, ≤40 km with tier1-4 prices from API
// Fallbacks when API fails: sedan 1200/1800/2400/1500, ertiga 18/km, sedan 14/km

export interface AirportFare {
  basePrice?: number;
  pricePerKm?: number;
  pickupPrice?: number;
  dropPrice?: number;
  tier1Price?: number;
  tier2Price?: number;
  tier3Price?: number;
  tier4Price?: number;
  extraKmCharge?: number;
}

const AIRPORT_FARE_PATHS = [
  '/api/admin/direct-airport-fares.php',
  '/api/direct-airport-fares.php',
  '/api/airport-fares.php',
];

const AIRPORT_HEADERS: Record<string, string> = {
  'X-Requested-With': 'XMLHttpRequest',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
};

// Vehicle alias groups for airport fares - ensure Glanza/Ertiga/Innova etc. resolve correctly
const AIRPORT_ALIAS_GROUPS: Record<string, string[]> = {
  swift_dzire: ['sedan', 'swift', 'dzire', 'amaze', 'etios'],
  toyota_glanza: ['glanza', 'toyota'],
  innova_crysta: ['innova'],
  tempo_traveller: ['tempo'],
};

function expandAirportFareAliases(map: Record<string, AirportFare>): Record<string, AirportFare> {
  const out = { ...map };
  for (const [canonical, aliases] of Object.entries(AIRPORT_ALIAS_GROUPS)) {
    const fare = map[canonical];
    if (fare && (fare.tier1Price ?? fare.tier2Price ?? fare.pickupPrice ?? fare.dropPrice ?? 0) > 0) {
      for (const alias of aliases) {
        if (!out[alias] || (out[alias].tier1Price ?? 0) === 0) out[alias] = fare;
      }
    }
  }
  return out;
}

function parseAirportFaresFromApi(data: unknown): Record<string, AirportFare> | null {
  const raw = (data as { fares?: unknown })?.fares ?? data;
  if (!raw || typeof raw !== 'object') return null;
  const result: Record<string, AirportFare> = {};
  const toFare = (row: unknown): AirportFare => {
    const r = row as Record<string, unknown>;
    return {
      basePrice: Number(r?.basePrice ?? r?.base_price ?? 0),
      pricePerKm: Number(r?.pricePerKm ?? r?.price_per_km ?? 0),
      pickupPrice: Number(r?.pickupPrice ?? r?.pickup_price ?? 0),
      dropPrice: Number(r?.dropPrice ?? r?.drop_price ?? 0),
      tier1Price: Number(r?.tier1Price ?? r?.tier1_price ?? 0),
      tier2Price: Number(r?.tier2Price ?? r?.tier2_price ?? 0),
      tier3Price: Number(r?.tier3Price ?? r?.tier3_price ?? 0),
      tier4Price: Number(r?.tier4Price ?? r?.tier4_price ?? 0),
      extraKmCharge: Number(r?.extraKmCharge ?? r?.extra_km_charge ?? 0),
    };
  };
  if (Array.isArray(raw)) {
    for (const row of raw) {
      const vid = String((row as { vehicle_id?: string; vehicleId?: string })?.vehicle_id ?? (row as { vehicleId?: string })?.vehicleId ?? '').toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_').trim();
      if (vid) result[vid] = toFare(row);
    }
  } else {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const vid = String(k).toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_').trim();
      if (v && typeof v === 'object') result[vid] = toFare(v);
    }
  }
  return Object.keys(result).length > 0 ? expandAirportFareAliases(result) : null;
}

export async function getAirportFares(): Promise<Record<string, AirportFare>> {
  const bases = getOutstationBaseUrls();
  const params = new URLSearchParams({
    force: 'true',
    source: 'airport_transfer_fares',
    _t: String(Date.now()),
  });
  for (const base of bases) {
    for (const path of AIRPORT_FARE_PATHS) {
      try {
        const url = `${base.replace(/\/$/, '')}${path}?${params.toString()}`;
        const res = await fetch(url, { headers: AIRPORT_HEADERS, cache: 'no-store' });
        if (!res.ok) continue;
        const data = await res.json();
        const parsed = parseAirportFaresFromApi(data);
        if (parsed && Object.keys(parsed).length > 0) return filterToWebappVehicles(parsed);
      } catch {
        continue;
      }
    }
  }
  return {};
}

// Web useFare.ts logic: distance <=10 → tier1, <=20 → tier2, <=30 → tier3, <=40 → tier4, else tier4 + extra km
// For short distance, use pickupPrice/dropPrice when tier1 is 0 (DB may store short-hop fares there)
function calculateAirportFareFromTiers(fare: AirportFare, distance: number): number {
  const extraKmCharge = fare.extraKmCharge ?? (fare.pricePerKm ?? 14);
  let basePrice = 0;
  if (distance <= 10) {
    const tier1 = fare.tier1Price ?? 0;
    const pickupDrop = Math.max(fare.pickupPrice ?? 0, fare.dropPrice ?? 0);
    basePrice = tier1 > 0 ? tier1 : pickupDrop > 0 ? pickupDrop : 1200;
  } else if (distance <= 20) {
    basePrice = fare.tier2Price ?? 1800;
  } else if (distance <= 30) {
    basePrice = fare.tier3Price ?? 2400;
  } else if (distance <= 40) {
    basePrice = fare.tier4Price ?? 1500;
  } else {
    basePrice = (fare.tier4Price ?? 1500) + (distance - 40) * extraKmCharge;
  }
  return Math.round(basePrice);
}

// Web useFare fallbacks when API fails - match web display (2km: Swift/Glanza sedan 840, Ertiga 1200, Innova 1500)
const AIRPORT_FALLBACK: Record<string, { tier1: number; tier2: number; tier3: number; tier4: number; extraKm: number }> = {
  sedan: { tier1: 840, tier2: 1200, tier3: 1500, tier4: 1800, extraKm: 14 },
  ertiga: { tier1: 1200, tier2: 1600, tier3: 2000, tier4: 2400, extraKm: 18 },
  innova: { tier1: 1500, tier2: 2000, tier3: 2500, tier4: 3000, extraKm: 20 },
  innova_crysta: { tier1: 1500, tier2: 2000, tier3: 2500, tier4: 3000, extraKm: 20 },
  tempo: { tier1: 2000, tier2: 2800, tier3: 3500, tier4: 4000, extraKm: 35 },
  tempo_traveller: { tier1: 2000, tier2: 2800, tier3: 3500, tier4: 4000, extraKm: 35 },
  swift_dzire: { tier1: 840, tier2: 1200, tier3: 1500, tier4: 1800, extraKm: 14 },
  glanza: { tier1: 1200, tier2: 1600, tier3: 2000, tier4: 2400, extraKm: 14 },
  toyota_glanza: { tier1: 1200, tier2: 1600, tier3: 2000, tier4: 2400, extraKm: 14 },
};

function getAirportFallbackForKey(cab: string): { tier1: number; tier2: number; tier3: number; tier4: number; extraKm: number } {
  const n = cab.toLowerCase();
  if (n.includes('ertiga')) return AIRPORT_FALLBACK.ertiga;
  // Glanza is sedan-class; wrong DB rows sometimes key glanza at Ertiga-like tiers
  if (n.includes('glanza') || n.includes('toyota_glanza')) return AIRPORT_FALLBACK.sedan;
  if (n.includes('innova') || n.includes('crysta')) return AIRPORT_FALLBACK.innova_crysta;
  if (n.includes('tempo') || n.includes('traveller')) return AIRPORT_FALLBACK.tempo_traveller;
  return AIRPORT_FALLBACK.sedan;
}

/** Calculate airport fare - uses API fares when provided, else web useFare fallbacks (tiers ≤10, ≤20, ≤30, ≤40) */
export function calculateAirportFare(
  cabType: string,
  distance: number,
  airportFaresMap?: Record<string, AirportFare> | null,
  vehicleId?: string
): number {
  const cab = cabType.toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_').trim();
  const vid = vehicleId ? String(vehicleId).toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_').trim() : '';
  // Numeric fleet IDs collide with array-index keys ("0","1","2") in some API responses — resolve by cab name first.
  const keysToTry = [
    ...(cab.includes('glanza') ? (['sedan', 'swift_dzire'] as string[]) : []),
    ...(vid && !isNumericFleetIdOnly(vid) ? [vid] : []),
    cab,
    cab.replace(/\s+/g, '_'),
    cab.includes('swift') || cab.includes('dzire') ? 'swift_dzire' : null,
    cab.includes('swift') || cab.includes('dzire') ? 'sedan' : null,
    cab.includes('glanza') ? 'toyota_glanza' : null,
    cab.includes('glanza') ? 'glanza' : null,
    cab.includes('ertiga') ? 'ertiga' : null,
    cab.includes('innova') ? 'innova_crysta' : null,
    cab.includes('innova') ? 'innova' : null,
    cab.includes('tempo') ? 'tempo_traveller' : null,
    cab.includes('tempo') ? 'tempo' : null,
  ].filter(Boolean) as string[];

  if (airportFaresMap) {
    for (const k of keysToTry) {
      if (!k) continue;
      const fare = airportFaresMap[k];
      const hasTierOrPrice =
        (fare?.tier1Price ?? fare?.tier2Price ?? fare?.basePrice ?? fare?.pickupPrice ?? fare?.dropPrice ?? 0) > 0;
      if (fare && hasTierOrPrice) {
        return calculateAirportFareFromTiers(fare, distance);
      }
    }
  }

  const fb = getAirportFallbackForKey(cabType);
  if (distance <= 10) return fb.tier1;
  if (distance <= 20) return fb.tier2;
  if (distance <= 30) return fb.tier3;
  if (distance <= 40) return fb.tier4;
  return Math.round(fb.tier4 + (distance - 40) * fb.extraKm);
}

/**
 * Fare breakdown for display - matches web useFare.ts one-way logic exactly.
 * Beyond tier4: baseDistance=150, roundTripExtraKm = (distance - 150) * 2
 */
export function calculateOutstationFareBreakdown(
  fare: OutstationFare,
  distanceKm: number
): OutstationFareBreakdown {
  const driverAllowance = fare.driverAllowance ?? 250;
  const extraKmCharge = fare.extraKmCharge ?? fare.pricePerKm ?? 0;
  const tier1Min = fare.tier1MinKm ?? 35;
  const tier1Max = fare.tier1MaxKm ?? 50;
  const tier2Min = fare.tier2MinKm ?? 51;
  const tier2Max = fare.tier2MaxKm ?? 75;
  const tier3Min = fare.tier3MinKm ?? 76;
  const tier3Max = fare.tier3MaxKm ?? 100;
  const tier4Min = fare.tier4MinKm ?? 101;
  const tier4Max = fare.tier4MaxKm ?? 149;
  const basePrice = fare.basePrice ?? 0;

  let totalBase = 0;
  let extraDistanceFare = 0;
  let extraKmDisplay = 0;

  if (distanceKm >= tier1Min && distanceKm <= tier1Max) {
    totalBase = fare.tier1Price ?? basePrice;
  } else if (distanceKm >= tier2Min && distanceKm <= tier2Max) {
    totalBase = fare.tier2Price ?? basePrice * 1.2;
  } else if (distanceKm >= tier3Min && distanceKm <= tier3Max) {
    totalBase = fare.tier3Price ?? basePrice * 1.4;
  } else if (distanceKm >= tier4Min && distanceKm <= tier4Max) {
    totalBase = fare.tier4Price ?? basePrice * 1.6;
  } else if (distanceKm > tier4Max) {
    // Web useFare: baseDistance=150, roundTripExtraKm = extraKm * 2 (calculate both sides)
    totalBase = basePrice;
    const baseDistance = 150;
    const extraKm = Math.max(0, distanceKm - baseDistance);
    const roundTripExtraKm = extraKm * 2;
    extraKmDisplay = Math.round(roundTripExtraKm);
    extraDistanceFare = roundTripExtraKm * extraKmCharge;
  } else {
    // Below tier1 or gaps: basePrice + max(0, distance - tier1Min) * extraKmCharge
    totalBase = basePrice;
    const extraKm = Math.max(0, distanceKm - tier1Min);
    extraKmDisplay = Math.round(extraKm);
    extraDistanceFare = extraKm * extraKmCharge;
  }

  const total = Math.round(totalBase + extraDistanceFare + driverAllowance);

  return {
    basePrice: totalBase,
    driverAllowance,
    extraDistanceFare: Math.round(extraDistanceFare),
    extraKmDisplay,
    total,
  };
}

// --- Fare update APIs (admin) ---

/** Update outstation fare - matches web directVehicleOperation: fetch, JSON, auth, fallbacks */
export async function updateOutstationFare(
  vehicleId: string,
  data: Partial<OutstationFare>
): Promise<{ success: boolean; message?: string }> {
  const base = resolveBase();
  const headers = await getFareUpdateHeaders();
  // Include both basePrice and oneWayBasePrice for API compatibility
  const body: Record<string, unknown> = {
    vehicleId,
    vehicle_id: vehicleId,
    basePrice: data.basePrice ?? 0,
    oneWayBasePrice: data.basePrice ?? 0,
    pricePerKm: data.pricePerKm ?? 0,
    oneWayPricePerKm: data.pricePerKm ?? 0,
    roundTripBasePrice: data.roundTripBasePrice ?? (data.basePrice ?? 0) * 0.9,
    roundTripPricePerKm: data.roundTripPricePerKm ?? (data.pricePerKm ?? 0) * 0.85,
    driverAllowance: data.driverAllowance ?? 250,
    nightHaltCharge: data.nightHaltCharge ?? 700,
    tier1Price: data.tier1Price ?? 3500,
    tier2Price: data.tier2Price ?? 4200,
    tier3Price: data.tier3Price ?? 4900,
    tier4Price: data.tier4Price ?? 5600,
    extraKmCharge: data.extraKmCharge ?? data.pricePerKm ?? 14,
    tier1MinKm: data.tier1MinKm ?? 35,
    tier1MaxKm: data.tier1MaxKm ?? 50,
    tier2MinKm: data.tier2MinKm ?? 51,
    tier2MaxKm: data.tier2MaxKm ?? 75,
    tier3MinKm: data.tier3MinKm ?? 76,
    tier3MaxKm: data.tier3MaxKm ?? 100,
    tier4MinKm: data.tier4MinKm ?? 101,
    tier4MaxKm: data.tier4MaxKm ?? 149,
  };

  // Only use endpoints that actually PERSIST updates (not fare-list endpoints like outstation-fares.php)
  const urls = [
    `${base}/api/admin/outstation-fares-update.php?_t=${Date.now()}`,
    `${base}/api/admin/direct-outstation-fares.php?_t=${Date.now()}`,
  ];
  let lastMsg = '';
  for (const url of urls) {
    const r = await fareUpdatePost(url, body, headers);
    if (r.ok) return { success: true };
    lastMsg = r.message || lastMsg;
  }
  return { success: false, message: lastMsg || `Update failed. Base: ${base}` };
}

/** Update airport fare - matches web: fetch, JSON, auth, fallbacks */
export async function updateAirportFare(
  vehicleId: string,
  data: Partial<AirportFare>
): Promise<{ success: boolean; message?: string }> {
  const base = resolveBase();
  const headers = await getFareUpdateHeaders();
  const body: Record<string, unknown> = {
    vehicleId,
    basePrice: data.basePrice ?? 0,
    pricePerKm: data.pricePerKm ?? 0,
    pickupPrice: data.pickupPrice ?? 0,
    dropPrice: data.dropPrice ?? 0,
    tier1Price: data.tier1Price ?? 0,
    tier2Price: data.tier2Price ?? 0,
    tier3Price: data.tier3Price ?? 0,
    tier4Price: data.tier4Price ?? 0,
    extraKmCharge: data.extraKmCharge ?? data.pricePerKm ?? 0,
  };

  // Only use endpoints that actually PERSIST updates
  const urls = [
    `${base}/api/admin/airport-fares-update.php`,
    `${base}/api/admin/direct-fare-update.php?tripType=airport&_t=${Date.now()}`,
  ];
  let lastMsg = '';
  for (const url of urls) {
    const r = await fareUpdatePost(url, body, headers);
    if (r.ok) return { success: true };
    lastMsg = r.message || lastMsg;
  }
  return { success: false, message: lastMsg || `Update failed. Base: ${base}` };
}

/**
 * Update local package fare - try JSON first (fetch, matches outstation/airport), then FormData fallbacks
 */
export async function updateLocalFare(
  vehicleId: string,
  data: {
    package8hrs80km?: number;
    package10hrs100km?: number;
    package4hrs40km?: number;
    priceExtraKm?: number;
    priceExtraHour?: number;
  }
): Promise<{ success: boolean; message?: string }> {
  const base = resolveBase();
  const headers = await getFareUpdateHeaders();
  const p4 = data.package4hrs40km ?? 0;
  const p8 = data.package8hrs80km ?? 0;
  const p10 = data.package10hrs100km ?? 0;
  const v = vehicleId.toLowerCase();
  const defaultExtraKm = v.includes('tempo') ? 22 : v.includes('innova') ? 20 : 15;
  const defaultExtraHour = v.includes('tempo') ? 400 : v.includes('innova') ? 350 : 250;
  const extraKm = data.priceExtraKm ?? defaultExtraKm;
  const extraHour = data.priceExtraHour ?? defaultExtraHour;

  const jsonBody: Record<string, unknown> = {
    vehicleId,
    vehicle_id: vehicleId,
    tripType: 'local',
    price4hrs40km: p4,
    price8hrs80km: p8,
    price10hrs100km: p10,
    priceExtraKm: extraKm,
    priceExtraHour: extraHour,
  };

  // Only use endpoints that actually PERSIST updates (local-package-fares supports POST)
  const urls = [
    `${base}/api/admin/direct-local-fares.php`,
    `${base}/api/admin/local-fares-update.php?_t=${Date.now()}`,
    `${base}/api/admin/direct-fare-update.php?tripType=local&_t=${Date.now()}`,
    `${base}/api/local-package-fares.php`,
  ];
  let lastMsg = '';
  for (const url of urls) {
    const r = await fareUpdatePost(url, jsonBody, headers);
    if (r.ok) {
      await syncLocalFares(base, headers);
      return { success: true };
    }
    lastMsg = r.message || lastMsg;
  }
  return { success: false, message: lastMsg || `Local fare update failed. Base: ${base}` };
}

async function syncLocalFares(base: string, headers: Record<string, string>): Promise<void> {
  try {
    await fetch(`${base}/api/admin/sync-local-fares.php?_t=${Date.now()}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
  } catch {
    /* ignore */
  }
}
