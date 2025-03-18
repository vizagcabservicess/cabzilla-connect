
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';
import { Location } from '@/types/api';
import { debounce } from '@/lib/utils';
import { isLocationInVizag } from '@/lib/locationUtils';

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
  const locationChangedRef = useRef<boolean>(false);
  const prevLocationRef = useRef<Location | null>(null);
  
  // Update the address whenever locationData changes
  useEffect(() => {
    if (!locationData) return;
    
    // Store current location to prevent unnecessary updates
    if (JSON.stringify(prevLocationRef.current) === JSON.stringify(locationData)) {
      return;
    }
    
    prevLocationRef.current = locationData;
    
    // Only update if we haven't manually changed the location
    if (!locationChangedRef.current) {
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
    if (handleLocationChange && newAddress) {
      const updatedLocation: Location = {
        ...locationData,
        address: newAddress,
        name: newAddress,
        id: locationData.id || `loc_${Date.now()}`
      };
      
      // Preserve lat/lng if they exist
      if (locationData.lat) updatedLocation.lat = locationData.lat;
      if (locationData.lng) updatedLocation.lng = locationData.lng;
      
      // Default isInVizag to false if it's undefined and we don't have coordinates to check
      updatedLocation.isInVizag = locationData.isInVizag;
      
      // Mark that we've manually changed the location
      locationChangedRef.current = true;
      
      handleLocationChange(updatedLocation);
    }
  };

  // Debounced version of handleInputChange to prevent too many state updates
  const debouncedHandleChange = useCallback(
    debounce((e: React.ChangeEvent<HTMLInputElement>) => {
      handleInputChange(e);
    }, 300),
    [handleLocationChange, locationData]
  );

  // Setup Google Maps autocomplete
  useEffect(() => {
    if (!google || !isLoaded || disabled || readOnly || !inputRef.current) return;
    
    try {
      // Clear any existing autocomplete
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
      
      const options: google.maps.places.AutocompleteOptions = {
        fields: ['address_components', 'geometry', 'name', 'formatted_address'],
      };
      
      // Apply location restrictions for Visakhapatnam
      if (isPickupLocation === true || isAirportTransfer === true) {
        // Set bounds to Visakhapatnam region
        const vizagBounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(17.6, 83.1),  // SW corner
          new google.maps.LatLng(17.9, 83.4)   // NE corner
        );
        
        options.bounds = vizagBounds;
        options.strictBounds = isPickupLocation === true;
        options.componentRestrictions = { country: 'in' };
      }
      
      // Create new autocomplete instance
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, options);
      autocompleteRef.current = autocomplete;
      
      // Add place_changed listener
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (!place || !place.geometry || !place.geometry.location) {
          console.error("No place details returned from autocomplete");
          return;
        }
        
        // Get formatted address
        const formattedAddress = place.formatted_address || place.name || '';
        
        // Update local state
        setAddress(formattedAddress);
        
        // Calculate if the location is in Vizag
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const isInVizag = checkIfLocationIsInVizag(lat, lng, formattedAddress);
        
        // Create location object
        const newLocation: Location = {
          address: formattedAddress,
          name: place.name || formattedAddress,
          id: locationData.id || `loc_${Date.now()}`,
          lat: lat,
          lng: lng,
          isInVizag: isInVizag
        };
        
        console.log('Selected place from autocomplete:', newLocation);
        
        // Mark that we've manually changed the location
        locationChangedRef.current = true;
        
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
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [google, isLoaded, handleLocationChange, disabled, readOnly, isPickupLocation, isAirportTransfer]);

  // Helper function to determine if a location is in Vizag
  function checkIfLocationIsInVizag(lat: number, lng: number, address: string): boolean {
    // Check coordinates (Visakhapatnam bounds)
    const isInVizagBounds = 
      lat >= 17.6 && lat <= 17.9 && 
      lng >= 83.1 && lng <= 83.4;
    
    // Check address text
    const addressLower = address.toLowerCase();
    const vizagNames = ['visakhapatnam', 'vizag', 'waltair', 'vizianagaram'];
    
    for (const name of vizagNames) {
      if (addressLower.includes(name)) {
        return true;
      }
    }
    
    return isInVizagBounds;
  }

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
        onChange={(e) => {
          setAddress(e.target.value);
          debouncedHandleChange(e);
        }}
        disabled={disabled}
        readOnly={readOnly}
        autoComplete="off" // Prevent browser's default autocomplete
      />
    </div>
  );
}
