import { useState } from 'react';
import { ChevronRight, Plus, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { TourWidgetAddPayload } from '@/lib/addTourToBookingWidget';

export type TourWidgetPickable = {
  tourId: string;
  tourName: string;
};

type TourWidgetExtrasLayout = 'ticket' | 'desktop';

type TourWidgetExtrasProps = {
  extraItems: TourWidgetAddPayload[];
  remainingTours: TourWidgetPickable[];
  loading?: boolean;
  onAdd: (tour: TourWidgetPickable) => void;
  onRemove: (tourId: string) => void;
  onSelect: (item: TourWidgetAddPayload) => void;
  layout: TourWidgetExtrasLayout;
};

function layoutPadding(layout: TourWidgetExtrasLayout): string {
  switch (layout) {
    case 'ticket':
      return 'px-2 py-2';
    case 'desktop':
      return 'px-0';
    default: {
      const _exhaustive: never = layout;
      return _exhaustive;
    }
  }
}

export function TourWidgetExtras({
  extraItems,
  remainingTours,
  loading = false,
  onAdd,
  onRemove,
  onSelect,
  layout,
}: TourWidgetExtrasProps) {
  const [isPicking, setIsPicking] = useState(false);
  const canAdd = remainingTours.length > 0 && !loading;

  if (extraItems.length === 0 && !canAdd && !isPicking) return null;

  const showCardAdd = canAdd && !isPicking && extraItems.length === 0;
  const showMoreLink = canAdd && !isPicking && extraItems.length > 0;

  return (
    <div className={cn('flex w-full flex-col gap-2', layout === 'desktop' ? 'mt-2' : '')}>
      {extraItems.map((item, index) => (
        <div key={item.tourId} className={cn('relative min-w-0', layoutPadding(layout))}>
          <button
            type="button"
            className="flex w-full items-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-left"
            onClick={() => onSelect(item)}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-medium leading-none text-gray-500">
                Tour {index + 2}
              </span>
              <span className="mt-0.5 block truncate text-sm font-semibold text-slate-900">
                {item.tourName}
              </span>
            </span>
          </button>
          <button
            type="button"
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label={`Remove ${item.tourName} from tours`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRemove(item.tourId);
            }}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}

      {isPicking && canAdd ? (
        <div className={cn('relative min-w-0', layoutPadding(layout))}>
          <Select
            onValueChange={(tourId) => {
              const tour = remainingTours.find((item) => item.tourId === tourId);
              if (!tour) return;
              onAdd(tour);
              setIsPicking(false);
            }}
          >
            <SelectTrigger
              className={cn(
                'h-auto w-full rounded-xl border border-dashed border-blue-300 bg-blue-50/40 px-3 py-2.5 pr-10 text-left',
                'focus:outline-none focus:ring-0 focus-visible:ring-0'
              )}
            >
              <SelectValue placeholder="Select another tour" />
            </SelectTrigger>
            <SelectContent>
              {remainingTours.map((tour) => (
                <SelectItem key={tour.tourId} value={tour.tourId}>
                  {tour.tourName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Cancel adding tour"
            onClick={() => setIsPicking(false)}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}

      {showCardAdd ? (
        <div className={layoutPadding(layout)}>
          <button
            type="button"
            onClick={() => setIsPicking(true)}
            className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-gray-300 bg-white px-3 py-2.5 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/50"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden />
            </span>
            <span className="min-w-0 flex-1 truncate">
              <span className="text-[14px] font-semibold text-blue-600">Add tour</span>
              <span className="ml-1.5 text-[11px] text-gray-400">Add another package to this booking</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" aria-hidden />
          </button>
        </div>
      ) : null}

      {showMoreLink ? (
        <div className={cn(layout === 'desktop' ? 'flex justify-start' : 'px-2')}>
          <button
            type="button"
            onClick={() => setIsPicking(true)}
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-blue-600 transition-colors hover:text-blue-700"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add more tours
          </button>
        </div>
      ) : null}
    </div>
  );
}
