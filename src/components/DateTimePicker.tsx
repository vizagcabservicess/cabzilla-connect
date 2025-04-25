
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TimeSelector } from './TimeSelector';
import { useIsMobile } from '@/hooks/use-mobile';

interface DateTimePickerProps {
  date?: Date;
  onDateChange?: (date: Date) => void;
  label?: string;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

export function DateTimePicker({ 
  date,
  onDateChange,
  label,
  minDate,
  maxDate,
  className
}: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(date);
  const [selectedTime, setSelectedTime] = useState<string>(date ? format(date, 'HH:mm') : '10:00');
  const isMobile = useIsMobile();

  // Update selected date whenever the date prop changes
  useEffect(() => {
    setSelectedDate(date);
    if (date) {
      setSelectedTime(format(date, 'HH:mm'));
    }
  }, [date]);

  // Combine date and time when date or time changes
  useEffect(() => {
    if (selectedDate && onDateChange) {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      
      const combinedDate = new Date(selectedDate);
      combinedDate.setHours(hours, minutes, 0, 0);
      
      onDateChange(combinedDate);
    }
  }, [selectedDate, selectedTime, onDateChange]);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-auto p-0" 
            align={isMobile ? "center" : "start"}
            side={isMobile ? "bottom" : "bottom"}
          >
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => {
                if (minDate && date < minDate) {
                  return true;
                }
                if (maxDate && date > maxDate) {
                  return true;
                }
                return false;
              }}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        
        <TimeSelector 
          value={selectedTime}
          onChange={setSelectedTime} 
          className="w-full sm:w-40"
        />
      </div>
    </div>
  );
}
