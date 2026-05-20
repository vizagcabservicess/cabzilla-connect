import { COMMUTE_SCHEDULE_OPTIONS, type CommuteSchedule } from './constants';

function compactScheduleKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/\s+to\s+/g, '-')
    .replace(/\s+/g, '');
}

const SCHEDULE_COMPACT_ALIASES: Record<string, CommuteSchedule> = {
  daily: 'daily',
  weekly: 'weekly',
  'mon-fri': 'mon-fri',
  monfri: 'mon-fri',
  'mon-sat': 'mon-sat',
  monsat: 'mon-sat',
  '3-4days': '3-4-days',
  irregular: 'irregular',
  asneeded: 'as-needed',
};

export function commuteScheduleLabel(schedule: CommuteSchedule | undefined): string {
  if (!schedule) return 'Daily';
  return COMMUTE_SCHEDULE_OPTIONS.find((o) => o.id === schedule)?.label ?? schedule;
}

/** Normalize schedule id/label/legacy text (e.g. "Mon to Fri") to a {@link CommuteSchedule} id. */
export function normalizeScheduleId(value?: string | null): CommuteSchedule {
  const raw = value?.trim();
  if (!raw) return 'daily';

  const byId = COMMUTE_SCHEDULE_OPTIONS.find((o) => o.id === raw);
  if (byId) return byId.id;

  const byLabel = COMMUTE_SCHEDULE_OPTIONS.find(
    (o) => o.label.toLowerCase() === raw.toLowerCase(),
  );
  if (byLabel) return byLabel.id;

  const alias = SCHEDULE_COMPACT_ALIASES[compactScheduleKey(raw)];
  if (alias) return alias;

  return 'daily';
}

export function isScheduleAmenity(value: string): boolean {
  const raw = value.trim();
  if (!raw) return false;
  if (COMMUTE_SCHEDULE_OPTIONS.some((o) => o.id === raw || o.label.toLowerCase() === raw.toLowerCase())) {
    return true;
  }
  return compactScheduleKey(raw) in SCHEDULE_COMPACT_ALIASES;
}

/** Prefer explicit schedule_text; fall back to schedule-like amenities (legacy seed data). */
export function resolveRideSchedule(
  scheduleText?: string | null,
  amenities?: string[] | null,
): CommuteSchedule {
  if (scheduleText?.trim()) {
    return normalizeScheduleId(scheduleText);
  }
  for (const item of amenities ?? []) {
    if (isScheduleAmenity(item)) {
      return normalizeScheduleId(item);
    }
  }
  return 'daily';
}

export function rideScheduleLabel(schedule?: string): string {
  return commuteScheduleLabel(normalizeScheduleId(schedule));
}
