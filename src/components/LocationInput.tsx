
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';
import { Location } from '@/types/api';
import { debounce } from '@/lib/utils';
import { isLocationInVizag, safeIncludes } from '@/lib/locationUtils';
import { AlertCircle } from 'lucide-react';

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
  const initialAddress = typeof locationData.address === 'string' ? locationData.address : 
                         typeof locationData.name === 'string' ? locationData.name : '';
  const [address, setAddress] = useState<string>(initialAddress);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { google, isLoaded } = useGoogleMaps();
  
  // Reference to the autocomplete instance
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const locationChangedRef = useRef<boolean>(false);
  const prevLocationRef = useRef<Location | null>(null);
  const wasLocationSelectedRef = useRef<boolean>(false);
  
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
      // Prioritize address over name, ensuring they are strings
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

  // Check if location is in India
  const isLocationInIndia = (lat: number, lng: number): boolean => {
    // Approximate India bounds
    return lat >= 8.0 && lat <= 37.0 && lng >= 68.0 && lng <= 97.0;
  };

  // Handle direct input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e || !e.target) return;
    
    const newAddress = e.target.value;
    setAddress(newAddress);
    setLocationError(null);
    wasLocationSelectedRef.current = false;
    
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
        componentRestrictions: { country: 'in' }, // Restrict to India
        types: ['geocode', 'establishment'] // Restrict to addresses and businesses
      };
      
      // Apply location restrictions for Visakhapatnam if needed
      if (isPickupLocation === true || isAirportTransfer === true) {
        // Set bounds to Visakhapatnam region for pickup locations
        const vizagBounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(17.6, 83.1),  // SW corner
          new google.maps.LatLng(17.9, 83.4)   // NE corner
        );
        
        options.bounds = vizagBounds;
        options.strictBounds = isPickupLocation === true;
      } else {
        // Use India bounds for non-pickup locations
        const indiaBounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(8.0, 68.0),   // SW corner of India
          new google.maps.LatLng(37.0, 97.0)   // NE corner of India
        );
        
        options.bounds = indiaBounds;
      }
      
      // Create new autocomplete instance
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, options);
      autocompleteRef.current = autocomplete;
      
      // Add place_changed listener
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        setLocationError(null);
        
        if (!place || !place.geometry || !place.geometry.location) {
          console.error("No place details returned from autocomplete");
          setLocationError("Please select a valid location from the dropdown");
          return;
        }
        
        // Get formatted address, with fallbacks
        const formattedAddress = place.formatted_address || place.name || '';
        
        // Update local state
        setAddress(formattedAddress);
        wasLocationSelectedRef.current = true;
        
        // Get coordinates
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        // Check if location is in India
        if (!isLocationInIndia(lat, lng)) {
          console.error("Selected location is outside India");
          setLocationError("Please select a location within India");
          return;
        }
        
        // Create location object with all required properties
        const newLocation: Location = {
          id: locationData.id || `loc_${Date.now()}`,
          name: place.name || formattedAddress.split(',')[0] || '',
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
    
    // Ensure address is a string and convert to lowercase safely
    const safeAddressLower = address.toLowerCase();
    
    // Check if address contains any Vizag-related names
    const vizagNames = ['visakhapatnam', 'vizag', 'waltair', 'vizianagaram'];
    
    for (const name of vizagNames) {
      if (safeAddressLower.includes(name)) {
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
      <div className="relative">
        <Input
          type="text"
          ref={inputRef}
          placeholder={placeholder}
          className={className + (locationError ? " border-red-500" : "")}
          value={address}
          onChange={(e) => {
            if (!e || !e.target) return;
            setAddress(e.target.value);
            debouncedHandleChange(e);
          }}
          onBlur={() => {
            // If user didn't select from autocomplete and just typed
            if (!wasLocationSelectedRef.current && address.trim() !== '') {
              console.log("Manual address entry - not selected from dropdown:", address);
            }
          }}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete="off" // Prevent browser's default autocomplete
        />
        {locationError && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-500">
            <AlertCircle size={16} />
          </div>
        )}
      </div>
      {locationError && (
        <p className="text-xs text-red-500 mt-1">{locationError}</p>
      )}
      <p className="text-xs text-gray-500">
        {isPickupLocation ? "Select a location in India" : "Select a destination in India"}
      </p>
    </div>
  );
}
