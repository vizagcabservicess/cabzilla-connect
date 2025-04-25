import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';
import { Location } from '@/types/api';
import { debounce } from '@/lib/utils';
import { isLocationInVizag, safeIncludes } from '@/lib/locationUtils';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const locationData = location || value || { address: '', id: '', name: '' };
  const handleLocationChange = onLocationChange || onChange;
  
  const initialAddress = typeof locationData.address === 'string' ? locationData.address : 
                         typeof locationData.name === 'string' ? locationData.name : '';
  const [address, setAddress] = useState<string>(initialAddress);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { google, isLoaded } = useGoogleMaps();
  
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const locationChangedRef = useRef<boolean>(false);
  const prevLocationRef = useRef<Location | null>(null);
  const wasLocationSelectedRef = useRef<boolean>(false);
  const autocompleteListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const isManualInputRef = useRef<boolean>(false);
  const pendingLocationUpdateRef = useRef<Location | null>(null);
  
  useEffect(() => {
    if (!locationData) return;
    
    if (prevLocationRef.current && JSON.stringify(prevLocationRef.current) === JSON.stringify(locationData)) {
      return;
    }
    
    prevLocationRef.current = locationData;
    
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

  const isLocationInIndia = (lat: number, lng: number): boolean => {
    return lat >= 8.0 && lat <= 37.0 && lng >= 68.0 && lng <= 97.0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e || !e.target) return;
    
    const newAddress = e.target.value;
    setAddress(newAddress);
    setLocationError(null);
    wasLocationSelectedRef.current = false;
    isManualInputRef.current = true;
    
    if (newAddress === '') {
      const emptyLocation: Location = {
        id: `loc_${Date.now()}`,
        name: '',
        address: '',
        isInVizag: false
      };
      locationChangedRef.current = true;
      if (handleLocationChange) {
        handleLocationChange(emptyLocation);
      }
    }
  };

  const updateParentLocation = useCallback((newLocation: Location) => {
    if (!handleLocationChange) return;
    
    const pendingUpdate = pendingLocationUpdateRef.current;
    if (pendingUpdate && JSON.stringify(pendingUpdate) === JSON.stringify(newLocation)) {
      console.log('Skipping duplicate location update');
      return;
    }
    
    pendingLocationUpdateRef.current = newLocation;
    
    locationChangedRef.current = true;
    
    console.log('Sending location update to parent:', newLocation);
    handleLocationChange(newLocation);
  }, [handleLocationChange]);

  const handleManualTextInput = useCallback(
    debounce((address: string) => {
      if (!handleLocationChange || !address || !isManualInputRef.current) return;
      
      console.log("Manual address entry - not selected from dropdown:", address);
      
      const updatedLocation: Location = {
        id: locationData.id || `loc_${Date.now()}`,
        name: address,
        address: address,
        ...(typeof locationData.lat === 'number' && !isNaN(locationData.lat) ? { lat: locationData.lat } : {}),
        ...(typeof locationData.lng === 'number' && !isNaN(locationData.lng) ? { lng: locationData.lng } : {}),
        isInVizag: locationData.isInVizag === true
      };
      
      updateParentLocation(updatedLocation);
    }, 500),
    [handleLocationChange, locationData, updateParentLocation]
  );

  const handleClearLocation = () => {
    setAddress('');
    locationChangedRef.current = true;
    wasLocationSelectedRef.current = false;
    
    const emptyLocation: Location = {
      id: `loc_${Date.now()}`,
      name: '',
      address: '',
      isInVizag: false
    };
    
    if (handleLocationChange) {
      console.log('Location cleared by user. Sending empty location to parent.');
      handleLocationChange(emptyLocation);
    }
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    if (!google || !isLoaded || disabled || readOnly || !inputRef.current) return;
    
    const cleanupAutocomplete = () => {
      if (autocompleteListenerRef.current && google.maps) {
        google.maps.event.removeListener(autocompleteListenerRef.current);
        autocompleteListenerRef.current = null;
      }
      
      if (autocompleteRef.current && google.maps) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
    
    cleanupAutocomplete();
    
    try {
      const options: google.maps.places.AutocompleteOptions = {
        fields: ['address_components', 'geometry', 'name', 'formatted_address'],
        componentRestrictions: { country: 'in' },
        types: ['geocode', 'establishment']
      };
      
      if (isPickupLocation === true || isAirportTransfer === true) {
        const vizagBounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(17.6, 83.1),
          new google.maps.LatLng(17.9, 83.4)
        );
        
        options.bounds = vizagBounds;
        options.strictBounds = isPickupLocation === true;
      } else {
        const indiaBounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(8.0, 68.0),
          new google.maps.LatLng(37.0, 97.0)
        );
        
        options.bounds = indiaBounds;
      }
      
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, options);
      autocompleteRef.current = autocomplete;
      
      autocompleteListenerRef.current = autocomplete.addListener('place_changed', () => {
        if (!autocompleteRef.current) return;
        
        const place = autocompleteRef.current.getPlace();
        setLocationError(null);
        
        if (!place || !place.geometry || !place.geometry.location) {
          console.error("No place details returned from autocomplete");
          setLocationError("Please select a valid location from the dropdown");
          return;
        }
        
        const formattedAddress = place.formatted_address || place.name || '';
        
        setAddress(formattedAddress);
        wasLocationSelectedRef.current = true;
        isManualInputRef.current = false;
        
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        if (!isLocationInIndia(lat, lng)) {
          console.error("Selected location is outside India");
          setLocationError("Please select a location within India");
          return;
        }
        
        const newLocation: Location = {
          id: locationData.id || `loc_${Date.now()}`,
          name: place.name || formattedAddress.split(',')[0] || '',
          address: formattedAddress,
          lat: lat,
          lng: lng,
          isInVizag: isInVizagArea(lat, lng, formattedAddress)
        };
        
        console.log('Autocomplete selected location:', newLocation);
        updateParentLocation(newLocation);
      });
    } catch (error) {
      console.error("Error initializing autocomplete:", error);
    }
    
    return () => {
      cleanupAutocomplete();
    };
  }, [google, isLoaded, handleLocationChange, disabled, readOnly, isPickupLocation, isAirportTransfer, updateParentLocation, locationData.id]);

  function isInVizagArea(lat: number, lng: number, address: string | undefined | null): boolean {
    const isInVizagBounds = 
      lat >= 17.6 && lat <= 17.9 && 
      lng >= 83.1 && lng <= 83.4;
    
    if (!address || typeof address !== 'string') {
      return isInVizagBounds;
    }
    
    const safeAddressLower = address.toLowerCase();
    
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
            handleInputChange(e);
          }}
          onBlur={() => {
            if (!wasLocationSelectedRef.current && address.trim() !== '' && isManualInputRef.current) {
              handleManualTextInput(address);
            }
          }}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete="off"
        />
        {address && (
          <Button
            type="button"
            variant="ghost" 
            size="icon"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400 hover:text-gray-700"
            onClick={handleClearLocation}
            aria-label="Clear location"
          >
            <X size={16} />
          </Button>
        )}
        {locationError && !address && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-500">
            <AlertCircle size={16} />
          </div>
        )}
      </div>
      {locationError && (
        <p className="text-xs text-red-500 mt-1">{locationError}</p>
      )}
      <p className="text-xs text-gray-500">
        {isAirportTransfer && !isPickupLocation 
          ? "Select a location in Visakhapatnam"
          : isPickupLocation 
            ? "Select a location in Visakhapatnam" 
            : "Select a location in India"}
      </p>
    </div>
  );
}
