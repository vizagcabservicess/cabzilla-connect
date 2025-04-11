
import React, { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  
  // For better time selection on mobile
  const [selectedHour, setSelectedHour] = useState<string>(
    date && date instanceof Date ? date.getHours().toString().padStart(2, '0') : '12'
  );
  const [selectedMinute, setSelectedMinute] = useState<string>(
    date && date instanceof Date ? date.getMinutes().toString().padStart(2, '0') : '00'
  );
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  
  // Ensure date is a valid Date object
  useEffect(() => {
    if (date && !(date instanceof Date)) {
      console.error("Invalid date passed to DateTimePicker:", date);
      onDateChange(undefined);
    }
  }, [date, onDateChange]);

  // Update hour/minute when date changes
  useEffect(() => {
    if (date && date instanceof Date) {
      setSelectedHour(date.getHours().toString().padStart(2, '0'));
      setSelectedMinute(date.getMinutes().toString().padStart(2, '0'));
      setSelectedTime(format(date, "HH:mm"));
    }
  }, [date]);

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTime(e.target.value);
  };

  const handleApply = () => {
    // For direct input time
    if (selectedTime) {
      const [hours, minutes] = selectedTime.split(":").map(Number);
      if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        if (date && date instanceof Date) {
          const newDate = new Date(date);
          newDate.setHours(hours);
          newDate.setMinutes(minutes);
          onDateChange(newDate);
        }
      }
    }
    // For dropdown-based selection
    else if (selectedHour && selectedMinute) {
      const hours = parseInt(selectedHour, 10);
      const minutes = parseInt(selectedMinute, 10);
      
      if (date && date instanceof Date) {
        const newDate = new Date(date);
        newDate.setHours(hours);
        newDate.setMinutes(minutes);
        onDateChange(newDate);
      }
    }
    
    setIsTimePickerOpen(false);
  };

  // Generate hour and minute options
  const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minuteOptions = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  // Format AM/PM time for display
  const formatTimeDisplay = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
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
            {date && date instanceof Date ? (
              <>
                {format(date, "PP")} {formatTimeDisplay(date)}
              </>
            ) : (
              <span>Pick a date</span>
            )}
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
          
          {/* Improved time picker UI */}
          <div className="p-4 border-t border-gray-200">
            {isMobile ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Select Time</span>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setIsTimePickerOpen(!isTimePickerOpen)}
                    className="flex items-center"
                  >
                    <Clock size={16} className="mr-1" />
                    {date && date instanceof Date ? formatTimeDisplay(date) : `${selectedHour}:${selectedMinute}`}
                  </Button>
                </div>
                
                {isTimePickerOpen && (
                  <div className="mt-2 space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Hour</label>
                        <Select value={selectedHour} onValueChange={setSelectedHour}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Hour" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] bg-white">
                            {hourOptions.map((hour) => (
                              <SelectItem key={hour} value={hour}>
                                {hour}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Minute</label>
                        <Select value={selectedMinute} onValueChange={setSelectedMinute}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Minute" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] bg-white">
                            {minuteOptions.map((minute) => (
                              <SelectItem key={minute} value={minute}>
                                {minute}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button size="sm" onClick={handleApply} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      Apply Time
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Input
                  type="time"
                  value={selectedTime || ""}
                  onChange={handleTimeChange}
                  className="max-w-[110px]"
                />
                <Button size="sm" onClick={handleApply} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Apply
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
