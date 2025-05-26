
import React from 'react';
import { Button } from '@/components/ui/button';

interface TripModeOption {
  value: string;
  label: string;
}

interface TripModeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options: TripModeOption[];
}

export const TripModeSelector: React.FC<TripModeSelectorProps> = ({
  value,
  onChange,
  options
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Trip Type</label>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={value === option.value ? "default" : "outline"}
            onClick={() => onChange(option.value)}
            className="w-full"
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
