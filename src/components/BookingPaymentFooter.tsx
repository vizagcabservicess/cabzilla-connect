import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/cabData';
import { cn } from '@/lib/utils';

export interface BookingPaymentFooterProps {
  finalTotal: number;
  mode: 'partial' | 'full';
  onModeChange: (mode: 'partial' | 'full') => void;
  onBookNow: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  /** Mobile web reference: smaller disclaimer text in grey instead of teal banner */
  disclaimerVariant?: 'teal' | 'muted';
}

export function BookingPaymentFooter({
  finalTotal,
  mode,
  onModeChange,
  onBookNow,
  isLoading = false,
  disabled = false,
  className,
  disclaimerVariant = 'teal',
}: BookingPaymentFooterProps) {
  const partial = Math.round(finalTotal * 0.3);
  const payNow = mode === 'partial' ? partial : finalTotal;

  return (
    <div className={cn('w-full', className)}>
      {disclaimerVariant === 'teal' ? (
        <div className="mb-2 flex gap-2.5 rounded-xl border border-teal-100/90 bg-teal-50 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100">
            <CheckCircle2 className="h-4 w-4 text-teal-600" strokeWidth={2.25} aria-hidden />
          </div>
          <p className="text-left text-[11px] leading-snug text-teal-800 sm:text-xs">
            Pay <span className="font-semibold">{formatPrice(partial)}</span> in advance to reserve, rest to
            driver. Toll and parking as per actual.
          </p>
        </div>
      ) : (
        <p className="mb-2 px-0.5 text-center text-[11px] leading-snug text-gray-600 sm:text-xs">
          Pay <span className="font-medium text-gray-800">{formatPrice(partial)}</span> in advance to reserve,
          rest to driver. Toll and parking as per actual.
        </p>
      )}

      <div className="mb-2 flex gap-1 rounded-xl bg-slate-900 p-1 shadow-inner">
        <button
          type="button"
          aria-pressed={mode === 'partial'}
          onClick={() => onModeChange('partial')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 px-1.5 text-xs font-semibold transition-all sm:text-sm',
            mode === 'partial'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-transparent text-white/95 hover:bg-white/10',
          )}
        >
          <span
            className={cn(
              'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors',
              mode === 'partial' ? 'border-white bg-white' : 'border-white/75 bg-transparent',
            )}
            aria-hidden
          >
            {mode === 'partial' ? <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> : null}
          </span>
          <span className="min-w-0 text-center leading-tight">Part Pay {formatPrice(partial)}</span>
        </button>
        <button
          type="button"
          aria-pressed={mode === 'full'}
          onClick={() => onModeChange('full')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 px-1.5 text-xs font-semibold transition-all sm:text-sm',
            mode === 'full'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-transparent text-white/95 hover:bg-white/10',
          )}
        >
          <span
            className={cn(
              'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors',
              mode === 'full' ? 'border-white bg-white' : 'border-white/75 bg-transparent',
            )}
            aria-hidden
          >
            {mode === 'full' ? <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> : null}
          </span>
          <span className="min-w-0 text-center leading-tight">Full Pay {formatPrice(finalTotal)}</span>
        </button>
      </div>

      <Button
        type="button"
        onClick={onBookNow}
        className="h-12 w-full rounded-xl bg-blue-600 text-sm font-extrabold uppercase tracking-wide text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 sm:text-base"
        disabled={disabled || isLoading}
      >
        {isLoading ? (
          <span className="flex items-center justify-center normal-case font-semibold">
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Processing…
          </span>
        ) : (
          <>
            Book Now - {formatPrice(payNow)}
          </>
        )}
      </Button>
    </div>
  );
}
