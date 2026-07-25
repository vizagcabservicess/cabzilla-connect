import { getLocationBySlug, searchLocations, type Location } from './locationData';
import { CITY_LOOKUP } from './cityLookup';

const SESSION_GUEST_TRACK_PHONE_KEY = 'guestTrackWhatsAppE164';

/** Known Vizag landmarks — avoid collapsing to city-center Visakhapatnam. */
const PLACE_COORDS: Array<{ match: RegExp; name: string; lat: number; lng: number; type: Location['type'] }> = [
  {
    match: /\bnovotel\b/i,
    name: 'Novotel Visakhapatnam',
    lat: 17.7105,
    lng: 83.3162,
    type: 'hotel',
  },
  {
    match: /\bakka+y+a\s*pal(?:em|me|am|um)\b/i,
    name: 'Akkayapalem',
    lat: 17.734,
    lng: 83.302,
    type: 'landmark',
  },
  {
    match: /\bkailasapuram\b/i,
    name: 'Kailasapuram',
    lat: 17.7409,
    lng: 83.2882,
    type: 'landmark',
  },
  {
    match: /\bmadhurawada\b/i,
    name: 'Madhurawada',
    lat: 17.822,
    lng: 83.356,
    type: 'landmark',
  },
  {
    match: /\bgajuwaka\b/i,
    name: 'Gajuwaka',
    lat: 17.7,
    lng: 83.216,
    type: 'landmark',
  },
  {
    match: /\bmvp\b|\bmvp\s*colony\b/i,
    name: 'MVP Colony',
    lat: 17.739,
    lng: 83.338,
    type: 'landmark',
  },
  {
    match: /\bbeach\s*road\b|\brk\s*beach\b/i,
    name: 'RK Beach',
    lat: 17.7135,
    lng: 83.3234,
    type: 'landmark',
  },
  {
    match: /\bnad\s*(?:junction|jn\.?)?\b/i,
    name: 'NAD Junction',
    lat: 17.7412,
    lng: 83.2318,
    type: 'landmark',
  },
  {
    match: /\binorbit\b/i,
    name: 'Inorbit Mall Visakhapatnam',
    lat: 17.8215,
    lng: 83.3555,
    type: 'landmark',
  },
  {
    match: /(?:vizag|visakhapatnam)\s*airport|\bvtz\b|^airport$/i,
    name: 'Visakhapatnam Airport',
    lat: 17.7211,
    lng: 83.2245,
    type: 'airport',
  },
];

function slugifyPlace(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/visakhapatnam\s*airport|vizag\s*airport|\bvtz\b/gi, 'vizag-airport')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** First meaningful place token — strip ", Visakhapatnam, AP, India". */
function primaryPlaceLabel(raw: string): string {
  const cleaned = raw
    .replace(/,?\s*India\s*$/i, '')
    .replace(/,?\s*Andhra Pradesh\s*$/i, '')
    .trim();
  const first = cleaned.split(',')[0]?.trim() || cleaned;
  return first.replace(/\s+/g, ' ').trim();
}

function findCityLookupExact(name: string): { key: string; data: (typeof CITY_LOOKUP)[string] } | null {
  const needle = name.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!needle) return null;
  // Exact city name only — never match "Visakhapatnam" inside "Novotel Visakhapatnam"
  for (const [key, data] of Object.entries(CITY_LOOKUP)) {
    if (key.toLowerCase() === needle) return { key, data };
  }
  // Bare vizag / waltair aliases
  if (/^(vizag|visakhapatnam|waltair)$/i.test(needle)) {
    const data = CITY_LOOKUP['Visakhapatnam'];
    if (data) return { key: 'Visakhapatnam', data };
  }
  return null;
}

/** Build a Location from a free-text place name (AI / deep-link). */
export function locationFromPlaceName(name: string, id: string): Location {
  const trimmed = name.trim();
  const primary = primaryPlaceLabel(trimmed);

  for (const a of PLACE_COORDS) {
    if (a.match.test(trimmed) || a.match.test(primary)) {
      const displayName = primary.length >= 3 ? primary : a.name;
      return {
        id,
        name: displayName,
        address: trimmed.includes(',') ? trimmed : `${a.name}, Visakhapatnam, Andhra Pradesh`,
        city: 'Visakhapatnam',
        state: 'Andhra Pradesh',
        lat: a.lat,
        lng: a.lng,
        type: a.type,
        popularityScore: 95,
        isInVizag: true,
      };
    }
  }

  // Prefer CITY_LOOKUP before searchLocations — many apDestinations still have Vizag placeholder coords
  const cityHit = findCityLookupExact(primary);
  if (cityHit) {
    return {
      id: `city_${slugifyPlace(cityHit.key)}`,
      name: cityHit.key,
      city: cityHit.data.city,
      state: cityHit.data.state,
      lat: cityHit.data.lat,
      lng: cityHit.data.lng,
      type: 'landmark',
      popularityScore: 90,
      address: `${cityHit.key}, ${cityHit.data.state}`,
    };
  }

  const hits = searchLocations(primary, id.includes('pickup'));
  const hit = hits.find(
    (h) =>
      h.lat &&
      h.lng &&
      (h.name.toLowerCase().includes(primary.toLowerCase().slice(0, 8)) ||
        primary.toLowerCase().includes(h.name.toLowerCase().slice(0, 8))),
  );
  if (hit) {
    const lookup = findCityLookupExact(hit.name) || findCityLookupExact(hit.city || '');
    return {
      ...hit,
      id: hit.id || id,
      name: primary.length >= 3 ? primary : hit.name,
      address: hit.address || `${primary}, ${hit.state || 'Andhra Pradesh'}`,
      lat: lookup?.data.lat ?? hit.lat,
      lng: lookup?.data.lng ?? hit.lng,
      city: lookup?.data.city ?? hit.city,
      state: lookup?.data.state ?? hit.state,
    };
  }

  const slug = slugifyPlace(primary);
  const resolved = getLocationBySlug(slug);
  const lookupBySlug = findCityLookupExact(primary) || findCityLookupExact(resolved.name || '');
  const lat = lookupBySlug?.data.lat ?? resolved.lat ?? 17.7243;
  const lng = lookupBySlug?.data.lng ?? resolved.lng ?? 83.3052;
  return {
    id,
    name: primary || trimmed,
    address: resolved.address || `${primary}, Andhra Pradesh`,
    city: lookupBySlug?.data.city || resolved.city || 'Visakhapatnam',
    state: lookupBySlug?.data.state || resolved.state || 'Andhra Pradesh',
    lat,
    lng,
    type: (resolved.type as Location['type']) || 'other',
    popularityScore: resolved.popularityScore ?? 50,
    isInVizag: /vizag|visakhapatnam/i.test(lookupBySlug?.data.city || resolved.city || ''),
  };
}

function parsePickupDateTime(dateRaw: string | null, timeRaw: string | null): Date {
  const now = new Date();
  const min = new Date(now.getTime() + 60 * 60 * 1000);
  if (!dateRaw?.trim()) return min;

  let base = new Date(dateRaw);
  if (Number.isNaN(base.getTime())) {
    base = new Date(`${dateRaw.trim()} 12:00:00`);
  }
  if (Number.isNaN(base.getTime())) return min;

  if (timeRaw?.trim()) {
    const t = timeRaw.trim();
    const m12 = t.match(/^(\d{1,2})([:.](\d{2}))?\s*(am|pm)$/i);
    const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
    if (m12) {
      let h = parseInt(m12[1], 10);
      const minPart = m12[3] ? parseInt(m12[3], 10) : 0;
      const ap = m12[4].toLowerCase();
      if (ap === 'pm' && h < 12) h += 12;
      if (ap === 'am' && h === 12) h = 0;
      base.setHours(h, minPart, 0, 0);
    } else if (m24) {
      base.setHours(parseInt(m24[1], 10), parseInt(m24[2], 10), 0, 0);
    }
  }

  return base < min ? min : base;
}

function normalizePhoneDigits(phone: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

/**
 * Sync apply VTH AI checkout params → sessionStorage so Hero opens Guest Details (step 3).
 * Returns true when this was an AI guest-checkout deep link.
 */
export function applyVthAiCheckoutPrefill(params: URLSearchParams): boolean {
  const stepGuest = params.get('step') === 'guest';
  const sourceAi = params.get('source') === 'vth_ai';
  if (!stepGuest && !sourceAi) return false;

  const from = params.get('from') || params.get('pickup') || '';
  const to = params.get('to') || params.get('dropoff') || params.get('drop') || '';
  if (!from || !to) return false;

  const tripTypeParam = (params.get('tripType') || '').toLowerCase();
  const hay = `${from} ${to}`;
  let tripType: 'outstation' | 'airport' | 'local' = 'outstation';
  if (tripTypeParam === 'airport' || tripTypeParam === 'local' || tripTypeParam === 'outstation') {
    tripType = tripTypeParam;
  } else if (/airport|vtz/i.test(hay)) {
    tripType = 'airport';
  }

  const tripMode = params.get('tripMode') === 'round-trip' ? 'round-trip' : 'one-way';
  const vehicle = params.get('vehicle') || '';
  const fare = Number(params.get('fare') || '0');
  const km = Number(params.get('km') || '0');
  const name = params.get('name') || '';
  const phoneDigits = normalizePhoneDigits(params.get('phone'));
  const pickupDate = parsePickupDateTime(params.get('date'), params.get('time'));

  const pickupLocation = locationFromPlaceName(from, 'vth-ai-pickup');
  const dropLocation = locationFromPlaceName(to, 'vth-ai-drop');

  // Hero drops pickups that fail isLocationInVizag — ensure Vizag-area coords for local pickups
  if (!pickupLocation.lat || !pickupLocation.lng) {
    pickupLocation.lat = 17.7215;
    pickupLocation.lng = 83.2248;
    pickupLocation.city = pickupLocation.city || 'Visakhapatnam';
  }

  const prefillData = {
    pickupLocation,
    dropLocation,
    tripType,
    tripMode,
    pickupDate: pickupDate.toISOString(),
    autoTriggerSearch: false,
    openGuestDetails: true,
    vehicleHint: vehicle,
    estimatedFare: Number.isFinite(fare) && fare > 0 ? fare : 0,
    estimatedKm: Number.isFinite(km) && km > 0 ? km : 0,
    source: 'vth_ai',
  };

  try {
    sessionStorage.setItem('routePrefillData', JSON.stringify(prefillData));
    sessionStorage.setItem('tripType', tripType);
    sessionStorage.setItem('tripMode', tripMode);
    if (name) sessionStorage.setItem('guestName', name);
    if (phoneDigits) {
      sessionStorage.setItem('guestPhone', phoneDigits);
      sessionStorage.setItem('countryCode', '+91');
      sessionStorage.setItem(SESSION_GUEST_TRACK_PHONE_KEY, `+91${phoneDigits}`);
    }
  } catch {
    /* ignore quota / private mode */
  }

  return true;
}
