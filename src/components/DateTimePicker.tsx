import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { useToast } from '@/components/ui/use-toast';

export interface DateTimePickerProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  minDate?: Date;
  className?: string;
  label?: string;
  disabled?: boolean;
  /** app = uppercase blue label + white bordered row (mobile web parity with app) */
  variant?: 'mobile' | 'desktop' | 'app';
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
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [isFocused, setIsFocused] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Only set to current date/time if no date is provided AND this is the initial render
    if (!date && !selectedTime) {
      const now = new Date();
      setSelectedTime(format(now, "HH:mm"));
      onDateChange(now);
    }
  }, []); // Remove onDateChange dependency to prevent re-triggering

  useEffect(() => {
    // Update selectedTime when date changes (but don't trigger onDateChange)
    if (date) {
      setSelectedTime(format(date, "HH:mm"));
    }
  }, [date]);

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTime(e.target.value);
  };

  const handleApply = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedTime) return;

    const [hours, minutes] = selectedTime.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      toast({
        title: "Invalid time format",
        description: "Please use HH:mm (24-hour format).",
        variant: "destructive"
      });
      return;
    }

    const newDate = date ? new Date(date) : new Date();
    newDate.setHours(hours);
    newDate.setMinutes(minutes);

    // Prevent selecting a past date/time and require 1 hour advance booking for today
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000); // Add 1 hour
    
    // Check if selected date is today
    const isToday = newDate.toDateString() === now.toDateString();
    
    if (minDate) {
      if (newDate < minDate) {
        toast({
          title: "Invalid selection",
          description: "You cannot select a past date or time.",
          variant: "destructive"
        });
        return;
      }
    } else {
      if (newDate < now) {
        toast({
          title: "Invalid selection",
          description: "You cannot select a past date or time.",
          variant: "destructive"
        });
        return;
      }
      
      // For today's bookings, require at least 1 hour advance notice
      if (isToday && newDate < oneHourFromNow) {
        toast({
          title: "Advance booking required",
          description: "Please book at least 1 hour in advance for same-day trips.",
          variant: "destructive"
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
        const [hours, minutes] = selectedTime.split(":").map(Number);
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
      ? format(date, "MMM d, h:mm a")
      : isAppVariant
        ? format(date, "d MMM yyyy 'at' h:mm a")
        : format(date, "PPP, hh:mm a")
    : "";

  return (
    <div className={cn("relative w-full", className)}>
      {/* Desktop / app: static label above */}
      {(isDesktopVariant || isAppVariant) && label && (
        <label
          className={cn(
            "block pointer-events-none font-medium",
            isAppVariant
              ? "mb-1 text-[11px] font-bold uppercase tracking-wide text-blue-600"
              : "mb-1.5 text-xs text-gray-600"
          )}
        >
          {label}
        </label>
      )}
      {/* Mobile: floating label when focused/has value */}
      {!isDesktopVariant && !isAppVariant && label && (isFocused || date) && (
        <label
          className="absolute left-4 -top-2.5 z-10 bg-white px-1 text-xs font-semibold text-gray-900 pointer-events-none transition-all duration-200"
          style={{ background: "white", paddingLeft: "0.25rem", paddingRight: "0.25rem", zIndex: 10 }}
        >
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={buttonRef}
            variant={"outline"}
            className={cn(
              "relative w-full justify-start text-left",
              isDesktopVariant
                ? "h-[2.75rem] min-w-[11rem] rounded-md border border-gray-200 bg-white pl-3 text-sm hover:bg-gray-50"
                : isAppVariant
                  ? "h-auto min-h-[3rem] rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 shadow-sm hover:bg-white"
                  : "h-[3.5rem] border-gray-200 bg-white text-[1rem] font-normal hover:bg-gray-50"
            )}
            disabled={disabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          >
            <div className="flex min-w-0 w-full items-center gap-2">
              <CalendarIcon className={cn("flex-shrink-0 text-gray-500", isAppVariant ? "h-5 w-5" : "h-4 w-4")} />
              <span
                className={cn(
                  "min-w-0 font-bold",
                  isDesktopVariant && "text-[0.9375rem] text-gray-800",
                  isAppVariant && "text-[1rem] font-semibold text-gray-900",
                  !isDesktopVariant && !isAppVariant && "w-full truncate text-gray-800"
                )}
                style={{ fontSize: isDesktopVariant ? "0.9375rem" : isAppVariant ? "1rem" : "1rem" }}
              >
                {date
                  ? dateSummary
                  : isFocused
                    ? ""
                    : isDesktopVariant
                      ? label === "Return"
                        ? "Return"
                        : "Select"
                      : isAppVariant
                        ? "Select date & time"
                        : label}
              </span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0" 
          align="start"
        >
          <Calendar
            mode="single"
            selected={date}
            onSelect={disabled ? undefined : handleCalendarSelect}
            disabled={minDate ? { before: minDate } : undefined}
            initialFocus
            className="rounded-t-none border-t pointer-events-auto"
          />
          <div className="p-3 border-t flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <Input
              type="time"
              value={selectedTime || ""}
              onChange={disabled ? undefined : handleTimeChange}
              className="max-w-[120px]"
              disabled={disabled}
            />
            <Button 
              onClick={disabled ? undefined : handleApply}
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
              disabled={disabled}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}