import { Check, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type TourAddToWidgetButtonProps = {
  tourName: string;
  onAdd?: () => void;
  onRemove?: () => void;
  className?: string;
  inCart?: boolean;
  /** On the selected-tours list, show an X. On browse, keep the check and click to unselect. */
  removeWithX?: boolean;
};

export function TourAddToWidgetButton({
  tourName,
  onAdd,
  onRemove,
  className,
  inCart = false,
  removeWithX = false,
}: TourAddToWidgetButtonProps) {
  const canRemove = inCart && Boolean(onRemove);
  const showRemoveX = canRemove && removeWithX;
  return (
    <button
      type="button"
      aria-label={
        showRemoveX
          ? `Remove ${tourName} from selected tours`
          : canRemove
            ? `Unselect ${tourName}`
            : inCart
              ? `${tourName} is in your tours`
              : `Add ${tourName} to booking`
      }
      title={showRemoveX ? 'Remove tour' : canRemove || inCart ? 'Click to unselect' : 'Add tour'}
      className={cn(
        'absolute z-20 flex h-9 w-9 items-center justify-center rounded-full',
        'border shadow-md transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        showRemoveX
          ? 'border-red-500 bg-white text-red-600 hover:bg-red-50'
          : inCart
            ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
            : 'border-slate-200 bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700',
        className
      )}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (canRemove && onRemove) {
          onRemove();
          return;
        }
        onAdd?.();
      }}
    >
      {showRemoveX ? (
        <X className="h-5 w-5" strokeWidth={2.5} aria-hidden />
      ) : inCart ? (
        <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
      ) : (
        <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
      )}
    </button>
  );
}
