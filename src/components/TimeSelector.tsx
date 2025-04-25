
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimeSelectorProps {
  value: string;
  onChange: (time: string) => void;
  className?: string;
  disabled?: boolean;
  minTime?: string;
  maxTime?: string;
  step?: number;
}

export function TimeSelector({
  value,
  onChange,
  className,
  disabled = false,
  minTime = "00:00",
  maxTime = "23:30",
  step = 30
}: TimeSelectorProps) {
  const [timeOptions, setTimeOptions] = useState<string[]>([]);

  // Generate time options when component mounts
  useEffect(() => {
    const options: string[] = [];
    const [minHour, minMinute] = minTime.split(':').map(Number);
    const [maxHour, maxMinute] = maxTime.split(':').map(Number);
    
    const minTotalMinutes = minHour * 60 + minMinute;
    const maxTotalMinutes = maxHour * 60 + maxMinute;
    
    for (let minutes = minTotalMinutes; minutes <= maxTotalMinutes; minutes += step) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      const formattedHour = hour.toString().padStart(2, '0');
      const formattedMinute = minute.toString().padStart(2, '0');
      options.push(`${formattedHour}:${formattedMinute}`);
    }

    setTimeOptions(options);
  }, [minTime, maxTime, step]);

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder="Select time" />
      </SelectTrigger>
      <SelectContent>
        {timeOptions.map((time) => (
          <SelectItem key={time} value={time}>
            {time}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
