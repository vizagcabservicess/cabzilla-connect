
import React from 'react';
import { LocationInput } from '@/components/LocationInput';
import { Location as ApiLocation } from '@/types/api';
import { Location as LibLocation } from '@/lib/locationData';

interface AdminBookingLocationHandlerProps {
  label: string;
  placeholder: string;
  value: LibLocation | null;
  onChange: (location: LibLocation | null) => void;
  isPickupLocation?: boolean;
  isAirportTransfer?: boolean;
  required?: boolean;
}

export function AdminBookingLocationHandler({
  label,
  placeholder,
  value,
  onChange,
  isPickupLocation = false,
  isAirportTransfer = false,
  required = false
}: AdminBookingLocationHandlerProps) {
  // Convert LibLocation to ApiLocation for the LocationInput
  const convertToApiLocation = (location: LibLocation | null): ApiLocation | undefined => {
    if (!location) return undefined;
    
    return {
      id: location.id,
      name: location.name,
      address: location.address,
      lat: location.lat,
      lng: location.lng,
      city: location.city,
      state: location.state,
      type: location.type,
      isInVizag: location.isInVizag,
      popularityScore: location.popularityScore
    };
  };

  // Convert ApiLocation back to LibLocation
  const handleLocationChange = (apiLocation: ApiLocation) => {
    const libLocation: LibLocation = {
      id: apiLocation.id,
      name: apiLocation.name,
      address: apiLocation.address,
      lat: apiLocation.lat,
      lng: apiLocation.lng,
      city: apiLocation.city || 'Visakhapatnam',
      state: apiLocation.state || 'Andhra Pradesh',
      type: (apiLocation.type as LibLocation['type']) || 'other',
      popularityScore: apiLocation.popularityScore || 50,
      isInVizag: apiLocation.isInVizag
    };
    
    onChange(libLocation);
  };

  return (
    <LocationInput
      label={label}
      placeholder={placeholder}
      value={convertToApiLocation(value)}
      onLocationChange={handleLocationChange}
      isPickupLocation={isPickupLocation}
      isAirportTransfer={isAirportTransfer}
      required={required}
    />
  );
}
