/**
 * When the backend omits `total_duration_hours`, derive hours from journey start/end timestamps.
 */

function parseTripTimestamp(input: string | null | undefined): Date | null {
  if (input == null) return null;
  const s = String(input).trim();
  if (!s) return null;
  let candidate = s;
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(s) && !s.includes('T')) {
    candidate = s.replace(/\s+/, 'T');
  }
  const d = new Date(candidate);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Reject bogus server values (e.g. pickup vs updated_at spanning months). */
const MAX_REASONABLE_TRIP_HOURS = 720;

export function deriveTripDurationHours(params: {
  startTime: string | null | undefined;
  endTime: string | null | undefined;
  completedAt?: string | null | undefined;
  serverHours: number;
}): number {
  const server = Number(params.serverHours);
  const serverOk =
    Number.isFinite(server) &&
    server > 0.05 &&
    server <= MAX_REASONABLE_TRIP_HOURS;
  if (serverOk) {
    return Math.round(server * 100) / 100;
  }
  const start = parseTripTimestamp(params.startTime ?? null);
  const end = parseTripTimestamp(params.endTime ?? params.completedAt ?? null);
  if (!start || !end) {
    return 0;
  }
  const ms = end.getTime() - start.getTime();
  if (ms < 60_000) {
    return 0;
  }
  const hours = ms / 3_600_000;
  const rounded = Math.round(hours * 100) / 100;
  return rounded > MAX_REASONABLE_TRIP_HOURS ? 0 : rounded;
}
