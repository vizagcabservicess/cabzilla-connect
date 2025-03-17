
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';
import { Location } from '@/types/api';
import { useMemo } from 'react';
import { debounce } from '@/lib/utils';

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
  
  // Ensure address is always a string to prevent type errors
  const initialAddress = typeof locationData.address === 'string' ? locationData.address : '';
  const [address, setAddress] = useState<string>(initialAddress);
  const { google, isLoaded } = useGoogleMaps();
  
  // Reference to the autocomplete instance
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update the address when the location data changes
  useEffect(() => {
    if (locationData) {
      if (typeof locationData.address === 'string' && locationData.address.trim() !== '') {
        setAddress(locationData.address);
      } else if (typeof locationData.name === 'string' && locationData.name.trim() !== '') {
        setAddress(locationData.name);
      } else {
        setAddress('');
      }
    } else {
      setAddress('');
    }
  }, [locationData]);

  // Create a debouncedHandleChange function
  const debouncedHandleChange = useMemo(
    () =>
      debounce((newAddress: string) => {
        if (handleLocationChange) {
          // Create a new location object with just the address for typing
          const updatedLocation: Location = { address: newAddress };
          
          // Preserve other fields from the existing location if available
          if (locationData) {
            if (locationData.id) updatedLocation.id = locationData.id;
            if (locationData.name) updatedLocation.name = locationData.name;
            if (locationData.city) updatedLocation.city = locationData.city;
            if (locationData.state) updatedLocation.state = locationData.state;
            if (typeof locationData.lat === 'number' && !isNaN(locationData.lat)) updatedLocation.lat = locationData.lat;
            if (typeof locationData.lng === 'number' && !isNaN(locationData.lng)) updatedLocation.lng = locationData.lng;
            if (locationData.type) updatedLocation.type = locationData.type;
            if (typeof locationData.popularityScore === 'number' && !isNaN(locationData.popularityScore)) {
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
      }, 300),
    [handleLocationChange, locationData]
  );

  // Handle input change immediately for UI responsiveness
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value || '';
    
    // Always update internal state for controlled input behavior
    setAddress(newAddress);
    
    // Use the debounced function for the actual API calls
    debouncedHandleChange(newAddress);
  }, [debouncedHandleChange]);

  // Setup and teardown of Google Maps autocomplete
  useEffect(() => {
    // Early return if conditions aren't met
    if (!google || !google.maps || !google.maps.places || disabled || readOnly || !isLoaded) {
      return;
    }
    
    // Function to create and set up the autocomplete
    const initAutocomplete = () => {
      try {
        // Use ref instead of getElementById for better component isolation
        const inputElement = inputRef.current;
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
        const autocomplete = new google.maps.places.Autocomplete(inputElement, options);
        autocompleteRef.current = autocomplete;

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

            // Get formatted address safely with fallback
            const formattedAddress = place.formatted_address || place.name || '';
            
            // Use safe defaults for all values
            const newLocation: Location = {
              address: formattedAddress,
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              name: place.name || formattedAddress,
            };

            // Safely add optional properties from previous location
            if (locationData) {
              if (locationData.id) newLocation.id = locationData.id;
              if (locationData.city) newLocation.city = locationData.city;
              if (locationData.state) newLocation.state = locationData.state;
              if (locationData.type) newLocation.type = locationData.type;
              if (typeof locationData.popularityScore === 'number' && !isNaN(locationData.popularityScore)) {
                newLocation.popularityScore = locationData.popularityScore;
              }
              if (typeof locationData.isPickupLocation === 'boolean') {
                newLocation.isPickupLocation = locationData.isPickupLocation;
              }
              if (typeof locationData.isDropLocation === 'boolean') {
                newLocation.isDropLocation = locationData.isDropLocation;
              }
            }

            // Update internal state first with the formatted address
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
    if (google && google.maps && google.maps.places && isLoaded) {
      // Add a small delay to make sure DOM is ready
      setTimeout(initAutocomplete, 10);
    }

    // Cleanup function to remove listeners when the component unmounts
    return () => {
      if (autocompleteRef.current) {
        // Safely clear instance listeners
        try {
          google.maps.event.clearInstanceListeners(autocompleteRef.current);
          autocompleteRef.current = null;
        } catch (error) {
          console.error("Error clearing instance listeners:", error);
        }
      }
    };
  }, [google, handleLocationChange, disabled, readOnly, locationData, isAirportTransfer, isLoaded]);

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <Input
        type="text"
        ref={inputRef}
        placeholder={placeholder}
        className={className}
        value={address} // Always use our controlled state value
        onChange={handleChange}
        disabled={disabled}
        readOnly={readOnly}
        autoComplete="off" // Prevent browser's default autocomplete
      />
    </div>
  );
}
