
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

            // Safe guard against null or undefined place
            if (!place) {
              console.log("No place details returned from autocomplete");
              return;
            }

            // Safely check for geometry and location
            if (!place.geometry || !place.geometry.location) {
              console.log("Autocomplete returned place with no geometry");
              return;
            }

            // Safely get formatted address
            const formattedAddress = place.formatted_address || address || '';
            
            // Create location object with safe default values
            const newLocation: Location = {
              address: formattedAddress,
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              name: place.name || formattedAddress,
            };

            // Safely add optional properties by using proper null checks
            if (locationData) {
              if (locationData.id) newLocation.id = locationData.id;
              if (locationData.city) newLocation.city = locationData.city;
              if (locationData.state) newLocation.state = locationData.state;
              if (locationData.type) newLocation.type = locationData.type;
              if (typeof locationData.popularityScore === 'number') {
                newLocation.popularityScore = locationData.popularityScore;
              }
              if (typeof locationData.isPickupLocation === 'boolean') {
                newLocation.isPickupLocation = locationData.isPickupLocation;
              }
              if (typeof locationData.isDropLocation === 'boolean') {
                newLocation.isDropLocation = locationData.isDropLocation;
              }
            }

            // Update internal state first
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
    
    // Always update internal state for controlled input behavior
    setAddress(newAddress);
    
    // Only call the location change handler if the address is not empty
    if (handleLocationChange) {
      // Create a new location object with just the address for typing
      const updatedLocation: Location = { 
        address: newAddress 
      };
      
      // Preserve other fields from the existing location if available
      if (locationData) {
        if (locationData.id) updatedLocation.id = locationData.id;
        if (locationData.name) updatedLocation.name = locationData.name;
        if (locationData.city) updatedLocation.city = locationData.city;
        if (locationData.state) updatedLocation.state = locationData.state;
        if (typeof locationData.lat === 'number') updatedLocation.lat = locationData.lat;
        if (typeof locationData.lng === 'number') updatedLocation.lng = locationData.lng;
        if (locationData.type) updatedLocation.type = locationData.type;
        if (typeof locationData.popularityScore === 'number') {
          updatedLocation.popularityScore = locationData.popularityScore;
        }
        if (typeof locationData.isPickupLocation === 'boolean') {
          updatedLocation.isPickupLocation = locationData.isPickupLocation;
        }
        if (typeof locationData.isDropLocation === 'boolean') {
          updatedLocation.isDropLocation = locationData.isDropLocation;
        }
      }
      
      // Call the handler with the updated location
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
        value={address || ''} // Ensure value is never undefined or null
        onChange={handleChange}
        disabled={disabled || readOnly}
        autoComplete="off" // Prevent browser's default autocomplete
      />
    </div>
  );
}
