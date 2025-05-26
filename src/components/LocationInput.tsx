
import React from 'react';
import { Input } from '@/components/ui/input';
import { Location as ApiLocation } from '@/types/api';

export interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  type: string;
}

interface LocationInputProps {
  label?: string;
  placeholder?: string;
  value?: Location | ApiLocation;
  onLocationChange: (location: Location | null) => void;
  isPickupLocation?: boolean;
  isAirportTransfer?: boolean;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  label,
  placeholder,
  value,
  onLocationChange,
  isPickupLocation = false,
  isAirportTransfer = false
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue) {
      const location: Location = {
        id: Date.now().toString(),
        name: inputValue,
        address: inputValue,
        latitude: 0,
        longitude: 0,
        city: inputValue,
        type: 'city'
      };
      onLocationChange(location);
    } else {
      onLocationChange(null);
    }
  };

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}
      <Input
        type="text"
        placeholder={placeholder}
        value={value?.name || ''}
        onChange={handleInputChange}
      />
    </div>
  );
};
