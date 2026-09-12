/**
 * Live fare engine for VTH AI — mirrors CabList / useFare / guestSearchFareLines.
 * Rate cards from vizagtaxihub.com; distance from Google Distance Matrix (or OSRM fallback).
 */
import { env } from '../config/env.js';

export interface OutstationFareRow {
  vehicleId: string;
  name?: string;
  oneWayBasePrice: number;
  oneWayPricePerKm: number;
  roundTripBasePrice: number;
  roundTripPricePerKm: number;
  driverAllowance: number;
  nightHaltCharge: number;
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier4Price: number;
  extraKmCharge: number;
  tier1MinKm: number;
  tier1MaxKm: number;
  tier2MinKm: number;
  tier2MaxKm: number;
  tier3MinKm: number;
  tier3MaxKm: number;
  tier4MinKm: number;
  tier4MaxKm: number;
}

export interface LocalFareRow {
  vehicleId: string;
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number;
  priceExtraKm: number;
  priceExtraHour: number;
}

export interface AirportFareRow {
  vehicleId: string;
  name?: string;
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier4Price: number;
  extraKmCharge: number;
}

export interface VehicleQuote {
  vehicleId: string;
  label: string;
  total: number;
  breakdown: string;
}

export interface RouteQuoteResult {
  from: string;
  to: string;
  /** One-way driving distance (pin to pin). */
  distanceKm: number;
  /** Round-trip driving km = 2 × one-way (website uses this as actualDistance). */
  roundTripKm?: number;
  calendarDays?: number;
  includedKm?: number;
  durationText?: string;
  tripMode: 'one-way' | 'round-trip';
  /** Website auto-switches airport ↔ outstation at 35 km for one-way. */
  pricingModel: 'outstation' | 'airport';
  quotes: VehicleQuote[];
  source: string;
}

/** Same threshold as Hero.tsx — ≤35 km uses Airport tab slabs, not outstation. */
export const AIRPORT_OUTSTATION_SWITCH_KM = 35;

/**
 * Keep in sync with src/lib/restrictedAirportRoutes.ts
 * (this package cannot import @/lib). Set to false to lift the restriction.
 */
const RESTRICTED_AIRPORT_ROUTES_ENABLED = false;
const RESTRICTED_AIRPORT_ROUTE_MESSAGE =
  "We're currently unable to provide airport transfers to this destination temporarily. Please contact us at +91 99663 63662 for alternate arrangements.";
const RESTRICTED_AIRPORT_ROUTE_SOURCE = 'restricted-airport-route';
const RESTRICTED_DROP_STATES = ['odisha', 'orissa'];
const RESTRICTED_DROP_DISTRICT_KEYWORDS = [
  'vizianagaram',
  'vijayanagaram',
  'vizianagarm',
  'srikakulam',
];
const RESTRICTED_DROP_TOWNS = [
  'palasa',
  'sompeta',
  'ichchapuram',
  'palakonda',
  'amadalavalasa',
  'razam',
  'rajam',
  'narasannapeta',
  'arasavalli',
  'srimukhalingam',
  'bobbili',
  'parvathipuram',
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function blobContainsTerm(blob: string, term: string): boolean {
  const escaped = escapeRegExp(term.toLowerCase());
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`).test(blob);
}

function textLooksLikeVizagAirport(text: string): boolean {
  const blob = (text || '').toLowerCase();
  if (!blob.trim()) return false;
  const looksLikeAirport =
    blob.includes('airport') ||
    blob.includes('vizag_airport') ||
    blob.includes('vizag_city_airport') ||
    blob.includes('vizag international') ||
    /\bvtz\b/.test(blob);
  if (!looksLikeAirport) return false;
  return (
    blob.includes('vizag_airport') ||
    blob.includes('vizag_city_airport') ||
    blob.includes('vizag international') ||
    blob.includes('vizag') ||
    blob.includes('visakhapatnam') ||
    /\bvtz\b/.test(blob) ||
    blob.includes('alluri') ||
    blob.includes('sitaram') ||
    blob.includes('bhogapuram')
  );
}

function isRestrictedAirportDropText(text: string): boolean {
  const blob = (text || '').toLowerCase();
  if (!blob.trim()) return false;
  if (RESTRICTED_DROP_STATES.some((s) => blobContainsTerm(blob, s))) return true;
  if (RESTRICTED_DROP_DISTRICT_KEYWORDS.some((term) => blobContainsTerm(blob, term))) return true;
  return RESTRICTED_DROP_TOWNS.some((term) => blobContainsTerm(blob, term));
}

function getRestrictedAirportRouteBlockFromText(
  from: string,
  to: string,
  pricingModel?: 'outstation' | 'airport' | 'auto'
): string | null {
  if (!RESTRICTED_AIRPORT_ROUTES_ENABLED) return null;
  if (pricingModel && pricingModel !== 'airport') return null;
  if (!textLooksLikeVizagAirport(from)) return null;
  if (!isRestrictedAirportDropText(to)) return null;
  return RESTRICTED_AIRPORT_ROUTE_MESSAGE;
}

export function isRestrictedAirportRouteQuote(q: RouteQuoteResult): boolean {
  return q.source === RESTRICTED_AIRPORT_ROUTE_SOURCE;
}

const CACHE_MS = 60_000;
let outstationCache: { at: number; rows: Record<string, OutstationFareRow> } | null = null;
let localCache: { at: number; rows: Record<string, LocalFareRow> } | null = null;
let airportCache: { at: number; rows: Record<string, AirportFareRow> } | null = null;

const FARE_API_BASE = () =>
  (env.FARE_API_BASE || 'https://vizagtaxihub.com').replace(/\/$/, '');

const DEFAULT_VEHICLES = [
  { id: 'sedan', label: 'Sedan (Dzire)' },
  { id: 'ertiga', label: 'Ertiga' },
  { id: 'innova_crysta', label: 'Innova Crysta' },
  { id: 'tempo_traveller', label: 'Tempo Traveller' },
  { id: 'bus', label: 'Urbania' },
] as const;

function mapsKey(): string {
  return (
    env.GOOGLE_MAPS_SERVER_KEY ||
    env.GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    ''
  );
}

/** Prefer a server key — browser referer-restricted keys fail on Distance Matrix from Node. */
let googleMapsDenied = false;

/** Well-known places so chat text matches booking pins (state-correct). */
const PLACE_ALIASES: Array<{ match: RegExp; query: string; lat?: number; lon?: number }> = [
  {
    match: /\b(?:hotel\s+)?royal\s*fort\b/i,
    query: 'Hotel Royal Fort, Ram Nagar, Visakhapatnam, Andhra Pradesh, India',
    lat: 17.7265,
    lon: 83.3055,
  },
  {
    match: /\brtc\s*(?:complex|bus(?:\s*stand)?)\b/i,
    query: 'RTC Complex, Visakhapatnam, Andhra Pradesh, India',
    lat: 17.722,
    lon: 83.306,
  },
  {
    match: /\bthe\s+park(?:\s+hotel)?\b/i,
    query: 'The Park Hotel, Visakhapatnam, Andhra Pradesh, India',
    lat: 17.711,
    lon: 83.316,
  },
  { match: /\bkailasapuram\b/i, query: 'Kailasapuram, Visakhapatnam, Andhra Pradesh, India', lat: 17.7409, lon: 83.2882 },
  { match: /\bpendurthi|pendhurthi|pendurty\b/i, query: 'Pendurthi, Visakhapatnam, Andhra Pradesh, India', lat: 17.801, lon: 83.209 },
  {
    match:
      /\b(?:vizag|visakhapatnam)\s+new\s+airport\b|\bnew\s+(?:vizag|visakhapatnam)\s+airport\b|\bbhogapuram\s+(?:intl|international)?\s*airport\b|\bairport\s+arrival\s*(?:spot|gate|hall)?\b|\barrival\s+spot\b/i,
    query: 'Bhogapuram International Airport, Andhra Pradesh, India',
    lat: 17.972,
    lon: 83.479,
  },
  {
    match: /^(?:the\s+)?airport$|\b(?:vizag|visakhapatnam)\s*airport\b|\bairport\s*(?:vizag|visakhapatnam)\b|\bvtz\b/i,
    query: 'Visakhapatnam Airport, Andhra Pradesh, India',
    lat: 17.7211,
    lon: 83.2245,
  },
  {
    match: /\bbhogapuram|bhogaouram\b/i,
    query: 'Bhogapuram, Andhra Pradesh, India',
    lat: 17.972,
    lon: 83.479,
  },
  {
    match: /\bgadiraju\b/i,
    query: 'Gadiraju Convention Centre, Visakhapatnam, Andhra Pradesh, India',
    lat: 17.804,
    lon: 83.358,
  },
  {
    match: /\bvisalakshi\s*nagar|visalakshinagar\b/i,
    query: 'Visalakshi Nagar, Visakhapatnam, Andhra Pradesh, India',
    lat: 17.748,
    lon: 83.341,
  },
  {
    match: /\b(?:vizag|visakhapatnam)\s*railway|\brailway\s*sta(?:tion)?\b/i,
    query: 'Visakhapatnam Railway Station, Andhra Pradesh, India',
    lat: 17.722,
    lon: 83.29,
  },
  {
    match: /\bsimhachalam|simanchalam|simhachalm\b/i,
    query: 'Simhachalam, Visakhapatnam, Andhra Pradesh, India',
    lat: 17.766,
    lon: 83.25,
  },
  {
    match: /\bkailasagiri|kailashgiri|kailasgiri\b/i,
    query: 'Kailasagiri, Visakhapatnam, Andhra Pradesh, India',
    lat: 17.749,
    lon: 83.342,
  },
  {
    match: /\btagarapuvalasa|thagarapuvalasa|tagarapuvalasa\b/i,
    query: 'Tagarapuvalasa, Andhra Pradesh, India',
    lat: 17.934,
    lon: 83.427,
  },
  {
    match: /\batchuthapuram|atchutapuram|achuthapuram\b/i,
    query: 'Atchutapuram, Andhra Pradesh, India',
    lat: 17.56,
    lon: 82.99,
  },
  {
    match: /\banakapalli|anakapalle\b/i,
    query: 'Anakapalle, Andhra Pradesh, India',
    lat: 17.691,
    lon: 83.004,
  },
  {
    match: /\bbeach\s*road\b|\brk\s*beach\b|\bramakrishna\s*beach\b/i,
    query: 'RK Beach Road, Visakhapatnam, Andhra Pradesh, India',
    lat: 17.7135,
    lon: 83.3234,
  },
  { match: /\bmvp\s*colony\b|\bmvp\b/i, query: 'MVP Colony, Visakhapatnam, Andhra Pradesh, India', lat: 17.739, lon: 83.338 },
  { match: /\bgajuwaka\b/i, query: 'Gajuwaka, Visakhapatnam, Andhra Pradesh, India', lat: 17.7, lon: 83.216 },
  { match: /\bmadhurawada|madhurawada\b/i, query: 'Madhurawada, Visakhapatnam, Andhra Pradesh, India', lat: 17.822, lon: 83.356 },
  { match: /\bdabagardens|daba\s*gardens\b/i, query: 'Daba Gardens, Visakhapatnam, Andhra Pradesh, India', lat: 17.721, lon: 83.304 },
  // Common chat typos: AKkayapalme, akkayapalam, akkayyapalem, etc.
  {
    match: /\bakka+y+a\s*pal(?:em|me|am|um)\b/i,
    query: 'Akkayapalem, Visakhapatnam, Andhra Pradesh, India',
    lat: 17.734,
    lon: 83.302,
  },
  {
    match: /\bnovotel\b/i,
    query: 'Novotel Visakhapatnam, Beach Road, Visakhapatnam, Andhra Pradesh, India',
    lat: 17.7105,
    lon: 83.3162,
  },
  { match: /\bnasikonda|rushikonda\b/i, query: 'Rushikonda, Visakhapatnam, Andhra Pradesh, India', lat: 17.782, lon: 83.385 },
  // Prefer Vizag Inorbit — Nominatim otherwise resolves Mumbai Inorbit Mall
  {
    match: /\binorbit\b/i,
    query: 'Inorbit Mall, Madhurawada, Visakhapatnam, Andhra Pradesh, India',
    lat: 17.8215,
    lon: 83.3555,
  },
  // Prefer Vizag NAD Junction — not Ranapur/Jhabua "Nad"
  {
    match: /\bnad\s*(?:junction|jn\.?|junc\.?)?\b/i,
    query: 'NAD Junction, Visakhapatnam, Andhra Pradesh, India',
    lat: 17.7412,
    lon: 83.2318,
  },
  // Only bare city name — never match "Akkayapalem Vizag" / "Kailasapuram Vizag"
  { match: /^(?:vizag|visakhapatnam|waltair)$/i, query: 'Visakhapatnam, Andhra Pradesh, India', lat: 17.6868, lon: 83.2185 },
  // Koraput town (Odisha) — never resolve to AP "Koraput Road"
  { match: /\bkoraput\b/i, query: 'Koraput Town, Koraput, Odisha, India', lat: 18.812, lon: 82.712 },
  { match: /\bjeypore\b/i, query: 'Jeypore, Odisha, India', lat: 18.856, lon: 82.573 },
  { match: /\bbhubaneswar\b/i, query: 'Bhubaneswar, Odisha, India', lat: 20.2961, lon: 85.8245 },
  { match: /\bpuri\b/i, query: 'Puri, Odisha, India', lat: 19.8135, lon: 85.8312 },
  { match: /\brajahmundry|rajamundry|rajamahendravaram\b/i, query: 'Rajahmundry, Andhra Pradesh, India', lat: 17.0005, lon: 81.804 },
  { match: /\bvijayawada|bezawada\b/i, query: 'Vijayawada, Andhra Pradesh, India', lat: 16.5062, lon: 80.648 },
  { match: /\btuni\b/i, query: 'Tuni, Andhra Pradesh, India', lat: 17.3597, lon: 82.546 },
  { match: /\bkakinada\b/i, query: 'Kakinada, Andhra Pradesh, India', lat: 16.9891, lon: 82.2475 },
  { match: /\b(?:araku|arakku|aruku|araku+)\b/i, query: 'Araku Valley, Andhra Pradesh, India', lat: 18.3273, lon: 82.877 },
  { match: /\bhyderabad\b/i, query: 'Hyderabad, Telangana, India', lat: 17.385, lon: 78.4867 },
  { match: /\btirupati\b/i, query: 'Tirupati, Andhra Pradesh, India', lat: 13.6288, lon: 79.4192 },
  { match: /\bsrikakulam\b/i, query: 'Srikakulam, Andhra Pradesh, India', lat: 18.2969, lon: 83.893 },
  { match: /\bvizianagaram|vijayanagaram|vizianagarm\b/i, query: 'Vizianagaram, Andhra Pradesh, India', lat: 18.1067, lon: 83.3956 },
  { match: /\blambasingi\b/i, query: 'Lambasingi, Andhra Pradesh, India', lat: 17.812, lon: 82.512 },
];

export function qualifyPlaceQuery(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');

  // "Akkayapalem Vizag" / "Kailasapuram, Visakhapatnam" → keep the locality, not city center
  const localityInCity = trimmed.match(
    /^(.+?)[, ]+(?:vizag|visakhapatnam|waltair)$/i,
  );
  if (localityInCity) {
    const locality = localityInCity[1]!.trim().replace(/[,\s]+$/g, '');
    // Ignore "Rajahmundry from Visakhapatnam" style phrases
    if (
      locality.length >= 2 &&
      !/^(vizag|visakhapatnam|waltair)$/i.test(locality) &&
      !/\b(from|to|towards)\b/i.test(locality)
    ) {
      for (const a of PLACE_ALIASES) {
        if (a.match.test(locality)) return a.query;
      }
      return `${locality}, Visakhapatnam, Andhra Pradesh, India`;
    }
  }

  for (const a of PLACE_ALIASES) {
    if (a.match.test(trimmed)) return a.query;
  }
  // "AKkayapalme, India" — match alias on the locality head before returning as-is
  const head = trimmed.split(',')[0]?.trim();
  if (head && head.length >= 2 && head.toLowerCase() !== trimmed.toLowerCase()) {
    for (const a of PLACE_ALIASES) {
      if (a.match.test(head)) return a.query;
    }
  }
  // Never force Andhra Pradesh — that mis-resolves Odisha/Telangana places (e.g. Koraput → 146km road).
  if (/india|andhra|odisha|orissa|telangana|tamil|karnataka|pradesh|chhattisgarh/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}, India`;
}

function resolveKnownCoords(raw: string): { lat: number; lon: number; display: string } | null {
  const trimmed = raw.trim();
  for (const a of PLACE_ALIASES) {
    if (a.match.test(trimmed) && typeof a.lat === 'number' && typeof a.lon === 'number') {
      return { lat: a.lat, lon: a.lon, display: a.query };
    }
  }
  const head = trimmed.split(',')[0]?.trim();
  if (head && head.toLowerCase() !== trimmed.toLowerCase()) {
    for (const a of PLACE_ALIASES) {
      if (a.match.test(head) && typeof a.lat === 'number' && typeof a.lon === 'number') {
        return { lat: a.lat, lon: a.lon, display: a.query };
      }
    }
  }
  return null;
}

function asNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeVehicleId(id: string): string {
  const s = id.toLowerCase().trim().replace(/\s+/g, '_');
  if (s.includes('urbania') || s === 'bus') return 'bus';
  if (s.includes('tempo')) return 'tempo_traveller';
  if (s.includes('innova') || s.includes('crysta')) return 'innova_crysta';
  if (s.includes('hycross') || s === 'mpv') return 'MPV';
  if (s.includes('ertiga')) return 'ertiga';
  if (s.includes('luxury')) return 'luxury';
  if (s.includes('amaze')) return 'amaze';
  if (s.includes('glanza') || s.includes('toyota')) return 'toyota';
  if (s.includes('sedan') || s.includes('dzire') || s.includes('swift')) return 'sedan';
  return s;
}

function vehicleLabel(id: string, rowName?: string): string {
  if (rowName) return rowName;
  const hit = DEFAULT_VEHICLES.find((v) => v.id === id);
  return hit?.label || id;
}

export async function fetchOutstationRateCards(): Promise<Record<string, OutstationFareRow>> {
  const now = Date.now();
  if (outstationCache && now - outstationCache.at < CACHE_MS) return outstationCache.rows;

  const url = `${FARE_API_BASE()}/api/admin/direct-outstation-fares.php?includeInactive=true&force_refresh=true&_t=${now}`;
  const res = await fetch(url, {
    headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-Admin-Mode': 'true' },
  });
  if (!res.ok) throw new Error(`Outstation fares HTTP ${res.status}`);
  const data = (await res.json()) as { status?: string; fares?: Record<string, Record<string, unknown>> };
  if (!data.fares) throw new Error('Outstation fares empty');

  const rows: Record<string, OutstationFareRow> = {};
  for (const [key, raw] of Object.entries(data.fares)) {
    const id = String(raw.vehicleId || raw.id || key);
    rows[id] = {
      vehicleId: id,
      name: typeof raw.name === 'string' ? raw.name : undefined,
      oneWayBasePrice: asNum(raw.oneWayBasePrice),
      oneWayPricePerKm: asNum(raw.oneWayPricePerKm),
      roundTripBasePrice: asNum(raw.roundTripBasePrice),
      roundTripPricePerKm: asNum(raw.roundTripPricePerKm),
      driverAllowance: asNum(raw.driverAllowance, 250),
      nightHaltCharge: asNum(raw.nightHaltCharge, 700),
      tier1Price: asNum(raw.tier1Price),
      tier2Price: asNum(raw.tier2Price),
      tier3Price: asNum(raw.tier3Price),
      tier4Price: asNum(raw.tier4Price),
      extraKmCharge: asNum(raw.extraKmCharge, asNum(raw.oneWayPricePerKm, 14)),
      tier1MinKm: asNum(raw.tier1MinKm, 35),
      tier1MaxKm: asNum(raw.tier1MaxKm, 50),
      tier2MinKm: asNum(raw.tier2MinKm, 51),
      tier2MaxKm: asNum(raw.tier2MaxKm, 75),
      tier3MinKm: asNum(raw.tier3MinKm, 76),
      tier3MaxKm: asNum(raw.tier3MaxKm, 100),
      tier4MinKm: asNum(raw.tier4MinKm, 101),
      tier4MaxKm: asNum(raw.tier4MaxKm, 149),
    };
  }
  outstationCache = { at: now, rows };
  return rows;
}

export async function fetchLocalRateCards(): Promise<Record<string, LocalFareRow>> {
  const now = Date.now();
  if (localCache && now - localCache.at < CACHE_MS) return localCache.rows;

  const url = `${FARE_API_BASE()}/api/admin/direct-local-fares.php?force_refresh=true&_t=${now}`;
  const res = await fetch(url, {
    headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-Admin-Mode': 'true' },
  });
  if (!res.ok) throw new Error(`Local fares HTTP ${res.status}`);
  const data = (await res.json()) as { fares?: Array<Record<string, unknown>> };
  const rows: Record<string, LocalFareRow> = {};
  for (const raw of data.fares || []) {
    const id = String(raw.vehicleId || '');
    if (!id) continue;
    rows[id] = {
      vehicleId: id,
      price4hrs40km: asNum(raw.price4hrs40km),
      price8hrs80km: asNum(raw.price8hrs80km),
      price10hrs100km: asNum(raw.price10hrs100km),
      priceExtraKm: asNum(raw.priceExtraKm),
      priceExtraHour: asNum(raw.priceExtraHour),
    };
  }
  localCache = { at: now, rows };
  return rows;
}

export async function fetchAirportRateCards(): Promise<Record<string, AirportFareRow>> {
  const now = Date.now();
  if (airportCache && now - airportCache.at < CACHE_MS) return airportCache.rows;

  const url =
    `${FARE_API_BASE()}/api/direct-airport-fares.php?force=true&source=airport_transfer_fares&_t=${now}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Airport fares HTTP ${res.status}`);
  const data = (await res.json()) as { fares?: Array<Record<string, unknown>> };
  const rows: Record<string, AirportFareRow> = {};
  for (const raw of data.fares || []) {
    const id = String(raw.vehicleId || raw.vehicle_id || '');
    if (!id) continue;
    const tier1 = asNum(raw.tier1Price ?? raw.tier1_price);
    const tier2 = asNum(raw.tier2Price ?? raw.tier2_price);
    // Skip junk/test rows (Dzire CNG ₹1, etc.)
    if (tier1 < 100 && tier2 < 100) continue;
    const nid = normalizeVehicleId(id);
    const row: AirportFareRow = {
      vehicleId: nid,
      name: String(raw.name || '') || undefined,
      tier1Price: tier1,
      tier2Price: tier2,
      tier3Price: asNum(raw.tier3Price ?? raw.tier3_price),
      tier4Price: asNum(raw.tier4Price ?? raw.tier4_price),
      extraKmCharge: asNum(raw.extraKmCharge ?? raw.extra_km_charge, 14),
    };
    // Prefer canonical ids (tempo_traveller over tempo)
    if (!rows[nid] || id.toLowerCase() === nid) rows[nid] = row;
    rows[id] = row;
  }
  airportCache = { at: now, rows };
  return rows;
}

function resolveAirportRow(
  all: Record<string, AirportFareRow>,
  vehicleId: string,
): AirportFareRow | null {
  const nid = normalizeVehicleId(vehicleId);
  if (all[nid]) return all[nid];
  if (all[vehicleId]) return all[vehicleId];
  // tempo API sometimes uses "tempo"
  if (nid === 'tempo_traveller' && all.tempo) return all.tempo;
  const key = Object.keys(all).find((k) => normalizeVehicleId(k) === nid);
  return key ? all[key] : null;
}

/** Same slabs as `useFare` airport branch / CabList (no driver allowance). */
export function computeAirportTransferFare(
  row: AirportFareRow,
  distanceKm: number,
): { total: number; breakdown: string } {
  const distance = Math.max(0, Math.round(distanceKm));
  const extraKmCharge = row.extraKmCharge || 14;
  let basePrice = 0;
  let extraDistanceFare = 0;
  let tierUsed = '';

  if (distance <= 10) {
    basePrice = row.tier1Price;
    tierUsed = '≤10 km';
  } else if (distance <= 20) {
    basePrice = row.tier2Price;
    tierUsed = '11–20 km';
  } else if (distance <= 30) {
    basePrice = row.tier3Price;
    tierUsed = '21–30 km';
  } else if (distance <= 40) {
    basePrice = row.tier4Price;
    tierUsed = '31–40 km';
  } else {
    basePrice = row.tier4Price;
    extraDistanceFare = (distance - 40) * extraKmCharge;
    tierUsed = `>40 km (+₹${extraKmCharge}/km after 40)`;
  }

  const total = Math.round(basePrice + extraDistanceFare);
  const breakdown = `${tierUsed}: ₹${Math.round(basePrice)}${
    extraDistanceFare ? ` + extra ₹${Math.round(extraDistanceFare)}` : ''
  }`;
  return { total, breakdown };
}

/** Same math as `computeOutstationOneWayFareFromRow` / `useFare` one-way branch. */
export function computeOutstationOneWayFare(row: OutstationFareRow, distanceKm: number): {
  total: number;
  breakdown: string;
} {
  const distance = Math.round(distanceKm);
  if (distance <= 0) return { total: 0, breakdown: 'invalid distance' };

  let basePrice = 0;
  let extraDistanceFare = 0;
  const driverAllowance = row.driverAllowance || 250;
  const extraKmCharge = row.extraKmCharge || row.oneWayPricePerKm || 14;
  let tierUsed = 'traditional';

  const {
    tier1MinKm: t1Min,
    tier1MaxKm: t1Max,
    tier2MinKm: t2Min,
    tier2MaxKm: t2Max,
    tier3MinKm: t3Min,
    tier3MaxKm: t3Max,
    tier4MinKm: t4Min,
    tier4MaxKm: t4Max,
  } = row;

  if (distance >= t1Min && distance <= t1Max) {
    basePrice = row.tier1Price || row.oneWayBasePrice;
    tierUsed = `tier1 ${t1Min}-${t1Max}km`;
  } else if (distance >= t2Min && distance <= t2Max) {
    basePrice = row.tier2Price || row.oneWayBasePrice * 1.2;
    tierUsed = `tier2 ${t2Min}-${t2Max}km`;
  } else if (distance >= t3Min && distance <= t3Max) {
    basePrice = row.tier3Price || row.oneWayBasePrice * 1.4;
    tierUsed = `tier3 ${t3Min}-${t3Max}km`;
  } else if (distance >= t4Min && distance <= t4Max) {
    basePrice = row.tier4Price || row.oneWayBasePrice * 1.6;
    tierUsed = `tier4 ${t4Min}-${t4Max}km`;
  } else if (distance > t4Max) {
    basePrice = row.oneWayBasePrice;
    const extraKm = Math.max(0, distance - 150);
    extraDistanceFare = extraKm * 2 * extraKmCharge;
    tierUsed = `> ${t4Max}km (base + extra km)`;
  } else {
    basePrice = row.oneWayBasePrice;
    extraDistanceFare = Math.max(0, distance - t1Min) * extraKmCharge;
    tierUsed = `< ${t1Min}km`;
  }

  const total = Math.round(basePrice + extraDistanceFare + driverAllowance);
  const breakdown = `${tierUsed}: fare ₹${Math.round(basePrice)}${
    extraDistanceFare ? ` + extra ₹${Math.round(extraDistanceFare)}` : ''
  } + driver ₹${driverAllowance}`;
  return { total, breakdown };
}

async function googleDistanceKm(
  from: string,
  to: string,
): Promise<{ km: number; durationText?: string } | null> {
  if (googleMapsDenied) return null;
  const key = mapsKey();
  if (!key) return null;
  const url =
    `https://maps.googleapis.com/maps/api/distancematrix/json` +
    `?origins=${encodeURIComponent(from)}` +
    `&destinations=${encodeURIComponent(to)}` +
    `&mode=driving&units=metric&region=in&key=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    status?: string;
    error_message?: string;
    rows?: Array<{
      elements?: Array<{ status?: string; distance?: { value: number }; duration?: { text: string } }>;
    }>;
  };
  if (data.status === 'REQUEST_DENIED') {
    googleMapsDenied = true;
    console.warn(
      '[fareEngine] Google Distance Matrix denied (use GOOGLE_MAPS_SERVER_KEY without HTTP referrer restriction). Falling back to OSRM.',
      data.error_message || '',
    );
    return null;
  }
  const el = data.rows?.[0]?.elements?.[0];
  if (!el || el.status !== 'OK' || !el.distance?.value) return null;
  return {
    km: Math.round(el.distance.value / 1000),
    durationText: el.duration?.text,
  };
}

type GeoHit = { lat: number; lon: number; display: string };

function scoreGeoHit(query: string, hit: GeoHit): number {
  const d = hit.display.toLowerCase();
  const q = query.toLowerCase().split(',')[0]!.trim();
  let score = 0;
  if (d.startsWith(q + ',') || d.startsWith(q + ' ')) score += 12;
  if (d.includes(`, ${q},`) || d.includes(`${q},`)) score += 6;
  // Prefer towns/districts over road segments (e.g. "Parvathipuram - Koraput Road")
  if (/\broad\b|\bhighway\b|\bnh\d+\b|\bstreet\b/.test(d) && !d.startsWith(q)) score -= 15;
  if (/\bdistrict\b|\btown\b|odisha|orissa|andhra|telangana/.test(d)) score += 3;
  // Strong bias to Vizag / coastal AP — chat is Vizag Taxi Hub
  if (/visakhapatnam|vizag|waltair/.test(d)) score += 20;
  if (/andhra pradesh/.test(d)) score += 8;
  // Penalize far-away famous namesakes (Mumbai Inorbit, MP "Nad", etc.)
  if (/mumbai|maharashtra|madhya pradesh|delhi|bengaluru|bangalore|chennai|kolkata/.test(d)) {
    score -= 25;
  }
  // Soft geographic preference: roughly near Vizag
  const nearVizag = hit.lat > 16.8 && hit.lat < 19.2 && hit.lon > 81.5 && hit.lon < 84.5;
  if (nearVizag) score += 10;
  return score;
}

async function nominatimGeocode(q: string): Promise<GeoHit | null> {
  // Bias toward Vizag metro without hard-bounding (outstation still works)
  const u =
    `https://nominatim.openstreetmap.org/search?format=json&limit=8&countrycodes=in` +
    `&viewbox=82.6,17.2,84.0,18.5&q=${encodeURIComponent(q)}`;
  const r = await fetch(u, { headers: { 'User-Agent': 'VizagTaxiHub-VTH-AI/1.0' } });
  if (!r.ok) return null;
  const arr = (await r.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!arr.length) return null;
  const ranked = arr
    .map((x) => ({
      lat: Number(x.lat),
      lon: Number(x.lon),
      display: x.display_name,
    }))
    .sort((a, b) => scoreGeoHit(q, b) - scoreGeoHit(q, a));
  return ranked[0] || null;
}

async function osrmDistanceKm(
  from: string,
  to: string,
): Promise<{ km: number; durationText?: string } | null> {
  const fromQ = qualifyPlaceQuery(from);
  const toQ = qualifyPlaceQuery(to);
  const a = resolveKnownCoords(from) || resolveKnownCoords(fromQ) || (await nominatimGeocode(fromQ));
  if (!resolveKnownCoords(from) && !resolveKnownCoords(fromQ)) {
    await new Promise((r) => setTimeout(r, 400));
  }
  const b = resolveKnownCoords(to) || resolveKnownCoords(toQ) || (await nominatimGeocode(toQ));
  if (!a || !b) return null;

  const routeUrl =
    `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`;
  const rr = await fetch(routeUrl);
  if (!rr.ok) return null;
  const route = (await rr.json()) as {
    code?: string;
    routes?: Array<{ distance: number; duration: number }>;
  };
  const leg = route.routes?.[0];
  if (!leg) return null;
  const mins = Math.round(leg.duration / 60);
  const displayA = 'display' in a ? a.display : fromQ;
  const displayB = 'display' in b ? b.display : toQ;
  console.info(`[fareEngine] OSRM ${Math.round(leg.distance / 1000)}km | ${displayA} → ${displayB}`);
  return {
    km: Math.round(leg.distance / 1000),
    durationText: mins >= 60 ? `${Math.floor(mins / 60)}-${Math.ceil(mins / 60) + 1} hrs` : `${mins} min`,
  };
}

export async function estimateDrivingDistanceKm(
  from: string,
  to: string,
): Promise<{ km: number; durationText?: string; source: string }> {
  const fromQ = qualifyPlaceQuery(from);
  const toQ = qualifyPlaceQuery(to);
  const g = await googleDistanceKm(fromQ, toQ);
  if (g) return { ...g, source: 'google' };
  const o = await osrmDistanceKm(fromQ, toQ);
  if (o) return { ...o, source: 'osrm' };
  throw new Error(`Could not estimate distance from "${fromQ}" to "${toQ}"`);
}

function resolveOutstationRow(
  all: Record<string, OutstationFareRow>,
  vehicleId: string,
): OutstationFareRow | null {
  const nid = normalizeVehicleId(vehicleId);
  if (all[nid]) return all[nid];
  if (all[vehicleId]) return all[vehicleId];
  const key = Object.keys(all).find((k) => k.toLowerCase() === nid.toLowerCase());
  return key ? all[key] : null;
}

/** Mirror of website `calculateOutstationRoundTripFare` (useFare / fareCalculationService). */
export function computeOutstationRoundTripFare(
  row: OutstationFareRow,
  oneWayKm: number,
  calendarDays: number,
): { total: number; breakdown: string; roundTripKm: number; includedKm: number } {
  const days = Math.max(1, Math.round(calendarDays));
  const perKmRate = row.roundTripPricePerKm || row.oneWayPricePerKm || 14;
  const nightAllowancePerNight = row.nightHaltCharge || 0;
  const driverAllowancePerDay = row.driverAllowance || 250;
  const roundTripKm = Math.round(oneWayKm * 2);
  const includedKm = days * 300;
  const baseFare = includedKm * perKmRate;
  const extraDistance = Math.max(0, roundTripKm - includedKm);
  const extraDistanceCharges = extraDistance * perKmRate;
  const nightAllowance = (days - 1) * nightAllowancePerNight;
  const driverAllowance = days * driverAllowancePerDay;
  const total = Math.round(baseFare + extraDistanceCharges + nightAllowance + driverAllowance);
  const breakdown =
    `${days} day(s): ${includedKm}km included × ₹${perKmRate}/km` +
    (extraDistance ? ` + ${extraDistance}km extra` : '') +
    ` + driver ₹${driverAllowance}` +
    (nightAllowance ? ` + night ₹${nightAllowance}` : '') +
    ` (RT drive ~${roundTripKm}km)`;
  return { total, breakdown, roundTripKm, includedKm };
}

export async function quoteOutstationRoute(input: {
  from: string;
  to: string;
  distanceKm?: number;
  vehicleIds?: string[];
  tripMode?: 'one-way' | 'round-trip';
  /** Calendar days for round-trip billing (default 2 if RT and unspecified). */
  calendarDays?: number;
  /** Force pricing model; default auto: one-way ≤35 km → airport (same as website). */
  pricingModel?: 'outstation' | 'airport' | 'auto';
}): Promise<RouteQuoteResult> {
  const tripMode = input.tripMode || 'one-way';
  const restrictedMessage = getRestrictedAirportRouteBlockFromText(
    input.from,
    input.to,
    input.pricingModel
  );
  if (restrictedMessage) {
    return {
      from: input.from,
      to: input.to,
      distanceKm: 0,
      tripMode,
      pricingModel: 'outstation',
      quotes: [],
      source: RESTRICTED_AIRPORT_ROUTE_SOURCE,
    };
  }

  let distanceKm = input.distanceKm;
  let durationText: string | undefined;
  let source = 'provided-km';

  if (!distanceKm || distanceKm <= 0) {
    const d = await estimateDrivingDistanceKm(qualifyPlaceQuery(input.from), qualifyPlaceQuery(input.to));
    distanceKm = d.km;
    durationText = d.durationText;
    source = d.source;
  }

  const prefer =
    input.pricingModel && input.pricingModel !== 'auto'
      ? input.pricingModel
      : tripMode === 'one-way' && distanceKm <= AIRPORT_OUTSTATION_SWITCH_KM
        ? 'airport'
        : 'outstation';

  // Airport / local pin-to-pin (website Airport tab) — no driver allowance
  if (prefer === 'airport' && tripMode === 'one-way') {
    const cards = await fetchAirportRateCards();
    const ids = input.vehicleIds?.length
      ? input.vehicleIds
      : DEFAULT_VEHICLES.map((v) => v.id);
    const quotes: VehicleQuote[] = [];
    for (const id of ids) {
      const row = resolveAirportRow(cards, id);
      if (!row) continue;
      const { total, breakdown } = computeAirportTransferFare(row, distanceKm);
      if (total <= 0) continue;
      quotes.push({
        vehicleId: row.vehicleId,
        label: vehicleLabel(id, row.name),
        total,
        breakdown,
      });
    }
    return {
      from: qualifyPlaceQuery(input.from),
      to: qualifyPlaceQuery(input.to),
      distanceKm,
      durationText,
      tripMode,
      pricingModel: 'airport',
      quotes,
      source,
    };
  }

  const calendarDays =
    tripMode === 'round-trip' ? Math.max(1, input.calendarDays ?? 2) : undefined;
  const roundTripKm = tripMode === 'round-trip' ? Math.round(distanceKm * 2) : undefined;

  const cards = await fetchOutstationRateCards();
  const ids = input.vehicleIds?.length
    ? input.vehicleIds
    : DEFAULT_VEHICLES.map((v) => v.id);

  const quotes: VehicleQuote[] = [];
  let includedKm: number | undefined;
  for (const id of ids) {
    const row = resolveOutstationRow(cards, id);
    if (!row) continue;
    if (tripMode === 'one-way') {
      const { total, breakdown } = computeOutstationOneWayFare(row, distanceKm);
      quotes.push({
        vehicleId: row.vehicleId,
        label: vehicleLabel(row.vehicleId, row.name),
        total,
        breakdown,
      });
    } else {
      const rt = computeOutstationRoundTripFare(row, distanceKm, calendarDays || 2);
      includedKm = rt.includedKm;
      quotes.push({
        vehicleId: row.vehicleId,
        label: vehicleLabel(row.vehicleId, row.name),
        total: rt.total,
        breakdown: rt.breakdown,
      });
    }
  }

  return {
    from: qualifyPlaceQuery(input.from),
    to: qualifyPlaceQuery(input.to),
    distanceKm,
    roundTripKm,
    calendarDays,
    includedKm,
    durationText,
    tripMode,
    pricingModel: 'outstation',
    quotes,
    source,
  };
}

export function formatRouteQuoteReply(
  q: RouteQuoteResult,
  opts?: {
    passengerCount?: number | null;
    travelDate?: string | null;
    travelTime?: string | null;
    vehicle?: string | null;
  },
): string {
  if (q.source === RESTRICTED_AIRPORT_ROUTE_SOURCE) {
    return RESTRICTED_AIRPORT_ROUTE_MESSAGE;
  }

  const short = (p: string) =>
    p
      .replace(/, India$/i, '')
      .replace(/, Andhra Pradesh/gi, '')
      .replace(/Town, Koraput, Odisha/i, 'Koraput, Odisha')
      .replace(/, Odisha/i, ', Odisha')
      .replace(/, Visakhapatnam$/i, '')
      .replace(/\s*\(Bhogapuram\)/i, '')
      .trim();
  const lines = q.quotes
    .slice(0, 5)
    .map((v) => `• ${v.label}: ₹${v.total.toLocaleString('en-IN')}`)
    .join('\n');
  const dur = q.durationText ? ` · ~${q.durationText}` : '';
  const pax = opts?.passengerCount && opts.passengerCount > 0 ? opts.passengerCount : null;
  const paxNote =
    pax && pax >= 8
      ? `For ${pax} persons, only vehicles that fit are listed (Sedan / Ertiga / Innova cannot seat ${pax}).\n`
      : pax
        ? `Quoted for ${pax} persons (whole vehicle, not per seat).\n`
        : '';

  let header: string;
  if (q.tripMode === 'round-trip') {
    const days = q.calendarDays || 2;
    const rtKm = q.roundTripKm || q.distanceKm * 2;
    const included = q.includedKm || days * 300;
    header =
      `${short(q.from)} → ${short(q.to)} (round-trip, ${days} day${days > 1 ? 's' : ''}):\n` +
      `• One-way: ~${q.distanceKm} km${dur}\n` +
      `• Round-trip drive: ~${rtKm} km` +
      (rtKm > included ? ` · ${rtKm - included} km extra beyond package` : '') +
      `\n`;
  } else if (q.pricingModel === 'airport') {
    header = `${short(q.from)} → ${short(q.to)}: ~${q.distanceKm} km${dur} (one-way).\n`;
  } else {
    header = `${short(q.from)} → ${short(q.to)}: ~${q.distanceKm} km${dur} (one-way).\n`;
  }

  const missing: string[] = [];
  if (!opts?.travelDate) missing.push('travel date');
  if (!opts?.travelTime) missing.push('pickup time');
  if (!opts?.vehicle) missing.push('vehicle');
  const cta =
    missing.length > 0
      ? `Reply "book it" for checkout, or share ${missing.join(' / ')}. Call +91 99663 63662 anytime.`
      : `Reply "book it" to get your website checkout link. Call +91 99663 63662 anytime.`;

  return header + paxNote + `Fares:\n${lines}\n` + cta;
}

export interface TourPackage {
  tourId: string;
  tourName: string;
  distance?: number;
  days?: number;
  pricing: Record<string, number>;
}

export interface TourItineraryDay {
  day: number;
  title: string;
  description?: string;
  activities: string[];
}

export interface TourDetailPackage extends TourPackage {
  description?: string;
  timeDuration?: string;
  itinerary: TourItineraryDay[];
  inclusions?: string[];
  exclusions?: string[];
}

let tourCache: { at: number; tours: TourPackage[] } | null = null;
const tourDetailCache = new Map<string, { at: number; detail: TourDetailPackage }>();

const TOUR_MATCHERS: Array<{ tourIdHints: string[]; keywords: string[]; multiDay?: boolean }> = [
  {
    tourIdHints: ['araku_vizag_3d_2n'],
    keywords: ['3d 2n', '3 days', '2 nights', '3 day', '3d/2n', '3d2n'],
    multiDay: true,
  },
  {
    // Exact day-package id — never match via includes('araku') or araku_vizag_3D_2N wins
    tourIdHints: ['araku'],
    keywords: ['araku', 'arakku', 'aruku', 'borra', 'padmapuram', 'katiki', 'galikonda', 'chaparai', 'ananthagiri', 'anantagiri'],
  },
  { tourIdHints: ['lambasingi'], keywords: ['lambasingi', 'lammasingi', 'kothapalli'] },
  { tourIdHints: ['vanajangi', 'vanajangi_tour'], keywords: ['vanajangi', 'paderu'] },
  {
    tourIdHints: ['vizag_north_city_tour', 'vizag_north_city'],
    keywords: ['north city', 'vizag north', 'north vizag'],
  },
  {
    tourIdHints: ['vizag_south_city_tour', 'vizag_south_city'],
    keywords: ['south city', 'vizag south', 'south vizag'],
  },
  {
    tourIdHints: ['arasavalli_srikurmam', 'arasavalli', 'srikurmam'],
    keywords: [
      'arasavalli',
      'arsavalli',
      'srikurmam',
      'sreekurmum',
      'sri kurmam',
      'ari kurman',
      'srikakulam temple',
    ],
  },
];

function wantsMultiDayTour(message: string): boolean {
  return /\b3\s*d\b|\b2\s*n\b|3\s*days?|2\s*nights?|3d\s*\/?\s*2n|multi[\s-]?day|overnight/.test(
    message.toLowerCase(),
  );
}

/** Prefer exact tourId; never pick a longer id that merely contains the hint (araku ⊂ araku_vizag_3D_2N). */
function findTourByIdHints(tours: TourPackage[], hints: string[]): TourPackage | null {
  const norm = (s: string) => s.toLowerCase().replace(/-/g, '_');
  const lowerHints = hints.map(norm);
  for (const h of lowerHints) {
    const exact = tours.find((t) => norm(t.tourId) === h);
    if (exact) return exact;
  }
  const candidates = tours.filter((t) => {
    const id = norm(t.tourId);
    return lowerHints.some(
      (h) =>
        id === h ||
        id.startsWith(`${h}_`) ||
        id.endsWith(`_${h}`) ||
        (id.startsWith(h) && (id.length === h.length || id[h.length] === '_')),
    );
  });
  if (!candidates.length) return null;
  candidates.sort((a, b) => (a.days || 99) - (b.days || 99) || a.tourId.length - b.tourId.length);
  return candidates[0] || null;
}

export async function fetchTourPackages(): Promise<TourPackage[]> {
  const now = Date.now();
  if (tourCache && now - tourCache.at < CACHE_MS) return tourCache.tours;
  const url = `${FARE_API_BASE()}/api/fares/tours.php?t=${now}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Tour fares HTTP ${res.status}`);
  const data = (await res.json()) as Array<Record<string, unknown>>;
  if (!Array.isArray(data)) throw new Error('Tour fares empty');
  const tours: TourPackage[] = data.map((t) => ({
    tourId: String(t.tourId || ''),
    tourName: String(t.tourName || t.tourId || 'Tour'),
    distance: asNum(t.distance) || undefined,
    days: asNum(t.days, 1) || 1,
    pricing: (t.pricing as Record<string, number>) || {},
  }));
  tourCache = { at: now, tours };
  return tours;
}

/** Full tour detail from website CMS — includes live itinerary (same as TourDetailPage). */
export async function fetchTourDetail(tourId: string): Promise<TourDetailPackage | null> {
  const id = tourId.trim();
  if (!id) return null;
  const now = Date.now();
  const cached = tourDetailCache.get(id.toLowerCase());
  if (cached && now - cached.at < CACHE_MS) return cached.detail;

  const url = `${FARE_API_BASE()}/api/tours.php/${encodeURIComponent(id)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const t = (await res.json()) as Record<string, unknown>;
  if (!t || t.status === 'error' || !t.tourId) return null;

  const itineraryRaw = Array.isArray(t.itinerary) ? t.itinerary : [];
  const itinerary: TourItineraryDay[] = itineraryRaw.map((day, idx) => {
    const d = day as Record<string, unknown>;
    const activities = Array.isArray(d.activities)
      ? d.activities.map((a) => String(a).trim()).filter((a) => a && !/^-+$/.test(a))
      : [];
    return {
      day: asNum(d.day, idx + 1) || idx + 1,
      title: String(d.title || `Day ${idx + 1}`),
      description: d.description ? String(d.description) : undefined,
      activities,
    };
  });

  const detail: TourDetailPackage = {
    tourId: String(t.tourId),
    tourName: String(t.tourName || t.tourId),
    distance: asNum(t.distance) || undefined,
    days: asNum(t.days, 1) || 1,
    pricing: (t.pricing as Record<string, number>) || {},
    description: t.description ? String(t.description) : undefined,
    timeDuration: t.timeDuration ? String(t.timeDuration) : undefined,
    itinerary,
    inclusions: Array.isArray(t.inclusions) ? t.inclusions.map(String) : undefined,
    exclusions: Array.isArray(t.exclusions) ? t.exclusions.map(String) : undefined,
  };
  tourDetailCache.set(id.toLowerCase(), { at: now, detail });
  // Also cache under exact API id casing
  tourDetailCache.set(detail.tourId.toLowerCase(), { at: now, detail });
  return detail;
}

export function isTourPackageIntent(message: string): boolean {
  const lower = message.toLowerCase();
  if (/\b(tour\s*package|day\s*tour|sightseeing\s*package|holiday\s*package)\b/.test(lower)) return true;
  if (/\b(3\s*days?\s*(?:and|&|\/)?\s*2\s*nights?|2\s*nights?\s*(?:and|&|\/)?\s*3\s*days?|3d\s*\/?\s*2n)\b/.test(lower)) {
    return true;
  }
  if (
    /\b(plan(?:ning)?|looking for|need|want)\b/.test(lower) &&
    /\b(trip|tour|package|visit|holiday|getaway)\b/.test(lower) &&
    /\b(vizag|visakhapatnam|araku|borra|lambasingi|vanajangi)\b/.test(lower)
  ) {
    return true;
  }
  if (/\b(tour|package)\b/.test(lower) && /(araku|borra|lambasingi|vanajangi|city|vizag|temple)/.test(lower)) {
    return true;
  }
  // Same destinations the website redirects from outstation → tour
  return TOUR_MATCHERS.some((m) => m.keywords.some((k) => lower.includes(k)));
}

export function matchTourPackage(message: string, tours: TourPackage[]): TourPackage | null {
  const lower = message.toLowerCase();
  const multiDay = wantsMultiDayTour(lower);

  if (multiDay) {
    const multi =
      findTourByIdHints(tours, ['araku_vizag_3d_2n']) ||
      tours.find((t) => (t.days || 1) > 1 && /araku/i.test(t.tourId + t.tourName));
    if (multi) return multi;
  }

  if (/south\s*city|vizag\s*south/.test(lower)) {
    const south = findTourByIdHints(tours, ['vizag_south_city']) ||
      tours.find((t) => /south/i.test(t.tourId + t.tourName));
    if (south) return south;
  }
  if (/north\s*city|city\s*tour|sightseeing|vizag\s*city/.test(lower) && !/araku|borra|lambasingi|vanajangi/.test(lower)) {
    const north =
      findTourByIdHints(tours, ['vizag_north_city_tour', 'vizag_north_city']) ||
      tours.find((t) => /north|city/i.test(t.tourId + t.tourName) && !/araku|3d/i.test(t.tourId));
    if (north) return north;
  }

  let best: TourPackage | null = null;
  let bestScore = 0;
  for (const matcher of TOUR_MATCHERS) {
    if (matcher.multiDay && !multiDay) continue;
    const hitKw = matcher.keywords.filter((k) => lower.includes(k));
    if (!hitKw.length) continue;
    const score = hitKw.reduce((s, k) => s + k.length, 0);
    const tour =
      findTourByIdHints(tours, matcher.tourIdHints) ||
      tours
        .filter((t) => hitKw.some((k) => t.tourName.toLowerCase().includes(k)))
        .sort((a, b) => (a.days || 99) - (b.days || 99) || a.tourId.length - b.tourId.length)[0];
    if (tour && score > bestScore) {
      best = tour;
      bestScore = score;
    }
  }

  // Default Araku/Borra asks to the 1-day package, not 3D/2N
  if (best && !multiDay && (best.days || 1) > 1 && /araku/i.test(best.tourId + best.tourName)) {
    const day = findTourByIdHints(tours, ['araku']) ||
      tours.find((t) => t.tourId.toLowerCase() === 'araku' || ((t.days || 1) === 1 && /araku/i.test(t.tourName)));
    if (day) return day;
  }

  return best;
}

const TOUR_VEHICLE_ORDER = ['sedan', 'ertiga', 'innova_crysta', 'tempo_traveller', 'bus'] as const;

function resolveTourVehiclePrice(pricing: Record<string, number>, vehicleId: string): number {
  const nid = normalizeVehicleId(vehicleId);
  if (pricing[nid] > 0) return pricing[nid];
  if (pricing[vehicleId] > 0) return pricing[vehicleId];
  const key = Object.keys(pricing).find((k) => normalizeVehicleId(k) === nid);
  return key ? pricing[key] : 0;
}

export function formatTourPackageReply(tour: TourPackage): string {
  const lines = TOUR_VEHICLE_ORDER.map((id) => {
    const price = resolveTourVehiclePrice(tour.pricing, id);
    if (!price) return null;
    return `• ${vehicleLabel(id)}: ₹${price.toLocaleString('en-IN')}`;
  }).filter(Boolean);

  const meta: string[] = [];
  if (tour.days && tour.days > 1) meta.push(`${tour.days} days`);
  if (tour.distance) meta.push(`~${tour.distance} km`);
  const metaLine = meta.length ? ` (${meta.join(' · ')})` : '';

  return (
    `${tour.tourName.trim()}${metaLine}:\n` +
    `${lines.join('\n')}\n` +
    `Reply "book it" for checkout, or share travel date / pickup time / vehicle. Call +91 99663 63662 anytime.`
  );
}

export function isTourItineraryIntent(message: string): boolean {
  return /\b(itinerary|day\s*plan|tour\s*plan|schedule|places?\s+to\s+visit|sightseeing\s+plan|what\s+(places|spots)|inclusions?|what('?s| is)?\s+included)\b/i.test(
    message,
  );
}

export function formatTourItineraryReply(detail: TourDetailPackage): string {
  const parts: string[] = [];
  const meta: string[] = [];
  if (detail.timeDuration) meta.push(detail.timeDuration.trim());
  else if (detail.days) meta.push(`${detail.days} day${detail.days > 1 ? 's' : ''}`);
  if (detail.distance) meta.push(`~${detail.distance} km`);
  const metaLine = meta.length ? ` (${meta.join(' · ')})` : '';

  parts.push(`${detail.tourName.trim()} — itinerary${metaLine}:`);

  if (detail.itinerary.length) {
    detail.itinerary.forEach((day, idx) => {
      const label =
        detail.itinerary.length > 1 ? `Day ${idx + 1}: ${day.title}` : day.title;
      parts.push(`\n${label}`);
      if (day.description?.trim()) {
        const desc = day.description.trim().replace(/\s+/g, ' ');
        if (desc.length < 280) parts.push(desc);
      }
      for (const act of day.activities.slice(0, 18)) {
        parts.push(`• ${act}`);
      }
    });
  } else {
    parts.push('\nItinerary details are not published for this tour yet.');
  }

  if (detail.inclusions?.length) {
    parts.push('\nInclusions:');
    for (const inc of detail.inclusions.slice(0, 8)) parts.push(`• ${inc}`);
  }

  parts.push(
    `\nFull tour page: ${FARE_API_BASE()}/tours/${
      detail.tourId.toLowerCase() === 'araku' ? 'araku-valley-tour' : detail.tourId
    }`,
  );
  parts.push(
    'Reply "book it" for checkout, or share travel date / pickup time / vehicle. Call +91 99663 63662.',
  );
  return parts.join('\n');
}

export async function fetchAllTourDetails(): Promise<TourDetailPackage[]> {
  const tours = await fetchTourPackages();
  const details = await Promise.all(tours.map((t) => fetchTourDetail(t.tourId)));
  return details.filter((d): d is TourDetailPackage => Boolean(d && d.tourId));
}

function isBareItineraryAsk(message: string): boolean {
  const lower = message.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return /^(i\s+)?(need|want|show|share|give|send)?\s*(the\s+|me\s+the\s+|me\s+)?(itinerary|day plan|tour plan|schedule)\s*(please)?$/.test(
    lower,
  );
}

export async function quoteTourItinerary(
  message: string,
  opts?: { lastTourId?: string | null; historyText?: string },
): Promise<{ reply: string; tourId: string } | null> {
  if (!isTourItineraryIntent(message)) return null;

  try {
    const tours = await fetchTourPackages();

    // 1) Always prefer the CURRENT message (never score against prior Araku itinerary text in history)
    let tour = matchTourPackage(message, tours);

    // 2) Bare "itinerary" / "i need itinerary" → last discussed tour
    if (!tour && isBareItineraryAsk(message) && opts?.lastTourId) {
      tour =
        tours.find((t) => t.tourId.toLowerCase() === opts.lastTourId!.toLowerCase()) || null;
    }

    // 3) Still unknown → ask which tour (do NOT default to Araku)
    if (!tour) {
      const names = tours.map((t) => `• ${t.tourName.trim()}`).join('\n');
      return {
        reply: `Which tour itinerary do you need?\n${names}\nSay e.g. "Lambasingi itinerary" or "Araku itinerary".`,
        tourId: '',
      };
    }

    const detail =
      (await fetchTourDetail(tour.tourId)) ||
      (await fetchTourDetail(tour.tourId.toLowerCase()));
    if (!detail || !detail.itinerary.length) {
      return {
        reply:
          `I could not load the live itinerary for ${tour.tourName.trim()} right now. ` +
          `Please see https://vizagtaxihub.com/tours or call +91 99663 63662.`,
        tourId: tour.tourId,
      };
    }
    return { reply: formatTourItineraryReply(detail), tourId: detail.tourId };
  } catch (err) {
    console.error('[fareEngine] quoteTourItinerary failed', err);
    return null;
  }
}

export async function quoteTourPackage(message: string): Promise<string | null> {
  if (!isTourPackageIntent(message)) return null;
  try {
    const tours = await fetchTourPackages();
    const tour = matchTourPackage(message, tours);
    if (!tour) {
      // List available tours when user said "tour" but no specific match
      if (/\btour|package\b/i.test(message)) {
        const names = tours.map((t) => `• ${t.tourName}`).join('\n');
        return `Available tour packages (fixed package rates, not outstation):\n${names}\nWhich tour do you want? e.g. Araku Valley, Lambasingi, Vizag City Tour.`;
      }
      return null;
    }
    return formatTourPackageReply(tour);
  } catch (err) {
    console.error('[fareEngine] quoteTourPackage failed', err);
    return null;
  }
}

/** Returns tourId when a package quote was produced (for follow-up itinerary asks). */
export async function quoteTourPackageWithId(
  message: string,
): Promise<{ reply: string; tourId: string } | null> {
  if (!isTourPackageIntent(message)) return null;
  try {
    const tours = await fetchTourPackages();
    const tour = matchTourPackage(message, tours);
    if (!tour) return null;
    return { reply: formatTourPackageReply(tour), tourId: tour.tourId };
  } catch {
    return null;
  }
}

export async function buildLiveRateCardBrief(): Promise<string> {
  try {
    const [out, local, tours, airport, tourDetails] = await Promise.all([
      fetchOutstationRateCards(),
      fetchLocalRateCards(),
      fetchTourPackages().catch(() => [] as TourPackage[]),
      fetchAirportRateCards().catch(() => ({} as Record<string, AirportFareRow>)),
      fetchAllTourDetails().catch(() => [] as TourDetailPackage[]),
    ]);
    const pick = (id: string) => resolveOutstationRow(out, id);
    const lp = (id: string) => local[id] || local[normalizeVehicleId(id)];
    const ap = (id: string) => resolveAirportRow(airport, id);

    const oLines = ['sedan', 'ertiga', 'innova_crysta', 'tempo_traveller', 'bus']
      .map((id) => {
        const r = pick(id);
        if (!r) return null;
        return `${vehicleLabel(id, r.name)}: outstation ₹${r.oneWayPricePerKm}/km · base ₹${r.oneWayBasePrice} · tiers ₹${r.tier1Price}/${r.tier2Price}/${r.tier3Price}/${r.tier4Price} · driver ₹${r.driverAllowance}`;
      })
      .filter(Boolean);

    const aLines = ['sedan', 'ertiga', 'innova_crysta', 'tempo_traveller', 'bus']
      .map((id) => {
        const r = ap(id);
        if (!r) return null;
        return `${vehicleLabel(id, r.name)} airport/local transfer: ≤10km ₹${r.tier1Price} · ≤20km ₹${r.tier2Price} · ≤30km ₹${r.tier3Price} · ≤40km ₹${r.tier4Price} · then +₹${r.extraKmCharge}/km (NO driver allowance)`;
      })
      .filter(Boolean);

    const lLines = ['sedan', 'ertiga', 'innova_crysta', 'tempo_traveller', 'bus']
      .map((id) => {
        const r = lp(id);
        if (!r) return null;
        return `${vehicleLabel(id)} local package: 8hr/80km ₹${r.price8hrs80km} · 10hr/100km ₹${r.price10hrs100km} · extra ₹${r.priceExtraKm}/km`;
      })
      .filter(Boolean);

    const tLines = tours.map((t) => {
      const sedan = resolveTourVehiclePrice(t.pricing, 'sedan');
      const tempo = resolveTourVehiclePrice(t.pricing, 'tempo_traveller');
      return `Tour "${t.tourName.trim()}" [${t.tourId}]: sedan ₹${sedan || '—'} · tempo ₹${tempo || '—'} (FIXED package)`;
    });

    const itinLines = tourDetails.map((d) => {
      const stops = d.itinerary
        .flatMap((day, idx) => {
          const prefix = d.itinerary.length > 1 ? `Day${idx + 1} ${day.title}: ` : '';
          return day.activities.slice(0, 12).map((a) => `${prefix}${a}`);
        })
        .slice(0, 16)
        .join(' | ');
      return `ITINERARY [${d.tourId}] ${d.tourName.trim()}: ${stops || '(none published)'}`;
    });

    return [
      'LIVE RATE CARDS (from booking database — do not invent other numbers):',
      ...oLines,
      'AIRPORT / LOCAL TRANSFERS (one-way ≤35 km uses these slabs — NEVER outstation base+driver for short city hops):',
      ...aLines,
      'LOCAL hourly packages (8hrs/80km and 10hrs/100km only — NEVER 4hrs/40km):',
      ...lLines,
      'LOCAL: quote 8hrs/80km and 10hrs/100km only — NEVER 4hrs/40km (discontinued).',
      'TOUR PACKAGES (use these for Araku/Borra/Lambasingi/city sightseeing — NEVER outstation tier fares):',
      ...tLines,
      'LIVE TOUR ITINERARIES (copy only the matching tourId — NEVER invent timings or mix Araku with Lambasingi):',
      ...itinLines,
      'One-way outstation 35–tier4Max km uses FLAT tier price + driver allowance (NOT base×km). Beyond tier4: base + 2×(km−150)×extraKm + driver.',
      'When a ROUTE_QUOTE, TOUR_QUOTE, or ITINERARY block is provided, copy those exactly.',
    ].join('\n');
  } catch (err) {
    console.error('[fareEngine] buildLiveRateCardBrief failed', err);
    return 'LIVE rate cards unavailable — do not invent fares; ask visitor to use the booking form or call +91 99663 63662.';
  }
}

export async function quoteVehicleRateCard(vehicleHint: string): Promise<string | null> {
  const id = normalizeVehicleId(vehicleHint);
  try {
    const [out, local, airport] = await Promise.all([
      fetchOutstationRateCards(),
      fetchLocalRateCards(),
      fetchAirportRateCards(),
    ]);
    const o = resolveOutstationRow(out, id);
    const l = local[id] || local[Object.keys(local).find((k) => normalizeVehicleId(k) === id) || ''];
    const a = resolveAirportRow(airport, id);
    if (!o && !l && !a) return null;
    const name = vehicleLabel(id, o?.name || a?.name);
    const parts: string[] = [`${name} — live booking rates:`];
    if (a) {
      parts.push(
        `Airport/local transfer (≤35 km): ≤10km ₹${a.tier1Price.toLocaleString('en-IN')} · ≤20km ₹${a.tier2Price.toLocaleString('en-IN')} · ≤30km ₹${a.tier3Price.toLocaleString('en-IN')} · ≤40km ₹${a.tier4Price.toLocaleString('en-IN')} (then +₹${a.extraKmCharge}/km).`,
      );
    }
    if (l) {
      parts.push(
        `Local packages: 8hrs/80km ₹${l.price8hrs80km.toLocaleString('en-IN')} · 10hrs/100km ₹${l.price10hrs100km.toLocaleString('en-IN')} (extra ₹${l.priceExtraKm}/km, ₹${l.priceExtraHour}/hr).`,
      );
    }
    if (o) {
      parts.push(
        `Outstation (>35 km): ₹${o.oneWayPricePerKm}/km · base ₹${o.oneWayBasePrice.toLocaleString('en-IN')} · short-trip tiers ₹${o.tier1Price}/${o.tier2Price}/${o.tier3Price}/${o.tier4Price} (flat + driver ₹${o.driverAllowance}). Night halt ₹${o.nightHaltCharge}.`,
      );
    }
    parts.push(
      'Share pickup, drop, and date for an exact quote — or reply "book it" when ready. Call +91 99663 63662.',
    );
    return parts.join(' ');
  } catch (err) {
    console.error('[fareEngine] quoteVehicleRateCard failed', err);
    return null;
  }
}

export function looksLikeClockToken(raw: string): boolean {
  const t = raw.trim().toLowerCase();
  if (/^\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)$/i.test(t)) return true;
  if (/^\d{1,2}\s*(?:am|pm)$/i.test(t)) return true;
  if (/^(?:[01]?\d|2[0-3])[:.][0-5]\d$/.test(t)) return true;
  if (/^\d{1,2}(?:am|pm)$/i.test(t)) return true;
  return false;
}

export function isLocalHourlyPackageIntent(message: string): boolean {
  const lower = message.toLowerCase();
  if (/\b0?4\s*hrs?\s*[\/\-]?\s*40\b/.test(lower)) return false;
  return (
    /\b(?:8\s*hr(?:s|ours?)?\s*[\/\-]?\s*80|10\s*hr(?:s|ours?)?\s*[\/\-]?\s*100|local\s*(?:hourly\s*)?package)\b/i.test(
      lower,
    ) ||
    (/\blocal\b/.test(lower) && /\b(8\s*hr|80\s*km|package)\b/.test(lower) && !/\baraku|outstation|airport\b/.test(lower))
  );
}

export async function quoteLocalHourlyPackages(): Promise<string> {
  const local = await fetchLocalRateCards();
  const ids = ['sedan', 'ertiga', 'innova_crysta', 'tempo_traveller', 'bus'] as const;
  const lineFor = (hours: 8 | 10) =>
    ids
      .map((id) => {
        const r = local[id] || local[Object.keys(local).find((k) => normalizeVehicleId(k) === id) || ''];
        if (!r) return null;
        const price = hours === 8 ? r.price8hrs80km : r.price10hrs100km;
        if (!price) return null;
        return `• ${vehicleLabel(id)}: ₹${price.toLocaleString('en-IN')}`;
      })
      .filter(Boolean)
      .join('\n');

  const extra = (() => {
    const sedan = local.sedan || local[Object.keys(local).find((k) => normalizeVehicleId(k) === 'sedan') || ''];
    if (!sedan) return '';
    return `Extra (Sedan): ₹${sedan.priceExtraKm}/km · ₹${sedan.priceExtraHour}/hr. `;
  })();

  return (
    `Vizag local packages (cab only — not per person):\n\n` +
    `8hrs / 80km:\n${lineFor(8)}\n\n` +
    `10hrs / 100km:\n${lineFor(10)}\n\n` +
    `${extra}4hrs/40km is discontinued.\n` +
    `Share pickup point, date, and vehicle to book. Call +91 99663 63662.`
  );
}

/** Parse "X to Y" / "to Y from X" style places from a visitor message. */
export function extractRoutePlaces(message: string): { from: string; to: string } | null {
  const cleaned = message
    .replace(/\b(cost|fare|price|charges?|rate|kitna|how much|approx|approximately)\b/gi, ' ')
    .replace(/\b(travel\s*time|journey\s*time|driving\s*time|how\s*long|duration|eta)\b/gi, ' ')
    .replace(/\b(round\s*-?\s*trip|return\s+trip|one\s*-?\s*way)\b/gi, ' ')
    .replace(/\bfor\s+(\d+|one|two|three|four|five|six|seven)\s+days?\b/gi, ' ')
    .replace(/\b(\d+|one|two|three|four|five|six|seven)\s+days?\b/gi, ' ')
    .replace(/\b(?:at|by)\s+\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm|fn|an)?\b/gi, ' ')
    .replace(/\b\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm|fn|an)\b/gi, ' ')
    // Flight origin is NOT the cab destination: "arriving from Chennai"
    .replace(/\b(?:arriv(?:e|ing)|coming|landing|flight)\s+from\s+[A-Za-z][A-Za-z\s]{1,40}/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // "to Rajahmundry from Visakhapatnam" / "to X from Y"
  const toFrom = cleaned.match(/\bto\s+(.+?)\s+from\s+(.+?)$/i);
  if (toFrom) {
    const to = cleanPlaceToken(toFrom[1]!);
    const from = cleanPlaceToken(toFrom[2]!);
    // Ignore "to vizag from 3 days..." — "from" here means duration, not origin
    if (
      isPlausiblePlace(from) &&
      isPlausiblePlace(to) &&
      !/\b(days?|nights?|hours?|hrs?)\b/i.test(from)
    ) {
      return { from: qualifyPlaceQuery(from), to: qualifyPlaceQuery(to) };
    }
  }

  // "from Visakhapatnam to Rajahmundry"
  const fromTo = cleaned.match(/\bfrom\s+(.+?)\s+to\s+(.+?)$/i);
  if (fromTo) {
    const from = cleanPlaceToken(fromTo[1]!);
    const to = cleanPlaceToken(fromTo[2]!);
    if (isPlausiblePlace(from) && isPlausiblePlace(to)) {
      return { from: qualifyPlaceQuery(from), to: qualifyPlaceQuery(to) };
    }
  }

  // "I need vehicle to Rajahmundry" / "cab to Tuni" / "to Hyderabad" → assume Vizag pickup
  const destOnly = cleaned.match(
    /^(?:(?:i\s+)?(?:need|want|looking\s+for)\s+)?(?:a\s+)?(?:vehicle|cab|taxi|car|book(?:ing)?)?\s*(?:to|towards|toward)\s+(.+?)$/i,
  );
  if (destOnly) {
    const to = cleanPlaceToken(destOnly[1]!);
    if (isPlausiblePlace(to)) {
      return {
        from: qualifyPlaceQuery('Visakhapatnam'),
        to: qualifyPlaceQuery(to),
      };
    }
  }

  const m = cleaned.match(/\b(.+?)\s+(?:to|towards|toward|->|→)\s+(.+?)$/i);
  if (!m) return null;
  const from = cleanPlaceToken(m[1]!);
  const to = cleanPlaceToken(m[2]!);
  if (!isPlausiblePlace(to)) return null;
  // Junk left of "to" (e.g. "I need vehicle to Rajahmundry") → Vizag → destination
  if (!isPlausiblePlace(from)) {
    return {
      from: qualifyPlaceQuery('Visakhapatnam'),
      to: qualifyPlaceQuery(to),
    };
  }

  return { from: qualifyPlaceQuery(from), to: qualifyPlaceQuery(to) };
}

function cleanPlaceToken(raw: string): string {
  return raw
    .trim()
    .replace(/[?.!,]+$/g, '')
    .replace(/^(?:the|a|an)\s+/i, '')
    // "Vizianagaram taxi fare" leftovers → "Vizianagaram"
    .replace(/\s+(?:taxi|cab|cabs|fares?|charges?|rates?|trip|trips)$/i, '')
    .replace(/\s+/g, ' ')
    .slice(0, 120)
    .trim();
}

function isPlausiblePlace(raw: string): boolean {
  if (raw.length < 2 || raw.length > 100) return false;
  if (looksLikeClockToken(raw)) return false;
  if (
    /^(what|whats|please|tell|need|want|how|much|time|travel|fare|price|cost|charges?|im|i'm|i|planning|vehicle|cab|taxi|car|book|tmrw|tomorrow|yesterday|outstation|out\s*station)$/i.test(
      raw,
    )
  ) {
    return false;
  }
  if (/^(travel\s*time|journey|duration|eta)$/i.test(raw)) return false;
  if (/\b(how much|travel time|fare|price|planning|looking for)\b/i.test(raw)) return false;
  // "I need vehicle" / "need a cab" are not places
  if (/^(i\s+)?(need|want|looking\s+for)\b/i.test(raw)) return false;
  if (/\b(need|want)\s+(a\s+)?(vehicle|cab|taxi|car|book)\b/i.test(raw)) return false;
  if (/^(a\s+)?(vehicle|cab|taxi|car)(\s+please)?$/i.test(raw)) return false;
  if (/\b(days?|nights?|hours?|hrs?)\b/i.test(raw)) return false;
  // Never treat handoff / chat phrases as pickup/drop ("Please connect me to human operator")
  if (
    /\b(connect|human|operator|agent|executive|support|someone|person|chat|whatsapp|call\s*me|talk\s*to|help\s*desk)\b/i.test(
      raw,
    )
  ) {
    return false;
  }
  if (/^(please|kindly)\b/i.test(raw)) return false;
  if (/\b(accommodation|dormitory|hotel\s+stay|persons?)\b/i.test(raw)) return false;
  return true;
}

/** Parse "2 days" / "two days" for round-trip billing. */
export function extractCalendarDays(message: string): number | null {
  const lower = message.toLowerCase();
  const num = lower.match(/\bfor\s+(\d{1,2})\s+days?\b/) || lower.match(/\b(\d{1,2})\s+days?\b/);
  if (num) return Math.max(1, Math.min(30, Number(num[1])));
  const words: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
  };
  const w = lower.match(/\bfor\s+(one|two|three|four|five|six|seven)\s+days?\b/) ||
    lower.match(/\b(one|two|three|four|five|six|seven)\s+days?\b/);
  if (w) return words[w[1]!] || null;
  return null;
}
