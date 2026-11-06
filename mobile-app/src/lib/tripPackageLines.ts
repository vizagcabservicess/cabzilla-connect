export type TripPackageTerms = {
  package_hours?: number | null;
  package_km?: number | null;
  day_window?: string | null;
  extra_hour_rate?: number | null;
  extra_hour_free_km?: number | null;
  extra_km_rate?: number | null;
  garage_to_garage?: boolean;
  driver_food?: boolean;
  ac_off_standby_ghat?: boolean;
  exclusions?: string[];
  notes?: string[];
  places?: string[];
  vehicle_note?: string | null;
};

export type TripPackageSource = {
  hourlyPackage?: string;
  additionalRequirements?: string | null;
  tripTerms?: TripPackageTerms | null;
};

function formatAmount(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function isTermLine(line: string): boolean {
  return /please provide|food for the driver|driver'?s food|additional hour|do not include|prices do not|prices quoted|subject to change|taxes or fees|additional km|kilometers are calculated|hotel to the hotel|garage|standby|turned off|toll|parking|entry fee|lockdown|will be charged|per km/i.test(line);
}

function cleanLine(raw: string): string {
  return raw
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\r/g, '')
    .trim();
}

export function splitRequirementText(raw: string): { places: string[]; notes: string[] } {
  const places: string[] = [];
  const notes: string[] = [];
  for (const rawLine of raw.split('\n')) {
    const line = cleanLine(rawLine);
    if (!line) continue;
    const plain = line.replace(/'/g, '');
    if (/^(?:places to visit|notes?)\s*:?$/i.test(plain) || (/sightseeing/i.test(plain) && /\bplaces?\b/i.test(plain))) continue;
    const numbered = line.match(/^\d{1,2}\s*[.)]\s*(.+)$/);
    const text = (numbered?.[1] ?? line.replace(/^[•●▪‣]\s+/, '')).trim();
    if (!text) continue;
    if (numbered && !isTermLine(text)) places.push(text);
    else notes.push(text);
  }
  return { places, notes };
}

function explodeNote(note: string): string[] {
  const lines: string[] = [];
  for (const chunk of cleanLine(note).split(/\n+/)) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    const pieces = trimmed
      .split(/(?=Places to visit\s*:)|(?=\d{1,2}\s*[.)]\s)/i)
      .map((piece) => piece.trim())
      .filter((piece) => piece !== '');
    lines.push(...(pieces.length > 0 ? pieces : [trimmed]));
  }
  return lines;
}

function isRawDayHeading(line: string): boolean {
  return /^day\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|first|second|third)\b/i.test(line.trim());
}

function isPlaceDump(line: string): boolean {
  const plain = cleanLine(line).replace(/'/g, '');
  if (/^(?:places to visit|notes?)\s*:?$/i.test(plain)) return true;
  const numbered = plain.match(/^\d{1,2}\s*[.)]\s*(.+)$/);
  return numbered != null && !isTermLine(numbered[1]);
}

function summarized(line: string, terms: TripPackageTerms | null | undefined): boolean {
  if (!terms) return false;
  const text = line.replace(/\s+/g, ' ').trim();
  if (terms.extra_hour_rate && /additional hour|extra hour|exceeds?\s+\d+\s*hrs?/i.test(text)) return true;
  if (terms.extra_km_rate && /additional km|per km|beyond\s+\d+\s*km/i.test(text)) return true;
  if (terms.garage_to_garage && /garage/i.test(text)) return true;
  if (terms.ac_off_standby_ghat && /standby|ghat|turned off|a\/c will|ac will/i.test(text)) return true;
  if (terms.driver_food && /food for the driver|driver'?s food|provide food/i.test(text)) return true;
  if ((terms.exclusions?.length ?? 0) > 0 && /do not include|not include|prices exclude|not included/i.test(text)) return true;
  if (terms.package_hours && terms.package_km && new RegExp(`${terms.package_hours}\\s*hrs?`, 'i').test(text) && new RegExp(`${terms.package_km}\\s*km`, 'i').test(text) && text.length < 80) {
    return true;
  }
  return false;
}

function coveredByIncludedNote(item: string, notes: string[] | undefined): boolean {
  const note = (notes ?? []).find((line) => /^included\s*:/i.test(line.trim()));
  if (!note) return false;
  const parts = note.replace(/^included\s*:/i, '').split(',').map((part) => part.trim().toLowerCase());
  const words = item.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  return parts.some((part) => words.every((word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(part)));
}

function exclusionLine(terms: TripPackageTerms): string {
  const items = (terms.exclusions ?? []).filter((item) => {
    const label = item.trim().toLowerCase();
    if (!label) return false;
    if (terms.driver_food && /food/.test(label) && /driver/.test(label)) return false;
    if (coveredByIncludedNote(label, terms.notes)) return false;
    return true;
  });
  return items.length > 0 ? `Not included: ${items.join(', ')}` : '';
}

/** Office notes typed under Notes:. Shown on the driver trip, separate from package clauses. */
export function officeNotes(trip: TripPackageSource): string[] {
  const terms = trip.tripTerms;
  const notes = [
    ...(terms?.notes ?? []),
    ...splitRequirementText(trip.additionalRequirements || '').notes,
  ];
  const lines: string[] = [];
  const shown = new Set<string>();
  for (const note of notes) {
    for (const piece of explodeNote(note)) {
      const text = piece.trim();
      const key = text.toLowerCase();
      if (!key || shown.has(key) || isPlaceDump(text) || isTermLine(text) || /^Day \d+\b/i.test(text)) continue;
      if (summarized(text, terms)) continue;
      shown.add(key);
      lines.push(text);
    }
  }
  return lines;
}

export function packageLines(trip: TripPackageSource): string[] {
  const terms = trip.tripTerms;
  const notes = terms?.notes?.filter((note) => note.trim() !== '') ?? [];
  const schedule = notes.filter((note) => /^Day \d+\b/i.test(note.trim()));
  const lines: string[] = [...schedule];
  const packageSummary = terms?.package_hours && terms.package_km
    ? `${terms.package_hours} hrs / ${terms.package_km} km`
    : '';
  const scheduleStatesPackage = packageSummary !== '' && schedule.some((note) => note.includes(packageSummary));
  if (packageSummary && !scheduleStatesPackage) {
    lines.push(packageSummary);
  } else if (!packageSummary && trip.hourlyPackage) {
    lines.push(trip.hourlyPackage);
  }
  if (terms?.day_window) lines.push(terms.day_window);
  if (terms?.extra_hour_rate) {
    lines.push(
      `Extra hour ${formatAmount(terms.extra_hour_rate)}${terms.extra_hour_free_km ? ` · ${terms.extra_hour_free_km} km free` : ''}`
    );
  }
  if (terms?.extra_km_rate) {
    const withinHours = notes.some((note) => /per km/i.test(note) && /within\s+\d+\s*hours?/i.test(note));
    lines.push(
      withinHours && terms.package_hours
        ? `Extra km ${formatAmount(terms.extra_km_rate)} within ${terms.package_hours} hours`
        : `Extra km ${formatAmount(terms.extra_km_rate)}`
    );
  }
  if (terms?.driver_food) lines.push('Please provide food for the driver');
  if (terms?.garage_to_garage) lines.push('Garage to garage');
  if (terms?.ac_off_standby_ghat) lines.push('AC off on standby and ghat roads');
  const excluded = terms ? exclusionLine(terms) : '';
  if (excluded) lines.push(excluded);

  const shown = new Set(lines.map((line) => line.trim().toLowerCase()));
  const extras = [
    ...notes.filter((note) => !/^Day \d+\b/i.test(note.trim())),
    ...splitRequirementText(trip.additionalRequirements || '').notes,
  ];
  for (const note of extras) {
    for (const piece of explodeNote(note)) {
      const text = piece.trim();
      const key = text.toLowerCase();
      if (!key || shown.has(key) || isPlaceDump(text) || summarized(text, terms)) continue;
      if (schedule.length > 0 && isRawDayHeading(text)) continue;
      if ([...shown].some((line) => line.includes(key) || key.includes(line))) continue;
      shown.add(key);
      lines.push(text);
    }
  }
  if (terms?.vehicle_note) {
    const note = terms.vehicle_note.trim();
    if (note && !shown.has(note.toLowerCase())) lines.push(note);
  }
  return lines;
}
