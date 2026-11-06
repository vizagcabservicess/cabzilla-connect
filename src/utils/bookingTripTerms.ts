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

/** WhatsApp lists insert word-joiners and a curly apostrophe, e.g. "1.⁠ ⁠Central Park". */
function normalizePasteLine(line: string): string {
  return line
    .replace(/[\u200B-\u200D\u2060\uFEFF\u00AD\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/\uFF0E/g, '.');
}

function isFeeNote(line: string): boolean {
  return /please provide|food for the driver|driver'?s food|additional hour|do not include|prices do not|prices quoted|subject to change|taxes or fees|every additional|additional km|kilometers are calculated|hotel to the hotel|garage|standby|prices exclude|prices include|above prices include|turned off|places will be shown|peak season|exceeding the time|toll|parking(?!\s+(?:lot|area|point))|entry fee|lockdown|driver'?s?\s+allowance|will be charged/i.test(line)
    || (/katiki/i.test(line) && /closed|not |will |cannot|extra/i.test(line));
}

function isPlacesHeading(line: string): boolean {
  const plain = normalizePasteLine(line)
    .replace(/[*_]/g, ' ')
    .replace(/'/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain || plain.length > 90) return false;
  if (/^(?:places\s+to\s+visit|day one|notes?)\s*:?$/i.test(plain)) return true;
  return /sightseeing/i.test(plain) && /\bplaces?\b/i.test(plain);
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
  const trimmed = normalizePasteLine(line).trim().replace(/^\*+/, '').replace(/\*+$/, '').trim();
  const bullet = trimmed.match(/^(?:[•●▪‣]|\-(?!\d))\s+(.+)$/);
  const numbered = trimmed.match(/^\d{1,2}\s*[.)]\s*(.+)$/);
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

const DAY_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  first: 1,
  second: 2,
  third: 3,
};

function dayHeadingTitle(raw: string): string {
  const hours = raw.match(/(\d+)\s*hrs?\s*(\d+)\s*km/i);
  if (hours) return `${hours[1]} hrs / ${hours[2]} km`;
  return programTitle(raw);
}

function programHeading(line: string): { day: number; title: string } | null {
  const plain = normalizePasteLine(line).replace(/[📅*_]/g, ' ').replace(/\s+/g, ' ').trim();
  if (/^tour begins\s*:?\s*$/i.test(plain)) return { day: 1, title: 'Tour begins' };
  const word = plain.match(/^Day\s+(one|two|three|four|five|six|seven|eight|nine|ten|first|second|third)\b\s*[:\u2012\u2013\u2014\-]\s*(.*)$/i);
  if (word) {
    const title = dayHeadingTitle(word[2]);
    if (/^by\b/i.test(title)) return null;
    return { day: DAY_WORDS[word[1].toLowerCase()], title: title || 'Sightseeing' };
  }
  const match = plain.match(/^Day\s+(\d+)\s*[\u2012\u2013\u2014:\-]\s*(.*)$/i);
  if (!match) return null;
  const title = dayHeadingTitle(match[2]);
  if (!title || /^by\b/i.test(title)) return null;
  return { day: Number(match[1]), title };
}

function keepDayProse(line: string): boolean {
  if (/^(?:greetings|dear |thank you|we are pleased|we look forward|regards)\b/i.test(line)) return false;
  if (isFeeNote(line)) return false;
  if (/scenic beauty|natural beauty|memorable/i.test(line) && !/pick-?up|jeep|parking|station|hotel/i.test(line)) return false;
  return /pick-?up|drop-?off|drop off|\bdrop\b|station|jeep|parking|hotel|railway|tempo|vehicle|waterfall|off-road|not suitable|additional local|proceed to(?:wards)?/i.test(line);
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
      const numbered = /^\d{1,2}\s*[.)]/.test(normalizePasteLine(line).trim());
      if (item && !isFeeNote(item) && (inPlaces || bullet || (numbered && looksLikePlaceName(item)))) {
        if (!numbered && keepDayProse(item)) {
          prose.push(item.replace(/\.$/, ''));
          continue;
        }
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

function looksLikePlaceName(item: string): boolean {
  if (item.length > 48) return false;
  if (/[.!?]/.test(item)) return false;
  if (/\b(will|please|should|must|shall|include|charge|charged|provide|driver|toll|parking)\b/i.test(item)) return false;
  return true;
}

export function parsePlaces(text: string): string[] {
  const places: string[] = [];
  let inPlaces = false;
  let noteList = false;
  for (const line of text.split('\n')) {
    const trimmed = normalizePasteLine(line).trim();
    if (isPlacesHeading(trimmed)) {
      const plain = trimmed.replace(/[*_]/g, ' ').replace(/\s+/g, ' ').trim();
      noteList = /^notes?\s*:?$/i.test(plain);
      inPlaces = true;
      continue;
    }
    if (!inPlaces) continue;
    if (trimmed === '') continue;
    const bare = trimmed.replace(/^\W+/, '');
    if (/^(?:pricing|note|notes|night halt|optional visit)\b/i.test(bare) || isSectionBoundary(trimmed) || /^day\s*\d+\b/i.test(bare)) {
      inPlaces = false;
      noteList = false;
      continue;
    }
    if (/^\*?(?:Ertiga|Innova|Sedan|Crysta|Tempo|Swift|Dzire|Urbania)\b/i.test(trimmed)) {
      inPlaces = false;
      noteList = false;
      continue;
    }
    const item = listItem(trimmed);
    if (item && !isFeeNote(item) && (!noteList || looksLikePlaceName(item))) {
      places.push(item);
      continue;
    }
    if (item && isFeeNote(item)) {
      inPlaces = false;
      noteList = false;
      continue;
    }
    inPlaces = false;
    noteList = false;
  }
  return uniqueTexts(places);
}

/** Places stay a numbered list. Term lines stay notes, including hotel-to-hotel and price clauses. */
export function splitStoredRequirements(raw: string): { places: string[]; notes: string[] } {
  const places: string[] = [];
  const notes: string[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = normalizePasteLine(line).trim();
    if (!trimmed || isPlacesHeading(trimmed)) continue;
    const item = listItem(trimmed);
    if (item && !isFeeNote(item) && /^\d{1,2}\s*[.)]/.test(trimmed)) {
      places.push(item);
      continue;
    }
    const note = (item && isFeeNote(item) ? item : trimmed.replace(/^[•●▪‣]\s+/, '')).replace(/\s+/g, ' ').trim();
    if (note) notes.push(note);
  }
  return { places: uniqueTexts(places), notes: uniqueTexts(notes) };
}

export function composeAdditionalRequirements(notes: string[], places: string[]): string {
  const cleanNotes = notes.map((note) => note.trim()).filter(Boolean);
  const cleanPlaces = places.map((place) => place.trim()).filter(Boolean);
  const notesText = cleanNotes.join('\n');
  const placesAlreadyWritten = cleanPlaces.length > 0
    && cleanPlaces.every((place) => notesText.toLowerCase().includes(place.toLowerCase()));
  const placeBlock = !placesAlreadyWritten && cleanPlaces.length > 0
    ? ['Places to visit:', ...cleanPlaces.map((place, index) => `${index + 1}. ${place}`)].join('\n')
    : '';
  return [placeBlock, notesText].filter(Boolean).join('\n\n');
}

/** Customer and driver WhatsApp: numbered places, then one bullet per term. */
export function formatRequirementsMessage(raw: string): string {
  const { places, notes } = splitStoredRequirements(raw);
  const blocks: string[] = [];
  if (places.length > 0) {
    blocks.push(['📍 *Places to visit:*', ...places.map((place, index) => `${index + 1}. ${place}`)].join('\n'));
  }
  if (notes.length > 0) {
    blocks.push(['✈️ *Additional Requirements:*', ...notes.map((note) => `• ${note}`)].join('\n'));
  }
  return blocks.join('\n\n');
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
  const hasNarrative = narrative.places.length > 0 || narrative.notes.length > 0 || narrative.exclusions != null || !!windowMatch;
  const current = data.trip_terms && typeof data.trip_terms === 'object' ? data.trip_terms : emptyTerms();
  const terms: TripTerms = { ...emptyTerms(), ...current };
  if (!hasNarrative) {
    const exclusionsBefore = [...(terms.exclusions ?? [])];
    const notesBefore = [...(terms.notes ?? [])];
    applyPriceCoverage(terms, text, null);
    const coverageChanged = exclusionsBefore.join('|') !== (terms.exclusions ?? []).join('|')
      || notesBefore.join('|') !== (terms.notes ?? []).join('|');
    if (!coverageChanged) return;
    data.trip_terms = terms;
    const requirements = composeAdditionalRequirements(terms.notes ?? [], terms.places ?? []);
    if (requirements) data.additional_requirements = requirements;
    return;
  }
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
  applyPriceCoverage(terms, text, narrative.exclusions);
  data.trip_terms = terms;
  const requirements = composeAdditionalRequirements(terms.notes ?? [], terms.places ?? []);
  if (requirements) data.additional_requirements = requirements;
}

/** Fill sightseeing from the paste when the server parser left it out. */
export function applySightseeingFromText(data: ParsedBooking, text: string): void {
  mergeNarrative(data, text);
}

export function parseNoteLines(text: string): string[] {
  const notes: string[] = [];
  for (const line of text.split('\n')) {
    const normalized = normalizePasteLine(line);
    if (isPlacesHeading(normalized)) continue;
    const numbered = normalized.match(/^\s*\**\s*\d{1,2}\s*[.)]\s*(.+)$/);
    const starred = normalized.match(/^\s*\*+\s*(.+)$/);
    const raw = (numbered?.[1] ?? starred?.[1] ?? '').trim();
    if (!raw) continue;
    const note = clean(raw).replace(/\*+/g, '').trim();
    if (note && isFeeNote(note)) notes.push(note);
  }
  return uniqueTexts(notes);
}

const KEPT_NOTE_STOP = /^(?:pick-?up date|pick-?up time|from|to|cost|amount received|advance received|vehicle|seating capacity|mode of payment|package inclusions|package exclusions|important terms|terms\s*(?:&|and)\s*conditions|pricing|regards|client name|pickup location)\b/i;

function noteKey(line: string): string {
  return normalizePasteLine(line).replace(/[*_]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Lines already written into the day program. Notes must not repeat them. */
function programEchoKeys(text: string): Set<string> {
  const source = text.split('\n');
  const heads: number[] = [];
  source.forEach((line, index) => {
    if (programHeading(line)) heads.push(index);
  });
  const keys = new Set<string>();
  heads.forEach((start, index) => {
    const heading = noteKey(source[start]);
    if (heading) keys.add(heading);
    const end = heads[index + 1] ?? source.length;
    for (let cursor = start + 1; cursor < end; cursor += 1) {
      if (isSectionBoundary(source[cursor])) break;
      const key = noteKey(source[cursor]);
      if (!key || isFeeNote(key)) continue;
      if (listItem(source[cursor]) || /night halt/i.test(key) || keepDayProse(key)) keys.add(key);
    }
  });
  return keys;
}

/** Free-text under a Notes: line. These are office notes the driver must see. */
export function readKeptNotes(text: string): string[] {
  const notes: string[] = [];
  let capturing = false;
  for (const raw of text.split('\n')) {
    const line = normalizePasteLine(raw).replace(/[*_]/g, '').trim();
    if (!line) continue;
    const labeled = line.match(/^notes?\s*:\s*(.*)$/i);
    if (labeled) {
      capturing = true;
      const rest = labeled[1].replace(/\s+/g, ' ').trim();
      if (rest) notes.push(rest);
      continue;
    }
    if (!capturing) continue;
    if (KEPT_NOTE_STOP.test(line)) {
      capturing = false;
      continue;
    }
    const phoneLine = line.match(/^(passenger number|phone number|mobile|contact number)\s*:\s*(.+)$/i);
    if (phoneLine) {
      const phone = normalizeBookingPhone(phoneLine[2]);
      notes.push(phone ? `${phoneLine[1]}: ${phone}` : line.replace(/\s+/g, ' ').trim());
      continue;
    }
    notes.push(line.replace(/\s+/g, ' ').trim());
  }
  const echo = programEchoKeys(text);
  return uniqueTexts(notes).filter((note) => !echo.has(noteKey(note)) && !isPriceIncludeLine(note));
}

const PRICE_INCLUDE_LINE = /(?:above prices include|above prices are included|prices are included|prices include|included of|inclusive of)/i;
const PRICE_EXCLUDE_LINE = /(?:do not include|does not include|not included|prices exclude)/i;
const PRICE_INCLUDE_CLAUSE = /(?:above prices include|above prices are included|prices are included|prices include|included of|inclusive of)\s+([^\n.]+)/i;
const PRICE_EXCLUDE_CLAUSE = /(?:prices do not include|do not include|does not include|not included|prices exclude)\s+([^\n.]+)/i;

function isPriceIncludeLine(line: string): boolean {
  return PRICE_INCLUDE_LINE.test(line) && !PRICE_EXCLUDE_LINE.test(line);
}

function clauseAfter(text: string, pattern: RegExp): string {
  const match = text.match(pattern);
  return match?.[1]?.replace(/\*+/g, '').replace(/\s+/g, ' ').trim() ?? '';
}

function feeList(clause: string): string {
  return clause
    .replace(/\band\b/gi, ',')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 1)
    .join(', ');
}

function collectFeeExclusions(scope: string): string[] {
  const exclusions: string[] = [];
  if (!scope) return exclusions;
  if (/tolls?/i.test(scope)) exclusions.push('tolls');
  if (/parking(?!\s+(?:lot|area|point))/i.test(scope)) exclusions.push('parking');
  if (/entry fees?/i.test(scope)) exclusions.push('entry fees');
  if (/driver'?s food|food for the driver|driver food/i.test(scope)) exclusions.push('driver food');
  if (/lockdown fines?/i.test(scope)) exclusions.push('lockdown fines');
  if (/driver'?s?\s+allowance/i.test(scope)) exclusions.push('driver allowance');
  return exclusions;
}

/** "Above prices include …" is coverage, not an exclusion. The server parser still files those words under exclusions. */
function applyPriceCoverage(terms: TripTerms, text: string, narrativeExclusions: string[] | null): void {
  const excludedClause = clauseAfter(text, PRICE_EXCLUDE_CLAUSE);
  const includedClause = clauseAfter(text, PRICE_INCLUDE_CLAUSE);
  if (narrativeExclusions == null && excludedClause) {
    terms.exclusions = collectFeeExclusions(excludedClause);
  } else if (narrativeExclusions == null && includedClause) {
    terms.exclusions = [];
  }
  if (includedClause && includedClause !== excludedClause) {
    const includedLine = `Included: ${feeList(includedClause)}`;
    const source = includedClause.toLowerCase();
    terms.notes = uniqueTexts([
      ...(terms.notes ?? []).filter((note) => !note.toLowerCase().includes(source) && !/^included\s*:/i.test(note)),
      includedLine,
    ]);
  }
}

export function applyKeptNotes(data: ParsedBooking, text: string): void {
  const kept = readKeptNotes(text);
  if (kept.length === 0) return;
  const current = data.trip_terms && typeof data.trip_terms === 'object' ? data.trip_terms : emptyTerms();
  const terms: TripTerms = { ...emptyTerms(), ...current };
  terms.notes = uniqueTexts([...(terms.notes ?? []), ...kept]);
  data.trip_terms = terms;
  data.additional_requirements = composeAdditionalRequirements(terms.notes ?? [], terms.places ?? []);
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
    const excludedClause = clauseAfter(text, PRICE_EXCLUDE_CLAUSE);
    const includedClause = clauseAfter(text, PRICE_INCLUDE_CLAUSE);
    const scope = excludedClause || (includedClause ? '' : text);
    terms.exclusions = collectFeeExclusions(scope);
  }
  const pastedNotes = uniqueTexts([...parseNoteLines(text), ...readKeptNotes(text)]);
  terms.notes = narrative.notes.length > 0 ? uniqueTexts([...narrative.notes, ...pastedNotes]) : pastedNotes;
  applyPriceCoverage(terms, text, narrative.exclusions);
  if (narrative.places.length > 0) terms.places = narrative.places;

  const rupeePackage = /(?:₹|₨|Rs\.?|INR)\s*[\d,]+/i.test(text) && /(\d+)\s*hrs?/i.test(text);
  const hasCost = data.cost > 0 || rupeePackage;
  data.driver_collects_payment = hasCost;
  applyExplicitFare(data, text);
  if (terms.package_hours && terms.package_km) {
    data.hourly_package = `${terms.package_hours}hrs-${terms.package_km}km`;
  }
  data.trip_terms = terms;
  data.additional_requirements = composeAdditionalRequirements(terms.notes, terms.places);
  applyRouteFromText(data, text);
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

/**
 * Indian mobiles stay as 10 national digits.
 * Any other country is kept in full, with +, so +254… is not thrown away.
 */
export function normalizeBookingPhone(raw: string): string {
  const trimmed = raw.replace(/[*_]/g, '').trim();
  if (!trimmed) return '';
  const hasPlus = trimmed.includes('+');
  let digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (!digits) return '';

  const indian =
    (digits.length === 12 && digits.startsWith('91')) ||
    (digits.length === 11 && digits.startsWith('0')) ||
    (digits.length === 10 && !hasPlus);

  if (indian) {
    if (digits.length === 12) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    return /^[6-9]\d{9}$/.test(digits) ? digits : '';
  }

  if ((hasPlus || digits.length > 10) && digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }
  return '';
}

export function isAcceptableBookingPhone(phone: string): boolean {
  const value = phone.trim();
  if (!value) return false;
  if (value.startsWith('+')) {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15;
  }
  return /^[6-9]\d{9}$/.test(value.replace(/\D/g, ''));
}

function parseLooseMobile(raw: string): string {
  return normalizeBookingPhone(raw);
}

function fieldBeforeNotes(text: string, label: RegExp): string {
  const notesAt = text.search(/^\s*[*_]*\s*notes?\s*:/im);
  const head = notesAt >= 0 ? text.slice(0, notesAt) : text;
  const match = head.match(new RegExp(`${label.source}\\s*:\\s*(.+)`, label.flags));
  return (match?.[1] ?? '').replace(/[*_]/g, '').trim();
}

/** Fill passenger and manager phones from the paste when the server parser drops a non-Indian number. */
export function applyBookingPhones(data: ParsedBooking, text: string): void {
  const passenger = normalizeBookingPhone(fieldBeforeNotes(text, /passenger number/i));
  if (passenger && !isAcceptableBookingPhone(data.customer_mobile ?? '')) {
    data.customer_mobile = passenger;
  }
  const manager = normalizeBookingPhone(fieldBeforeNotes(text, /phone number/i));
  if (manager && !isAcceptableBookingPhone(data.manager_mobile ?? '')) {
    data.manager_mobile = manager;
  }
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
    if (/toll|parking|driver'?s?\s+allowance/i.test(text)) {
      terms.exclusions = ['tolls', 'parking', 'driver allowance'].filter((item) => new RegExp(item.split(' ')[0], 'i').test(text));
    }
    applyPriceCoverage(terms, text, null);
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
