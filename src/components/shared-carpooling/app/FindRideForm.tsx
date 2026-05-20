import { useState } from 'react';
import { format } from 'date-fns';
import {
  ArrowLeftRight,
  CalendarDays,
  Clock,
  Minus,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Location } from '@/lib/locationData';
import { BRAND_GREEN, CARPOOL_MAX_SEATS } from '../constants';
import { CarpoolLocationField, carpoolLocationLabel, hasValidCarpoolLocation } from '../CarpoolLocationField';
import { CARPOOL_DATETIME_WRAPPER_CLASS, carpoolNativeDatetimeClass } from '../carpoolFormStyles';

export type FindRideValues = {
  from: string;
  to: string;
  date: string;
  time: string;
  seats: number;
};

type FindRideFormProps = {
  onSearch: (values: FindRideValues) => void;
  loading?: boolean;
  initial?: Partial<FindRideValues>;
};

const FIND_LABEL_CLASS = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500';

const FIND_DATETIME_INPUT_CLASS = carpoolNativeDatetimeClass('bg-white');

export function FindRideForm({ onSearch, loading = false, initial }: FindRideFormProps) {
  const [from, setFrom] = useState(initial?.from ?? '');
  const [to, setTo] = useState(initial?.to ?? '');
  const [fromLocation, setFromLocation] = useState<Location | undefined>();
  const [toLocation, setToLocation] = useState<Location | undefined>();
  const [date, setDate] = useState(initial?.date ?? format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(initial?.time ?? '07:30');
  const [seats, setSeats] = useState(initial?.seats ?? 1);

  const swap = () => {
    setFrom(to);
    setTo(from);
    setFromLocation(toLocation);
    setToLocation(fromLocation);
  };

  const handleSearch = () => {
    if (!hasValidCarpoolLocation(fromLocation, from) || !hasValidCarpoolLocation(toLocation, to)) {
      toast.error('Please select pickup and drop locations from suggestions');
      return;
    }

    onSearch({
      from: carpoolLocationLabel(fromLocation, from),
      to: carpoolLocationLabel(toLocation, to),
      date,
      time,
      seats,
    });
  };

  return (
    <div className="space-y-4">
      <CarpoolLocationField
        id="find-pickup"
        label="From"
        labelClassName={FIND_LABEL_CLASS}
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
          onClick={swap}
          className="absolute -top-3 left-1/2 z-10 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm"
          aria-label="Swap locations"
        >
          <ArrowLeftRight className="h-4 w-4 text-gray-600" />
        </button>
        <CarpoolLocationField
          id="find-drop"
          label="To"
          labelClassName={FIND_LABEL_CLASS}
          value={to}
          location={toLocation}
          onChange={setTo}
          onLocationChange={setToLocation}
          placeholder="Drop location"
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label className={FIND_LABEL_CLASS}>Date</label>
          <div className={CARPOOL_DATETIME_WRAPPER_CLASS}>
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={date}
              min={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => setDate(e.target.value)}
              className={FIND_DATETIME_INPUT_CLASS}
            />
          </div>
        </div>
        <div className="min-w-0">
          <label className={FIND_LABEL_CLASS}>Time</label>
          <div className={CARPOOL_DATETIME_WRAPPER_CLASS}>
            <Clock className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={FIND_DATETIME_INPUT_CLASS}
            />
          </div>
        </div>
      </div>

      <div>
        <label className={FIND_LABEL_CLASS}>Seats Needed (max {CARPOOL_MAX_SEATS})</label>
        <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-2">
          <button
            type="button"
            onClick={() => setSeats((s) => Math.max(1, s - 1))}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="text-xl font-bold text-gray-900">{seats}</span>
          <button
            type="button"
            onClick={() => setSeats((s) => Math.min(CARPOOL_MAX_SEATS, s + 1))}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={handleSearch}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-semibold text-white shadow-lg disabled:opacity-60"
        style={{ backgroundColor: BRAND_GREEN }}
      >
        <Search className="h-5 w-5" />
        {loading ? 'Searching…' : 'Search Rides'}
      </button>

      <div className="grid grid-cols-3 gap-2 pt-2 text-center">
        {[
          { icon: ShieldCheck, label: 'Verified Cabs' },
          { icon: Search, label: 'Affordable Fares' },
          { icon: Clock, label: 'On-time Pickup' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="rounded-xl bg-green-50 px-2 py-3">
            <Icon className="mx-auto h-4 w-4" style={{ color: BRAND_GREEN }} />
            <p className="mt-1 text-[10px] font-semibold text-gray-700">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
