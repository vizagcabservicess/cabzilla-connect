
import React, { useState, useEffect } from 'react';
import { LocationInput } from '@/components/LocationInput';
import { DateTimePicker } from '@/components/DateTimePicker';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, MapPin, Calendar } from 'lucide-react';
import { Location } from '@/types/location';

interface OutstationSearchWidgetProps {
  initialPickup?: string;
  initialDrop?: string;
  onSearch?: (searchData: {
    pickupLocation: Location | null;
    dropLocation: Location | null;
    pickupDate: Date;
    tripType: string;
    tripMode: string;
  }) => void;
}

export function OutstationSearchWidget({ 
  initialPickup, 
  initialDrop, 
  onSearch 
}: OutstationSearchWidgetProps) {
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropLocation, setDropLocation] = useState<Location | null>(null);
  const [pickupDate, setPickupDate] = useState<Date>(new Date());

  useEffect(() => {
    if (initialPickup) {
      setPickupLocation({
        name: initialPickup,
        address: initialPickup,
        lat: 17.6868,
        lng: 83.2185,
        isInVizag: true
      });
    }
    
    if (initialDrop) {
      setDropLocation({
        name: initialDrop,
        address: initialDrop,
        lat: 17.9784,
        lng: 82.9344,
        isInVizag: false
      });
    }

    // Auto-trigger search if both locations are prefilled
    if (initialPickup && initialDrop && onSearch) {
      const searchData = {
        pickupLocation: {
          name: initialPickup,
          address: initialPickup,
          lat: 17.6868,
          lng: 83.2185,
          isInVizag: true
        },
        dropLocation: {
          name: initialDrop,
          address: initialDrop,
          lat: 17.9784,
          lng: 82.9344,
          isInVizag: false
        },
        pickupDate: new Date(),
        tripType: 'outstation',
        tripMode: 'one-way'
      };
      
      setTimeout(() => {
        onSearch(searchData);
      }, 100);
    }
  }, [initialPickup, initialDrop, onSearch]);

  const handleSearch = () => {
    if (onSearch && pickupLocation && dropLocation) {
      onSearch({
        pickupLocation,
        dropLocation,
        pickupDate,
        tripType: 'outstation',
        tripMode: 'one-way'
      });
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              From
            </label>
            <LocationInput
              placeholder="Pickup location"
              value={pickupLocation}
              onChange={setPickupLocation}
              tripType="outstation"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              To
            </label>
            <LocationInput
              placeholder="Drop location"
              value={dropLocation}
              onChange={setDropLocation}
              tripType="outstation"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Pickup Date & Time
            </label>
            <DateTimePicker
              value={pickupDate}
              onChange={setPickupDate}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Button
            onClick={handleSearch}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
            disabled={!pickupLocation || !dropLocation}
          >
            <Search className="mr-2 h-5 w-5" />
            Search Cabs
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
