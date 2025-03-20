
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';
import { Location } from '@/types/api';
import { debounce } from '@/lib/utils';
import { isLocationInVizag, safeIncludes } from '@/lib/locationUtils';
import { AlertCircle, Map, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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
  const { google, isLoaded, loadError } = useGoogleMaps();
  
  // Reference to the autocomplete instance
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const locationChangedRef = useRef<boolean>(false);
  const prevLocationRef = useRef<Location | null>(null);
  const wasLocationSelectedRef = useRef<boolean>(false);
  const autocompleteListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const isManualInputRef = useRef<boolean>(false);
  const pendingLocationUpdateRef = useRef<Location | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const autocompleteInitializedRef = useRef<boolean>(false);
  const initializationAttemptsRef = useRef<number>(0);
  
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

  // Display error message if Google Maps fails to load
  useEffect(() => {
    if (loadError) {
      console.error("Google Maps failed to load:", loadError);
      setLocationError("Location services unavailable. Please check your internet connection.");
    }
  }, [loadError]);

  // Check if location is in India
  const isLocationInIndia = (lat: number, lng: number): boolean => {
    // Approximate India bounds
    return lat >= 8.0 && lat <= 37.0 && lng >= 68.0 && lng <= 97.0;
  };

  // Handle direct input changes (without using the debounced version)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e || !e.target) return;
    
    const newAddress = e.target.value;
    setAddress(newAddress);
    setLocationError(null);
    wasLocationSelectedRef.current = false;
    isManualInputRef.current = true; // Mark that this is manual input
    
    // Ensure the autocomplete is initialized
    if (isLoaded && google && inputRef.current && !autocompleteInitializedRef.current) {
      initializeAutocomplete();
    }
    
    // If the input is cleared completely, immediately update the parent
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

  // Handle Places API geocoding manually
  const searchPlaceByText = useCallback(async (searchText: string) => {
    if (!google || !google.maps || searchText.trim() === '') {
      return null;
    }
    
    try {
      // Create a PlacesService if it doesn't exist yet
      if (!placesServiceRef.current) {
        const mapCanvas = document.getElementById('map-canvas');
        if (!mapCanvas) {
          console.log("Creating map-canvas element for PlacesService");
          const newMapCanvas = document.createElement('div');
          newMapCanvas.id = 'map-canvas';
          newMapCanvas.style.display = 'none';
          document.body.appendChild(newMapCanvas);
        }
        
        try {
          placesServiceRef.current = new google.maps.places.PlacesService(
            document.getElementById('map-canvas') as HTMLDivElement
          );
          console.log("PlacesService initialized");
        } catch (error) {
          console.error("Failed to initialize PlacesService:", error);
          return null;
        }
      }
      
      return new Promise<google.maps.places.PlaceResult | null>((resolve, reject) => {
        if (!placesServiceRef.current) {
          reject(new Error("Places service not available"));
          return;
        }
        
        placesServiceRef.current.findPlaceFromQuery({
          query: searchText + ' India', // Append India to bias results
          fields: ['name', 'geometry', 'formatted_address']
        }, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
            resolve(results[0]);
          } else {
            console.warn("Place search failed:", status);
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error("Error searching for place:", error);
      return null;
    }
  }, [google]);

  // Send location update to parent component
  const updateParentLocation = useCallback((newLocation: Location) => {
    if (!handleLocationChange) return;
    
    // Check if this is a duplicate update by comparing with the pending update
    const pendingUpdate = pendingLocationUpdateRef.current;
    if (pendingUpdate && JSON.stringify(pendingUpdate) === JSON.stringify(newLocation)) {
      console.log('Skipping duplicate location update');
      return;
    }
    
    // Store this update as pending to prevent duplicates
    pendingLocationUpdateRef.current = newLocation;
    
    // Mark that we've manually changed the location
    locationChangedRef.current = true;
    
    // Send the updated location to parent
    console.log('Sending location update to parent:', newLocation);
    handleLocationChange(newLocation);
  }, [handleLocationChange]);

  // Debounced version to handle manual text input
  const handleManualTextInput = useCallback(
    debounce(async (address: string) => {
      if (!handleLocationChange || !address || !isManualInputRef.current) return;
      
      // Only send update if this was a manual text input (not a selection from dropdown)
      console.log("Manual address entry - not selected from dropdown:", address);
      
      // Try to geocode the address if Google Maps is available
      if (google && google.maps) {
        console.log("Attempting to geocode manually entered address");
        try {
          const place = await searchPlaceByText(address);
          
          if (place && place.geometry && place.geometry.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const formattedAddress = place.formatted_address || place.name || address;
            
            // Create a new location with geocoded information
            const geocodedLocation: Location = {
              id: locationData.id || `loc_${Date.now()}`,
              name: place.name || formattedAddress.split(',')[0] || address,
              address: formattedAddress,
              lat: lat,
              lng: lng,
              isInVizag: isInVizagArea(lat, lng, formattedAddress)
            };
            
            console.log("Geocoded manual input successfully:", geocodedLocation);
            updateParentLocation(geocodedLocation);
            return;
          }
        } catch (error) {
          console.warn("Geocoding failed for manual input:", error);
        }
      }
      
      // Fallback: Create a new location object with safe defaults if geocoding fails
      const fallbackLocation: Location = {
        id: locationData.id || `loc_${Date.now()}`,
        name: address,
        address: address,
        // Don't include lat/lng if they're not numbers to avoid type errors
        ...(typeof locationData.lat === 'number' && !isNaN(locationData.lat) ? { lat: locationData.lat } : {}),
        ...(typeof locationData.lng === 'number' && !isNaN(locationData.lng) ? { lng: locationData.lng } : {}),
        // Always set isInVizag to a boolean value
        isInVizag: locationData.isInVizag === true
      };
      
      console.log("Using fallback location for manual input:", fallbackLocation);
      updateParentLocation(fallbackLocation);
    }, 500),
    [google, handleLocationChange, locationData, searchPlaceByText, updateParentLocation]
  );

  // Clear location 
  const handleClearLocation = () => {
    setAddress('');
    locationChangedRef.current = true;
    wasLocationSelectedRef.current = false;
    
    // Create an empty location object
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
    
    // Focus the input after clearing
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Setup Google Maps autocomplete
  const initializeAutocomplete = useCallback(() => {
    if (!google || !google.maps || !google.maps.places || !inputRef.current || 
        disabled || readOnly || !isLoaded) {
      console.log("Cannot initialize autocomplete yet, conditions not met:", {
        googleAvailable: !!google,
        mapsAvailable: !!(google && google.maps),
        placesAvailable: !!(google && google.maps && google.maps.places),
        inputRefAvailable: !!inputRef.current,
        notDisabled: !disabled,
        notReadOnly: !readOnly,
        isLoaded: isLoaded
      });
      return false;
    }
    
    // Force create map-canvas if it doesn't exist
    if (!document.getElementById('map-canvas')) {
      console.log("Creating map-canvas element for autocomplete initialization");
      const mapCanvas = document.createElement('div');
      mapCanvas.id = 'map-canvas';
      mapCanvas.style.display = 'none';
      document.body.appendChild(mapCanvas);
    }
    
    // Cleanup previous listeners to prevent duplication
    if (autocompleteListenerRef.current) {
      try {
        google.maps.event.removeListener(autocompleteListenerRef.current);
      } catch (error) {
        console.error("Error removing autocomplete listener:", error);
      }
      autocompleteListenerRef.current = null;
    }
    
    if (autocompleteRef.current) {
      try {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      } catch (error) {
        console.error("Error clearing instance listeners:", error);
      }
      autocompleteRef.current = null;
    }
    
    try {
      console.log("🔄 Initializing Google Places Autocomplete...");
      
      // Create options for autocomplete
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
      console.log("Created new Autocomplete instance");
      
      // Add place_changed listener
      autocompleteListenerRef.current = autocomplete.addListener('place_changed', () => {
        if (!autocompleteRef.current) return;
        
        const place = autocompleteRef.current.getPlace();
        setLocationError(null);
        
        console.log("Place selected from autocomplete:", place);
        
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
        isManualInputRef.current = false; // Reset manual input flag since this was a selection
        
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
        updateParentLocation(newLocation);
      });
      
      autocompleteInitializedRef.current = true;
      console.log("✅ Autocomplete initialized successfully");
      return true;
    } catch (error) {
      console.error("❌ Error initializing autocomplete:", error);
      autocompleteInitializedRef.current = false;
      
      // Only show toast for final attempt
      if (initializationAttemptsRef.current >= 2) {
        toast.error("Error setting up location search. Please refresh the page.");
      }
      return false;
    }
  }, [google, disabled, readOnly, isPickupLocation, isAirportTransfer, updateParentLocation, locationData.id, isLoaded]);

  // Initialize autocomplete when Google Maps is loaded
  useEffect(() => {
    if (isLoaded && google && inputRef.current && !autocompleteInitializedRef.current) {
      initializationAttemptsRef.current++;
      console.log(`Attempt #${initializationAttemptsRef.current} to initialize autocomplete`);
      
      // Delay initialization to ensure everything is properly loaded
      const initTimeout = setTimeout(() => {
        const success = initializeAutocomplete();
        
        // Retry initialization if it failed (up to 3 times)
        if (!success && initializationAttemptsRef.current < 3) {
          console.log(`Autocomplete initialization failed, will retry. Attempt: ${initializationAttemptsRef.current}`);
          
          // Try to force-initialize Places API
          if (google && google.maps && !google.maps.places) {
            try {
              console.log("Attempting to manually load Places library");
              // This is a hack to try to force the Places library to load
              new google.maps.places.Autocomplete(document.createElement('input'));
            } catch (error) {
              console.error("Failed to manually initialize Places library:", error);
            }
          }
        }
      }, 500 + (initializationAttemptsRef.current * 500)); // Increase delay with each attempt
      
      return () => clearTimeout(initTimeout);
    }
  }, [isLoaded, google, initializeAutocomplete]);

  // Re-initialize autocomplete when props change
  useEffect(() => {
    if (isLoaded && google && inputRef.current && (isPickupLocation !== undefined || isAirportTransfer !== undefined)) {
      initializeAutocomplete();
    }
  }, [isPickupLocation, isAirportTransfer, initializeAutocomplete, isLoaded, google]);

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

  // Create a hidden element for the PlacesService if it doesn't exist
  useEffect(() => {
    if (!document.getElementById('map-canvas') && google && google.maps) {
      const mapCanvas = document.createElement('div');
      mapCanvas.id = 'map-canvas';
      mapCanvas.style.display = 'none';
      document.body.appendChild(mapCanvas);
      
      // Initialize the PlacesService
      if (!placesServiceRef.current && google.maps.places) {
        try {
          placesServiceRef.current = new google.maps.places.PlacesService(mapCanvas);
          console.log("PlacesService initialized via useEffect");
        } catch (error) {
          console.error("Failed to initialize PlacesService in useEffect:", error);
        }
      }
    }
    
    return () => {
      // Don't remove the map-canvas on unmount as other components might use it
    };
  }, [google]);

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
            // If user typed but didn't select from autocomplete
            if (!wasLocationSelectedRef.current && address.trim() !== '' && isManualInputRef.current) {
              handleManualTextInput(address);
            }
          }}
          onClick={() => {
            // Re-initialize autocomplete on click if it wasn't initialized successfully
            if (!autocompleteInitializedRef.current && google && isLoaded) {
              console.log("Trying to initialize autocomplete on click");
              initializeAutocomplete();
            }
          }}
          onFocus={() => {
            // Also try to initialize on focus
            if (!autocompleteInitializedRef.current && google && isLoaded) {
              console.log("Trying to initialize autocomplete on focus");
              initializeAutocomplete();
            }
          }}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete="off" // Prevent browser's default autocomplete
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
        {loadError && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-amber-500">
            <Map size={16} />
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
