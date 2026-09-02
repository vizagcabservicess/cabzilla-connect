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

  if (/\b(today)\b/i.test(trimmed)) return parseFlexibleDate('today');
  if (/\b(tomorrow|tmrw)\b/i.test(trimmed)) return parseFlexibleDate('tomorrow');
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

export function extractPassengerCount(message: string): number | null {
  const m = message.match(/\b(\d{1,2})\s*(?:ppl|people|persons?|pax|passengers?)\b/i);
  if (m) return Number(m[1]);
  const word = message.match(/\b(six|seven|eight|four|five)\s*(?:ppl|people|persons?|pax)?\b/i);
  const map: Record<string, number> = { four: 4, five: 5, six: 6, seven: 7, eight: 8 };
  if (word) return map[word[1]!.toLowerCase()] || null;
  return null;
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
  if (parts.length < 3) return {};

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
  return out;
}

export function isBareAirportToken(message: string): boolean {
  return /^(the\s+)?(vizag\s+|visakhapatnam\s+)?airport$/i.test(message.trim());
}

export function isAirportDropOrPickup(message: string): boolean {
  return /\b(airport|vtz|bhogapuram)\b/i.test(message);
}
