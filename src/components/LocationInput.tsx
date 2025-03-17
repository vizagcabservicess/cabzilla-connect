
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
  const initialAddress = typeof locationData.address === 'string' ? locationData.address : 
                         typeof locationData.name === 'string' ? locationData.name : '';
  
  const [address, setAddress] = useState<string>(initialAddress);
  const { google, isLoaded } = useGoogleMaps();
  
  // Reference to the autocomplete instance
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Debug log to check initial values
  useEffect(() => {
    console.log("LocationInput initialized with:", { 
      locationData, 
      address,
      isPickupLocation,
      isAirportTransfer,
      readOnly
    });
  }, []);
  
  // Update the address whenever locationData changes
  useEffect(() => {
    if (locationData) {
      const newAddress = typeof locationData.address === 'string' && locationData.address.trim() !== '' 
        ? locationData.address 
        : typeof locationData.name === 'string' && locationData.name.trim() !== '' 
          ? locationData.name 
          : '';
          
      if (newAddress && newAddress !== address) {
        console.log('Updating address from props:', newAddress);
        setAddress(newAddress);
      }
    }
  }, [locationData, address]);

  // Handle direct input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setAddress(newAddress);
    
    // Create a basic location object with the typed address
    if (handleLocationChange) {
      handleLocationChange({
        address: newAddress,
        name: newAddress,
        id: locationData.id || `loc_${Date.now()}`,
        lat: locationData.lat || 0,
        lng: locationData.lng || 0,
        type: locationData.type || 'other'
      });
    }
  };

  // Setup Google Maps autocomplete
  useEffect(() => {
    if (!google || !isLoaded || disabled || readOnly || !inputRef.current) {
      console.log("Not initializing autocomplete due to conditions:", {
        googleExists: !!google,
        isLoaded,
        disabled,
        readOnly,
        inputRefExists: !!inputRef.current
      });
      return;
    }
    
    try {
      // Clear any existing autocomplete
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
      
      const options: google.maps.places.AutocompleteOptions = {
        fields: ['address_components', 'geometry', 'name', 'formatted_address'],
      };
      
      // Apply location restrictions for Visakhapatnam
      if (isPickupLocation === true || isAirportTransfer === true) {
        console.log("Setting up location restrictions for Vizag");
        // Set bounds to Visakhapatnam region
        const vizagBounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(17.6, 83.1),  // SW corner
          new google.maps.LatLng(17.9, 83.4)   // NE corner
        );
        
        options.bounds = vizagBounds;
        options.strictBounds = isPickupLocation === true;
        options.componentRestrictions = { country: 'in' };
      }
      
      console.log("Creating autocomplete with options:", options);
      
      // Create new autocomplete instance
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, options);
      autocompleteRef.current = autocomplete;
      
      // Add place_changed listener
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        console.log("Place selected:", place);
        
        if (!place || !place.geometry || !place.geometry.location) {
          console.error("No place details returned from autocomplete");
          return;
        }
        
        // Get formatted address
        const formattedAddress = place.formatted_address || place.name || '';
        
        // Update local state
        setAddress(formattedAddress);
        
        // Create location object with Vizag information
        const isInVizag = formattedAddress.toLowerCase().includes('visakhapatnam') || 
                         formattedAddress.toLowerCase().includes('vizag') ||
                         (place.geometry.location.lat() >= 17.6 && 
                          place.geometry.location.lat() <= 17.9 && 
                          place.geometry.location.lng() >= 83.1 && 
                          place.geometry.location.lng() <= 83.4);
        
        // Create location object
        const newLocation: Location = {
          address: formattedAddress,
          name: place.name || formattedAddress,
          id: locationData.id || `loc_${Date.now()}`,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          type: locationData.type || 'other',
          isInVizag: isInVizag
        };
        
        console.log('Selected place from autocomplete:', newLocation);
        
        // Update parent component
        if (handleLocationChange) {
          handleLocationChange(newLocation);
        }
      });
    } catch (error) {
      console.error("Error initializing autocomplete:", error);
    }
    
    // Cleanup when component unmounts
    return () => {
      if (autocompleteRef.current && google) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [google, isLoaded, handleLocationChange, disabled, readOnly, isPickupLocation, isAirportTransfer, locationData]);

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
        value={address}
        onChange={handleInputChange}
        disabled={disabled}
        readOnly={readOnly}
        autoComplete="off" // Prevent browser's default autocomplete
      />
    </div>
  );
}
