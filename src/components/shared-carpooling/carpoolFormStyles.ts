import { cn } from '@/lib/utils';

/** Wrapper for native date/time inputs — clips iOS overflow and anchors picker icon. */
export const CARPOOL_DATETIME_WRAPPER_CLASS = 'relative min-w-0 w-full max-w-full overflow-hidden';

/**
 * iOS-safe styling for `<input type="date">` and `<input type="time">`.
 * Hides duplicate picker chrome overlap and gives room for value + indicator.
 */
export function carpoolNativeDatetimeClass(bgClass = 'bg-gray-50'): string {
  return cn(
    'box-border w-full min-w-0 max-w-full rounded-xl border border-gray-200 py-3 pl-10 pr-10 text-sm leading-normal',
    'focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20',
    '[appearance:none]',
    '[&::-webkit-date-and-time-value]:min-w-0 [&::-webkit-date-and-time-value]:text-left',
    '[&::-webkit-datetime-edit]:min-w-0 [&::-webkit-datetime-edit]:overflow-hidden',
    '[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3',
    '[&::-webkit-calendar-picker-indicator]:top-1/2 [&::-webkit-calendar-picker-indicator]:-translate-y-1/2',
    '[&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer',
    '[&::-webkit-calendar-picker-indicator]:opacity-70',
    bgClass,
  );
}
