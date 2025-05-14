
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LocalTimePickerProps {
  selected: string;
  onSelect: (time: string) => void;
  className?: string;
}

export function LocalTimePicker({ selected, onSelect, className }: LocalTimePickerProps) {
  // Generate time slots (every 30 minutes)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const h = hour.toString().padStart(2, '0');
        const m = minute.toString().padStart(2, '0');
        slots.push(`${h}:${m}`);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  return (
    <div className={className}>
      <Select value={selected} onValueChange={onSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Select time" />
        </SelectTrigger>
        <SelectContent>
          {timeSlots.map((time) => (
            <SelectItem key={time} value={time}>
              {time}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
