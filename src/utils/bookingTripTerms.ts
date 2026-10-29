import type { ParsedBooking, TripTerms } from '@/services/api/aiBookingAPI';

function emptyTerms(): TripTerms {
  return {
    package_hours: null,
    package_km: null,
    day_window: null,
    extra_hour_rate: null,
    extra_hour_free_km: null,
    extra_km_rate: null,
    garage_to_garage: false,
    driver_food: false,
    ac_off_standby_ghat: false,
    exclusions: [],
    notes: [],
    places: [],
    flight_number: null,
    flight_time: null,
    flight_direction: null,
    flight_route: null,
    vehicle_note: null,
  };
}

export type PickupParts = {
  name: string;
  url: string;
  lat: number | null;
  lng: number | null;
};

function clean(raw: string): string {
  return raw
    .replace(/\u2060/g, '')
    .replace(/^\*+|\*+$/g, '')
    .replace(/^_+|_+$/g, '')
    .trim();
}

export function exactMapPin(lat: number | string, lng: number | string): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function splitPickup(raw: string): PickupParts {
  const value = clean(raw);
  const urlMatch = value.match(/https?:\/\/\S+/i);
  let url = urlMatch ? urlMatch[0].replace(/[)\].,]+$/g, '') : '';
  let lat: number | null = null;
  let lng: number | null = null;
  const pin = value.match(/(-?\d{1,3}\.\d{4,})\s*,\s*(-?\d{1,3}\.\d{4,})/);
  let place = value
    .replace(/\s*\(?\s*https?:\/\/\S+\)?/gi, ' ')
    .replace(/[()]/g, ' ');
  if (pin) {
    const latN = Number(pin[1]);
    const lngN = Number(pin[2]);
    if (Math.abs(latN) <= 90 && Math.abs(lngN) <= 180) {
      lat = latN;
      lng = lngN;
      url = exactMapPin(pin[1], pin[2]);
      place = place.replace(pin[0], ' ');
    }
  }
  place = place.replace(/\s{2,}/g, ' ').replace(/^[,\s]+|[,\s]+$/g, '').trim();
  const name = lat != null && lng != null ? `${place || 'Pickup'} (${pin?.[1]}, ${pin?.[2]})` : place;
  return { name, url, lat, lng };
}

/** Keep the map pin and two-way / one-way marker from the paste. */
export function applyRouteFromText(data: ParsedBooking, text: string): void {
  const from = text.match(/^\s*\**\s*From\s*\**\s*:\s*(.+)$/im);
  if (from) {
    const pickup = splitPickup(from[1]);
    if (pickup.name) data.pickup_location = pickup.name;
    if (pickup.lat != null && pickup.lng != null) {
      data.pickup_lat = pickup.lat;
      data.pickup_lng = pickup.lng;
      data.pickup_map_url = pickup.url;
    } else if (pickup.url) {
      data.pickup_map_url = pickup.url;
    }
  }
  const to = text.match(/^\s*\**\s*To\s*\**\s*:\s*(.+)$/im);
  if (!to) return;
  const raw = to[1].replace(/[*_]/g, '').trim();
  const bracket = raw.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (bracket && /two.?way|round.?trip/i.test(bracket[2])) {
    data.drop_location = bracket[1].trim();
    data.trip_type = 'Round Trip';
  } else if (bracket && /one.?way/i.test(bracket[2])) {
    data.drop_location = bracket[1].trim();
    data.trip_type = 'One Way';
  } else if (bracket && /local/i.test(bracket[2])) {
    data.drop_location = bracket[1].trim();
    data.trip_type = 'Local';
  } else if (/two.?way|round.?trip/i.test(raw)) {
    data.trip_type = 'Round Trip';
  }
}

function looseAmount(raw: string): number {
  const cleaned = raw.replace(/[*_\u2060]/g, '');
  const match = cleaned.match(/(?:₹|₨|Rs\.?|INR)?\s*([\d,]+(?:\.\d+)?)/i);
  if (!match) return 0;
  const amount = Math.round(parseFloat(match[1].replace(/,/g, '')));
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function labeledAmount(text: string, label: string): number | null {
  const match = text.match(new RegExp(`^\\s*\\**\\s*${label}\\s*\\**\\s*:\\s*(.+)$`, 'im'));
  if (!match) return null;
  const amount = looseAmount(match[1]);
  return amount > 0 ? amount : null;
}

/** A Cost or Advance line is the fare. It is never an agent booking. */
export function applyExplicitFare(data: ParsedBooking, text: string): void {
  const cost = labeledAmount(text, 'Cost') ?? labeledAmount(text, 'Fare \\(base\\)');
  const advance = labeledAmount(text, 'Advance Received');
  if (cost != null) data.cost = cost;
  if (advance != null) data.advance_received = advance;
  if (data.cost > 0) data.driver_collects_payment = true;
}

function isFeeNote(line: string): boolean {
  return /please provide|food for the driver|driver'?s food|additional hour|do not include|prices do not|every additional|additional km|garage|standby|prices exclude|turned off|places will be shown|peak season|exceeding the time|toll|parking(?!\s+(?:lot|area|point))|entry fee|lockdown|driver allowance/i.test(line)
    || (/katiki/i.test(line) && /closed|not |will |cannot|extra/i.test(line));
}

function uniqueTexts(items: string[]): string[] {
  const seen = new Set<string>();
  const rows: string[] = [];
  for (const item of items) {
    const value = item.trim();
    const key = value.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    rows.push(value);
  }
  return rows;
}

function headingCase(raw: string): string {
  const small = new Set(['a', 'an', 'and', 'at', 'for', 'from', 'in', 'of', 'on', 'the', 'to', 'with']);
  return raw
    .replace(/\*+/g, '')
    .replace(/[^\w\s,&'+./()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word, index) => (index > 0 && small.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}

function listItem(line: string): string | null {
  let trimmed = line.replace(/\u2060/g, '').trim().replace(/^\*+/, '').replace(/\*+$/, '').trim();
  const bullet = trimmed.match(/^(?:[•●▪‣]|\-(?!\d))\s+(.+)$/);
  const numbered = trimmed.match(/^\d+\.?\s*(.+)$/);
  const raw = (bullet?.[1] ?? numbered?.[1] ?? '').replace(/\*+/g, '').trim();
  if (!raw) return null;
  const name = clean(raw).replace(/\s+/g, ' ').trim();
  return name || null;
}

function sectionBody(text: string, start: RegExp, ends: RegExp[]): string | null {
  const found = new RegExp(start.source, start.flags.replace('g', '')).exec(text);
  if (!found) return null;
  const from = found.index + found[0].length;
  const rest = text.slice(from);
  let until = text.length;
  for (const end of ends) {
    const hit = new RegExp(end.source, end.flags.replace('g', '')).exec(rest);
    if (hit && from + hit.index < until) until = from + hit.index;
  }
  return text.slice(from, until);
}

function bulletsIn(block: string): string[] {
  const rows: string[] = [];
  for (const line of block.split('\n')) {
    const item = listItem(line);
    if (item) rows.push(item);
  }
  return rows;
}

function isSectionBoundary(line: string): boolean {
  return /package inclusions|package exclusions|important terms|terms\s*(?:&|and)\s*conditions|total package cost|vehicle details|greetings from|fare and payments|tour inclusions|inclusions\s*:|exclusions\s*:|billing and charges|policies|additional terms|important notes|day-by-day itinerary|^support\b|booking\s*#|your tour package/i.test(line);
}

function programTitle(raw: string): string {
  const cleaned = raw.replace(/\*+/g, '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const letters = cleaned.replace(/[^A-Za-z]/g, '');
  if (letters && letters === letters.toUpperCase()) return headingCase(cleaned);
  return cleaned;
}

function programHeading(line: string): { day: number; title: string } | null {
  const plain = line.replace(/[📅*_]/g, ' ').replace(/\s+/g, ' ').trim();
  const match = plain.match(/^Day\s+(\d+)\s*[\u2012\u2013\u2014:\-]\s*(.+)$/i);
  if (!match) return null;
  const title = programTitle(match[2]);
  if (!title || /^by\b/i.test(title)) return null;
  return { day: Number(match[1]), title };
}

function keepDayProse(line: string): boolean {
  if (/^(?:greetings|dear |thank you|we are pleased|we look forward|regards)\b/i.test(line)) return false;
  if (/scenic beauty|natural beauty|memorable/i.test(line) && !/pickup|jeep|parking|station|hotel/i.test(line)) return false;
  return /pickup|drop|station|jeep|parking|hotel|railway|tempo|vehicle|waterfall|off-road|not suitable|additional local|proceed towards/i.test(line);
}

function clipSentences(raw: string, max = 280): string {
  const text = raw.replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const dot = slice.lastIndexOf('.');
  return dot > 80 ? slice.slice(0, dot + 1).trim() : `${slice.trimEnd()}…`;
}

/** Day-by-day tour program: "DAY 1 – …" with bullet places and a night halt. */
export function parseProgramSchedule(text: string): { lines: string[]; places: string[] } {
  const source = text.split('\n');
  const heads: { index: number; day: number; title: string }[] = [];
  source.forEach((line, index) => {
    const heading = programHeading(line);
    if (!heading) return;
    heads.push({ index, day: heading.day, title: heading.title });
  });
  if (heads.length === 0) return { lines: [], places: [] };

  const places: string[] = [];
  const usedDays = new Set<number>();
  let nextDay = 1;
  const lines = heads.map((head, index) => {
    const next = heads[index + 1]?.index ?? source.length;
    const body: string[] = [];
    for (let cursor = head.index + 1; cursor < next; cursor += 1) {
      if (isSectionBoundary(source[cursor])) break;
      body.push(source[cursor]);
    }
    const dayPlaces: string[] = [];
    let halt = '';
    let optional = '';
    const prose: string[] = [];
    let inPlaces = false;
    for (const raw of body) {
      const line = raw.trim();
      if (!line) continue;
      if (/places to visit\s*:/i.test(line)) {
        inPlaces = true;
        continue;
      }
      const haltMatch = line.match(/night halt\s*:\s*(.+)/i);
      if (haltMatch) {
        halt = headingCase(haltMatch[1]);
        inPlaces = false;
        continue;
      }
      const optionalMatch = line.match(/optional visit\s*:\s*(.+)/i);
      if (optionalMatch) {
        optional = clean(optionalMatch[1]).replace(/\*+/g, '').trim();
        inPlaces = false;
        continue;
      }
      const item = listItem(line);
      const bullet = /^[•●▪‣]/.test(line.trim()) || /^\-(?!\d)/.test(line.trim());
      if (item && (inPlaces || bullet) && !isFeeNote(item)) {
        dayPlaces.push(item);
        continue;
      }
      if (inPlaces) inPlaces = false;
      const plain = clean(line).replace(/\*+/g, '').replace(/\s+/g, ' ').trim();
      if (/^pickup\s*:/i.test(plain)) continue;
      if (keepDayProse(plain)) prose.push(plain.replace(/\.$/, ''));
    }
    places.push(...dayPlaces.filter((place) => !/breakfast|lunch|dinner|check-in|check-out|overnight|proceed towards|drop at|pickup from/i.test(place)));
    if (optional) places.push(optional);
    let displayDay = head.day;
    if (usedDays.has(displayDay)) {
      while (usedDays.has(nextDay)) nextDay += 1;
      displayDay = nextDay;
    }
    usedDays.add(displayDay);
    nextDay = displayDay + 1;
    const parts = [`Day ${displayDay} — ${head.title}${dayPlaces.length > 0 ? `: ${dayPlaces.join(', ')}` : ''}`];
    if (optional) parts.push(`Optional: ${optional}`);
    if (prose.length > 0) parts.push(clipSentences(prose.join('. '), 480));
    if (halt) parts.push(`Night halt: ${halt}`);
    return parts.join('. ').replace(/\.\s*\./g, '.');
  });
  return { lines, places };
}

function parseTermsSection(text: string): string[] {
  const body = sectionBody(
    text,
    /important terms|terms\s*(?:&|and)\s*conditions/i,
    [/regards\b/i, /we look forward/i]
  );
  if (body == null) return [];
  const notes: string[] = [];
  let title = '';
  const paragraphs: string[] = [];
  const flush = () => {
    if (!title) return;
    const paragraph = paragraphs.join(' ').replace(/\s+/g, ' ').trim();
    const sentence = paragraph.match(/^.{12,}?[.!?](?:\s|$)/)?.[0]?.trim() ?? clipSentences(paragraph, 180);
    notes.push(sentence ? `${title}: ${sentence}` : title);
    title = '';
    paragraphs.length = 0;
  };
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const heading = line.match(/^\**\s*\d+\.?\s+(.+)$/);
    if (heading) {
      flush();
      title = clean(heading[1]).replace(/\*+/g, '').trim();
      continue;
    }
    if (title) paragraphs.push(clean(line).replace(/\*+/g, ''));
  }
  flush();
  return notes;
}

export function parsePlaces(text: string): string[] {
  const places: string[] = [];
  let inPlaces = false;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (/places to visit\s*:|day one\s*:/i.test(trimmed)) {
      inPlaces = true;
      continue;
    }
    if (!inPlaces) continue;
    if (trimmed === '') continue;
    const bare = trimmed.replace(/^\W+/, '');
    if (/^(?:pricing|note|notes|night halt|optional visit)\b/i.test(bare) || isSectionBoundary(trimmed) || /^day\s*\d+\b/i.test(bare)) {
      inPlaces = false;
      continue;
    }
    if (/^\*?(?:Ertiga|Innova|Sedan|Crysta|Tempo)\b/i.test(trimmed)) {
      inPlaces = false;
      continue;
    }
    const item = listItem(line);
    if (item && !isFeeNote(item)) {
      places.push(item);
      continue;
    }
    inPlaces = false;
  }
  return uniqueTexts(places);
}

export type PackageNarrative = {
  places: string[];
  notes: string[];
  /** Null when the paste has no Package Exclusions section. */
  exclusions: string[] | null;
};

/** Places, day program, inclusions, and terms from a tour-package paste. */
function clauseList(text: string, label: string): string[] | null {
  const match = text.match(new RegExp(`\\**\\s*${label}\\s*\\**\\s*:\\s*\\**\\s*(.+)`, 'i'));
  if (!match) return null;
  const raw = match[1].replace(/\*+/g, '').trim();
  if (!raw) return null;
  const parts = (raw.includes(';') ? raw.split(';') : raw.split(','))
    .map((part) => part.trim())
    .filter((part) => part.length > 1);
  return parts.length > 0 ? parts : null;
}

function additionalRequest(text: string): string {
  const match = text.match(/Additional Requirements:\*?\s*([\s\S]+?)(?:\n\s*\n|\n\*(?:Your tour|Fare and Payments))/i);
  if (!match) return '';
  return match[1].replace(/\*+/g, '').replace(/\s+/g, ' ').trim();
}

function importantNoteBullets(text: string): string[] {
  const body = sectionBody(text, /important notes\s*:/i, [/support\b/i, /booking\s*#/i, /thank you for choosing/i]);
  if (body == null) return [];
  return bulletsIn(body);
}

export function readPackageNarrative(text: string): PackageNarrative {
  const schedule = parseProgramSchedule(text);
  const inclusionBlock = sectionBody(text, /package inclusions/i, [
    /package exclusions/i,
    /important terms/i,
    /terms\s*(?:&|and)\s*conditions/i,
  ]);
  const exclusionBlock = sectionBody(text, /package exclusions/i, [
    /important terms/i,
    /terms\s*(?:&|and)\s*conditions/i,
    /package inclusions/i,
  ]);
  const notes = [...schedule.lines];
  const request = additionalRequest(text);
  if (request) notes.push(request);
  const inclusionItems = inclusionBlock == null ? clauseList(text, 'Inclusions') ?? [] : bulletsIn(inclusionBlock);
  if (inclusionItems.length > 0) notes.push(`Included: ${inclusionItems.join('; ')}`);
  notes.push(...parseTermsSection(text));
  for (const tip of importantNoteBullets(text)) {
    const key = tip.slice(0, 24).toLowerCase();
    if (!notes.some((note) => note.toLowerCase().includes(key))) notes.push(tip);
  }
  const exclusions = exclusionBlock == null ? clauseList(text, 'Exclusions') : bulletsIn(exclusionBlock);
  return {
    places: uniqueTexts([...parsePlaces(text), ...schedule.places]),
    notes: uniqueTexts(notes),
    exclusions,
  };
}

function mergeNarrative(data: ParsedBooking, text: string): void {
  const narrative = readPackageNarrative(text);
  const windowMatch = text.match(/(\d{1,2}:\d{2}\s*[AP]\.?M\.?\s+to\s+\d{1,2}:\d{2}\s*[AP]\.?M\.?)/i);
  if (narrative.places.length === 0 && narrative.notes.length === 0 && narrative.exclusions == null && !windowMatch) return;
  const current = data.trip_terms && typeof data.trip_terms === 'object' ? data.trip_terms : emptyTerms();
  const terms: TripTerms = { ...emptyTerms(), ...current };
  if (narrative.places.length > 0) terms.places = narrative.places;
  if (narrative.notes.length > 0) {
    const leftover = (terms.notes ?? []).filter((note) => {
      const key = note.trim().toLowerCase();
      return key !== '' && !narrative.notes.some((line) => {
        const full = line.toLowerCase();
        return full === key || full.startsWith(`${key}:`) || full.startsWith(`${key} `);
      });
    });
    terms.notes = [...narrative.notes, ...leftover];
  }
  if (narrative.exclusions != null) terms.exclusions = narrative.exclusions;
  if (windowMatch && !terms.day_window) terms.day_window = clean(windowMatch[1]);
  data.trip_terms = terms;
  const noteBlock = (terms.notes ?? []).join('\n');
  const placeBlock = (terms.places ?? []).map((place, index) => `${index + 1}. ${place}`).join('\n');
  const firstPlace = terms.places?.[0] ?? '';
  const requirements = noteBlock && firstPlace && noteBlock.includes(firstPlace) ? noteBlock : [noteBlock, placeBlock].filter(Boolean).join('\n');
  if (requirements) data.additional_requirements = requirements;
}

/** Fill sightseeing from the paste when the server parser left it out. */
export function applySightseeingFromText(data: ParsedBooking, text: string): void {
  mergeNarrative(data, text);
}

export function parseNoteLines(text: string): string[] {
  const notes: string[] = [];
  for (const line of text.split('\n')) {
    const match = line.match(/^\s*\**\s*\d+\.?\s*[.\u2060\s]*(.+)$/);
    if (!match) continue;
    const note = clean(match[1]).replace(/\*+/g, '').trim();
    if (!note) continue;
    if (/food for the driver|driver'?s food|additional hour|do not include|prices exclude|additional km|garage to the garage|turned off|places will be shown|peak season|exceeding the time|toll|parking(?!\s+(?:lot|area|point))|entry fee|lockdown|driver allowance/i.test(note) || (/katiki/i.test(note) && /closed|not |will |cannot|extra/i.test(note))) {
      notes.push(note);
    }
  }
  return notes;
}

export function applyTripTerms(data: ParsedBooking, text: string): ParsedBooking {
  const terms: TripTerms = { ...emptyTerms(), ...data.trip_terms };
  const packageMatch = text.match(/(\d+)\s*hrs?\s+(\d+)\s*km/i);
  if (packageMatch) {
    terms.package_hours = parseInt(packageMatch[1], 10);
    terms.package_km = parseInt(packageMatch[2], 10);
  }
  const windowMatch = text.match(/(\d{1,2}:\d{2}\s*[AP]\.?M\.?\s+to\s+\d{1,2}:\d{2}\s*[AP]\.?M\.?)/i);
  if (windowMatch) terms.day_window = clean(windowMatch[1]);

  const hourRate = text.match(/additional hour[^.\n]*₹\s*([\d,]+)/i);
  if (hourRate) terms.extra_hour_rate = parseInt(hourRate[1].replace(/,/g, ''), 10) || null;
  const freeKm = text.match(/(\d+)\s*km will be added for free/i);
  if (freeKm) terms.extra_hour_free_km = parseInt(freeKm[1], 10);
  const extraKm = text.match(/₹\s*([\d,]+)\s*per km/i);
  if (extraKm) terms.extra_km_rate = parseInt(extraKm[1].replace(/,/g, ''), 10) || null;

  terms.garage_to_garage = /garage to the garage/i.test(text);
  terms.ac_off_standby_ghat = /a\/c will be turned off|ac will be turned off/i.test(text);

  const narrative = readPackageNarrative(text);
  const foodIsExcluded = (narrative.exclusions ?? []).some((item) => /food/i.test(item));
  terms.driver_food = !foodIsExcluded && !/exclude driver'?s food|prices exclude driver/i.test(text) && /food for the driver|provide food|driver'?s food/i.test(text);
  if (narrative.exclusions != null) {
    terms.exclusions = narrative.exclusions;
  } else {
    const exclusions: string[] = [];
    if (/tolls?/i.test(text)) exclusions.push('tolls');
    if (/parking(?!\s+(?:lot|area|point))/i.test(text)) exclusions.push('parking');
    if (/entry fees?/i.test(text)) exclusions.push('entry fees');
    if (/driver'?s food|food for the driver/i.test(text)) exclusions.push('driver food');
    if (/lockdown fines?/i.test(text)) exclusions.push('lockdown fines');
    if (/driver allowance/i.test(text)) exclusions.push('driver allowance');
    terms.exclusions = exclusions;
  }
  terms.notes = narrative.notes.length > 0 ? narrative.notes : parseNoteLines(text);
  if (narrative.places.length > 0) terms.places = narrative.places;

  const rupeePackage = /(?:₹|₨|Rs\.?|INR)\s*[\d,]+/i.test(text) && /(\d+)\s*hrs?/i.test(text);
  const hasCost = data.cost > 0 || rupeePackage;
  data.driver_collects_payment = hasCost;
  applyExplicitFare(data, text);
  if (terms.package_hours && terms.package_km) {
    data.hourly_package = `${terms.package_hours}hrs-${terms.package_km}km`;
  }
  data.additional_requirements = terms.notes.join('\n');
  data.trip_terms = terms;
  applyRouteFromText(data, text);
  if (terms.places.length > 0) {
    const block = terms.places.map((place, index) => `${index + 1}. ${place}`).join('\n');
    const existing = (data.additional_requirements || '').trim();
    if (!existing.includes(terms.places[0])) {
      data.additional_requirements = existing ? `${existing}\n${block}` : block;
    }
  }
  return data;
}

function parseLooseTime(raw: string): string {
  const t = clean(raw);
  const ampm = t.match(/^(\d{1,2})[.:](\d{2})\s*(A\.?M\.?|P\.?M\.?)/i);
  if (ampm) {
    let hour = parseInt(ampm[1], 10);
    const min = ampm[2];
    const isPm = ampm[3].replace(/\./g, '').toUpperCase().startsWith('P');
    if (isPm && hour !== 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${min}`;
  }
  const h24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (h24) return `${h24[1].padStart(2, '0')}:${h24[2]}`;
  return '';
}

function parseLooseDate(raw: string): string {
  const t = clean(raw).replace(/(\d+)(st|nd|rd|th)/gi, '$1');
  const dmY = t.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmY) return `${dmY[3]}-${dmY[2].padStart(2, '0')}-${dmY[1].padStart(2, '0')}`;
  const ts = Date.parse(t);
  if (!Number.isNaN(ts)) {
    const d = new Date(ts);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }
  return '';
}

function parseLooseMobile(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.length === 10 ? digits : '';
}

function flightFrom(raw: string): { number: string | null; rest: string } {
  const match = raw.match(/((?:IndiGo|Air India|SpiceJet|Akasa|Vistara)\s+)?(\d?[A-Z]{1,2}\s*\d{2,4})/i);
  if (!match) return { number: null, rest: clean(raw) };
  const number = `${match[1] ?? ''}${match[2]}`.replace(/\s+/g, ' ').trim();
  const rest = clean(raw.replace(match[0], '')).replace(/^[-–:\s]+|[-–:\s]+$/g, '');
  return { number, rest };
}

function agentBase(seed: ParsedBooking): ParsedBooking {
  return {
    ...seed,
    cost: 0,
    advance_received: 0,
    driver_collects_payment: false,
    payment_mode: 'Agent',
    trip_terms: emptyTerms(),
  };
}

export function parseAgentBookings(text: string, seed: ParsedBooking): ParsedBooking[] | null {
  if (/Client Name\s*:/i.test(text) && /Pickup Location\s*:/i.test(text)) {
    return parseAgentEmail(text, seed);
  }
  if (/^\s*\*?\s*Date\s*:/im.test(text) && /Pick up\s*:/i.test(text) && !/Pick-up Date\s*:/i.test(text)) {
    const one = parseShortDuty(text, seed);
    return one ? [one] : null;
  }
  return null;
}

function field(block: string, label: string): string {
  const match = block.match(new RegExp(`${label}\\s*:\\s*(.+)`, 'i'));
  return clean(match?.[1] ?? '').replace(/\*+/g, '').trim();
}

function parseAgentEmail(text: string, seed: ParsedBooking): ParsedBooking[] | null {
  const name = field(text, 'Client Name').replace(/\s{2,}/g, ' ');
  const mobile = parseLooseMobile(field(text, 'Contact Number'));
  const blocks = text.split(/\n(?=\s*(?:\*\*)?\d+\.\s*Date\s*:)/i).filter((block) => /\d+\.\s*Date\s*:/i.test(block));
  if (blocks.length === 0) return null;
  return blocks.map((block) => {
    const data = agentBase(seed);
    data.customer_name = name;
    data.customer_mobile = mobile;
    const dateRaw = block.match(/Date\s*:\s*(.+)/i)?.[1] ?? '';
    data.pickup_date = parseLooseDate(dateRaw.replace(/\*+/g, ''));
    data.pickup_time = parseLooseTime(field(block, 'Pickup Time'));
    const pickup = splitPickup(field(block, 'Pickup Location'));
    data.pickup_location = pickup.name;
    data.pickup_map_url = pickup.url;
    data.pickup_lat = pickup.lat;
    data.pickup_lng = pickup.lng;
    data.drop_location = field(block, 'Drop Location') || '—';
    data.trip_type = /airport|\bVTZ\b|Bhogapuram/i.test(`${data.pickup_location} ${data.drop_location}`) ? 'Airport' : 'One Way';
    const flight = flightFrom(field(block, 'Flight'));
    const arrival = field(block, 'Arrival Time');
    const departure = field(block, 'Departure Time');
    const terms = emptyTerms();
    terms.flight_number = flight.number;
    terms.flight_time = arrival || departure || null;
    terms.flight_direction = arrival ? 'arrival' : departure ? 'departure' : null;
    const origin = field(block, 'Origin');
    const destination = field(block, 'Destination');
    terms.flight_route = [origin, destination].filter(Boolean).join(' → ') || null;
    terms.notes = parseNoteLines(text);
    if (/toll|parking|driver allowance/i.test(text)) {
      terms.exclusions = ['tolls', 'parking', 'driver allowance'].filter((item) => new RegExp(item.split(' ')[0], 'i').test(text));
    }
    data.trip_terms = terms;
    data.additional_requirements = terms.notes.join('\n');
    data.driver_collects_payment = false;
    return data;
  });
}

function parseShortDuty(text: string, seed: ParsedBooking): ParsedBooking | null {
  const data = agentBase(seed);
  const dateRaw = field(text, 'Date');
  data.pickup_date = parseLooseDate(dateRaw);
  const nameLine = field(text, 'Name');
  const nameParts = nameLine.split('/');
  data.customer_name = clean(nameParts[0] ?? '');
  data.customer_mobile = parseLooseMobile(nameParts.slice(1).join(' ') || nameLine);
  data.pickup_time = parseLooseTime(field(text, 'Time'));
  const pickupRaw = field(text, 'Pick up');
  const flight = flightFrom(pickupRaw);
  const pickup = splitPickup(flight.rest || pickupRaw);
  data.pickup_location = pickup.name || flight.rest || pickupRaw;
  data.pickup_map_url = pickup.url;
  data.pickup_lat = pickup.lat;
  data.pickup_lng = pickup.lng;
  const dropRaw = field(text, 'Drop at');
  if (/^full\s*day$/i.test(dropRaw)) {
    data.drop_location = 'Full day';
    data.trip_type = 'Local';
  } else {
    data.drop_location = dropRaw || '—';
    data.trip_type = 'One Way';
  }
  const cabRaw = field(text, 'Cab Type') || text.match(/Cab Type\s*:\s*(.+)/i)?.[1] || '';
  const cab = clean(cabRaw).replace(/\*+/g, '');
  const vehicleSplit = cab.split(/\s*[-–]\s*/);
  data.vehicle_type = vehicleSplit[0]?.trim() ?? '';
  const terms = emptyTerms();
  terms.flight_number = flight.number;
  terms.vehicle_note = vehicleSplit.slice(1).join(' - ').trim() || null;
  terms.notes = parseNoteLines(text);
  data.trip_terms = terms;
  data.driver_collects_payment = false;
  return data.pickup_date && data.customer_name ? data : null;
}
