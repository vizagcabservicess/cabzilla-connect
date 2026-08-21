import type { Location } from '@/lib/locationData';

export const MAX_OUTSTATION_STOPS = 3;

export function isFilledStop(location: Location | null | undefined): location is Location {
  return Boolean(location?.name?.trim());
}

export function filledOutstationStops(stops: Array<Location | null | undefined>): Location[] {
  return stops.filter(isFilledStop);
}

export function formatViaStopsLabel(stops: Array<Location | null | undefined>): string {
  return filledOutstationStops(stops)
    .map((stop) => stop.name.trim())
    .filter(Boolean)
    .join(' → ');
}

function nameFromUnknownStop(item: unknown): string {
  if (typeof item === 'string') return item.trim();
  if (!item || typeof item !== 'object') return '';
  const rec = item as { name?: unknown; address?: unknown };
  if (typeof rec.name === 'string' && rec.name.trim()) return rec.name.trim();
  if (typeof rec.address === 'string' && rec.address.trim()) return rec.address.trim();
  return '';
}

/** Read stop names from booking/session shapes (string, location objects, or camelCase aliases). */
export function resolveViaStopsLabel(source: {
  via_stops?: unknown;
  viaStops?: unknown;
  intermediateStops?: unknown;
}): string {
  const direct = source.via_stops ?? source.viaStops;
  if (typeof direct === 'string') {
    const trimmed = direct.trim();
    if (trimmed && !/^(n\/a|na|null|undefined)$/i.test(trimmed)) return trimmed;
  }
  if (Array.isArray(direct)) {
    const names = direct.map(nameFromUnknownStop).filter(Boolean);
    if (names.length > 0) return names.join(' → ');
  }
  if (Array.isArray(source.intermediateStops)) {
    const names = source.intermediateStops.map(nameFromUnknownStop).filter(Boolean);
    if (names.length > 0) return names.join(' → ');
  }
  const extra =
    typeof (source as { additionalRequirements?: unknown }).additionalRequirements === 'string'
      ? (source as { additionalRequirements: string }).additionalRequirements
      : typeof (source as { additional_requirements?: unknown }).additional_requirements === 'string'
        ? (source as { additional_requirements: string }).additional_requirements
        : '';
  const viaFromNotes = extra.match(/via\/?stops:\s*(.+)/i);
  if (viaFromNotes?.[1]?.trim()) return viaFromNotes[1].trim();
  return '';
}

export function stripViaStopsRequirementLine(text: string): string {
  return (text || '')
    .split(/\r?\n/)
    .filter((line) => !/^\s*via\/?stops:/i.test(line.trim()))
    .join('\n')
    .trim();
}

export function parseStoredStops(raw: unknown): Array<Location | null> {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_OUTSTATION_STOPS).map((item) => {
    if (!item || typeof item !== 'object') return null;
    const loc = item as Location;
    return loc.name ? loc : null;
  });
}

export function routePointsWithStops(
  pickup: Location,
  drop: Location,
  stops: Array<Location | null | undefined>
): Location[] {
  return [pickup, ...filledOutstationStops(stops), drop];
}
