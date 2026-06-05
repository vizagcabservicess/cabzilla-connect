import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, Clock, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export interface DateTimePickerProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  minDate?: Date;
  className?: string;
  label?: string;
  disabled?: boolean;
  /** app = uppercase blue label + white bordered row (mobile web parity with app); infield = caption + bold value inside trigger row (Urbania-style) */
  variant?: 'mobile' | 'desktop' | 'app' | 'infield';
}

export function DateTimePicker({
  date,
  onDateChange,
  minDate,
  className,
  label = 'Date of journey',
  disabled = false,
  variant = 'mobile',
}: DateTimePickerProps) {
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

  const openPicker = () => {
    if (disabled) return;
    setOpen(true);
  };

  const dateSummary = date
    ? isDesktopVariant
      ? format(date, 'MMM d, h:mm a')
      : isAppVariant
        ? format(date, "d MMM yyyy 'at' h:mm a")
        : format(date, 'PPP, hh:mm a')
    : '';

  const isJourneyToday = !!date && isSameDay(date, new Date());

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

  const pickerPanel = (
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
              className="absolute inset-0 bg-black/50"
              aria-label="Close date picker"
              onClick={() => setOpen(false)}
            />
            <div className="relative max-h-[88vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
                <h3 className="text-base font-semibold text-gray-900">{label || 'Select date & time'}</h3>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {pickerPanel}
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
            {pickerPanel}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
