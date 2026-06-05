import { useEffect, useMemo, useState } from 'react';
import { format, addDays, startOfDay } from 'date-fns';
import {
  ArrowLeftRight,
  CalendarDays,
  Clock,
  IndianRupee,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DateTimePicker } from '@/components/DateTimePicker';
import type { Location } from '@/lib/locationData';
import { BRAND_GREEN, HERO_ACCENT, CARPOOL_MAX_SEATS } from './constants';
import { CarpoolLocationField, carpoolLocationLabel, hasValidCarpoolLocation } from './CarpoolLocationField';
import {
  CARPOOL_DATETIME_WRAPPER_CLASS,
  CARPOOL_TICKET_CELL,
  CARPOOL_TICKET_INFIELD_LABEL,
  carpoolNativeDatetimeClass,
} from './carpoolFormStyles';
import {
  clampTimeInputToMin,
  defaultTimeInputForDate,
  getMinTimeInputForDate,
  hasValidTimeInputWindow,
  isPickupDateToday,
  isTimeInputBeforeOrEqual,
  parseTimeInputToMinutes,
} from './searchUtils';

const HERO_MAX_PICKUP_TIME = '20:00';
const HERO_FEATURES = [
  { Icon: ShieldCheck, title: 'Verified Cabs', subtitle: 'Safe & trusted' },
  { Icon: Users, title: 'Shared Rides', subtitle: 'Save up to 60%' },
  { Icon: IndianRupee, title: 'Affordable Fares', subtitle: 'Fixed & transparent' },
  { Icon: Clock, title: 'On-time Pickup', subtitle: 'Punctual, every day' },
] as const;

const HERO_LABEL_CLASS = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500';

const HERO_DATETIME_INPUT_CLASS = carpoolNativeDatetimeClass('bg-gray-50 text-gray-800');

type CarpoolingHeroProps = {
  onSearch: (params: {
    from: string;
    to: string;
    date: string;
    time: string;
    seats: number;
    fromLocation?: Location;
    toLocation?: Location;
  }) => void | Promise<void>;
  isSearching?: boolean;
};

export function CarpoolingHero({ onSearch, isSearching = false }: CarpoolingHeroProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [fromLocation, setFromLocation] = useState<Location | undefined>();
  const [toLocation, setToLocation] = useState<Location | undefined>();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(() => defaultTimeInputForDate(format(new Date(), 'yyyy-MM-dd')));
  const [seats, setSeats] = useState(1);

  const minTime = useMemo(() => getMinTimeInputForDate(date), [date]);
  const canPickTimeToday = useMemo(
    () => hasValidTimeInputWindow(date, HERO_MAX_PICKUP_TIME),
    [date],
  );

  const tripStart = useMemo(() => {
    try {
      const d = new Date(`${date}T12:00:00`);
      const [hours, minutes] = time.split(':').map((part) => parseInt(part, 10));
      if (Number.isFinite(hours) && Number.isFinite(minutes)) {
        d.setHours(hours, minutes, 0, 0);
      }
      return d;
    } catch {
      return new Date();
    }
  }, [date, time]);

  const minTripStart = useMemo(() => startOfDay(new Date()), []);

  useEffect(() => {
    if (!canPickTimeToday && isPickupDateToday(date)) {
      setDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
      setTime('07:00');
    }
  }, [canPickTimeToday, date]);

  const isFormComplete = useMemo(() => {
    if (!hasValidCarpoolLocation(fromLocation, from)) return false;
    if (!hasValidCarpoolLocation(toLocation, to)) return false;
    if (!time.trim()) return false;
    if (minTime && isTimeInputBeforeOrEqual(time, minTime)) return false;
    if (seats < 1) return false;
    return true;
  }, [from, to, fromLocation, toLocation, time, minTime, seats]);

  useEffect(() => {
    if (!minTime) return;
    setTime((current) => clampTimeInputToMin(current, minTime));
  }, [date, minTime]);

  const swapLocations = () => {
    setFrom(to);
    setTo(from);
    setFromLocation(toLocation);
    setToLocation(fromLocation);
  };

  const handleTripStartChange = (next: Date | undefined) => {
    if (!next) return;
    const nextTime = format(next, 'HH:mm');
    if (parseTimeInputToMinutes(nextTime) > parseTimeInputToMinutes(HERO_MAX_PICKUP_TIME)) {
      toast.error('Pickup time must be before 8:00 PM');
      return;
    }
    setDate(format(next, 'yyyy-MM-dd'));
    setTime(nextTime);
  };

  const handleSearch = async () => {
    if (!isFormComplete) return;
    if (!hasValidCarpoolLocation(fromLocation, from) || !hasValidCarpoolLocation(toLocation, to)) {
      toast.error('Please select pickup and drop locations from suggestions');
      return;
    }
    if (!canPickTimeToday) {
      toast.error('No pickup times left for today. Please choose a future date.');
      return;
    }
    if (minTime && isTimeInputBeforeOrEqual(time, minTime)) {
      toast.error('Please choose a future pickup time');
      return;
    }

    await onSearch({
      from: carpoolLocationLabel(fromLocation, from),
      to: carpoolLocationLabel(toLocation, to),
      date,
      time,
      seats,
      fromLocation,
      toLocation,
    });
  };

  const searchButton = (
    <button
      type="button"
      onClick={() => void handleSearch()}
      disabled={!isFormComplete || isSearching}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-semibold text-white shadow-lg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 lg:rounded-xl',
      )}
      style={{ backgroundColor: BRAND_GREEN }}
    >
      <Search className="h-5 w-5" />
      {isSearching ? 'Searching…' : 'Search Rides'}
    </button>
  );

  return (
    <section
      className="relative isolate w-full max-w-full overflow-x-clip"
      style={{
        backgroundImage:
          'linear-gradient(95deg, rgba(8, 20, 14, 0.92) 0%, rgba(8, 20, 14, 0.75) 40%, rgba(8, 20, 14, 0.35) 70%, rgba(8, 20, 14, 0.15) 100%), url(https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=2400&q=85)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="mx-auto grid w-full min-w-0 max-w-[1400px] gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_400px] lg:items-center lg:gap-10 lg:px-8 lg:py-16 xl:grid-cols-[1fr_420px]">
        {/* Left content */}
        <div className="min-w-0 text-white">
          <h1 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-tight tracking-tight">
            Smart Commute. Shared Rides.{' '}
            <span style={{ color: HERO_ACCENT }}>Stronger Community.</span>
          </h1>
          <p className="mt-4 max-w-lg text-base text-white/85 sm:text-lg">
            Daily shared cabs for employees &amp; students. Travel together. Save together.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
            {HERO_FEATURES.map(({ Icon, title, subtitle }) => (
              <div
                key={title}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 backdrop-blur-sm sm:px-4 sm:py-4"
              >
                <Icon className="mb-2 h-5 w-5 text-white/90" strokeWidth={2} />
                <p className="text-sm font-semibold leading-tight">{title}</p>
                <p className="mt-0.5 text-xs text-white/70">{subtitle}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Search card */}
        <div
          id="find-ride"
          className="min-w-0 max-w-full scroll-mt-24 overflow-hidden rounded-2xl bg-white p-4 shadow-2xl sm:p-5 lg:p-6"
        >
          <h2 className="mb-4 text-lg font-bold lg:mb-5" style={{ color: BRAND_GREEN }}>
            Find Your Shared Ride
          </h2>

          {/* Mobile — Urbania-style ticket layout */}
          <div className="lg:hidden">
            <div className="overflow-hidden rounded-xl border border-gray-200 divide-y divide-gray-200">
              <div className="relative flex min-h-0 items-stretch bg-white">
                <div className="relative w-[14px] shrink-0 self-stretch py-1.5" aria-hidden>
                  <div
                    className="absolute left-1/2 top-[1.25rem] h-2 w-2 -translate-x-1/2 rounded-full border-2 bg-white"
                    style={{ borderColor: BRAND_GREEN }}
                  />
                  <div
                    className="absolute bottom-[1.25rem] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border-2 bg-white"
                    style={{ borderColor: '#ef4444' }}
                  />
                  <div
                    className="absolute bottom-[1.85rem] left-1/2 top-[1.85rem] w-0 -translate-x-1/2 border-l-2 border-dashed opacity-55"
                    style={{ borderColor: BRAND_GREEN }}
                  />
                </div>
                <div className="relative min-w-0 flex-1 divide-y divide-gray-200 pr-10">
                  <CarpoolLocationField
                    id="hero-pickup-mobile"
                    layout="ticket"
                    label="From"
                    value={from}
                    location={fromLocation}
                    onChange={setFrom}
                    onLocationChange={setFromLocation}
                    isPickup
                    placeholder="Enter pickup location"
                  />
                  <CarpoolLocationField
                    id="hero-drop-mobile"
                    layout="ticket"
                    label="To"
                    value={to}
                    location={toLocation}
                    onChange={setTo}
                    onLocationChange={setToLocation}
                    placeholder="Enter destination location"
                  />
                  <button
                    type="button"
                    onClick={swapLocations}
                    className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm hover:bg-gray-50"
                    aria-label="Swap pickup and drop"
                  >
                    <ArrowLeftRight className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className={CARPOOL_TICKET_CELL}>
                <DateTimePicker
                  variant="infield"
                  label="Trip start"
                  date={tripStart}
                  onDateChange={handleTripStartChange}
                  minDate={minTripStart}
                  className="min-w-0"
                />
              </div>

              <div className={cn(CARPOOL_TICKET_CELL, 'flex items-center justify-between gap-3')}>
                <div>
                  <span className={CARPOOL_TICKET_INFIELD_LABEL}>Seats needed</span>
                  <p className="mt-0.5 text-[11px] leading-none text-gray-400">Max {CARPOOL_MAX_SEATS}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSeats((s) => Math.max(1, s - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                    aria-label="Decrease seats"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-[1.25rem] text-center text-base font-bold text-gray-900">{seats}</span>
                  <button
                    type="button"
                    onClick={() => setSeats((s) => Math.min(CARPOOL_MAX_SEATS, s + 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                    aria-label="Increase seats"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4">{searchButton}</div>
          </div>

          {/* Desktop — original boxed layout */}
          <div className="hidden space-y-4 lg:block">
            <CarpoolLocationField
              id="hero-pickup"
              label="From"
              labelClassName={HERO_LABEL_CLASS}
              wrapperClassName="bg-gray-50"
              value={from}
              location={fromLocation}
              onChange={setFrom}
              onLocationChange={setFromLocation}
              isPickup
              placeholder="Pickup location"
            />

            <div className="relative">
              <button
                type="button"
                onClick={swapLocations}
                className="absolute -top-3 left-1/2 z-10 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm hover:bg-gray-50"
                aria-label="Swap pickup and drop"
              >
                <ArrowLeftRight className="h-4 w-4 text-gray-600" />
              </button>
              <CarpoolLocationField
                id="hero-drop"
                label="To"
                labelClassName={HERO_LABEL_CLASS}
                wrapperClassName="bg-gray-50"
                value={to}
                location={toLocation}
                onChange={setTo}
                onLocationChange={setToLocation}
                placeholder="Drop location"
              />
            </div>

            <div className="grid min-w-0 grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className={HERO_LABEL_CLASS}>Date</label>
                <div className={CARPOOL_DATETIME_WRAPPER_CLASS}>
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={date}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => setDate(e.target.value)}
                    className={HERO_DATETIME_INPUT_CLASS}
                  />
                </div>
              </div>
              <div className="min-w-0">
                <label className={HERO_LABEL_CLASS}>Time</label>
                <div className={CARPOOL_DATETIME_WRAPPER_CLASS}>
                  <Clock className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="time"
                    value={time}
                    min={minTime}
                    max={HERO_MAX_PICKUP_TIME}
                    onChange={(e) => setTime(e.target.value)}
                    className={HERO_DATETIME_INPUT_CLASS}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={HERO_LABEL_CLASS}>Seats Needed (max {CARPOOL_MAX_SEATS})</label>
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-2">
                <button
                  type="button"
                  onClick={() => setSeats((s) => Math.max(1, s - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                  aria-label="Decrease seats"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-lg font-semibold text-gray-900">{seats}</span>
                <button
                  type="button"
                  onClick={() => setSeats((s) => Math.min(CARPOOL_MAX_SEATS, s + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                  aria-label="Increase seats"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {searchButton}
          </div>
        </div>
      </div>
    </section>
  );
}
