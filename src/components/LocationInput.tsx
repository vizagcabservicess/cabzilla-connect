
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';
import { Location } from '@/types/api';

interface LocationInputProps {
  location?: Location;  // Keep original prop
  value?: Location;     // Add value as alias for location
  onLocationChange?: (location: Location) => void;
  onChange?: (location: Location) => void; // Add alias for onLocationChange
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  label?: string;
  isPickupLocation?: boolean;
  isAirportTransfer?: boolean;
  readOnly?: boolean;
}

export function LocationInput({
  location,
  value,
  onLocationChange,
  onChange,
  placeholder = "Enter location",
  className = "",
  disabled = false,
  label,
  isPickupLocation,
  isAirportTransfer,
  readOnly
}: LocationInputProps) {
  // Use value prop if location is not provided
  const locationData = location || value;
  const handleLocationChange = onLocationChange || onChange;
  
  const [address, setAddress] = useState(locationData?.address || "");
  const { google } = useGoogleMaps();

  useEffect(() => {
    if (locationData?.address) {
      setAddress(locationData.address);
    }
  }, [locationData]);

  useEffect(() => {
    if (!google || !google.maps || !google.maps.places || disabled || readOnly) return;

    let autocomplete: google.maps.places.Autocomplete;

    const initAutocomplete = () => {
      const inputElement = document.getElementById('location-input') as HTMLInputElement;
      if (!inputElement) return;

      autocomplete = new google.maps.places.Autocomplete(inputElement, {
        types: ['geocode'],
        componentRestrictions: { country: 'in' },
        fields: ['address_components', 'geometry', 'name'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();

        if (!place.geometry) {
          console.log("Autocomplete's returned place contains no geometry");
          return;
        }

        const newLocation: Location = {
          address: place.formatted_address || address,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };

        setAddress(place.formatted_address || address);
        if (handleLocationChange) {
          handleLocationChange(newLocation);
        }
      });
    };

    if (google && google.maps && google.maps.places) {
      initAutocomplete();
    }

    return () => {
      // Cleanup when the component unmounts or google changes
      if (autocomplete) {
        google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [google, handleLocationChange, address, disabled, readOnly]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setAddress(newAddress);
    if (handleLocationChange) {
      handleLocationChange({ ...locationData, address: newAddress });
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <Input
        type="text"
        id="location-input"
        placeholder={placeholder}
        className={className}
        value={address}
        onChange={handleChange}
        disabled={disabled || readOnly}
      />
    </div>
  );
}
