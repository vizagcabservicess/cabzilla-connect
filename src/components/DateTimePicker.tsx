
import { useState, forwardRef, useEffect } from "react";
import { format, addDays, setHours, setMinutes } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  label: string;
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  minDate?: Date;
  className?: string;
}

export function DateTimePicker({
  label,
  date,
  onDateChange,
  minDate,
  className,
}: DateTimePickerProps) {
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // When date changes externally, update the time selection
  useEffect(() => {
    if (date) {
      const timeString = format(date, 'HH:mm');
      setSelectedTime(timeString);
    } else {
      setSelectedTime(null);
    }
  }, [date]);

  // Process time selection
  const handleTimeSelection = (timeString: string) => {
    setSelectedTime(timeString);
    if (date) {
      const [hours, minutes] = timeString.split(':').map(Number);
      const newDate = setMinutes(setHours(date, hours), minutes);
      onDateChange(newDate);
    }
  };

  // Generate time slots (every 30 minutes)
  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  return (
    <div className={className}>
      <label className="input-label">{label}</label>
      <div className="flex space-x-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left shadow-input",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-cabGray-500" />
              {date ? format(date, "PPP") : <span>Select date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={onDateChange}
              initialFocus
              disabled={(date) => {
                if (minDate) {
                  return date < minDate;
                }
                return date < new Date();
              }}
              defaultMonth={date || new Date()}
              className={cn("p-3 pointer-events-auto")}
            />
            <div className="p-3 border-t border-cabGray-100">
              <div className="flex justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDateChange(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDateChange(addDays(new Date(), 1))}
                >
                  Tomorrow
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left shadow-input",
                !selectedTime && "text-muted-foreground"
              )}
              disabled={!date}
            >
              <Clock className="mr-2 h-4 w-4 text-cabGray-500" />
              {selectedTime ? selectedTime : <span>Select time</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-48 p-0 pointer-events-auto"
            align="start"
          >
            <div className="h-60 overflow-y-auto py-1 fade-mask">
              {timeSlots.map((time) => (
                <div
                  key={time}
                  className={cn(
                    "px-3 py-1.5 cursor-pointer text-sm transition-colors",
                    time === selectedTime
                      ? "bg-cabBlue-100 text-cabBlue-700 font-medium"
                      : "hover:bg-cabGray-50"
                  )}
                  onClick={() => handleTimeSelection(time)}
                >
                  {time}
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
