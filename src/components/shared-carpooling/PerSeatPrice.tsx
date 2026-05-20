import { cn } from '@/lib/utils';
import { ONE_WAY_LABEL, PER_SEAT_PRICE_SUFFIX } from './constants';

type PerSeatPriceProps = {
  amount: number | string;
  className?: string;
  align?: 'left' | 'center' | 'right';
  amountClassName?: string;
  suffixClassName?: string;
  /** Tighter copy for narrow mobile cards */
  compact?: boolean;
};

export function PerSeatPrice({
  amount,
  className,
  align = 'right',
  amountClassName,
  suffixClassName,
  compact = false,
}: PerSeatPriceProps) {
  const alignClass =
    align === 'left' ? 'text-left' : align === 'center' ? 'text-center' : 'text-right';

  return (
    <div className={cn(alignClass, className)}>
      <p
        className={cn(
          'font-bold tabular-nums text-gray-900',
          compact ? 'text-[11px] leading-tight sm:text-sm' : 'text-sm',
          amountClassName,
        )}
      >
        ₹{amount}
        <span className={cn('font-semibold', compact && 'hidden sm:inline', suffixClassName)}>
          {' '}
          {PER_SEAT_PRICE_SUFFIX}
        </span>
        {compact && (
          <span className={cn('font-semibold sm:hidden', suffixClassName)}> /seat</span>
        )}
      </p>
      <p className={cn('text-gray-500', compact ? 'text-[10px] leading-tight sm:text-xs' : 'text-xs', suffixClassName)}>
        {ONE_WAY_LABEL}
      </p>
    </div>
  );
}
