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
}

export function LocationInput({
  location,
  onLocationChange,
  placeholder = "Enter location",
  className = "",
  disabled = false
}: LocationInputProps) {
  const [address, setAddress] = useState(location.address);
  const { googleMapsSDK } = useGoogleMaps();

  useEffect(() => {
    setAddress(location.address);
  }, [location]);

  useEffect(() => {
    if (!googleMapsSDK || disabled) return;

    let autocomplete: google.maps.places.Autocomplete;

    const initAutocomplete = () => {
      const inputElement = document.getElementById('location-input') as HTMLInputElement;
      if (!inputElement) return;

      autocomplete = new googleMapsSDK.places.Autocomplete(inputElement, {
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

    if (googleMapsSDK) {
      initAutocomplete();
    }

    return () => {
      // Cleanup when the component unmounts or googleMapsSDK changes
      if (autocomplete) {
        googleMapsSDK.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [googleMapsSDK, onLocationChange, address, disabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value);
    onLocationChange({ ...location, address: e.target.value });
  };

  return (
    <Input
      type="text"
      id="location-input"
      placeholder={placeholder}
      className={className}
      value={address}
      onChange={handleChange}
      disabled={disabled}
    />
  );
}
