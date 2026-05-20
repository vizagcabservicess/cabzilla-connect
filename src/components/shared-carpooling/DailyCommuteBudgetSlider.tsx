import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { CARPOOL_MAX_SEATS, ONE_WAY_LABEL, PER_SEAT_PRICE_SUFFIX } from './constants';

/** Fallback floor before a route fare is calculated. */
export const COMMUTE_BUDGET_SLIDER_FLOOR = 100;
export const COMMUTE_BUDGET_SLIDER_STEP = 50;

/** Minimum thumb position for the route (nearest ₹50 step, not always rounded up). */
export function commuteBudgetSliderMin(perSeatFare: number): number {
  const snapped = Math.round(perSeatFare / COMMUTE_BUDGET_SLIDER_STEP) * COMMUTE_BUDGET_SLIDER_STEP;
  return Math.max(COMMUTE_BUDGET_SLIDER_FLOOR, snapped);
}

/** Default budget thumb for a calculated route fare. */
export function commuteBudgetDefaultPerSeat(perSeatFare: number, min: number, max: number): number {
  const rounded = Math.round(perSeatFare / 10) * 10;
  return clampCommuteBudgetPerSeat(rounded, min, max);
}

export function commuteBudgetSliderMax(perSeatFare: number, min: number): number {
  const base = Math.max(min + COMMUTE_BUDGET_SLIDER_STEP, Math.max(500, perSeatFare * 2));
  return min + Math.ceil((base - min) / COMMUTE_BUDGET_SLIDER_STEP) * COMMUTE_BUDGET_SLIDER_STEP;
}

export function clampCommuteBudgetPerSeat(value: number, min: number, max: number): number {
  const v = Math.min(max, Math.max(min, value));
  return min + Math.round((v - min) / COMMUTE_BUDGET_SLIDER_STEP) * COMMUTE_BUDGET_SLIDER_STEP;
}

type DailyCommuteBudgetSliderProps = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  loading?: boolean;
};

export function DailyCommuteBudgetSlider({
  value,
  min,
  max,
  onChange,
  disabled = false,
  loading = false,
}: DailyCommuteBudgetSliderProps) {
  const sliderMin = Math.min(min, max);
  const sliderMax = Math.max(min, max);
  const safeValue = clampCommuteBudgetPerSeat(value, sliderMin, sliderMax);

  return (
    <div className={cn('min-w-0 w-full max-w-full', disabled && 'opacity-60')}>
      {loading && (
        <p className="mb-2 text-xs text-gray-500">Calculating fare for your route…</p>
      )}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <span className="shrink-0 text-[10px] font-medium text-gray-500 sm:text-xs">
          ₹{sliderMin.toLocaleString('en-IN')}
        </span>
        <div className="min-w-0 flex-1">
          <Slider
            className={cn(
              'w-full touch-pan-x',
              '[&_span.bg-primary]:!bg-[#008744]',
              '[&_span.border-primary]:!border-[#008744]',
            )}
            value={[safeValue]}
            min={sliderMin}
            max={sliderMax}
            step={COMMUTE_BUDGET_SLIDER_STEP}
            disabled={disabled || loading}
            onValueChange={(v) => onChange(clampCommuteBudgetPerSeat(v[0] ?? safeValue, sliderMin, sliderMax))}
            aria-valuemin={sliderMin}
            aria-valuemax={sliderMax}
            aria-valuenow={safeValue}
          />
        </div>
        <span className="shrink-0 text-[10px] font-medium text-gray-500 sm:text-xs">₹{sliderMax.toLocaleString('en-IN')}</span>
      </div>
      <p className="mt-2 text-center text-sm font-semibold tabular-nums text-gray-900">
        ₹{safeValue.toLocaleString('en-IN')} {PER_SEAT_PRICE_SUFFIX}
      </p>
      <p className="text-center text-xs text-gray-500">{ONE_WAY_LABEL}</p>
      <p className="mt-1 px-1 text-center text-xs text-gray-500">
        Based on Swift Dzire airport fare for your route, split across {CARPOOL_MAX_SEATS} seats
      </p>
    </div>
  );
}
