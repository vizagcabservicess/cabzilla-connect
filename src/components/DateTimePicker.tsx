
import React, { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
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

  useEffect(() => {
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
      alert("Invalid time format. Please use HH:mm (24-hour format).");
      return;
    }

    const newDate = date ? new Date(date) : new Date();
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
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
    <div className="space-y-2">
      {label && (
        <label className="text-xs font-medium text-gray-600 mb-1">
          {label}
        </label>
      )}
      <Popover>
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
              <span className="text-sm">
                {date ? format(date, "PPP, hh:mm a") : "Select date and time"}
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
            onSelect={handleCalendarSelect}
            disabled={minDate ? { before: minDate } : undefined}
            initialFocus
            className="rounded-t-none border-t"
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
