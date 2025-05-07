
import React, { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format, isValid } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export interface DateTimePickerProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  minDate?: Date;
  className?: string;
  label?: string;
}

export function DateTimePicker({ 
  date, 
  onDateChange, 
  minDate, 
  className,
  label
}: DateTimePickerProps) {
  const isMobile = useIsMobile();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Safe date formatting function to prevent invalid date errors
  const safeDateFormat = (date: Date | undefined, formatString: string): string => {
    if (!date || !isValid(date)) return '';
    try {
      return format(date, formatString);
    } catch (error) {
      console.error("Error formatting date:", error);
      return '';
    }
  };

  useEffect(() => {
    try {
      const now = new Date();
      if (!date) {
        setSelectedTime(safeDateFormat(now, "HH:mm"));
        onDateChange(now);
      } else if (isValid(date)) {
        setSelectedTime(safeDateFormat(date, "HH:mm"));
      } else {
        // If date is invalid, reset to current date/time
        console.warn("Invalid date provided to DateTimePicker, using current time instead");
        setSelectedTime(safeDateFormat(now, "HH:mm"));
        onDateChange(now);
      }
    } catch (error) {
      console.error("Error in DateTimePicker initialization:", error);
      // Fallback to current time
      const now = new Date();
      setSelectedTime(safeDateFormat(now, "HH:mm"));
      onDateChange(now);
    }
  }, []);

  useEffect(() => {
    if (date && isValid(date)) {
      setSelectedTime(safeDateFormat(date, "HH:mm"));
    }
  }, [date]);

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTime(e.target.value);
  };

  const handleApply = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedTime) return;

    try {
      const [hours, minutes] = selectedTime.split(":").map(Number);
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        alert("Invalid time format. Please use HH:mm (24-hour format).");
        return;
      }

      const newDate = date && isValid(date) ? new Date(date) : new Date();
      newDate.setHours(hours);
      newDate.setMinutes(minutes);
      
      if (isValid(newDate)) {
        onDateChange(newDate);
        setOpen(false);
      } else {
        throw new Error("Invalid date created");
      }
    } catch (error) {
      console.error("Error applying time:", error);
      alert("Could not set the time. Please try again.");
    }
  };

  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    if (selectedDate && isValid(selectedDate)) {
      try {
        if (date && selectedTime && isValid(date)) {
          const [hours, minutes] = selectedTime.split(":").map(Number);
          if (!isNaN(hours) && !isNaN(minutes)) {
            selectedDate.setHours(hours);
            selectedDate.setMinutes(minutes);
          }
        }
        onDateChange(selectedDate);
      } catch (error) {
        console.error("Error selecting calendar date:", error);
      }
    } else {
      onDateChange(undefined);
    }
  };

  const displayDate = date && isValid(date) 
    ? safeDateFormat(date, "PPP, hh:mm a") 
    : "Select date and time";

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-xs font-medium text-gray-600 mb-1">
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal h-[50px] bg-white",
              "border-gray-200 hover:bg-gray-50",
              !date && "text-gray-400",
              "md:h-[42px]"
            )}
          >
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-gray-400" />
              <span className="text-sm">{displayDate}</span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0" 
          align="start"
        >
          <Calendar
            mode="single"
            selected={date && isValid(date) ? date : undefined}
            onSelect={handleCalendarSelect}
            disabled={minDate ? { before: minDate } : undefined}
            initialFocus
            className="rounded-t-none border-t pointer-events-auto"
          />
          <div className="p-3 border-t flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <Input
              type="time"
              value={selectedTime || ""}
              onChange={handleTimeChange}
              className="max-w-[120px]"
            />
            <Button 
              onClick={handleApply}
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
