import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { TourItineraryDialog } from '@/components/tour/TourItineraryDialog';
import {
  addTourToBookingWidget,
  findOverlappingCartTour,
  unselectTourFromBookingWidget,
} from '@/lib/addTourToBookingWidget';
import { useTourCart } from '@/hooks/useTourCart';
import { startingTourPrice } from '@/lib/tourVehiclePrice';
import { getTourUrl } from '@/utils/tourUrlUtils';
import { cn } from '@/lib/utils';
import type { TourListItem } from '@/types/tour';

type TourCatalogCardProps = {
  tour: TourListItem;
};

function compactDuration(tour: TourListItem): string {
  if (tour.days >= 2) return `${tour.days} Days`;
  return '1 Day';
}

function durationLine(tour: TourListItem): string {
  if (tour.days >= 2) return `${tour.days} days`;
  return '1 day';
}

function tourBadge(tour: TourListItem): { label: string; className: string } {
  const name = tour.tourName.toLowerCase();
  if (name.includes('temple') || name.includes('srikurmam') || name.includes('arasavalli')) {
    return { label: 'Spiritual', className: 'bg-violet-600' };
  }
  if (name.includes('city')) return { label: 'City Tour', className: 'bg-sky-600' };
  if (tour.days >= 3) return { label: 'Trending', className: 'bg-orange-500' };
  if (tour.days === 2) return { label: 'Most Popular', className: 'bg-emerald-600' };
  return { label: 'Best Seller', className: 'bg-rose-500' };
}

function descriptionText(tour: TourListItem): string {
  const raw = String(tour.description || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (raw) return raw;
  return `Experience ${tour.tourName} with a private cab and a local sightseeing plan.`;
}

export function TourCatalogCard({ tour }: TourCatalogCardProps) {
  const { items, has: cartHas } = useTourCart();
  const [itineraryOpen, setItineraryOpen] = useState(false);
  const title = tour.tourName;
  const image = String(tour.imageUrl || '').trim();
  const inCart = cartHas(tour.tourId, title);
  const overlap = inCart ? null : findOverlappingCartTour(title, items, tour.tourId);
  const badge = tourBadge(tour);
  const price = startingTourPrice(tour.pricing) || tour.minPrice || 0;
  const tourUrl = getTourUrl({ tourId: tour.tourId, tourName: title });

  return (
    <Card className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.07)] transition-shadow hover:shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
      <Link to={tourUrl} className="relative block h-48 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100">
            <MapPin className="h-12 w-12 text-slate-400" />
          </div>
        )}
        <span
          className={cn(
            'absolute left-3 top-3 rounded-md px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm',
            badge.className
          )}
        >
          {badge.label}
        </span>
        <span className="absolute right-3 top-3 rounded-md bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow-sm">
          {compactDuration(tour)}
        </span>
      </Link>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
        <Link to={tourUrl}>
          <h3 className="line-clamp-2 text-base font-bold leading-snug tracking-[-0.015em] text-slate-900 hover:text-blue-700">
            {title}
          </h3>
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
          {tour.distance > 0 ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 text-blue-500" />
              {tour.distance} km
            </span>
          ) : null}
          <span>{durationLine(tour)}</span>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 font-semibold text-blue-600 hover:text-blue-800"
            onClick={() => setItineraryOpen(true)}
          >
            View Itinerary
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <p className="mt-2 line-clamp-2 text-[13px] font-normal leading-relaxed text-slate-500">
          {descriptionText(tour)}
        </p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div>
            <p className="text-[11px] font-medium text-slate-500">From</p>
            <p className="text-lg font-bold leading-none tracking-tight text-slate-900">
              {price > 0 ? `₹${price.toLocaleString('en-IN')}` : 'Quote'}
            </p>
          </div>
          <button
            type="button"
            title={
              overlap
                ? `${overlap.label} is already covered by ${overlap.item.tourName.trim()}`
                : undefined
            }
            className={cn(
              'inline-flex h-9 items-center justify-center gap-1 rounded-lg px-3 text-[12px] font-semibold shadow-sm transition-colors',
              inCart
                ? 'border border-rose-200 bg-white text-rose-600 hover:bg-rose-50'
                : overlap
                  ? 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
            )}
            onClick={() => {
              if (inCart) {
                unselectTourFromBookingWidget(tour);
                return;
              }
              addTourToBookingWidget(tour);
            }}
          >
            {inCart ? (
              <>
                <Minus className="h-3.5 w-3.5" strokeWidth={2.75} />
                Remove from Tour List
              </>
            ) : overlap ? (
              'Already in Tour List'
            ) : (
              <>
                Add to Tour List
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
      <TourItineraryDialog
        open={itineraryOpen}
        onOpenChange={setItineraryOpen}
        tourId={tour.tourId}
        tourName={title}
      />
    </Card>
  );
}
