import { format } from 'date-fns';
import type { CarpoolSearchParams } from './types';
import type { GroupPreference, CommuteSchedule } from './constants';
import { COMMUTE_FORM_DEFAULT_BUDGET } from './constants';
import { COMMUTE_BUDGET_SLIDER_FLOOR } from './DailyCommuteBudgetSlider';
import type { SharedRide } from './constants';
import { fetchSharedRides } from './rideMapper';

export { commuteScheduleLabel, normalizeScheduleId, isScheduleAmenity, resolveRideSchedule, rideScheduleLabel } from './scheduleUtils';

export const NO_RIDES_PAGE_URL = 'https://vizagtaxihub.com/shared-carpooling/no-rides';

export function getDefaultSearchParams(): CarpoolSearchParams {
  const today = format(new Date(), 'yyyy-MM-dd');
  return {
    fullName: '',
    waDigits: '',
    company: '',
    budget: '150',
    pickupTime: '07:30 AM',
    pickupDate: today,
    commuteSchedule: 'daily',
    groupPreference: 'mixed',
    from: '',
    to: '',
    date: format(new Date(), 'dd MMM, yyyy'),
    time: 'Any time',
    seats: 1,
  };
}

/** Convert yyyy-MM-dd to display label e.g. "20 May, 2026". */
export function formatCarpoolDisplayDate(isoDate: string): string {
  const d = isoDate.trim();
  if (!d) return '';
  try {
    return format(new Date(`${d}T12:00:00`), 'dd MMM, yyyy');
  } catch {
    return d;
  }
}

/** Convert HTML `<input type="time">` (HH:mm) to display label e.g. "07:00 AM". */
export function formatCarpoolTimeLabel(time: string): string {
  const t = time.trim();
  if (!t) return 'Any time';
  if (/AM|PM/i.test(t)) return t;
  const match = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return t;
  let h = parseInt(match[1]!, 10);
  const m = match[2]!;
  const period = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${period}`;
}

/** Parse display label e.g. "07:30 AM" to minutes from midnight. */
export function parsePickupTimeToMinutes(time: string): number {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let h = parseInt(match[1]!, 10);
  const m = parseInt(match[2]!, 10);
  const period = match[3]!.toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

export function isPickupDateToday(pickupDate: string): boolean {
  return pickupDate.trim() === format(new Date(), 'yyyy-MM-dd');
}

/** When date is today, drop times at or before the current clock time. */
export function filterPickupTimesForDate(
  times: readonly string[],
  pickupDate: string,
  now: Date = new Date(),
): string[] {
  if (!isPickupDateToday(pickupDate)) return [...times];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return times.filter((t) => parsePickupTimeToMinutes(t) > nowMinutes);
}

export function defaultPickupTimeForDate(
  times: readonly string[],
  pickupDate: string,
  now: Date = new Date(),
): string {
  const available = filterPickupTimesForDate(times, pickupDate, now);
  return available[0] ?? '';
}

/** Current local time as `<input type="time">` value (HH:mm). */
export function formatTimeInputValue(now: Date = new Date()): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function parseTimeInputToMinutes(time: string): number {
  const [h, m] = time.split(':').map((part) => parseInt(part, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

/** Minimum allowed `<input type="time">` when pickup is today; undefined for future dates. */
export function getMinTimeInputForDate(pickupDate: string, now: Date = new Date()): string | undefined {
  if (!isPickupDateToday(pickupDate)) return undefined;
  return formatTimeInputValue(now);
}

export function isTimeInputBeforeOrEqual(time: string, minTime: string): boolean {
  return parseTimeInputToMinutes(time) <= parseTimeInputToMinutes(minTime);
}

export function clampTimeInputToMin(time: string, minTime: string | undefined): string {
  if (!minTime || !isTimeInputBeforeOrEqual(time, minTime)) return time;
  return minTime;
}

export function defaultTimeInputForDate(
  pickupDate: string,
  preferred = '07:00',
  now: Date = new Date(),
): string {
  const min = getMinTimeInputForDate(pickupDate, now);
  if (!min) return preferred;
  return clampTimeInputToMin(preferred, min);
}

export function hasValidTimeInputWindow(
  pickupDate: string,
  maxTime = '20:00',
  now: Date = new Date(),
): boolean {
  const min = getMinTimeInputForDate(pickupDate, now);
  if (!min) return true;
  return parseTimeInputToMinutes(min) <= parseTimeInputToMinutes(maxTime);
}

function isUnsetSearchBudget(budget: string, defaults: CarpoolSearchParams): boolean {
  const b = budget.trim();
  return !b || b === defaults.budget || b === String(COMMUTE_FORM_DEFAULT_BUDGET) || b === String(COMMUTE_BUDGET_SLIDER_FLOOR);
}

export function groupPreferenceLabel(pref: GroupPreference): string {
  if (pref === 'mixed') return 'Mixed Group';
  if (pref === 'men') return 'Men Only';
  return 'Women Only';
}

function normalizeLocation(value: string): string {
  return value
    .toLowerCase()
    .replace(/,?\s*vizag/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when search text and ride stop refer to the same place (handles NAD vs Nad Junction, etc.). */
export function locationMatches(search: string, rideLocation: string): boolean {
  const from = normalizeLocation(search);
  const stop = normalizeLocation(rideLocation);
  if (!from || !stop) return true;
  if (stop.includes(from) || from.includes(stop)) return true;
  return from.split(' ').some((word) => word.length > 2 && stop.includes(word));
}

/** Returns rides whose route overlaps the searched from/to (used to pick results vs no-rides screen). */
export function filterMatchingRides(search: CarpoolSearchParams, rides: SharedRide[]): SharedRide[] {
  const from = normalizeLocation(search.from);
  const to = normalizeLocation(search.to);

  if (!from && !to) return rides;

  return rides.filter((ride) => {
    const fromMatch = !from || locationMatches(search.from, ride.pickup);
    const toMatch = !to || locationMatches(search.to, ride.drop);
    return fromMatch && toMatch;
  });
}

/** Fill missing search fields from the selected ride for summary display and booking. */
export function enrichSearchWithRide(
  search: CarpoolSearchParams,
  ride?: SharedRide | null,
): CarpoolSearchParams {
  if (!ride) return search;

  const defaults = getDefaultSearchParams();
  const budgetUnset = isUnsetSearchBudget(search.budget, defaults);

  const rideTime = ride.time.trim();
  const displayTime = rideTime || search.time;
  const displayBudget =
    budgetUnset && ride.pricePerSeat > 0
      ? String(Math.round(ride.pricePerSeat))
      : search.budget;

  return {
    ...search,
    from: search.from.trim() || ride.pickup,
    to: search.to.trim() || ride.drop,
    time: displayTime,
    pickupTime: rideTime || search.pickupTime,
    budget: displayBudget,
  };
}

export async function fetchMatchingRides(search: CarpoolSearchParams): Promise<SharedRide[]> {
  const all = await fetchSharedRides({});
  return filterMatchingRides(search, all);
}
