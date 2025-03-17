import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';
import { Location } from '@/types/api';
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
  
  // Flag to track if we should update address from props
  const skipNextPropsUpdate = useRef(false);
  const isInternalUpdate = useRef(false);

  // Update the address when the location data changes (only if not being edited)
  useEffect(() => {
    // Skip this update if we just sent data to the parent
    if (skipNextPropsUpdate.current) {
      skipNextPropsUpdate.current = false;
      return;
    }

    // Don't update if this is from internal state changes (typing)
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

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

  // Create a debounced function to update the parent component
  const debouncedUpdateParent = useCallback(
    debounce((newLocation: Location) => {
      console.log('Debounced update parent with:', newLocation);
      skipNextPropsUpdate.current = true;
      if (handleLocationChange) {
        handleLocationChange(newLocation);
      }
    }, 300),
    [handleLocationChange]
  );

  // Handle input change immediately for UI responsiveness
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    console.log('Input changed to:', newAddress);
    
    // Always update internal state for controlled input behavior
    setAddress(newAddress);
    
    // Mark that we're doing an internal update to prevent circular updates
    isInternalUpdate.current = true;
    
    // Create a new location object with just the address for typing
    const updatedLocation: Location = { 
      address: newAddress,
      // Keep all existing location data, just update the address
      ...(locationData || {}),
      // Make sure address is set
      address: newAddress
    };
    
    // Use the debounced function for the parent component update
    debouncedUpdateParent(updatedLocation);
  }, [debouncedUpdateParent, locationData]);

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
            
            // Keep current address value if no formatted address is available
            if (!formattedAddress && address) {
              console.log("No formatted address from place, keeping current:", address);
              return;
            }
            
            // Update internal state first with the formatted address
            setAddress(formattedAddress);
            
            // Use safe defaults for all values
            const newLocation: Location = {
              ...locationData, // Keep existing location data
              address: formattedAddress,
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              name: place.name || formattedAddress,
            };

            // Mark that we're setting data from autocomplete
            skipNextPropsUpdate.current = true;
            
            // Call the handler if it exists immediately (no debounce for selections)
            if (handleLocationChange) {
              console.log('Place selected, updating with:', newLocation);
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
  }, [google, handleLocationChange, disabled, readOnly, locationData, isAirportTransfer, isLoaded, address]);

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
