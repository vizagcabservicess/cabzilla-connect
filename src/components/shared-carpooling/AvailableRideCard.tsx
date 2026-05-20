import { ArrowRight, Clock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND_GREEN, BRAND_GREEN_LIGHT, ONE_WAY_LABEL, type SharedRide } from './constants';
import { RideScheduleBadge } from './RideScheduleBadge';

function formatRideTimeLabel(time: string): string {
  const match = time.match(/^(\d{1,2}:\d{2})\s*(AM|PM)$/i);
  if (match) return `${match[1]} ${match[2]!.toUpperCase()}.`;
  return time;
}

type AvailableRideCardProps = {
  ride: SharedRide;
  onViewDetails: () => void;
  className?: string;
};

export function AvailableRideCard({ ride, onViewDetails, className }: AvailableRideCardProps) {
  const timeLabel = formatRideTimeLabel(ride.time);
  const pricePerSeat = Number(ride.pricePerSeat);
  const rating = Number(ride.rating);
  const priceDisplay = Number.isFinite(pricePerSeat) ? pricePerSeat.toFixed(2) : '0.00';

  return (
    <article
      className={cn(
        'min-w-0 overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm',
        className,
      )}
    >
      {/* Header: time badge + seats pill */}
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white sm:text-sm"
          style={{ backgroundColor: BRAND_GREEN }}
        >
          <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
          {timeLabel}
        </span>
        <span
          className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold sm:text-sm"
          style={{ backgroundColor: BRAND_GREEN_LIGHT, color: BRAND_GREEN }}
        >
          {ride.seatsLeft} Seats Left
        </span>
      </div>

      {/* Body: route | price + vehicle */}
      <div className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:gap-4">
        <div className="flex min-w-0 gap-2.5">
          <div className="mt-1.5 flex shrink-0 flex-col items-center">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BRAND_GREEN }} />
            <span className="my-1 h-10 w-px bg-gray-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div>
              <p className="truncate text-sm font-bold text-gray-900 sm:text-base">{ride.pickup}</p>
              <p className="mt-0.5 text-[11px] text-gray-400 sm:text-xs">Pickup</p>
            </div>
            <div className="mt-3">
              <p className="truncate text-sm font-bold text-gray-900 sm:text-base">{ride.drop}</p>
              <p className="mt-0.5 text-[11px] text-gray-400 sm:text-xs">Drop-off</p>
            </div>
            <RideScheduleBadge schedule={ride.schedule} className="mt-2.5" />
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end">
          <div className="text-right">
            <p className="whitespace-nowrap text-sm font-bold tabular-nums text-gray-900 sm:text-base">
              ₹{priceDisplay}
              <span className="font-semibold"> /seat</span>
            </p>
            <p className="mt-0.5 text-[11px] text-gray-500 sm:text-xs">{ONE_WAY_LABEL}</p>
          </div>
          <img
            src={ride.vehicleImage}
            alt={ride.vehicle}
            className="mt-2 h-14 w-[5.5rem] object-contain object-right sm:h-16 sm:w-24"
          />
        </div>
      </div>

      {/* Footer: driver | rating | CTA */}
      <div className="mt-4 flex min-w-0 items-center gap-2 border-t border-gray-100 pt-3.5 sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <img
            src={ride.driverAvatar}
            alt={ride.driverName}
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500">Posted by</p>
            <p className="truncate text-xs font-bold text-gray-900 sm:text-sm">{ride.driverName}</p>
          </div>
        </div>

        <div className="shrink-0 text-center">
          <div className="flex items-center justify-center gap-0.5">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold text-gray-900 sm:text-sm">
              {(Number.isFinite(rating) ? rating : 0).toFixed(1)}
            </span>
          </div>
          <p className="text-[11px] font-medium" style={{ color: BRAND_GREEN }}>
            Verified
          </p>
        </div>

        <button
          type="button"
          onClick={onViewDetails}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 sm:text-xs"
          style={{ backgroundColor: BRAND_GREEN }}
        >
          View Details
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}
