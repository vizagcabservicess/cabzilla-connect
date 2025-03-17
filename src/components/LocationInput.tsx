
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';
import { Location } from '@/types/api';

interface LocationInputProps {
  location: Location;
  onLocationChange: (location: Location) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  label?: string; // Add label prop
  isPickupLocation?: boolean; // Add optional props used in other components
  isAirportTransfer?: boolean;
  readOnly?: boolean;
}

export function LocationInput({
  location,
  onLocationChange,
  placeholder = "Enter location",
  className = "",
  disabled = false,
  label,
  isPickupLocation,
  isAirportTransfer,
  readOnly
}: LocationInputProps) {
  const [address, setAddress] = useState(location?.address || "");
  const { google } = useGoogleMaps();

  useEffect(() => {
    if (location?.address) {
      setAddress(location.address);
    }
  }, [location]);

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
        onLocationChange(newLocation);
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
  }, [google, onLocationChange, address, disabled, readOnly]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setAddress(newAddress);
    onLocationChange({ ...location, address: newAddress });
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
