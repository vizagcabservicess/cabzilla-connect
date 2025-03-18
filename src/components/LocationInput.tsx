
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';
import { Location } from '@/types/api';
import { debounce } from '@/lib/utils';
import { isLocationInVizag, safeIncludes } from '@/lib/locationUtils';

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
  const locationData = location || value || { address: '', id: '', name: '' };
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
    if (prevLocationRef.current && JSON.stringify(prevLocationRef.current) === JSON.stringify(locationData)) {
      return;
    }
    
    prevLocationRef.current = locationData;
    
    // Only update if we haven't manually changed the location
    if (!locationChangedRef.current) {
      // Safely get address or name, ensuring they are strings
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
    if (!e || !e.target) return;
    
    const newAddress = e.target.value;
    setAddress(newAddress);
    
    // Only trigger location change if we have a handler and an address
    if (handleLocationChange && newAddress) {
      // Create a new location object with safe defaults
      const updatedLocation: Location = {
        id: locationData.id || `loc_${Date.now()}`,
        name: newAddress,
        address: newAddress,
        // Don't include lat/lng if they're not numbers to avoid type errors
        ...(typeof locationData.lat === 'number' && !isNaN(locationData.lat) ? { lat: locationData.lat } : {}),
        ...(typeof locationData.lng === 'number' && !isNaN(locationData.lng) ? { lng: locationData.lng } : {}),
        // Always set isInVizag to a boolean value
        isInVizag: locationData.isInVizag === true
      };
      
      // Mark that we've manually changed the location
      locationChangedRef.current = true;
      
      // Log the location data for debugging
      console.log('Text input location update:', updatedLocation);
      
      // Send the updated location to parent
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
      if (autocompleteRef.current && google && google.maps) {
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
        
        // Get formatted address, with fallbacks
        const formattedAddress = place.formatted_address || place.name || '';
        
        // Update local state
        setAddress(formattedAddress);
        
        // Get coordinates
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        // Create location object with all required properties
        const newLocation: Location = {
          id: locationData.id || `loc_${Date.now()}`,
          name: place.name || formattedAddress,
          address: formattedAddress,
          lat: lat,
          lng: lng,
          // Determine if location is in Vizag (with defaults)
          isInVizag: isInVizagArea(lat, lng, formattedAddress)
        };
        
        console.log('Autocomplete selected location:', newLocation);
        
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
      if (autocompleteRef.current && google && google.maps) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [google, isLoaded, handleLocationChange, disabled, readOnly, isPickupLocation, isAirportTransfer]);

  // Helper function to safely determine if a location is in Vizag
  function isInVizagArea(lat: number, lng: number, address: string | undefined | null): boolean {
    // Check by coordinates first (Visakhapatnam bounds)
    const isInVizagBounds = 
      lat >= 17.6 && lat <= 17.9 && 
      lng >= 83.1 && lng <= 83.4;
    
    // If we don't have a valid address string, just use coordinates
    if (!address || typeof address !== 'string') {
      return isInVizagBounds;
    }
    
    // Check if address contains any Vizag-related names using safeIncludes
    const vizagNames = ['visakhapatnam', 'vizag', 'waltair', 'vizianagaram'];
    
    for (const name of vizagNames) {
      if (safeIncludes(address, name)) {
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
          if (!e || !e.target) return;
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
