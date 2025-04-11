
import React, { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";

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
  const [selectedTime, setSelectedTime] = useState<string | null>(
    date ? format(date, "HH:mm") : null
  );

  // Update selected time when date prop changes
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

    if (date) {
      const newDate = new Date(date);
      newDate.setHours(hours);
      newDate.setMinutes(minutes);
      onDateChange(newDate);
    }
  };

  const formattedDate = date 
    ? `${format(date, "E dd MMM yyyy")} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    : "Select date and time";

  const displayLabel = () => (
    label && (
      <label
        htmlFor="date"
        className="text-sm font-medium text-gray-500 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1 block"
      >
        {label}
      </label>
    )
  );

  const calendarContent = (
    <>
      <Calendar
        mode="single"
        selected={date}
        onSelect={onDateChange}
        disabled={minDate ? { before: minDate } : undefined}
        initialFocus
        className={cn("p-3 pointer-events-auto")}
      />
      <div className="p-4 flex items-center space-x-2">
        <div className="flex items-center space-x-2 flex-1">
          <Clock className="h-4 w-4 text-gray-500" />
          <Input
            type="time"
            value={selectedTime || ""}
            onChange={handleTimeChange}
            className="max-w-[120px]"
          />
        </div>
        <Button size="sm" onClick={handleApply}>
          Apply
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div className="space-y-2">
        {displayLabel()}
        <Drawer>
          <DrawerTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formattedDate}
            </Button>
          </DrawerTrigger>
          <DrawerContent className="p-4">
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-medium mb-4 text-center">Select Date & Time</h3>
              {calendarContent}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayLabel()}
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
          {calendarContent}
        </PopoverContent>
      </Popover>
    </div>
  );
}
