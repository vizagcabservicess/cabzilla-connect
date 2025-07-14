import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from '@/components/ui/use-toast';

export interface DateTimePickerProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  minDate?: Date;
  className?: string;
  label?: string;
  disabled?: boolean;
}

export function DateTimePicker({ 
  date, 
  onDateChange, 
  minDate, 
  className,
  label = 'Date of journey',
  disabled = false
}: DateTimePickerProps) {
  const isMobile = useIsMobile();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [isFocused, setIsFocused] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Always set to current date/time if no date is provided (even after refresh)
    if (!date) {
      const now = new Date();
      setSelectedTime(format(now, "HH:mm"));
      onDateChange(now);
    } else {
      setSelectedTime(format(date, "HH:mm"));
    }
  }, [date, onDateChange]);

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

    // Prevent selecting a past date/time
    const now = new Date();
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

  return (
    <div className="relative w-full">
      {/* Floating label implementation: only show when focused or has value */}
      {label && (isFocused || date) && (
        <label
          className="absolute left-4 -top-2.5 text-xs bg-white px-1 text-blue-600 z-10 pointer-events-none transition-all duration-200 font-semibold"
          style={{
            background: 'white',
            paddingLeft: '0.25rem',
            paddingRight: '0.25rem',
            zIndex: 10,
          }}
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
              "w-full justify-start text-left font-normal bg-white",
              "border-gray-200 hover:bg-gray-50",
              !date && "text-gray-400",
              disabled && "opacity-60 cursor-not-allowed pointer-events-none",
              "h-[3.5rem]",
              "text-[1.2rem]",
              "relative"
            )}
            disabled={disabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          >
            <div className="flex items-center gap-2 w-full">
              <CalendarIcon className="h-4 w-4 text-gray-400" />
              <span className="truncate w-full" style={{ fontSize: '1.2rem' }}>
                {date ? format(date, "PPP, hh:mm a") : (isFocused ? '' : label)}
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
