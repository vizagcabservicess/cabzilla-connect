import { useEffect, useMemo, useRef, useState } from 'react';
import { format, addDays, startOfDay } from 'date-fns';
import {
  ArrowLeftRight,
  Building2,
  CalendarDays,
  Check,
  Clock,
  Leaf,
  Minus,
  Plus,
  User,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DateTimePicker } from '@/components/DateTimePicker';
import type { Location } from '@/lib/locationData';
import { BRAND_GREEN, BRAND_GREEN_LIGHT, CARPOOL_MAX_SEATS, COMMUTE_FORM_DEFAULT_BUDGET, COMMUTE_SCHEDULE_OPTIONS, GroupPreference, PICKUP_TIMES, type CommuteSchedule } from './constants';
import { CarpoolLocationField, carpoolLocationLabel, hasValidCarpoolLocation } from './CarpoolLocationField';
import {
  CARPOOL_DATETIME_WRAPPER_CLASS,
  CARPOOL_FIELD_INPUT_CLASS,
  CARPOOL_TICKET_CELL,
  CARPOOL_TICKET_INFIELD_INPUT,
  CARPOOL_TICKET_INFIELD_LABEL,
  carpoolNativeDatetimeClass,
} from './carpoolFormStyles';
import {
  commuteBudgetDefaultPerSeat,
  commuteBudgetSliderMax,
  commuteBudgetSliderMin,
  DailyCommuteBudgetSlider,
} from './DailyCommuteBudgetSlider';
import { fetchCommuteBudgetPerSeat } from './commuteBudget';
import { hasCarpoolRouteCoordinates } from './carpoolSedanFare';
import { defaultPickupTimeForDate, filterPickupTimesForDate, isPickupDateToday, parsePickupTimeToMinutes } from './searchUtils';
import type { CommuteFormData } from './types';

const COMMUTE_DATETIME_INPUT_CLASS = carpoolNativeDatetimeClass('bg-white');

type CommuteFormProps = {
  onFindRides: (data: CommuteFormData) => void | Promise<void>;
  onContextChange?: (ctx: {
    from: string;
    to: string;
    budget: string;
    pickupTime: string;
    pickupDate: string;
    seats: number;
    commuteSchedule: CommuteSchedule;
    groupPreference: GroupPreference;
  }) => void;
  defaultFrom?: string;
  defaultTo?: string;
  defaultFromLocation?: Location;
  defaultToLocation?: Location;
  defaultFullName?: string;
  defaultWaDigits?: string;
  defaultCompany?: string;
  submitLabel?: string;
  isSubmitting?: boolean;
};

const GROUP_OPTIONS: { id: GroupPreference; label: string; Icon: typeof Users }[] = [
  { id: 'mixed', label: 'Mixed Group', Icon: Users },
  { id: 'men', label: 'Men Only', Icon: User },
  { id: 'women', label: 'Women Only', Icon: User },
];

function getDefaultBudgetRange() {
  const min = commuteBudgetSliderMin(COMMUTE_FORM_DEFAULT_BUDGET);
  const max = commuteBudgetSliderMax(COMMUTE_FORM_DEFAULT_BUDGET, min);
  return { min, max, value: COMMUTE_FORM_DEFAULT_BUDGET };
}

const DEFAULT_BUDGET_RANGE = getDefaultBudgetRange();

function snapToNearestPickupTime(date: Date, available: readonly string[]): string {
  if (available.length === 0) return '';
  const minutes = date.getHours() * 60 + date.getMinutes();
  let best = available[0]!;
  let bestDiff = Infinity;
  for (const slot of available) {
    const diff = Math.abs(parsePickupTimeToMinutes(slot) - minutes);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = slot;
    }
  }
  return best;
}

export function CommuteForm({
  onFindRides,
  onContextChange,
  defaultFrom = '',
  defaultTo = '',
  defaultFromLocation,
  defaultToLocation,
  defaultFullName = '',
  defaultWaDigits = '',
  defaultCompany = '',
  submitLabel = 'Sign Up & Find Matching Rides',
  isSubmitting = false,
}: CommuteFormProps) {
  const [fullName, setFullName] = useState(defaultFullName);
  const [waDigits, setWaDigits] = useState(defaultWaDigits);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [fromLocation, setFromLocation] = useState<Location | undefined>();
  const [toLocation, setToLocation] = useState<Location | undefined>();
  const [company, setCompany] = useState(defaultCompany);
  const [budgetPerDay, setBudgetPerDay] = useState(DEFAULT_BUDGET_RANGE.value);
  const [budgetSliderMin, setBudgetSliderMin] = useState(DEFAULT_BUDGET_RANGE.min);
  const [budgetSliderMax, setBudgetSliderMax] = useState(DEFAULT_BUDGET_RANGE.max);
  const [fareLoading, setFareLoading] = useState(false);
  const [seats, setSeats] = useState(1);
  const [pickupDate, setPickupDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [pickupTime, setPickupTime] = useState(() =>
    defaultPickupTimeForDate(PICKUP_TIMES, format(new Date(), 'yyyy-MM-dd')),
  );
  const [commuteSchedule, setCommuteSchedule] = useState<CommuteSchedule>('daily');
  const [groupPreference, setGroupPreference] = useState<GroupPreference>('mixed');
  const fareRequestId = useRef(0);

  const availablePickupTimes = useMemo(
    () => filterPickupTimesForDate(PICKUP_TIMES, pickupDate),
    [pickupDate],
  );

  const minTripStart = useMemo(() => startOfDay(new Date()), []);

  const commuteTripStart = useMemo(() => {
    const d = new Date(`${pickupDate}T12:00:00`);
    if (pickupTime) {
      const mins = parsePickupTimeToMinutes(pickupTime);
      d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
    }
    return d;
  }, [pickupDate, pickupTime]);

  useEffect(() => {
    if (availablePickupTimes.length === 0 && isPickupDateToday(pickupDate)) {
      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      setPickupDate(tomorrow);
      setPickupTime(PICKUP_TIMES[0]!);
      return;
    }
    if (availablePickupTimes.length === 0) {
      if (pickupTime) setPickupTime('');
      return;
    }
    if (!availablePickupTimes.includes(pickupTime)) {
      setPickupTime(availablePickupTimes[0]!);
    }
  }, [pickupDate, availablePickupTimes, pickupTime]);

  useEffect(() => {
    if (defaultFrom) setFrom(defaultFrom);
  }, [defaultFrom]);

  useEffect(() => {
    if (defaultTo) setTo(defaultTo);
  }, [defaultTo]);

  useEffect(() => {
    if (defaultFromLocation) setFromLocation(defaultFromLocation);
  }, [defaultFromLocation]);

  useEffect(() => {
    if (defaultToLocation) setToLocation(defaultToLocation);
  }, [defaultToLocation]);

  useEffect(() => {
    if (defaultFullName) setFullName(defaultFullName);
  }, [defaultFullName]);

  useEffect(() => {
    if (defaultWaDigits) setWaDigits(defaultWaDigits);
  }, [defaultWaDigits]);

  useEffect(() => {
    if (defaultCompany) setCompany(defaultCompany);
  }, [defaultCompany]);

  useEffect(() => {
    if (!hasCarpoolRouteCoordinates(fromLocation, toLocation)) {
      setFareLoading(false);
      if (!fromLocation?.lat && !toLocation?.lat && !from.trim() && !to.trim()) {
        setBudgetSliderMin(DEFAULT_BUDGET_RANGE.min);
        setBudgetSliderMax(DEFAULT_BUDGET_RANGE.max);
        setBudgetPerDay(DEFAULT_BUDGET_RANGE.value);
      }
      return;
    }

    const requestId = ++fareRequestId.current;
    setFareLoading(true);

    const timer = window.setTimeout(() => {
      fetchCommuteBudgetPerSeat(fromLocation!, toLocation!)
        .then((result) => {
          if (requestId !== fareRequestId.current) return;
          if (!result) return;
          const min = commuteBudgetSliderMin(result.perSeatFare);
          const max = commuteBudgetSliderMax(result.perSeatFare, min);
          const perSeat = commuteBudgetDefaultPerSeat(result.perSeatFare, min, max);
          setBudgetSliderMin(min);
          setBudgetSliderMax(max);
          setBudgetPerDay(perSeat);
        })
        .catch(() => {
          if (requestId !== fareRequestId.current) return;
        })
        .finally(() => {
          if (requestId === fareRequestId.current) setFareLoading(false);
        });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [fromLocation, toLocation]);

  useEffect(() => {
    onContextChange?.({
      from: carpoolLocationLabel(fromLocation, from),
      to: carpoolLocationLabel(toLocation, to),
      budget: String(budgetPerDay),
      pickupTime,
      pickupDate,
      seats,
      commuteSchedule,
      groupPreference,
    });
  }, [from, to, fromLocation, toLocation, budgetPerDay, pickupTime, pickupDate, seats, commuteSchedule, groupPreference, onContextChange]);

  const swapLocations = () => {
    setFrom(to);
    setTo(from);
    setFromLocation(toLocation);
    setToLocation(fromLocation);
  };

  const handleCommuteTripStartChange = (next: Date | undefined) => {
    if (!next) return;
    const nextDate = format(next, 'yyyy-MM-dd');
    setPickupDate(nextDate);
    const timesForDate = filterPickupTimesForDate(PICKUP_TIMES, nextDate);
    const snapped = snapToNearestPickupTime(next, timesForDate);
    if (snapped) setPickupTime(snapped);
  };

  const routeHasCoordinates = hasCarpoolRouteCoordinates(fromLocation, toLocation);

  const isFormComplete = useMemo(() => {
    if (!fullName.trim()) return false;
    if (waDigits.trim().length < 10) return false;
    if (!hasValidCarpoolLocation(fromLocation, from)) return false;
    if (!hasValidCarpoolLocation(toLocation, to)) return false;
    if (!pickupTime.trim()) return false;
    if (seats < 1 || seats > CARPOOL_MAX_SEATS) return false;
    if (!routeHasCoordinates || fareLoading) return false;
    return true;
  }, [
    fullName,
    waDigits,
    from,
    to,
    fromLocation,
    toLocation,
    pickupTime,
    availablePickupTimes.length,
    seats,
    routeHasCoordinates,
    fareLoading,
  ]);

  const handleSubmit = () => {
    if (!isFormComplete) return;
    if (!fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    if (waDigits.trim().length < 10) {
      toast.error('Please enter your 10-digit WhatsApp number');
      return;
    }
    if (!hasValidCarpoolLocation(fromLocation, from) || !hasValidCarpoolLocation(toLocation, to)) {
      toast.error('Please select pickup and drop locations from suggestions');
      return;
    }
    if (!pickupTime) {
      toast.error('No pickup times left for today. Please choose a future date.');
      return;
    }
    if (seats > CARPOOL_MAX_SEATS) {
      toast.error(`Shared cabs seat up to ${CARPOOL_MAX_SEATS} passengers`);
      return;
    }

    const data: CommuteFormData = {
      fullName: fullName.trim(),
      waDigits: waDigits.trim(),
      company: company.trim(),
      budget: String(budgetPerDay),
      pickupTime,
      pickupDate,
      seats,
      commuteSchedule,
      groupPreference,
      from: carpoolLocationLabel(fromLocation, from),
      to: carpoolLocationLabel(toLocation, to),
    };
    onFindRides(data);
  };

  const submitButton = (
    <button
      type="button"
      onClick={handleSubmit}
      disabled={!isFormComplete || isSubmitting}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-semibold text-white shadow-lg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
      )}
      style={{ backgroundColor: BRAND_GREEN }}
    >
      {isSubmitting ? 'Searching…' : submitLabel}
    </button>
  );

  const scheduleSection = (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        Commute Schedule<span className="text-red-500">*</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {COMMUTE_SCHEDULE_OPTIONS.map(({ id, label }) => {
          const selected = commuteSchedule === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setCommuteSchedule(id)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:text-sm',
                selected ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              )}
              style={selected ? { backgroundColor: BRAND_GREEN } : undefined}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );

  const groupSection = (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">Group Preference</label>
      <div className="grid min-w-0 grid-cols-3 gap-1.5 sm:gap-2">
        {GROUP_OPTIONS.map(({ id, label, Icon }) => {
          const selected = groupPreference === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setGroupPreference(id)}
              className={cn(
                'relative flex min-w-0 flex-col items-center gap-2 rounded-xl border-2 px-1.5 py-3 text-center transition-all sm:px-2 sm:py-4',
                selected ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300',
              )}
              style={selected ? { borderColor: BRAND_GREEN, backgroundColor: BRAND_GREEN_LIGHT } : undefined}
            >
              {selected && (
                <Check className="absolute right-2 top-2 h-4 w-4" style={{ color: BRAND_GREEN }} strokeWidth={3} />
              )}
              <Icon className="h-6 w-6 text-gray-600" />
              <span className="text-xs font-semibold text-gray-800">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const infoBanner = (
    <div className="flex gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: BRAND_GREEN_LIGHT }}>
      <Leaf className="h-5 w-5 shrink-0" style={{ color: BRAND_GREEN }} />
      <p className="text-xs leading-relaxed text-gray-700">
        This helps us match you with commuters on the same route, schedule, and comfort preferences.
        Your details are shared only with verified drivers and co-riders.
      </p>
    </div>
  );

  const budgetSection = (
    <div className="min-w-0">
      <label className="mb-1.5 block text-sm font-medium text-gray-700">Daily Commute Budget</label>
      <DailyCommuteBudgetSlider
        value={budgetPerDay}
        min={budgetSliderMin}
        max={budgetSliderMax}
        onChange={setBudgetPerDay}
        disabled={!routeHasCoordinates}
        loading={fareLoading}
      />
    </div>
  );

  return (
    <div
      id="commute-form"
      className="scroll-mt-24 min-w-0 w-full max-w-full overflow-hidden max-lg:rounded-none max-lg:border-0 max-lg:bg-transparent max-lg:p-0 max-lg:shadow-none lg:rounded-2xl lg:border lg:border-gray-100 lg:bg-white lg:p-6 lg:shadow-sm"
    >
      <h2 className="text-xl font-bold text-gray-900">Tell us about your daily commute</h2>
      <p className="mt-1 text-sm text-gray-500">We&apos;ll match you with riders on your route</p>

      {/* Mobile — ticket layout (matches Find Your Shared Ride) */}
      <div className="mt-6 space-y-4 lg:hidden">
        <div className="overflow-hidden rounded-xl border border-gray-200 divide-y divide-gray-200 max-lg:rounded-lg">
          <div className={CARPOOL_TICKET_CELL}>
            <label htmlFor="commute-full-name-mobile" className={CARPOOL_TICKET_INFIELD_LABEL}>
              Full name
            </label>
            <input
              id="commute-full-name-mobile"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className={cn(CARPOOL_TICKET_INFIELD_INPUT, 'mt-1')}
            />
          </div>

          <div className={CARPOOL_TICKET_CELL}>
            <span className={CARPOOL_TICKET_INFIELD_LABEL}>WhatsApp number</span>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <select
                aria-label="Country code"
                className="w-14 shrink-0 border-0 bg-transparent p-0 text-base font-bold text-gray-900 focus:outline-none focus:ring-0"
              >
                <option>+91</option>
              </select>
              <input
                id="commute-wa-mobile"
                type="tel"
                value={waDigits}
                onChange={(e) => setWaDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile number"
                className={cn(CARPOOL_TICKET_INFIELD_INPUT, 'min-w-0 flex-1')}
              />
            </div>
          </div>

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
                id="commute-pickup-mobile"
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
                id="commute-drop-mobile"
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
            <label htmlFor="commute-company-mobile" className={CARPOOL_TICKET_INFIELD_LABEL}>
              Company / organisation
            </label>
            <input
              id="commute-company-mobile"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Your office or college name"
              className={cn(CARPOOL_TICKET_INFIELD_INPUT, 'mt-1')}
            />
          </div>

          <div className={CARPOOL_TICKET_CELL}>
            <DateTimePicker
              variant="infield"
              label="Trip start"
              date={commuteTripStart}
              onDateChange={handleCommuteTripStartChange}
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

        {budgetSection}
        {scheduleSection}
        {groupSection}
        {infoBanner}
        {submitButton}
      </div>

      {/* Desktop — original boxed layout */}
      <div className="mt-6 hidden min-w-0 space-y-4 lg:block">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className={cn('w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4', CARPOOL_FIELD_INPUT_CLASS)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">WhatsApp Number</label>
          <div className="flex min-w-0 gap-2">
            <select className={cn('w-16 shrink-0 rounded-xl border border-gray-200 bg-gray-50 px-2 py-3', CARPOOL_FIELD_INPUT_CLASS)}>
              <option>+91</option>
            </select>
            <input
              type="tel"
              value={waDigits}
              onChange={(e) => setWaDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              className={cn('min-w-0 flex-1 rounded-xl border border-gray-200 py-3 px-4', CARPOOL_FIELD_INPUT_CLASS)}
            />
          </div>
        </div>

        <CarpoolLocationField
          id="commute-pickup"
          label="Pickup Location"
          value={from}
          location={fromLocation}
          onChange={setFrom}
          onLocationChange={setFromLocation}
          isPickup
          placeholder="Search pickup location"
        />

        <div className="relative">
          <button
            type="button"
            onClick={swapLocations}
            className="absolute -top-3 left-1/2 z-10 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm hover:bg-gray-50"
            aria-label="Swap pickup and drop"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 text-gray-600" />
          </button>
          <CarpoolLocationField
            id="commute-drop"
            label="Drop Location"
            value={to}
            location={toLocation}
            onChange={setTo}
            onLocationChange={setToLocation}
            placeholder="Search drop location"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Company / Organisation</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Your office or college name"
              className={cn('w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4', CARPOOL_FIELD_INPUT_CLASS)}
            />
          </div>
        </div>

        <div className="min-w-0">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            No. of Seats <span className="font-normal text-gray-500">(max {CARPOOL_MAX_SEATS})</span>
          </label>
          <div className="flex w-full min-w-0 items-center justify-between rounded-xl border border-gray-200 px-3 py-2 sm:px-4">
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

        {budgetSection}

        <div className="grid min-w-0 grid-cols-2 gap-3">
          <div className="min-w-0">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Pickup Date</label>
            <div className={CARPOOL_DATETIME_WRAPPER_CLASS}>
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={pickupDate}
                min={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setPickupDate(e.target.value)}
                className={COMMUTE_DATETIME_INPUT_CLASS}
              />
            </div>
          </div>
          <div className="min-w-0">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Pickup Time</label>
            <div className={CARPOOL_DATETIME_WRAPPER_CLASS}>
              <Clock className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className={cn(
                  'w-full min-w-0 appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 disabled:bg-gray-50 disabled:text-gray-400',
                  CARPOOL_FIELD_INPUT_CLASS,
                )}
              >
                {availablePickupTimes.length === 0 ? (
                  <option value="">No times left today</option>
                ) : (
                  availablePickupTimes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {scheduleSection}
        {groupSection}
        {infoBanner}
        {submitButton}
      </div>
    </div>
  );
}
