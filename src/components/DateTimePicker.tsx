import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, Clock, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export type DateTimePickerHandle = {
  focus: () => void;
  open: () => void;
};

export interface DateTimePickerProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  minDate?: Date;
  className?: string;
  label?: string;
  disabled?: boolean;
  /** app = uppercase blue label + white bordered row (mobile web parity with app); infield = caption + bold value inside trigger row (Urbania-style) */
  variant?: 'mobile' | 'desktop' | 'app' | 'infield';
  /** Fired after the user confirms date/time via Apply. */
  onDateApplied?: () => void;
}

export const DateTimePicker = forwardRef<DateTimePickerHandle, DateTimePickerProps>(function DateTimePicker({
  date,
  onDateChange,
  minDate,
  className,
  label = 'Date of journey',
  disabled = false,
  variant = 'mobile',
  onDateApplied,
}, ref) {
  const isDesktopVariant = variant === 'desktop';
  const isAppVariant = variant === 'app';
  const isInfieldVariant = variant === 'infield';
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [isFocused, setIsFocused] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false,
  );
  const scrollLockY = useRef(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const onDateAppliedRef = useRef(onDateApplied);

  useEffect(() => {
    onDateAppliedRef.current = onDateApplied;
  }, [onDateApplied]);

  const useMobileSheet = isInfieldVariant && !isDesktopViewport;

  useEffect(() => {
    function handleResize() {
      setIsDesktopViewport(window.innerWidth >= 1024);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!useMobileSheet || !open) return;

    scrollLockY.current = window.scrollY;
    const { style } = document.body;
    const prevOverflow = style.overflow;
    const prevPosition = style.position;
    const prevTop = style.top;
    const prevWidth = style.width;

    style.overflow = 'hidden';
    style.position = 'fixed';
    style.top = `-${scrollLockY.current}px`;
    style.width = '100%';

    return () => {
      style.overflow = prevOverflow;
      style.position = prevPosition;
      style.top = prevTop;
      style.width = prevWidth;
      window.scrollTo(0, scrollLockY.current);
    };
  }, [useMobileSheet, open]);

  useEffect(() => {
    if (!date && !selectedTime) {
      const now = new Date();
      setSelectedTime(format(now, 'HH:mm'));
      onDateChange(now);
    }
  }, []);

  useEffect(() => {
    if (date) {
      setSelectedTime(format(date, 'HH:mm'));
    }
  }, [date]);

  const openPicker = () => {
    if (disabled) return;
    setOpen(true);
  };

  useImperativeHandle(ref, () => ({
    focus: () => {
      if (disabled) return;
      triggerRef.current?.focus();
      triggerRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },
    open: () => {
      if (disabled) return;
      openPicker();
      triggerRef.current?.focus();
      triggerRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },
  }), [disabled]);

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTime(e.target.value);
  };

  const handleApply = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedTime) return;

    const [hours, minutes] = selectedTime.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      toast({
        title: 'Invalid time format',
        description: 'Please use HH:mm (24-hour format).',
        variant: 'destructive',
      });
      return;
    }

    const newDate = date ? new Date(date) : new Date();
    newDate.setHours(hours);
    newDate.setMinutes(minutes);

    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const isToday = newDate.toDateString() === now.toDateString();

    if (minDate) {
      if (newDate < minDate) {
        toast({
          title: 'Invalid selection',
          description: 'You cannot select a past date or time.',
          variant: 'destructive',
        });
        return;
      }
    } else {
      if (newDate < now) {
        toast({
          title: 'Invalid selection',
          description: 'You cannot select a past date or time.',
          variant: 'destructive',
        });
        return;
      }

      if (isToday && newDate < oneHourFromNow) {
        toast({
          title: 'Advance booking required',
          description: 'Please book at least 1 hour in advance for same-day trips.',
          variant: 'destructive',
        });
        return;
      }
    }

    onDateChange(newDate);
    setOpen(false);
    window.setTimeout(() => onDateAppliedRef.current?.(), 50);
  };

  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      if (date && selectedTime) {
        const [hours, minutes] = selectedTime.split(':').map(Number);
        selectedDate.setHours(hours);
        selectedDate.setMinutes(minutes);
      }
      onDateChange(selectedDate);
    } else {
      onDateChange(undefined);
    }
  };

  const dateSummary = date
    ? isDesktopVariant
      ? format(date, 'MMM d, h:mm a')
      : isAppVariant
        ? format(date, "d MMM yyyy 'at' h:mm a")
        : format(date, 'PPP, hh:mm a')
    : '';

  const isJourneyToday = !!date && isSameDay(date, new Date());

  const sheetTimeLabel = (() => {
    if (!selectedTime) return '';
    const [hours, minutes] = selectedTime.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return selectedTime;
    const base = date ? new Date(date) : new Date();
    base.setHours(hours, minutes, 0, 0);
    return format(base, 'h:mm a');
  })();

  const mobileCalendarClassNames = {
    months: 'flex w-full flex-col',
    month: 'w-full space-y-3',
    caption: 'relative mb-1 flex items-center justify-center px-1 pt-0',
    caption_label: 'text-[15px] font-bold tracking-tight text-slate-900',
    nav: 'flex items-center gap-1',
    nav_button: cn(
      'inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700',
      'opacity-100',
    ),
    nav_button_previous: 'absolute left-1',
    nav_button_next: 'absolute right-1',
    table: 'w-full border-collapse',
    head_row: 'mb-1 flex w-full',
    head_cell:
      'flex h-8 w-full flex-1 items-center justify-center text-[11px] font-semibold uppercase tracking-wide text-slate-400',
    row: 'mt-0.5 flex w-full',
    cell: 'relative flex h-10 w-full flex-1 items-center justify-center p-0 text-center text-sm focus-within:relative focus-within:z-20',
    day: cn(
      'inline-flex h-10 w-10 items-center justify-center rounded-xl p-0 text-[14px] font-medium text-slate-800 transition-colors',
      'hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30',
    ),
    day_selected:
      'bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white shadow-[0_6px_14px_-6px_rgba(37,99,235,0.65)]',
    day_today: 'bg-blue-50 font-bold text-blue-700',
    day_outside: 'text-slate-300 opacity-70 aria-selected:bg-blue-600/80 aria-selected:text-white aria-selected:opacity-100',
    day_disabled: 'text-slate-300 opacity-40 hover:bg-transparent hover:text-slate-300',
    day_hidden: 'invisible',
  } as const;

  const triggerContent = (
    <div className={cn('flex min-w-0 w-full', isInfieldVariant ? 'items-start gap-2' : 'items-center gap-2')}>
      <CalendarIcon
        className={cn(
          'pointer-events-none flex-shrink-0 text-gray-500',
          isAppVariant && !isInfieldVariant ? 'h-5 w-5' : isInfieldVariant ? 'mt-px h-4 w-4' : 'h-4 w-4',
        )}
      />
      {isInfieldVariant ? (
        <div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-0 text-left leading-none">
          {label ? (
            <span className="text-[11px] font-medium leading-none text-gray-500">{label}</span>
          ) : null}
          <div className="mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0">
            <span className="min-w-0 select-none text-[15px] font-bold leading-tight text-gray-900">
              {date
                ? `${format(date, 'd MMM, yyyy')} at ${format(date, 'h:mm a')}`
                : isFocused
                  ? ''
                  : 'Select date & time'}
            </span>
            {date && isJourneyToday ? (
              <span className="shrink-0 text-[11px] font-medium leading-none text-gray-500">(Today)</span>
            ) : null}
          </div>
        </div>
      ) : (
        <span
          className={cn(
            'pointer-events-none min-w-0 font-bold',
            isDesktopVariant && 'text-[0.9375rem] text-gray-800',
            isAppVariant && 'text-[1rem] font-semibold text-gray-900',
            !isDesktopVariant && !isAppVariant && 'w-full truncate text-gray-800',
          )}
          style={{ fontSize: isDesktopVariant ? '0.9375rem' : isAppVariant ? '1rem' : '1rem' }}
        >
          {date
            ? dateSummary
            : isFocused
              ? ''
              : isDesktopVariant
                ? label === 'Return'
                  ? 'Return'
                  : 'Select'
                : isAppVariant
                  ? 'Select date & time'
                  : label}
        </span>
      )}
    </div>
  );

  const desktopPickerPanel = (
    <>
      <Calendar
        mode="single"
        selected={date}
        onSelect={disabled ? undefined : handleCalendarSelect}
        disabled={minDate ? { before: minDate } : undefined}
        initialFocus
        className="pointer-events-auto mx-auto w-full max-w-sm"
      />
      <div className="flex items-center gap-2 border-t p-3">
        <Clock className="h-4 w-4 shrink-0 text-gray-400" />
        <Input
          type="time"
          value={selectedTime || ''}
          onChange={disabled ? undefined : handleTimeChange}
          className="max-w-[8rem] text-base"
          style={{ fontSize: 16 }}
          disabled={disabled}
        />
        <Button
          type="button"
          onClick={disabled ? undefined : handleApply}
          className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
          disabled={disabled}
        >
          Apply
        </Button>
      </div>
    </>
  );

  const mobileSheet =
    useMobileSheet && open && typeof document !== 'undefined'
      ? createPortal(
          <div className="fixed inset-0 z-[10070] flex flex-col justify-end" role="dialog" aria-modal="true">
            <button
              type="button"
              className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
              aria-label="Close date picker"
              onClick={() => setOpen(false)}
            />
            <div className="relative flex max-h-[90vh] flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-[0_-18px_50px_-20px_rgba(15,23,42,0.35)]">
              <div className="flex shrink-0 justify-center pt-2.5 pb-1" aria-hidden>
                <div className="h-1 w-10 rounded-full bg-slate-200" />
              </div>

              <div className="relative shrink-0 overflow-hidden bg-[linear-gradient(165deg,#e8f3ff_0%,#f4f8ff_48%,#ffffff_100%)] px-4 pb-3 pt-1">
                <div
                  className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-blue-500/10 blur-2xl"
                  aria-hidden
                />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-blue-600/80">
                      Schedule
                    </p>
                    <h3 className="mt-0.5 text-lg font-bold tracking-tight text-slate-900">
                      {label || 'Select date & time'}
                    </h3>
                    {date ? (
                      <p className="mt-1 text-[13px] font-medium text-slate-600">
                        {format(date, 'EEE, d MMM yyyy')}
                        {sheetTimeLabel ? ` · ${sheetTimeLabel}` : ''}
                        {isJourneyToday ? ' · Today' : ''}
                      </p>
                    ) : (
                      <p className="mt-1 text-[13px] text-slate-500">Pick a date and departure time</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm ring-1 ring-slate-200/80 transition-colors hover:bg-white hover:text-slate-800"
                    aria-label="Close"
                    onClick={() => setOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-2 pt-1 sm:px-4">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={disabled ? undefined : handleCalendarSelect}
                  disabled={minDate ? { before: minDate } : undefined}
                  initialFocus
                  className="pointer-events-auto mx-auto w-full max-w-none p-1"
                  classNames={mobileCalendarClassNames}
                />
              </div>

              <div className="shrink-0 border-t border-slate-100 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                <div className="flex items-center gap-2.5">
                  <label
                    htmlFor="trip-start-time"
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 shadow-sm focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                  >
                    <Clock className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                    <Input
                      id="trip-start-time"
                      type="time"
                      value={selectedTime || ''}
                      onChange={disabled ? undefined : handleTimeChange}
                      className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] font-semibold tabular-nums text-slate-900 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      style={{ fontSize: 16 }}
                      disabled={disabled}
                    />
                  </label>
                  <Button
                    type="button"
                    onClick={disabled ? undefined : handleApply}
                    className="h-12 min-w-[7.5rem] rounded-2xl bg-blue-600 px-5 text-[15px] font-bold text-white shadow-[0_10px_22px_-10px_rgba(37,99,235,0.7)] hover:bg-blue-700"
                    disabled={disabled}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={cn('relative w-full', className)}>
      {(isDesktopVariant || (isAppVariant && !isInfieldVariant)) && label && (
        <label
          className={cn(
            'pointer-events-none block font-medium',
            isAppVariant
              ? 'mb-1 text-[11px] font-bold uppercase tracking-wide text-blue-600'
              : 'mb-1.5 text-xs text-gray-600',
          )}
        >
          {label}
        </label>
      )}
      {!isDesktopVariant && !isAppVariant && !isInfieldVariant && label && (isFocused || date) && (
        <label
          className="pointer-events-none absolute -top-2.5 left-4 z-10 bg-white px-1 text-xs font-semibold text-gray-900 transition-all duration-200"
          style={{ background: 'white', paddingLeft: '0.25rem', paddingRight: '0.25rem', zIndex: 10 }}
        >
          {label}
        </label>
      )}

      {useMobileSheet ? (
        <>
          <button
            ref={triggerRef}
            type="button"
            className={cn(
              'relative flex w-full cursor-pointer items-center justify-start border-0 bg-transparent p-0 text-left touch-manipulation [-webkit-tap-highlight-color:transparent]',
              'min-h-[2.75rem] py-1 active:bg-gray-50/80',
              disabled && 'cursor-not-allowed opacity-60',
            )}
            disabled={disabled}
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={openPicker}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          >
            {triggerContent}
          </button>
          {mobileSheet}
        </>
      ) : (
        <Popover open={open} onOpenChange={setOpen} modal>
          <PopoverTrigger asChild>
            <Button
              ref={triggerRef}
              type="button"
              variant={isInfieldVariant ? 'ghost' : 'outline'}
              className={cn(
                'relative w-full justify-start text-left',
                isDesktopVariant
                  ? 'h-[2.75rem] min-w-[11rem] rounded-md border border-gray-200 bg-white pl-3 text-sm hover:bg-gray-50'
                  : isAppVariant && !isInfieldVariant
                    ? 'h-auto min-h-[3rem] rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 shadow-sm hover:bg-white'
                    : isInfieldVariant
                      ? 'h-auto min-h-[2.75rem] rounded-none border border-transparent bg-transparent px-0 py-1 shadow-none hover:bg-transparent'
                      : 'h-[3.5rem] border-gray-200 bg-white text-[1rem] font-normal hover:bg-gray-50',
              )}
              disabled={disabled}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            >
              {triggerContent}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="z-[10060] w-auto p-0" align="start">
            {desktopPickerPanel}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
});
