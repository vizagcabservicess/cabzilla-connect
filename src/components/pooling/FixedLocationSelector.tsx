
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { POOLING_LOCATIONS, PoolingLocation } from '@/lib/poolingData';
import { MapPin } from 'lucide-react';

interface FixedLocationSelectorProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (locationId: string) => void;
  excludeLocation?: string;
}

export function FixedLocationSelector({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  excludeLocation 
}: FixedLocationSelectorProps) {
  const availableLocations = POOLING_LOCATIONS.filter(
    location => location.id !== excludeLocation
  );

  const majorCities = availableLocations.filter(loc => loc.type === 'major');
  const minorCities = availableLocations.filter(loc => loc.type === 'minor');

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">
            Major Cities
          </div>
          {majorCities.map((location) => (
            <SelectItem key={location.id} value={location.id}>
              <div className="flex items-center space-x-2">
                <MapPin size={14} className="text-blue-600" />
                <span>{location.name}</span>
              </div>
            </SelectItem>
          ))}
          
          {minorCities.length > 0 && (
            <>
              <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase mt-2">
                Other Cities
              </div>
              {minorCities.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  <div className="flex items-center space-x-2">
                    <MapPin size={14} className="text-gray-600" />
                    <span>{location.name}</span>
                  </div>
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
