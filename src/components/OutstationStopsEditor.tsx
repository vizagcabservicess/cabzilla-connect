import { ChevronRight, Plus, X } from 'lucide-react';
import { LocationInput } from '@/components/LocationInput';
import { MAX_OUTSTATION_STOPS } from '@/lib/outstationStops';
import type { Location } from '@/lib/locationData';
import { cn } from '@/lib/utils';

type StopLayout = 'ticket' | 'stacked' | 'desktop';

interface OutstationStopRowsProps {
  stops: Array<Location | null>;
  onChange: (index: number, location: Location | null) => void;
  onRemove: (index: number) => void;
  layout: StopLayout;
  fieldVariant?: 'mobile' | 'desktop' | 'app' | 'infield';
  cellClassName?: string;
  editTrigger?: number;
}

interface OutstationAddStopLinkProps {
  stopCount: number;
  onAdd: () => void;
  className?: string;
  align?: 'left' | 'right';
  more?: boolean;
  /** `card` = dashed row between From/To. `link` = compact + Add more. */
  variant?: 'card' | 'link';
}

export function OutstationAddStopLink({
  stopCount,
  onAdd,
  className,
  align = 'left',
  more = false,
  variant = 'link',
}: OutstationAddStopLinkProps) {
  if (stopCount >= MAX_OUTSTATION_STOPS) return null;

  if (variant === 'card' && !more) {
    return (
      <div className={cn('px-2 py-2', className)}>
        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-gray-300 bg-white px-3 py-2.5 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/50"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate">
            <span className="text-[14px] font-semibold text-blue-600">Add stop</span>
            <span className="ml-1.5 text-[11px] text-gray-400">
              Add multiple stops in between
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className={cn(align === 'right' ? 'flex justify-end' : 'flex justify-start', className)}>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1 text-[13px] font-semibold text-blue-600 transition-colors hover:text-blue-700"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        {more ? 'Add more stops' : 'Add stop'}
      </button>
    </div>
  );
}

export function OutstationStopRows({
  stops,
  onChange,
  onRemove,
  layout,
  fieldVariant = 'infield',
  cellClassName,
  editTrigger = 0,
}: OutstationStopRowsProps) {
  if (stops.length === 0) return null;

  return (
    <>
      {stops.map((stop, index) => {
        const label = `Stop ${index + 1}`;
        const row = (
          <div className="relative min-w-0">
            <LocationInput
              key={`outstation-stop-${index}-${editTrigger}-${stop?.id || 'empty'}`}
              variant={fieldVariant}
              className={cn(cellClassName, layout === 'desktop' ? 'pr-8' : 'pr-7')}
              label={label}
              placeholder={`Enter stop ${index + 1}`}
              value={stop ? { ...stop } : undefined}
              onLocationChange={(location) => onChange(index, location)}
              isPickupLocation={false}
              tripType="outstation"
              hideLeadingIcon={layout === 'ticket'}
              hideClearButton
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className={cn(
                'absolute z-10 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700',
                layout === 'desktop' ? 'right-1 top-8' : 'right-1 top-1/2 -translate-y-1/2'
              )}
              aria-label={`Remove ${label}`}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        );

        if (layout === 'desktop') {
          return (
            <div key={`stop-wrap-${index}`} className="min-w-0 flex-1">
              {row}
            </div>
          );
        }

        return <div key={`stop-wrap-${index}`}>{row}</div>;
      })}
    </>
  );
}
