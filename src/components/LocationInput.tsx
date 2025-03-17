
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
    // Early return if conditions aren't met
    if (!google || !google.maps || !google.maps.places || disabled || readOnly) return;
    
    // Reference to the autocomplete instance
    let autocomplete: google.maps.places.Autocomplete | null = null;
    
    // Function to create and set up the autocomplete
    const initAutocomplete = () => {
      try {
        const inputElement = document.getElementById('location-input') as HTMLInputElement;
        if (!inputElement) {
          console.error("Location input element not found");
          return;
        }

        const options: google.maps.places.AutocompleteOptions = {
          types: ['geocode'],
          fields: ['address_components', 'geometry', 'name', 'formatted_address'],
        };
        
        // Only apply country restriction for India if specified
        if (isAirportTransfer === true) {
          options.componentRestrictions = { country: 'in' };
        }

        // Create the autocomplete instance
        autocomplete = new google.maps.places.Autocomplete(inputElement, options);

        // Add place_changed listener
        autocomplete.addListener('place_changed', () => {
          if (!autocomplete) return;
          
          try {
            const place = autocomplete.getPlace();

            // Safely check that place and geometry exist
            if (!place || !place.geometry || !place.geometry.location) {
              console.log("Autocomplete's returned place contains no geometry");
              return;
            }

            // Create location object with safe default values
            const newLocation: Location = {
              address: place.formatted_address || address || '',
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              name: place.name || place.formatted_address || '',
              // Retain other properties if they exist
              ...(locationData && locationData.id && { id: locationData.id }),
              ...(locationData && locationData.city && { city: locationData.city }),
              ...(locationData && locationData.state && { state: locationData.state }),
              ...(locationData && locationData.type && { type: locationData.type }),
              ...(locationData && locationData.popularityScore && { popularityScore: locationData.popularityScore }),
              ...(locationData && locationData.isPickupLocation && { isPickupLocation: locationData.isPickupLocation }),
              ...(locationData && locationData.isDropLocation && { isDropLocation: locationData.isDropLocation }),
            };

            setAddress(place.formatted_address || address || '');
            if (handleLocationChange) {
              handleLocationChange(newLocation);
            }
          } catch (error) {
            console.error("Error handling place_changed event:", error);
          }
        });
      } catch (error) {
        console.error("Error initializing autocomplete:", error);
      }
    };

    // Initialize autocomplete if Google Maps API is loaded
    if (google && google.maps && google.maps.places) {
      initAutocomplete();
    }

    // Cleanup function to remove listeners when the component unmounts
    return () => {
      if (autocomplete) {
        // Safely clear instance listeners
        try {
          google.maps.event.clearInstanceListeners(autocomplete);
        } catch (error) {
          console.error("Error clearing instance listeners:", error);
        }
      }
    };
  }, [google, handleLocationChange, address, disabled, readOnly, locationData, isAirportTransfer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setAddress(newAddress);
    
    if (handleLocationChange) {
      // Create a new location object with the updated address while preserving other properties
      const updatedLocation: Location = {
        ...locationData,
        address: newAddress
      };
      
      // Only update the location through the handler if we have enough length
      // This prevents the toLowerCase error during typing
      if (newAddress.length > 0) {
        handleLocationChange(updatedLocation);
      }
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
        autoComplete="off" // Prevent browser's default autocomplete
      />
    </div>
  );
}
