
import React, { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useIsMobile } from '@/hooks/useIsMobile';
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";

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
    date ? format(date, "HH:mm") : null
  );

  // Update time string when date prop changes
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

  const CalendarPickerContent = (
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
    </>
  );

  // Format the displayed date with proper time
  const formattedDate = date 
    ? format(date, "PPP, hh:mm a") 
    : "Pick a date";

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
      
      {isMobile ? (
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
          <DrawerContent className="p-0">
            <div className="p-4 bg-background">
              <h4 className="font-medium mb-4 text-center">Select Date & Time</h4>
              {CalendarPickerContent}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
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
              {formattedDate}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center" side="bottom">
            {CalendarPickerContent}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
