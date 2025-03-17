
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
  
  const [address, setAddress] = useState<string>('');
  const { google } = useGoogleMaps();

  // Update the address when the location data changes
  useEffect(() => {
    if (locationData && typeof locationData.address === 'string') {
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

            // Ensure place exists and has the required geometry
            if (!place) {
              console.log("No place details returned from autocomplete");
              return;
            }

            if (!place.geometry || !place.geometry.location) {
              console.log("Autocomplete returned place with no geometry");
              return;
            }

            // Get a safe formatted address
            const formattedAddress = place.formatted_address || address || '';
            
            // Create location object with safe default values
            const newLocation: Location = {
              address: formattedAddress,
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              name: place.name || formattedAddress,
            };

            // Only add optional properties if they exist
            if (locationData && locationData.id) newLocation.id = locationData.id;
            if (locationData && locationData.city) newLocation.city = locationData.city;
            if (locationData && locationData.state) newLocation.state = locationData.state;
            if (locationData && locationData.type) newLocation.type = locationData.type;
            if (locationData && locationData.popularityScore) newLocation.popularityScore = locationData.popularityScore;
            if (locationData && locationData.isPickupLocation !== undefined) newLocation.isPickupLocation = locationData.isPickupLocation;
            if (locationData && locationData.isDropLocation !== undefined) newLocation.isDropLocation = locationData.isDropLocation;

            // Update the input value
            setAddress(formattedAddress);
            
            // Call the handler if it exists
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
    
    // Only update the location through the handler if we have enough characters
    // This prevents the toLowerCase error during typing empty strings
    if (handleLocationChange && newAddress.trim() !== '') {
      // Create a new location object with the updated address while preserving other properties
      const updatedLocation: Location = {
        address: newAddress
      };
      
      // Only add optional properties if they exist in locationData
      if (locationData) {
        if (locationData.id) updatedLocation.id = locationData.id;
        if (locationData.name) updatedLocation.name = locationData.name;
        if (locationData.city) updatedLocation.city = locationData.city;
        if (locationData.state) updatedLocation.state = locationData.state;
        if (locationData.lat) updatedLocation.lat = locationData.lat;
        if (locationData.lng) updatedLocation.lng = locationData.lng;
        if (locationData.type) updatedLocation.type = locationData.type;
        if (locationData.popularityScore) updatedLocation.popularityScore = locationData.popularityScore;
        if (locationData.isPickupLocation !== undefined) updatedLocation.isPickupLocation = locationData.isPickupLocation;
        if (locationData.isDropLocation !== undefined) updatedLocation.isDropLocation = locationData.isDropLocation;
      }
      
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
        value={address}
        onChange={handleChange}
        disabled={disabled || readOnly}
        autoComplete="off" // Prevent browser's default autocomplete
      />
    </div>
  );
}
