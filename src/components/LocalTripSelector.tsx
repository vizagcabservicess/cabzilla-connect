
import React from 'react';
import { Button } from '@/components/ui/button';

interface LocalTripSelectorProps {
  selectedType: string;
  onTypeChange: (type: string) => void;
}

const tripTypes = [
  { value: 'hourly', label: '2 Hours' },
  { value: '4hours', label: '4 Hours' },
  { value: '8hours', label: '8 Hours' },
  { value: 'daily', label: 'Full Day' }
];

export const LocalTripSelector: React.FC<LocalTripSelectorProps> = ({
  selectedType,
  onTypeChange
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Local Trip Duration</label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {tripTypes.map((type) => (
          <Button
            key={type.value}
            type="button"
            variant={selectedType === type.value ? "default" : "outline"}
            onClick={() => onTypeChange(type.value)}
            className="w-full"
          >
            {type.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
