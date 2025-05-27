
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { POOLING_LOCATIONS } from '@/lib/poolingData';

interface FixedLocationSelectorProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  excludeLocation?: string;
}

export const FixedLocationSelector: React.FC<FixedLocationSelectorProps> = ({
  label,
  placeholder,
  value,
  onChange,
  excludeLocation
}) => {
  const availableLocations = POOLING_LOCATIONS.filter(
    location => location.id !== excludeLocation
  );

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {availableLocations.map((location) => (
            <SelectItem key={location.id} value={location.id}>
              {location.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
