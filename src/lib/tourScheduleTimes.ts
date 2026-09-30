const MINUTE_MS = 60 * 1000;

/** Pickup must be at least this far after the current time. */
export const PICKUP_LEAD_MS = 90 * MINUTE_MS;

/** Same-day airport transfer and tour start must be at least this far apart. */
export const SAME_DAY_TRANSFER_GAP_MS = 2 * 60 * MINUTE_MS;

export type PlanWhen = {
  pickupDate: string;
  pickupTime: string;
};

export type AirportScheduleDirection = 'from-airport' | 'to-airport';

function atMinute(date: Date): Date {
  const next = new Date(date);
  next.setSeconds(0, 0);
  return next;
}

export function earliestPickupInstant(now = new Date()): Date {
  return atMinute(new Date(now.getTime() + PICKUP_LEAD_MS));
}

export function planInstant(pickupDate: string, pickupTime: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) return null;
  const [year, month, day] = pickupDate.split('-').map(Number);
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(pickupTime || '');
  const date = new Date(
    year,
    month - 1,
    day,
    timeMatch ? Number(timeMatch[1]) : 0,
    timeMatch ? Number(timeMatch[2]) : 0,
    0,
    0
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

export function fieldsFromInstant(date: Date): PlanWhen {
  const value = atMinute(date);
  return {
    pickupDate: [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, '0'),
      String(value.getDate()).padStart(2, '0'),
    ].join('-'),
    pickupTime: `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`,
  };
}

/** Move a pickup that is sooner than 1.5 hours from now up to that earliest time. */
export function clampToLeadTime(when: PlanWhen, now = new Date()): PlanWhen {
  const instant = planInstant(when.pickupDate, when.pickupTime);
  if (!instant) return when;
  const earliest = earliestPickupInstant(now);
  if (instant.getTime() >= earliest.getTime()) return fieldsFromInstant(instant);
  return fieldsFromInstant(earliest);
}

export type SeparatedSchedule = {
  airport: PlanWhen;
  trip: PlanWhen;
  airportChanged: boolean;
  tripChanged: boolean;
};

/**
 * From-airport on the tour date is at least 2 hours before the tour.
 * To-airport on the tour date is at least 2 hours after the tour.
 * `prefer` is the time the user just edited; the other one moves when the gap is too small.
 */
export function separateAirportAndTrip(input: {
  direction: AirportScheduleDirection;
  airport: PlanWhen;
  trip: PlanWhen;
  prefer: 'airport' | 'trip';
  now?: Date;
}): SeparatedSchedule {
  const now = input.now ?? new Date();
  const airport = clampToLeadTime(input.airport, now);
  const trip = input.trip.pickupDate ? clampToLeadTime(input.trip, now) : input.trip;
  const airportAt = planInstant(airport.pickupDate, airport.pickupTime);
  const tripAt = planInstant(trip.pickupDate, trip.pickupTime);

  if (!airportAt || !tripAt || airport.pickupDate !== trip.pickupDate) {
    return {
      airport,
      trip,
      airportChanged: airport.pickupDate !== input.airport.pickupDate || airport.pickupTime !== input.airport.pickupTime,
      tripChanged: trip.pickupDate !== input.trip.pickupDate || trip.pickupTime !== input.trip.pickupTime,
    };
  }

  const gap = tripAt.getTime() - airportAt.getTime();
  const fromAirport = input.direction === 'from-airport';
  const gapOk = fromAirport ? gap >= SAME_DAY_TRANSFER_GAP_MS : -gap >= SAME_DAY_TRANSFER_GAP_MS;
  if (gapOk) {
    return {
      airport,
      trip,
      airportChanged: airport.pickupDate !== input.airport.pickupDate || airport.pickupTime !== input.airport.pickupTime,
      tripChanged: trip.pickupDate !== input.trip.pickupDate || trip.pickupTime !== input.trip.pickupTime,
    };
  }

  const earliest = earliestPickupInstant(now);
  let nextAirport = airportAt;
  let nextTrip = tripAt;
  if (input.prefer === 'airport') {
    if (fromAirport) {
      nextTrip = new Date(airportAt.getTime() + SAME_DAY_TRANSFER_GAP_MS);
    } else {
      const earlierTrip = new Date(airportAt.getTime() - SAME_DAY_TRANSFER_GAP_MS);
      if (earlierTrip.getTime() >= earliest.getTime()) nextTrip = earlierTrip;
      else {
        nextTrip = earliest;
        nextAirport = new Date(earliest.getTime() + SAME_DAY_TRANSFER_GAP_MS);
      }
    }
  } else if (fromAirport) {
    const earlierAirport = new Date(tripAt.getTime() - SAME_DAY_TRANSFER_GAP_MS);
    if (earlierAirport.getTime() >= earliest.getTime()) nextAirport = earlierAirport;
    else {
      nextAirport = earliest;
      nextTrip = new Date(earliest.getTime() + SAME_DAY_TRANSFER_GAP_MS);
    }
  } else {
    nextAirport = new Date(tripAt.getTime() + SAME_DAY_TRANSFER_GAP_MS);
  }

  const nextAirportWhen = fieldsFromInstant(nextAirport);
  const nextTripWhen = fieldsFromInstant(nextTrip);
  return {
    airport: nextAirportWhen,
    trip: nextTripWhen,
    airportChanged:
      nextAirportWhen.pickupDate !== input.airport.pickupDate ||
      nextAirportWhen.pickupTime !== input.airport.pickupTime,
    tripChanged:
      nextTripWhen.pickupDate !== input.trip.pickupDate || nextTripWhen.pickupTime !== input.trip.pickupTime,
  };
}

/** YYYY-MM-DD, including a leading date on an ISO datetime. */
export function tourIsoDateOnly(iso: string): string {
  const value = String(iso || '').trim();
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : '';
}

function utcDayIndex(iso: string): number | null {
  const day = tourIsoDateOnly(iso);
  if (!day) return null;
  return Date.UTC(
    Number(day.slice(0, 4)),
    Number(day.slice(5, 7)) - 1,
    Number(day.slice(8, 10))
  ) / 86400000;
}

/** Airport pickup may sit this many calendar days before the tour or after the last package day. */
export const AIRPORT_DURATION_PAD_DAYS = 2;

export function formatTourDurationLabel(days: number): string {
  const count = Math.max(1, Math.round(days));
  if (count <= 1) return '1 Day';
  const nights = count - 1;
  return `${count} Days / ${nights} Night${nights === 1 ? '' : 's'}`;
}

/** Calendar days from tour start through last tour day plus nearby airport dates (not stale years). */
export function daysCoveringTourAndAirports(
  tourStartIso: string,
  tourDayCount: number,
  airportIsos: string[]
): number {
  const start = utcDayIndex(tourStartIso);
  const packageDays = Math.max(1, tourDayCount || 1);
  if (start == null) return packageDays;
  const packageEnd = start + packageDays - 1;
  let min = start;
  let max = packageEnd;
  for (const iso of airportIsos) {
    const day = utcDayIndex(iso);
    if (day == null) continue;
    if (day < start - AIRPORT_DURATION_PAD_DAYS || day > packageEnd + AIRPORT_DURATION_PAD_DAYS) {
      continue;
    }
    if (day < min) min = day;
    if (day > max) max = day;
  }
  const span = Math.max(1, max - min + 1);
  return Math.min(span, packageDays + AIRPORT_DURATION_PAD_DAYS);
}

export type AirportWhenInput = {
  direction?: string;
  pickupDate?: string;
  pickupTime?: string;
};

/** Latest from-airport pickup. Tour cannot start before this. */
export function latestFromAirportWhen(transfers: AirportWhenInput[]): PlanWhen | null {
  let latest: { when: PlanWhen; at: number } | null = null;
  for (const transfer of transfers) {
    if (transfer.direction !== 'from-airport') continue;
    const pickupDate = tourIsoDateOnly(String(transfer.pickupDate || ''));
    if (!pickupDate) continue;
    const pickupTime =
      transfer.pickupTime && /^\d{1,2}:\d{2}$/.test(transfer.pickupTime)
        ? transfer.pickupTime
        : '00:00';
    const at = planInstant(pickupDate, pickupTime);
    if (!at) continue;
    if (!latest || at.getTime() > latest.at) {
      latest = { when: { pickupDate, pickupTime }, at: at.getTime() };
    }
  }
  return latest?.when ?? null;
}

export function earliestToAirportWhen(transfers: AirportWhenInput[]): PlanWhen | null {
  let earliest: { when: PlanWhen; at: number } | null = null;
  for (const transfer of transfers) {
    if (transfer.direction !== 'to-airport') continue;
    const pickupDate = tourIsoDateOnly(String(transfer.pickupDate || ''));
    if (!pickupDate) continue;
    const pickupTime =
      transfer.pickupTime && /^\d{1,2}:\d{2}$/.test(transfer.pickupTime)
        ? transfer.pickupTime
        : '00:00';
    const at = planInstant(pickupDate, pickupTime);
    if (!at) continue;
    if (!earliest || at.getTime() < earliest.at) {
      earliest = { when: { pickupDate, pickupTime }, at: at.getTime() };
    }
  }
  return earliest?.when ?? null;
}

export function minTourStartInstant(transfers: AirportWhenInput[], now = new Date()): Date {
  const floor = earliestPickupInstant(now);
  const fromAirport = latestFromAirportWhen(transfers);
  if (!fromAirport) return floor;
  const airAt = planInstant(fromAirport.pickupDate, fromAirport.pickupTime);
  if (!airAt) return floor;
  const afterAirport = new Date(airAt.getTime() + SAME_DAY_TRANSFER_GAP_MS);
  return afterAirport.getTime() > floor.getTime() ? afterAirport : floor;
}

/** Tour pickup is the from-airport time plus 2 hours (same calendar day unless that rolls past midnight). */
export function clampTripAfterFromAirports(trip: PlanWhen, transfers: AirportWhenInput[]): PlanWhen {
  const fromAirport = latestFromAirportWhen(transfers);
  if (!fromAirport) {
    return trip.pickupDate ? clampToLeadTime(trip) : trip;
  }
  return fieldsFromInstant(minTourStartInstant(transfers));
}

export function airportHotelName(transfers: Array<AirportWhenInput & { placeName?: string }>): string {
  const fromAirport = transfers.find(
    (transfer) => transfer.direction === 'from-airport' && String(transfer.placeName || '').trim()
  );
  return String(fromAirport?.placeName || '').trim();
}
