import { Link } from 'react-router-dom';
import { CalendarDays, Clock, IndianRupee, MapPin, Pencil, Users } from 'lucide-react';
import type { CarpoolSearchParams } from './types';
import { BRAND_GREEN, PER_SEAT_PRICE_SUFFIX, ONE_WAY_LABEL } from './constants';
import { commuteScheduleLabel } from './searchUtils';

type SearchSummaryBarProps = {
  search: CarpoolSearchParams;
};

function groupLabel(pref: CarpoolSearchParams['groupPreference']): string {
  if (pref === 'mixed') return 'Mixed Group';
  if (pref === 'men') return 'Men Only';
  return 'Women Only';
}

export function SearchSummaryBar({ search }: SearchSummaryBarProps) {
  const items = [
    { label: 'From', value: search.from, Icon: MapPin },
    { label: 'To', value: search.to, Icon: MapPin },
    { label: 'Date', value: search.date, Icon: CalendarDays },
    { label: 'Time', value: search.time, Icon: Clock },
    { label: 'Seats Needed', value: `${search.seats} Seat${search.seats !== 1 ? 's' : ''}`, Icon: Users },
    { label: 'Schedule', value: commuteScheduleLabel(search.commuteSchedule), Icon: CalendarDays },
    { label: 'Group Preference', value: groupLabel(search.groupPreference), Icon: Users },
    { label: 'Budget', value: `Up to ₹${search.budget} ${PER_SEAT_PRICE_SUFFIX}, ${ONE_WAY_LABEL}`, Icon: IndianRupee },
  ];

  return (
    <div className="border-b border-gray-100 bg-gray-50">
      <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {items.map(({ label, value, Icon }) => (
              <div key={label} className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <p className="truncate text-sm font-semibold text-gray-900">{value}</p>
                </div>
              </div>
            ))}
          </div>
          <Link
            to="/shared-carpooling#commute-form"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Pencil className="h-4 w-4" style={{ color: BRAND_GREEN }} />
            Modify Search
          </Link>
        </div>
      </div>
    </div>
  );
}
