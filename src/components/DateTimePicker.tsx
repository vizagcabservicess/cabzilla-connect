
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

  // Initialize with current date and time if no date is provided
  useEffect(() => {
    const now = new Date();
    const currentTime = format(now, "HH:mm");
    
    if (!date) {
      setSelectedTime(currentTime);
      onDateChange(now);
    } else {
      setSelectedTime(format(date, "HH:mm"));
    }
  }, []);

  // Update selectedTime when date prop changes
  useEffect(() => {
    if (date) {
      setSelectedTime(format(date, "HH:mm"));
    }
  }, [date]);

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

    const newDate = date ? new Date(date) : new Date();
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    onDateChange(newDate);
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
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP, hh:mm a") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center" side="bottom">
          <Calendar
            mode="single"
            selected={date}
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
            <Button 
              onClick={handleApply}
              className="whitespace-nowrap"
              style={{touchAction: "manipulation"}}
            >
              Apply Time
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
