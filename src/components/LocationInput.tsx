
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';
import { Location } from '@/types/api';

interface LocationInputProps {
  location?: Location;
  value?: Location;
  onLocationChange?: (location: Location) => void;
  onChange?: (location: Location) => void;
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
  const locationData = location || value || { address: '' };
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

      const options: google.maps.places.AutocompleteOptions = {
        types: ['geocode'],
        fields: ['address_components', 'geometry', 'name', 'formatted_address'],
      };
      
      // Only apply country restriction for India if specified
      if (isAirportTransfer) {
        options.componentRestrictions = { country: 'in' };
      }

      autocomplete = new google.maps.places.Autocomplete(inputElement, options);

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();

        if (!place || !place.geometry) {
          console.log("Autocomplete's returned place contains no geometry");
          return;
        }

        const newLocation: Location = {
          address: place.formatted_address || address || '',
          lat: place.geometry.location?.lat() || 0,
          lng: place.geometry.location?.lng() || 0,
          name: place.name || place.formatted_address || '',
          // Retain other properties if they exist
          ...(locationData.id && { id: locationData.id }),
          ...(locationData.city && { city: locationData.city }),
          ...(locationData.state && { state: locationData.state }),
          ...(locationData.type && { type: locationData.type }),
          ...(locationData.popularityScore && { popularityScore: locationData.popularityScore }),
        };

        setAddress(place.formatted_address || address || '');
        if (handleLocationChange) {
          handleLocationChange(newLocation);
        }
      });
    };

    if (google && google.maps && google.maps.places) {
      try {
        initAutocomplete();
      } catch (error) {
        console.error("Error initializing autocomplete:", error);
      }
    }

    return () => {
      // Cleanup when the component unmounts or google changes
      if (autocomplete) {
        google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [google, handleLocationChange, address, disabled, readOnly, locationData, isAirportTransfer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value || '';
    setAddress(newAddress);
    if (handleLocationChange) {
      // Create a new location object with the updated address while preserving other properties
      const updatedLocation: Location = {
        ...locationData,
        address: newAddress
      };
      handleLocationChange(updatedLocation);
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
        value={address || ''}
        onChange={handleChange}
        disabled={disabled || readOnly}
      />
    </div>
  );
}
