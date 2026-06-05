import { cn } from '@/lib/utils';

/** Wrapper for native date/time inputs — clips iOS overflow and anchors picker icon. */
export const CARPOOL_DATETIME_WRAPPER_CLASS = 'relative min-w-0 w-full max-w-full overflow-hidden';

/** 16px on mobile — prevents iOS Safari auto-zoom when an input is focused. */
export const CARPOOL_FIELD_INPUT_CLASS =
  'text-base sm:text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20';

/** Urbania-style ticket row padding (mobile carpool hero). */
export const CARPOOL_TICKET_CELL = 'px-2.5 py-2.5';

/** In-field caption above values inside a ticket row. */
export const CARPOOL_TICKET_INFIELD_LABEL = 'text-[11px] font-medium leading-none text-gray-500';

/** Borderless in-field text input inside a ticket row (mobile). */
export const CARPOOL_TICKET_INFIELD_INPUT =
  'w-full border-0 bg-transparent p-0 text-base font-bold text-gray-900 placeholder:font-normal placeholder:text-gray-500 focus:outline-none focus:ring-0';

/**
 * iOS-safe styling for `<input type="date">` and `<input type="time">`.
 * Hides duplicate picker chrome overlap and gives room for value + indicator.
 */
export function carpoolNativeDatetimeClass(bgClass = 'bg-gray-50'): string {
  return cn(
    'box-border w-full min-w-0 max-w-full rounded-xl border border-gray-200 py-3 pl-10 pr-10 text-base leading-normal sm:text-sm',
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
