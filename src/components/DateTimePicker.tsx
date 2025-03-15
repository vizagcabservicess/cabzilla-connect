
import { useState } from "react";
import { Calendar } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";

interface DateTimePickerProps {
  label: string;
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  minDate?: Date;
}

export function DateTimePicker({
  label,
  date,
  onDateChange,
  minDate,
}: DateTimePickerProps) {
  const [selectedTime, setSelectedTime] = useState<string | null>(
    date ? format(date, "HH:mm") : null
  );

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

  return (
    <div className="space-y-2">
      <label
        htmlFor="date"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
      </label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-[280px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP, hh:mm a") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center" side="bottom">
          <CalendarComponent
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
        </PopoverContent>
      </Popover>
    </div>
  );
}
