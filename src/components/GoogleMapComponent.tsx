
import React from 'react';
import { Location } from '@/types/api';

export interface GoogleMapComponentProps {
  pickupLocation: Location;
  dropLocation: Location;
  tripType: string;
  onDistanceCalculated: (mapDistance: number, mapDuration: number) => void;
}

export function GoogleMapComponent({ 
  pickupLocation, 
  dropLocation, 
  tripType,
  onDistanceCalculated 
}: GoogleMapComponentProps) {
  // Mock implementation - in a real app, this would use Google Maps API
  React.useEffect(() => {
    // Simulate distance calculation
    const mockDistance = Math.floor(Math.random() * 50) + 10;
    const mockDuration = Math.floor(mockDistance * 2.5);
    
    setTimeout(() => {
      onDistanceCalculated(mockDistance, mockDuration);
    }, 1000);
  }, [pickupLocation, dropLocation, onDistanceCalculated]);

  return (
    <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Map Component</p>
        <p className="text-sm text-gray-500">
          From: {pickupLocation.name}
        </p>
        <p className="text-sm text-gray-500">
          To: {dropLocation.name}
        </p>
      </div>
    </div>
  );
}
