/**
 * Deterministic intents from live VTH AI chats (vira_widget).
 * Keep this free of DB / LLM so tests can run offline.
 */

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function ymd(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCMonth() + 1 !== month || dt.getUTCDate() !== day) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function defaultYearIst(): number {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCFullYear();
}

function pickUpcomingYear(month: number, day: number): number {
  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const year = now.getUTCFullYear();
  const candidate = Date.UTC(year, month - 1, day);
  const today = Date.UTC(year, now.getUTCMonth(), now.getUTCDate());
  return candidate >= today ? year : year + 1;
}

/** Parse chat dates: 15 October, 17th October, 25.08.26, 26 aug, 2nd October. */
export function parseFlexibleDate(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return null;
    return `${raw.getFullYear()}-${pad2(raw.getMonth() + 1)}-${pad2(raw.getDate())}`;
  }
  const s = String(raw).trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  if (/^(today)$/i.test(s)) {
    const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  }
  if (/^(tomorrow|tmrw|tommorow|tommorrow)$/i.test(s)) {
    const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  }

  const dotted = s.match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?$/);
  if (dotted) {
    const day = Number(dotted[1]);
    const month = Number(dotted[2]);
    let year = dotted[3] ? Number(dotted[3]) : pickUpcomingYear(month, day);
    if (year < 100) year += 2000;
    return ymd(year, month, day);
  }

  // Chat dumps: "21 09 2026" / "21 09 26"
  const spaced = s.match(/^(\d{1,2})\s+(\d{1,2})\s+(\d{2,4})$/);
  if (spaced) {
    const day = Number(spaced[1]);
    const month = Number(spaced[2]);
    let year = Number(spaced[3]);
    if (year < 100) year += 2000;
    return ymd(year, month, day);
  }

  const named = s.match(
    /^(?:on\s+|at\s+|dated?\s+)?(\d{1,2})(?:st|nd|rd|th)?[\s\-/]+([A-Za-z]+)(?:[\s\-/]+(\d{2,4}))?(?:\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))?$/i,
  );
  if (named) {
    const day = Number(named[1]);
    const month = MONTHS[named[2]!.toLowerCase()];
    if (!month) return null;
    const year = named[3] ? (Number(named[3]) < 100 ? Number(named[3]) + 2000 : Number(named[3])) : pickUpcomingYear(month, day);
    return ymd(year, month, day);
  }

  const monthFirst = s.match(/^([A-Za-z]+)[\s\-/]+(\d{1,2})(?:st|nd|rd|th)?(?:[\s\-/]+(\d{2,4}))?$/i);
  if (monthFirst) {
    const month = MONTHS[monthFirst[1]!.toLowerCase()];
    const day = Number(monthFirst[2]);
    if (!month) return null;
    const year = monthFirst[3]
      ? Number(monthFirst[3]) < 100
        ? Number(monthFirst[3]) + 2000
        : Number(monthFirst[3])
      : pickUpcomingYear(month, day);
    return ymd(year, month, day);
  }

  if (/^[A-Za-z]{3}\s/.test(s)) return null;
  return null;
}

/** Pull a date out of a longer sentence. */
export function extractFlexibleDate(message: string): string | null {
  const trimmed = message.trim();
  const whole = parseFlexibleDate(trimmed);
  if (whole) return whole;

  const named = trimmed.match(
    /\b(?:on\s+|at\s+|dated?\s+)?(\d{1,2}(?:st|nd|rd|th)?[\s\-/]+[A-Za-z]+(?:[\s\-/]+\d{2,4})?)\b/i,
  );
  if (named) {
    const parsed = parseFlexibleDate(named[1]);
    if (parsed) return parsed;
  }

  const numeric = trimmed.match(/\b(\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?)\b/);
  if (numeric) {
    const parsed = parseFlexibleDate(numeric[1]);
    if (parsed) return parsed;
  }

  const spaced = trimmed.match(/\b(\d{1,2})\s+(\d{1,2})\s+(\d{2,4})\b/);
  if (spaced) {
    const parsed = parseFlexibleDate(`${spaced[1]} ${spaced[2]} ${spaced[3]}`);
    if (parsed) return parsed;
  }

  if (/\b(today)\b/i.test(trimmed)) return parseFlexibleDate('today');
  if (/\b(tomorrow|tmrw)\b/i.test(trimmed)) return parseFlexibleDate('tomorrow');
  return null;
}

const WEEKDAY = 'monday|tuesday|wednesday|thursday|friday|saturday|sunday';

function meridiemToAmpm(raw: string): 'AM' | 'PM' {
  const t = raw.toLowerCase();
  if (t === 'pm' || t === 'an' || t === 'afternoon') return 'PM';
  return 'AM';
}

/**
 * Pickup times from chat: 11:30 AM, 11 30 AM, 11.30 FN (forenoon), 11:30 AN (afternoon).
 */
export function extractFlexibleTime(message: string): string | null {
  const trimmed = message.trim();

  const spacedFn = trimmed.match(
    /\b(?:at\s+|by\s+|pickup\s*(?:at|time)?[:\s]*)?(\d{1,2})[:.\s](\d{2})\s*(am|pm|fn|an|noon)\b/i,
  );
  if (spacedFn) {
    const h = Number(spacedFn[1]);
    const m = Number(spacedFn[2]);
    if (h >= 1 && h <= 12 && m <= 59) {
      const ap = /noon/i.test(spacedFn[3]!) ? 'PM' : meridiemToAmpm(spacedFn[3]!);
      return `${h}:${pad2(m)} ${ap}`;
    }
  }

  const colon = trimmed.match(
    /\b(?:at\s+|by\s+|pickup\s*(?:at|time)?[:\s]*)?(\d{1,2})[:.](\d{2})(?!\s*(?:am|pm|fn|an))\b/i,
  );
  if (colon) {
    const h = Number(colon[1]);
    const m = Number(colon[2]);
    if (h >= 0 && h <= 23 && m <= 59) {
      if (h === 0) return '12:00 AM';
      if (h > 12) return `${h}:${pad2(m)}`;
      return `${h}:${pad2(m)}`;
    }
  }

  const ampmHour = trimmed.match(
    /\b(?:at\s+|by\s+|pickup\s*(?:at|time)?[:\s]*)?(\d{1,2})\s*(am|pm|fn|an)\b/i,
  );
  if (ampmHour) {
    const h = Number(ampmHour[1]);
    if (h >= 1 && h <= 12) {
      return `${h}:00 ${meridiemToAmpm(ampmHour[2]!)}`;
    }
  }

  if (/^(good\s+)?(morning|afternoon|evening|night)[.!]?$/i.test(trimmed)) return null;
  const soft = trimmed.match(/\b(morning|afternoon|evening|night)\b/i);
  if (soft) {
    return soft[1]!.charAt(0).toUpperCase() + soft[1]!.slice(1).toLowerCase();
  }

  return null;
}

export function isAccommodationIntent(message: string): boolean {
  return /\b(dormitory|accommodation|hotel\s+(?:room|stay|booking)|rooms?\s+for\s+\d+|stay\s+in\s+araku)\b/i.test(
    message,
  );
}

export function accommodationReply(): string {
  return (
    `We provide cabs and tour packages only — hotel / dormitory stay is not included in the cab fare.\n` +
    `You book accommodation separately. If you still need the cab (pickup time, vehicle, date), share those details and I will quote the live fare.\n` +
    `Call +91 99663 63662 if you want hotel suggestions.`
  );
}

export function isVehicleRateOnlyIntent(message: string): boolean {
  const lower = message.toLowerCase();
  const hasVehicle =
    /\b(innova|crysta|ertiga|sedan|dzire|tempo|traveller|urbania|luxury)\b/.test(lower) ||
    /ఇన్నోవా|ఇనోవా/.test(message);
  const wantsRate =
    /బేరా|ధర|ఛార్జ్/.test(message) ||
    /\b(rate|rates|charg|price|fare|cost|kitna|quote|how much|per\s*km)\b/.test(lower);
  const hasRoute = /\b(to|from|towards|->|→)\b/.test(lower);
  return hasVehicle && wantsRate && !hasRoute;
}

export function vehicleHintFromMessage(message: string): string {
  const lower = message.toLowerCase();
  if (/urbania/.test(lower)) return 'urbania';
  if (/tempo|traveller/.test(lower)) return 'tempo';
  if (/innova|crysta|ఇన్నోవా|ఇనోవా/.test(lower) || /ఇన్నోవా|ఇనోవా/.test(message)) return 'innova';
  if (/ertiga/.test(lower)) return 'ertiga';
  if (/luxury/.test(lower)) return 'luxury';
  return 'sedan';
}

export function isCoachOrLargeBusIntent(message: string): boolean {
  return /\b(40\s*seater|50\s*seater|mini\s*bus|coach|32\s*seater)\b/i.test(message);
}

export function coachBusReply(): string {
  return (
    `Our website booking vehicles go up to Tempo Traveller (12 seater) and Urbania (16–17 seater).\n` +
    `We do not list a 40-seater on the form. For a coach / large bus, please call +91 99663 63662 and we will quote it.`
  );
}

export function isTwoDayArakuIntent(message: string): boolean {
  const lower = message.toLowerCase();
  const araku = /\b(araku|arakku|aruku)\b/.test(lower);
  const twoDay = /\b(2\s*days?|2d\s*\/?\s*1n|2\s*days?\s*(?:and|&)?\s*1\s*night|1\s*night)\b/.test(lower);
  const threeDay = /\b(3\s*days?|2\s*nights?|3d\s*\/?\s*2n)\b/.test(lower);
  return Boolean(araku && twoDay && !threeDay);
}

export function isTourFollowupIntent(message: string, lastTourName?: string | null): boolean {
  const lower = message.toLowerCase();
  if (/\b(hotel|stay|accommodation|included|inclusion|exclusion)\b/.test(lower)) return true;
  if (/\b(borra|bora\s*cave|will it take|places included|sightseeing|1 day plan|how many days|for how many days|timing|itinerary)\b/.test(lower)) {
    return true;
  }
  if (/\b(per person|per pax|split|6 ppl|6 people|\d+\s*pax|\d+\s*ppl)\b/.test(lower)) return true;
  if (lastTourName && /^(timing|itinerary|1 day plan|days?|cost|price)$/i.test(message.trim())) return true;
  return false;
}

export function isPerPersonIntent(message: string): boolean {
  return /\b(per person|per pax|each person|split|ppl cost)\b/i.test(message);
}

/** "is it one way or round trip?" — a question, never a destination. */
export function isTripModeQuestion(message: string): boolean {
  const t = message.trim().toLowerCase();
  const hasOne = /one\s*-?\s*way/.test(t);
  const hasRound = /round\s*-?\s*trip|return\s+trip|\b2\s*way\b/.test(t);
  const asking =
    /\?/.test(t) ||
    /^(is|are|was|were|does|do|can|could|will|would|what|which|how)\b/.test(t) ||
    /\b(or|which one|both|this fare|these fares)\b/.test(t);
  if (hasOne && hasRound) return asking || t.length < 80;
  if (!asking) return false;
  return (hasOne || hasRound) && /\b(is it|is this|are these|fare|quote|price|or)\b/.test(t);
}

export function isClarifyingQuestion(message: string): boolean {
  const t = message.trim();
  if (isTripModeQuestion(t)) return true;
  if (isPerPersonIntent(t) || isHotelIncludedAsk(t) || isHowManyDaysAsk(t)) return true;
  if (
    /(\?$|^(is|are|was|were|does|do|did|can|could|will|would|what|which|how|why)\b)/i.test(t) &&
    !/\b(?:from|to|towards|pickup|drop(?:\s+at)?)\s+[A-Za-z]{3,}/i.test(t)
  ) {
    return true;
  }
  return false;
}

/** Explicit trip-mode choice, not a question. */
export function parseTripModeAnswer(message: string): 'one-way' | 'round-trip' | null {
  if (isTripModeQuestion(message)) return null;
  const t = message.trim().toLowerCase();
  if (/^(it'?s\s+)?(a\s+)?round\s*-?\s*trip\b/.test(t) || /^(return(\s+trip)?|2\s*way)$/.test(t)) {
    return 'round-trip';
  }
  if (/^(it'?s\s+)?(a\s+)?one\s*-?\s*way\b/.test(t)) return 'one-way';
  if (/\bround\s*-?\s*trip\b/.test(t) && !/\bone\s*-?\s*way\b/.test(t)) return 'round-trip';
  if (/\bone\s*-?\s*way\b/.test(t) && !/\bround\b/.test(t)) return 'one-way';
  return null;
}

export function extractPassengerCount(message: string): number | null {
  const m = message.match(
    /\b(?:for\s+)?(\d{1,2})\s*(?:ppl|people|persons?|pax|passengers?|members?|guests?)\b/i,
  );
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 50) return n;
  }
  const word = message.match(
    /\b(four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen)\s*(?:ppl|people|persons?|pax|passengers?)?\b/i,
  );
  const map: Record<string, number> = {
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
  };
  if (word) return map[word[1]!.toLowerCase()] || null;
  return null;
}

export function isSuitableVehicleIntent(message: string): boolean {
  return /\b(any\s+)?suitable\s+vehicle\b|\bany\s+(vehicle|cab|car|tempo)\b|\bwhatever\s+(fits|is\s+suitable)\b/i.test(
    message,
  );
}

/** Smallest website vehicle that can seat this many passengers. */
export function vehicleForPassengerCount(pax: number): string | null {
  if (pax <= 0) return null;
  if (pax <= 4) return 'Sedan';
  if (pax <= 7) return 'Ertiga';
  if (pax <= 8) return 'Innova Crysta';
  if (pax <= 12) return 'Tempo Traveller';
  if (pax <= 17) return 'Urbania';
  return null;
}

/** Fare-engine vehicle ids that can seat this many people. */
export function vehicleIdsForPassengerCount(pax: number | null | undefined): string[] | undefined {
  if (!pax || pax < 1) return undefined;
  if (pax <= 4) return ['sedan', 'ertiga', 'innova_crysta', 'tempo_traveller', 'bus'];
  if (pax <= 7) return ['ertiga', 'innova_crysta', 'tempo_traveller', 'bus'];
  if (pax <= 8) return ['innova_crysta', 'tempo_traveller', 'bus'];
  if (pax <= 12) return ['tempo_traveller', 'bus'];
  if (pax <= 17) return ['bus'];
  return [];
}

export function isFlightOriginPhrase(message: string): boolean {
  return /\b(?:arriv(?:e|ing)|coming|landing|flight)\s+from\b/i.test(message);
}

function normalizeAirportPlace(raw: string): string {
  const t = raw.toLowerCase().replace(/\s+/g, ' ').trim();
  if (
    /new\s+airport|bhogapuram|airport\s+arrival|arrival\s+spot/.test(t) ||
    /^(the\s+)?airport\s+arrival\s*(spot|gate|hall)?$/.test(t)
  ) {
    return 'Vizag New Airport (Bhogapuram)';
  }
  if (/\b(airport|vtz)\b/.test(t) && /vizag|visakhapatnam|waltair/.test(t)) {
    return /new/.test(t) ? 'Vizag New Airport (Bhogapuram)' : 'Visakhapatnam Airport';
  }
  if (/^(the\s+)?airport$/.test(t)) return 'Visakhapatnam Airport';
  return raw.trim();
}

function stripTripNoiseFromPlace(raw: string): string {
  return raw
    .replace(new RegExp(`\\b(?:${WEEKDAY})\\b`, 'gi'), ' ')
    .replace(/\b\d{1,2}\s+\d{1,2}\s+\d{2,4}\b/g, ' ')
    .replace(/\b\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?\b/g, ' ')
    .replace(/\b(?:on\s+|at\s+|dated?\s+)?\d{1,2}(?:st|nd|rd|th)?[\s\-/]+[A-Za-z]+(?:[\s\-/]+\d{2,4})?\b/gi, ' ')
    .replace(/\b(?:today|tomorrow|tmrw)\b/gi, ' ')
    .replace(/\b(?:at|by)\s+\d{1,2}(?:[:.\s]\d{2})?\s*(?:am|pm|fn|an)?\b/gi, ' ')
    .replace(/\b\d{1,2}[:.]\d{2}\s*(?:am|pm|fn|an)?\b/gi, ' ')
    .replace(/\b\d{1,2}\s+\d{2}\s*(?:am|pm|fn|an)\b/gi, ' ')
    .replace(/\b\d{1,2}\s*(?:am|pm|fn|an)\b/gi, ' ')
    .replace(/\b(?:morning|afternoon|evening|night)\b/gi, ' ')
    .replace(/\b(?:for\s+)?\d{1,2}\s*(?:ppl|people|persons?|pax|passengers?|members?|guests?)\b/gi, ' ')
    .replace(/\b(?:arriv(?:e|ing)|coming|landing|flight)\s+from\b[\s\S]*$/i, ' ')
    .replace(
      /\b(?:one\s*-?\s*way|round\s*-?\s*trip|return\s+trip|please|kindly|need|want|looking\s+for)\b/gi,
      ' ',
    )
    .replace(/\b(?:a\s+)?(?:cab|taxi|car|vehicle|book(?:ing)?)\b/gi, ' ')
    .replace(/\b(?:sedan|dzire|ertiga|innova|crysta|tempo|traveller|urbania|small car|4 seater)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const FIELD_STOP =
  /\s+(?:(?:my\s+)?(?:pickup|pick\s*up|drop(?:ping)?|destination)|arriv(?:e|ing)|coming|landing|flight|depart(?:ure|ing)?|one\s*-?\s*way|round\s*-?\s*trip|(?:for\s+)?\d{1,2}\s*(?:ppl|people|persons?|pax)|(?:at|by)\s+\d{1,2}|(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))/i;

function captureAfterLabel(text: string, starter: RegExp): string | null {
  const m = text.match(starter);
  if (!m?.[1]) return null;
  const cut = m[1].split(FIELD_STOP)[0] || m[1];
  const cleaned = stripTripNoiseFromPlace(cut);
  return cleaned.length >= 3 ? cleaned : null;
}

function parseFromToPlaces(text: string): { from?: string; to?: string } {
  const cleaned = stripTripNoiseFromPlace(
    text.replace(/\b(?:arriv(?:e|ing)|coming|landing|flight)\s+from\s+[A-Za-z][A-Za-z\s]{1,40}/gi, ' '),
  ).replace(/\s+/g, ' ').trim();
  if (!cleaned) return {};

  const toFrom = cleaned.match(/\bto\s+(.+?)\s+from\s+(.+)$/i);
  if (toFrom) {
    const to = stripTripNoiseFromPlace(toFrom[1]!);
    const from = stripTripNoiseFromPlace(toFrom[2]!);
    if (from.length >= 3 && to.length >= 3) return { from, to };
  }

  const fromTo = cleaned.match(/\bfrom\s+(.+?)\s+(?:to|towards|->|→)\s+(.+)$/i);
  if (fromTo) {
    const from = stripTripNoiseFromPlace(fromTo[1]!);
    const to = stripTripNoiseFromPlace(fromTo[2]!);
    if (from.length >= 3 && to.length >= 3) return { from, to };
  }

  const simple = cleaned.match(/^(.+?)\s+(?:to|towards|->|→)\s+(.+)$/i);
  if (simple) {
    const from = stripTripNoiseFromPlace(simple[1]!);
    const to = stripTripNoiseFromPlace(simple[2]!);
    if (to.length >= 3) {
      if (from.length >= 3 && !/^(i|we|please|kindly)$/i.test(from)) return { from, to };
      return { to };
    }
  }

  const destOnly = cleaned.match(/^(?:to|towards|->|→)\s+(.+)$/i);
  if (destOnly) {
    const to = stripTripNoiseFromPlace(destOnly[1]!);
    if (to.length >= 3) return { to };
  }

  return {};
}

export interface ParsedTripDetails {
  pickup?: string;
  dropoff?: string;
  travelDate?: string;
  travelTime?: string;
  vehicle?: string;
  passengerCount?: number;
  tripMode?: 'one-way' | 'round-trip';
  flightOrigin?: string;
}

/**
 * Any free-form trip dump: labeled pickup/drop, from→to, airport arrival, date/time/pax.
 */
export function parseUnstructuredTripDetails(message: string): ParsedTripDetails {
  const text = message.replace(/\s+/g, ' ').trim();
  if (text.length < 3) return {};
  if (isClarifyingQuestion(text) && !/\b(?:from|to|towards|pickup|drop)\s+[A-Za-z]{3,}/i.test(text)) {
    const out: ParsedTripDetails = {};
    const date = extractFlexibleDate(text);
    if (date) out.travelDate = date;
    const time = extractFlexibleTime(text);
    if (time) out.travelTime = time;
    const pax = extractPassengerCount(text);
    if (pax) out.passengerCount = pax;
    const mode = parseTripModeAnswer(text);
    if (mode) out.tripMode = mode;
    return out;
  }

  const out: ParsedTripDetails = {};

  const flightFrom = text.match(
    /\b(?:arriv(?:e|ing)|coming|landing|flight)\s+from\s+([A-Za-z][A-Za-z\s]{1,40}?)(?:\s*$|[.,]|\s+(?:drop|pickup|land|arriv))/i,
  );
  if (flightFrom) {
    const origin = stripTripNoiseFromPlace(flightFrom[1]!);
    if (origin) out.flightOrigin = origin;
  }

  const date = extractFlexibleDate(text);
  if (date) out.travelDate = date;

  const time = extractFlexibleTime(text);
  if (time) out.travelTime = time;

  const pax = extractPassengerCount(text);
  if (pax) out.passengerCount = pax;

  if (!isTripModeQuestion(text)) {
    if (/round\s*-?\s*trip|return\s+trip|\b2\s*way\b/i.test(text)) out.tripMode = 'round-trip';
    else if (/one\s*-?\s*way/i.test(text)) out.tripMode = 'one-way';
  }

  const lower = text.toLowerCase();
  if (/urbania/.test(lower)) out.vehicle = 'Urbania';
  else if (/\b(tempo|traveller)\b/.test(lower)) out.vehicle = 'Tempo Traveller';
  else if (/\b(innova|crysta)\b/.test(lower)) out.vehicle = 'Innova Crysta';
  else if (/\bertiga\b/.test(lower)) out.vehicle = 'Ertiga';
  else if (/\b(sedan|dzire|small car|4 seater)\b/.test(lower)) out.vehicle = 'Sedan';
  else if (isSuitableVehicleIntent(text) && pax) {
    const v = vehicleForPassengerCount(pax);
    if (v) out.vehicle = v;
  }

  const pickupLabeled =
    captureAfterLabel(
      text,
      /(?:(?:my\s+)?(?:pickup|pick\s*up)|collect(?:ing)?|start(?:ing)?(?:\s+point)?)\s*(?:location|point|place|area)?\s*(?:is\s*)?(?:at|from|:)\s*(.+)/i,
    ) ||
    captureAfterLabel(text, /pick(?:\s*up)?\s+(?:me|us)\s+(?:at|from)\s+(.+)/i) ||
    captureAfterLabel(text, /(?:arriv(?:e|ing)|landing)\s+at\s+(.+)/i) ||
    captureAfterLabel(text, /(?:pickup|pick\s*up)\s+(?!location\b)(.+)/i);

  const dropLabeled =
    captureAfterLabel(
      text,
      /drop(?:ping)?(?:\s+(?:me|us))?\s+(?:at|to|off(?:\s+at)?|:)\s*(.+)/i,
    ) ||
    captureAfterLabel(text, /drop(?:ping)?(?:\s+(?:me|us))?\s+(.+)/i) ||
    captureAfterLabel(
      text,
      /(?:destination|drop(?:\s*off)?(?:\s+(?:location|point|place)))\s*(?:is\s*)?(?:at|to|:)?\s*(.+)/i,
    ) ||
    captureAfterLabel(text, /(?:going|headed|leave|leaving)\s+(?:to|for)\s+(.+)/i) ||
    captureAfterLabel(text, /(?:need|want)\s+(?:a\s+)?(?:cab|taxi|car|vehicle)\s+to\s+(.+)/i);

  if (pickupLabeled) out.pickup = pickupLabeled;
  if (dropLabeled) out.dropoff = dropLabeled;

  if (!out.pickup || !out.dropoff) {
    const pair = parseFromToPlaces(text);
    if (!out.pickup && pair.from) out.pickup = pair.from;
    if (!out.dropoff && pair.to) out.dropoff = pair.to;
  }

  const airportish = /\b(airport|vtz|bhogapuram|arrival\s+spot)\b/i.test(text);
  const arrivalLang = /\b(arriv(?:e|ing)|landing|landed|flight)\b/i.test(text);
  if (!out.pickup && airportish && (arrivalLang || out.dropoff)) {
    if (/\bnew\s+airport\b|\bbhogapuram\b|\barrival\s+spot\b/i.test(text)) {
      out.pickup = 'Vizag New Airport (Bhogapuram)';
    } else if (/\b(?:vizag|visakhapatnam)\s+airport\b|\bairport\s+arrival\b/i.test(text) || arrivalLang) {
      out.pickup = /\bnew\b|\bbhogapuram\b|\barrival\s+spot\b/i.test(text)
        ? 'Vizag New Airport (Bhogapuram)'
        : 'Visakhapatnam Airport';
    }
  }
  if (!out.pickup && /\bairport\s+arrival\s*(?:spot|gate|hall)?\b|\barrival\s+spot\b/i.test(text)) {
    out.pickup = 'Vizag New Airport (Bhogapuram)';
  }

  if (out.pickup) out.pickup = normalizeAirportPlace(out.pickup);
  if (out.dropoff) out.dropoff = normalizeAirportPlace(stripTripNoiseFromPlace(out.dropoff));

  if (
    out.flightOrigin &&
    out.dropoff &&
    out.dropoff.toLowerCase().includes(out.flightOrigin.toLowerCase().slice(0, 6))
  ) {
    out.dropoff = undefined;
  }

  return out;
}

export function isArakuLocalStartIntent(message: string): boolean {
  return (
    /\b(not from vizag|start at araku|taxi available at araku|araku local)\b/i.test(message) ||
    (/\baraku\b/i.test(message) && /\b(start|pickup|available)\b/i.test(message) && /\bnot from vizag\b/i.test(message))
  );
}

export function arakuLocalStartReply(): string {
  return (
    `Yes — pickup can start in Araku itself (you do not have to begin from Vizag).\n` +
    `Please share: pickup point in Araku, drop point, date, pickup time, and vehicle. I will quote the live fare.\n` +
    `Call +91 99663 63662 if you prefer.`
  );
}

export function isMultiStopSightseeingIntent(message: string): boolean {
  const lower = message.toLowerCase();
  const stops = [
    'simhachalam',
    'simanchalam',
    'kailasagiri',
    'kailashgiri',
    'arasavalli',
    'arsavalli',
    'srikurmam',
    'sreekurmum',
    'ramabanam',
    'temple',
    'railway',
    'hotel',
  ].filter((k) => lower.includes(k));
  const thenChain = /\bthen\b/.test(lower) || /\bafter\b/.test(lower) || (lower.match(/,/g) || []).length >= 2;
  return stops.length >= 2 && (thenChain || /\btemple/.test(lower));
}

export function isBorraCavesAsk(message: string): boolean {
  return /\b(borra|bora)\s*caves?\b/i.test(message) && /\b(take|include|included|visit|go)\b/i.test(message);
}

export function isHotelIncludedAsk(message: string): boolean {
  return /\b(hotel|stay|accommodation|dormitory)\b/i.test(message) && /\b(include|included|or not)\b/i.test(message);
}

export function isHowManyDaysAsk(message: string): boolean {
  return /\b(how many days|for how many days|1 day plan|days is it)\b/i.test(message);
}

/** Comma-separated "airport, Jeypore, one-way, 14th August, 8 AM, Small car" */
export function parseTripBlob(message: string): {
  pickup?: string;
  dropoff?: string;
  travelDate?: string;
  travelTime?: string;
  vehicle?: string;
  tripMode?: 'one-way' | 'round-trip';
} {
  const parts = message
    .split(/[,\n]/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2);
  if (parts.length < 3) {
    const blob = parseUnstructuredTripDetails(message);
    return blob.pickup || blob.dropoff ? blob : {};
  }

  const out: ReturnType<typeof parseTripBlob> = {};
  const unused: string[] = [];
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (/round\s*-?\s*trip|return/.test(lower)) {
      out.tripMode = 'round-trip';
      continue;
    }
    if (/one\s*-?\s*way/.test(lower)) {
      out.tripMode = 'one-way';
      continue;
    }
    const date = parseFlexibleDate(part) || extractFlexibleDate(part);
    if (date) {
      out.travelDate = date;
      continue;
    }
    if (/^\d{1,2}(?:[:.]\d{2})?\s*(am|pm)$/i.test(part) || /^([01]?\d|2[0-3])[:.][0-5]\d$/.test(part)) {
      out.travelTime = part.toUpperCase().replace(/\./g, ':');
      continue;
    }
    if (/\b(sedan|dzire|ertiga|innova|crysta|tempo|urbania|small car|4 seater)\b/i.test(part)) {
      if (/urbania/.test(lower)) out.vehicle = 'Urbania';
      else if (/tempo/.test(lower)) out.vehicle = 'Tempo Traveller';
      else if (/innova|crysta/.test(lower)) out.vehicle = 'Innova Crysta';
      else if (/ertiga/.test(lower)) out.vehicle = 'Ertiga';
      else out.vehicle = 'Sedan';
      continue;
    }
    unused.push(part);
  }
  if (unused[0] && !out.pickup) out.pickup = unused[0];
  if (unused[1] && !out.dropoff) out.dropoff = unused[1];
  if (!out.pickup || !out.dropoff) {
    const blob = parseUnstructuredTripDetails(message);
    if (blob.pickup && !out.pickup) out.pickup = blob.pickup;
    if (blob.dropoff && !out.dropoff) out.dropoff = blob.dropoff;
    if (blob.travelDate && !out.travelDate) out.travelDate = blob.travelDate;
    if (blob.travelTime && !out.travelTime) out.travelTime = blob.travelTime;
    if (blob.vehicle && !out.vehicle) out.vehicle = blob.vehicle;
    if (blob.tripMode && !out.tripMode) out.tripMode = blob.tripMode;
  }
  return out;
}

export function isBareAirportToken(message: string): boolean {
  return /^(the\s+)?((vizag|visakhapatnam)\s+(new\s+)?)?(airport)(\s+arrival\s*(spot|gate|hall)?)?$/i.test(
    message.trim(),
  );
}

export function isAirportDropOrPickup(message: string): boolean {
  return /\b(airport|vtz|bhogapuram)\b/i.test(message);
}
