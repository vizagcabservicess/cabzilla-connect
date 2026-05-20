import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, RotateCcw, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND_GREEN, TimeFilter, type SharedRide } from './constants';
import { PerSeatPrice } from './PerSeatPrice';
import type { SortOption } from './types';

function parseRideTime(time: string): { clock: string; period: string } {
  const match = time.match(/^(\d{1,2}:\d{2})\s*(AM|PM)$/i);
  if (match) return { clock: match[1]!, period: match[2]!.toUpperCase() };
  return { clock: time, period: '' };
}

function parseTimeToMinutes(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let h = parseInt(match[1]!, 10);
  const m = parseInt(match[2]!, 10);
  const period = match[3]!.toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

type MatchingRideListProps = {
  selectedId: string;
  onSelect: (ride: SharedRide) => void;
  rides?: SharedRide[];
};

export function MatchingRideList({ selectedId, onSelect, rides = [] }: MatchingRideListProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState<TimeFilter>('all');
  const [sort, setSort] = useState<SortOption>('earliest');
  const [visibleCount, setVisibleCount] = useState(6);

  const counts = useMemo(() => {
    const c = { all: rides.length, morning: 0, afternoon: 0, evening: 0, night: 0 };
    for (const r of rides) c[r.period] += 1;
    return c;
  }, [rides]);

  const filteredRides = useMemo(() => {
    let list = filter === 'all' ? [...rides] : rides.filter((r) => r.period === filter);

    list.sort((a, b) => {
      if (sort === 'earliest') return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
      if (sort === 'price-low') return a.pricePerSeat - b.pricePerSeat;
      if (sort === 'price-high') return b.pricePerSeat - a.pricePerSeat;
      return b.seatsLeft - a.seatsLeft;
    });

    return list;
  }, [filter, sort, rides]);

  const displayed = filteredRides.slice(0, visibleCount);

  const hasActiveFilters = filter !== 'all' || sort !== 'earliest';

  const resetFilters = () => {
    setFilter('all');
    setSort('earliest');
    setVisibleCount(6);
  };

  const tabs: { id: TimeFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All Rides', count: counts.all },
    { id: 'morning', label: 'Morning', count: counts.morning },
    { id: 'afternoon', label: 'Afternoon', count: counts.afternoon },
    { id: 'evening', label: 'Evening', count: counts.evening },
    { id: 'night', label: 'Night', count: counts.night },
  ];

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map(({ id, label, count }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:text-sm',
                filter === id ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
              style={filter === id ? { backgroundColor: BRAND_GREEN } : undefined}
            >
              {label} ({count})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 sm:text-sm"
            >
              <RotateCcw className="h-4 w-4" />
              Reset filters
            </button>
          )}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 sm:text-sm"
          >
            <option value="earliest">Sort by: Earliest Pickup</option>
            <option value="price-low">Sort by: Lowest Price</option>
            <option value="price-high">Sort by: Highest Price</option>
            <option value="seats">Sort by: Most Seats</option>
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {displayed.map((ride) => {
          const { clock, period } = parseRideTime(ride.time);
          const selected = ride.id === selectedId;

          return (
            <article
              key={ride.id}
              className={cn(
                'relative cursor-pointer overflow-hidden rounded-xl border bg-white p-4 transition-all hover:shadow-md',
                selected ? 'border-green-500 shadow-md ring-1 ring-green-500/30' : 'border-gray-100',
              )}
              onClick={() => onSelect(ride)}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(ride)}
              role="button"
              tabIndex={0}
            >
              {ride.isBestMatch && (
                <span
                  className="absolute right-0 top-0 rounded-bl-lg px-3 py-1 text-[10px] font-bold uppercase text-white"
                  style={{ backgroundColor: BRAND_GREEN }}
                >
                  Best Match
                </span>
              )}

              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
                {/* Time + Route */}
                <div className="flex min-w-0 flex-1 gap-3">
                  <div className="flex shrink-0 flex-col leading-none">
                    <span className="text-xl font-bold text-gray-900">{clock}</span>
                    {period && <span className="mt-0.5 text-xs font-bold text-gray-900">{period}</span>}
                  </div>
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <div className="mt-1 flex shrink-0 flex-col items-center">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BRAND_GREEN }} />
                      <span className="my-0.5 h-6 w-px bg-gray-300" />
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800">{ride.pickup}</p>
                      <p className="mt-1 text-sm font-semibold text-gray-800">{ride.drop}</p>
                      {ride.via && <p className="mt-1 text-xs text-gray-500">{ride.via}</p>}
                    </div>
                  </div>
                </div>

                {/* Vehicle */}
                <div className="flex shrink-0 items-center gap-2 sm:w-28">
                  <img src={ride.vehicleImage} alt={ride.vehicle} className="h-8 w-12 object-contain" />
                  <p className="text-xs font-semibold text-gray-800 sm:text-sm">{ride.vehicle.replace('Maruti ', '').replace('Toyota ', '').replace('Mahindra ', '')}</p>
                </div>

                {/* Driver */}
                <div className="flex shrink-0 items-center gap-2 sm:w-36">
                  <img src={ride.driverAvatar} alt={ride.driverName} className="h-8 w-8 rounded-full object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-gray-800 sm:text-sm">{ride.driverName}</p>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="text-[11px] text-gray-600">{ride.rating}</span>
                      <span className="rounded px-1 py-px text-[9px] font-bold uppercase text-white" style={{ backgroundColor: BRAND_GREEN }}>
                        Verified
                      </span>
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
                  <div className="text-left sm:text-right">
                    <p className="text-xs font-semibold" style={{ color: BRAND_GREEN }}>
                      {ride.seatsLeft} Seats Left
                    </p>
                    <PerSeatPrice amount={ride.pricePerSeat} align="left" className="sm:text-right" />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.innerWidth < 1024) {
                        navigate(`/shared-carpooling/ride/${ride.id}`, { state: location.state });
                      } else {
                        onSelect(ride);
                      }
                    }}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white sm:text-sm"
                    style={{ backgroundColor: BRAND_GREEN }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {visibleCount < filteredRides.length && (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => c + 4)}
          className="mt-4 flex w-full items-center justify-center gap-1 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
        >
          Load More Rides
          <ChevronDown className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
