import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Filter, Loader2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND_GREEN, TimeFilter, type GroupPreference, type SharedRide } from './constants';
import { AvailableRideCard } from './AvailableRideCard';
import { fetchSharedRides } from './rideMapper';
import { filterMatchingRides, getDefaultSearchParams, enrichSearchWithRide } from './searchUtils';

const TIME_FILTERS: { id: TimeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
  { id: 'night', label: 'Night' },
];

type AvailableRidesProps = {
  searchFrom?: string;
  searchTo?: string;
  searchDate?: string;
  searchTime?: string;
  searchSeats?: number;
  searchBudget?: string;
  searchGroupPreference?: GroupPreference;
};

export function AvailableRides({
  searchFrom,
  searchTo,
  searchDate,
  searchTime,
  searchSeats,
  searchBudget,
  searchGroupPreference,
}: AvailableRidesProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<TimeFilter>('all');
  const [showAll, setShowAll] = useState(false);
  const [rides, setRides] = useState<SharedRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const data = await fetchSharedRides({
          period: filter !== 'all' ? filter : undefined,
        });
        if (!cancelled) {
          setRides(data);
        }
      } catch {
        if (!cancelled) {
          setRides([]);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const filteredRides = useMemo(() => {
    let list = rides;
    if (filter !== 'all') {
      list = list.filter((r) => r.period === filter);
    }
    if (searchFrom || searchTo) {
      list = filterMatchingRides(
        { ...getDefaultSearchParams(), from: searchFrom ?? '', to: searchTo ?? '' },
        list,
      );
    }
    return list;
  }, [rides, filter, searchFrom, searchTo]);

  const displayedRides = showAll ? filteredRides : filteredRides.slice(0, 4);

  const hasActiveFilters = filter !== 'all' || showAll;

  const resetFilters = () => {
    setFilter('all');
    setShowAll(false);
  };

  const handleViewDetails = (ride: SharedRide) => {
    const defaults = getDefaultSearchParams();
    const search = enrichSearchWithRide(
      {
        ...defaults,
        from: searchFrom?.trim() || '',
        to: searchTo?.trim() || '',
        date: searchDate?.trim() || defaults.date,
        time: searchTime?.trim() || defaults.time,
        pickupTime: searchTime?.trim() || defaults.pickupTime,
        seats: searchSeats ?? defaults.seats,
        budget: searchBudget?.trim() || defaults.budget,
        groupPreference: searchGroupPreference ?? defaults.groupPreference,
      },
      ride,
    );
    const rides = filteredRides.length > 0 ? filteredRides : [ride];
    const navState = { search, rides, selectedRideId: ride.id };

    if (window.innerWidth < 1024) {
      navigate(`/shared-carpooling/ride/${ride.id}`, { state: navState });
      return;
    }

    navigate('/shared-carpooling/results', { state: navState });
  };

  return (
    <div
      id="available-rides"
      className="min-w-0 scroll-mt-24 overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-900 sm:text-xl">Available Shared Rides</h2>
          <p className="mt-0.5 text-sm text-gray-500">Find a ride that fits your schedule</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4" />
              Reset filters
            </button>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            aria-label="Filter rides by time of day"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {TIME_FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-medium transition-colors sm:text-sm',
              filter === id ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
            )}
            style={filter === id ? { backgroundColor: BRAND_GREEN } : undefined}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3 sm:space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-green-700" />
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-gray-500">
            Could not load rides. Please try again later.
          </p>
        ) : displayedRides.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            {searchFrom || searchTo
              ? 'No rides match this route yet. Try nearby pickup/drop names or submit a commute request.'
              : 'No rides available yet. Submit the commute form or check back soon.'}
          </p>
        ) : (
          displayedRides.map((ride) => (
            <AvailableRideCard
              key={ride.id}
              ride={ride}
              onViewDetails={() => handleViewDetails(ride)}
            />
          ))
        )}
      </div>

      {!loading && filteredRides.length > 4 && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="mt-4 flex w-full items-center justify-center gap-1 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
        >
          {showAll ? 'Show Less' : 'View More Rides'}
          <ChevronDown className={cn('h-4 w-4 transition-transform', showAll && 'rotate-180')} />
        </button>
      )}
    </div>
  );
}
