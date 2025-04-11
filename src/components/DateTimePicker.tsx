
import React, { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export interface DateTimePickerProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  minDate?: Date;
  className?: string;
  label?: string; // Make label optional
}

export function DateTimePicker({ 
  date, 
  onDateChange, 
  minDate, 
  className,
  label
}: DateTimePickerProps) {
  const isMobile = useIsMobile();
  const [selectedTime, setSelectedTime] = useState<string | null>(
    date && date instanceof Date ? format(date, "HH:mm") : null
  );
  
  // Ensure date is a valid Date object
  useEffect(() => {
    if (date && !(date instanceof Date)) {
      console.error("Invalid date passed to DateTimePicker:", date);
      onDateChange(undefined);
    }
  }, [date, onDateChange]);

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTime(e.target.value);
  };

  const handleApply = () => {
    if (!selectedTime) return;

    const [hours, minutes] = selectedTime.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      alert("Invalid time format. Please use HH:mm (24-hour format).");
      return;
    }

    if (date && date instanceof Date) {
      const newDate = new Date(date);
      newDate.setHours(hours);
      newDate.setMinutes(minutes);
      onDateChange(newDate);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor="date"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </label>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal rounded-md",
              !date && "text-muted-foreground",
              isMobile && "text-sm py-2.5"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date && date instanceof Date ? format(date, "PPP, hh:mm a") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center" side={isMobile ? "bottom" : "bottom"} sideOffset={5}>
          <Calendar
            mode="single"
            selected={date instanceof Date ? date : undefined}
            onSelect={onDateChange}
            disabled={minDate ? { before: minDate } : undefined}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
          <div className="p-4 flex items-center space-x-2">
            <Input
              type="time"
              value={selectedTime || ""}
              onChange={handleTimeChange}
              className="max-w-[80px]"
            />
            <Button size="sm" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
