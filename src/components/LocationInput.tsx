import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";
import { X, Search, MapPin } from "lucide-react";
import { toast } from "sonner";
import type { Location } from '@/lib/locationData';
import type { TripType } from '@/lib/tripTypes';

// Vizag coordinates
const VIZAG_LAT = 17.6868;
const VIZAG_LNG = 83.2185;
const MAX_DISTANCE_KM = 35;

// Helper to calculate distance between two lat/lng points (Haversine formula)
function getDistanceFromLatLng(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper to check if a location is within distance from Vizag
function isWithinVizagRange(lat: number, lng: number, maxDistance: number = MAX_DISTANCE_KM): boolean {
  return getDistanceFromLatLng(VIZAG_LAT, VIZAG_LNG, lat, lng) <= maxDistance;
}

interface LocationInputProps {
  id?: string;
  label?: string;
  value?: Location | string;
  onChange?: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  suggestions?: Location[];
  disabled?: boolean;
  className?: string;
  location?: Location;
  onLocationChange?: (location: Location) => void;
  isPickupLocation?: boolean;
  tripType?: TripType;
  readOnly?: boolean;
}

export function LocationInput({
  id,
  label,
  value,
  onChange,
  required = false,
  placeholder = "Enter location",
  suggestions = [],
  disabled = false,
  className = "",
  location,
  onLocationChange,
  isPickupLocation = false,
  tripType,
  readOnly = false,
}: LocationInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<Location[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const valueRef = useRef<Location | string | undefined>(value);
  const locationRef = useRef(location);
  const initializedRef = useRef(false);
  const { isLoaded, google, error } = useGoogleMaps();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const autocompleteInitializedRef = useRef(false);
  const initializationAttemptsRef = useRef(0);
  const [isFocused, setIsFocused] = useState(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  
  useEffect(() => {
    function handleResize() {
      setIsDesktop(window.innerWidth >= 1024);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Initialize input value from either value or location only on first render
  // or when value/location changes from external sources
  useEffect(() => {
    // Skip if the value hasn't actually changed to avoid loops
    if (valueRef.current === value && locationRef.current === location) {
      return;
    }
    
    // Always update when value/location changes, regardless of initialization state
    // Update refs
    valueRef.current = value;
    locationRef.current = location;
    
    // Set input value based on value or location (without triggering onChange)
    if (typeof value === 'string') {
      setInputValue(value);
    } else if (value && typeof value === 'object') {
      setInputValue(value.name || value.address || "");
    } else if (location) {
      setInputValue(location.name || location.address || "");
    } else {
      // Clear input when value is undefined/null
      setInputValue("");
    }
    
    // Mark as initialized
    initializedRef.current = true;
  }, []); // Empty dependency array - only run once on mount
  
     // Filter suggestions based on input value
   useEffect(() => {
     if (inputValue && inputValue.length >= 2 && suggestions.length > 0) {
       const isAirportTransfer = tripType === 'airport';
       const isTourTrip = tripType === 'tour';
       
       // First filter by input match (faster than distance calculation)
       let filtered = suggestions.filter(suggestion => {
         return (suggestion.name || "").toLowerCase().includes(inputValue.toLowerCase());
       });
       
       // Then apply distance filtering only if needed
       if (isPickupLocation || isAirportTransfer || isTourTrip) {
         filtered = filtered.filter(suggestion => {
           return isWithinVizagRange(suggestion.lat, suggestion.lng);
         });
       }
       
       setFilteredSuggestions(filtered);
     } else {
       setFilteredSuggestions([]);
     }
   }, [inputValue, suggestions, isPickupLocation, tripType]);
  
  // Initialize Google Maps Autocomplete when ready
  useEffect(() => {
    if (!isLoaded || !google || !inputRef.current || autocompleteInitializedRef.current) return;
    
    try {
      
      // Create a circle around Vizag city center
      const vizagCenter = new google.maps.LatLng(VIZAG_LAT, VIZAG_LNG);
      
      // Use 35km radius for autocomplete to allow all locations
      // Distance validation will be handled separately in the place_changed listener
      const circle = new google.maps.Circle({
        center: vizagCenter,
        radius: MAX_DISTANCE_KM * 1000, // Always use 35km for autocomplete
      });
      
      const strictBounds = circle.getBounds() as google.maps.LatLngBounds;
      
      // Configure Autocomplete options with stable bounds
      const options: google.maps.places.AutocompleteOptions = {
        types: ["geocode", "establishment"],
        componentRestrictions: { country: "in" },
        bounds: strictBounds,
        strictBounds: isPickupLocation, // Only enforce strict bounds for pickup locations
      };
      
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current as HTMLInputElement, options);
      
      // Add place_changed listener
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        if (place && place.geometry?.location) {
          setInputValue(place.name || place.formatted_address || "");
          
          if (onChange && place.formatted_address) {
            onChange(place.formatted_address);
          }
          
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          
          // Check if within range for pickup locations
          const isAirportTransfer = tripType === 'airport';
          const isTourTrip = tripType === 'tour';
          
          // For tour trips, pickup location must be within 15km
          if (isTourTrip && isPickupLocation && !isWithinVizagRange(lat, lng, 15)) {
            toast("For tour trips, pickup location must be within 15km of Visakhapatnam. Please select a location within 15km radius.");
            setInputValue("");
            if (onChange) onChange("");
            if (onLocationChange) onLocationChange({ id: '', name: '', address: '', lat: 0, lng: 0, city: '', state: '', type: 'other', popularityScore: 50 });
            return;
          }
          
          // For regular pickup locations (non-tour), validate 35km radius
          if (isPickupLocation && !isTourTrip && !isWithinVizagRange(lat, lng)) {
            toast("Selected location is outside the 35km radius from Visakhapatnam. Please select a location within Visakhapatnam city limits.");
            setInputValue("");
            if (onChange) onChange("");
            if (onLocationChange) onLocationChange({ id: '', name: '', address: '', lat: 0, lng: 0, city: '', state: '', type: 'other', popularityScore: 50 });
            return;
          }
          
          // For airport transfers, allow drop locations outside range to trigger automatic switching
          if (isAirportTransfer && !isPickupLocation && !isWithinVizagRange(lat, lng)) {
            toast("Selected location is outside the 35km radius from Visakhapatnam. We'll automatically switch to Outstation for this trip.");
          }
          
          if (onLocationChange) {
            onLocationChange({
              id: place.place_id || place.formatted_address || "",
              name: place.name || place.formatted_address || "",
              address: place.formatted_address || "",
              lat: lat,
              lng: lng,
              isInVizag: isWithinVizagRange(lat, lng),
              city: '',
              state: '',
              type: 'other',
              popularityScore: 50
            });
          }
        }
      });
      
      autocompleteInitializedRef.current = true;
      initializationAttemptsRef.current = 0;
    } catch (error) {
      console.error("Failed to initialize Google Maps Autocomplete:", error);
      initializationAttemptsRef.current++;
      if (initializationAttemptsRef.current < 3) {
        setTimeout(() => {
          autocompleteInitializedRef.current = false;
        }, 500 * initializationAttemptsRef.current);
      } else {
        toast("Error initializing location search. Please try refreshing the page.");
        console.error("Failed to initialize Google Maps Autocomplete after multiple attempts:", error);
      }
    }
     }, [isLoaded, google, isPickupLocation]); // Removed functions from deps to prevent infinite loops
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Call the original onChange if provided
    if (onChange) {
      onChange(newValue);
    }
    
    // Only show suggestions if there's input and we have suggestions
    setShowSuggestions(newValue.length > 0 && suggestions.length > 0);
  };
  
     const handleSuggestionClick = (suggestion: Location) => {
     const isAirportTransfer = tripType === 'airport';
     const isTourTrip = tripType === 'tour';
     
     // Validate location before accepting it
     // For tour trips, pickup location must be within 15km
     if (isTourTrip && isPickupLocation && !isWithinVizagRange(suggestion.lat, suggestion.lng, 15)) {
       toast("For tour trips, pickup location must be within 15km of Visakhapatnam. Please select a location within 15km radius.");
       return;
     }
     
     // For regular pickup locations (non-tour), validate 35km radius
     if (isPickupLocation && !isTourTrip && !isWithinVizagRange(suggestion.lat, suggestion.lng)) {
       toast("Selected location is outside the 35km radius from Visakhapatnam. Please select a location within Visakhapatnam city limits.");
       return;
     }
     
     if (isAirportTransfer && !isPickupLocation && !isWithinVizagRange(suggestion.lat, suggestion.lng)) {
       toast("Selected location is outside the 35km radius from Visakhapatnam. We'll automatically switch to Outstation for this trip.");
     }
    setInputValue(suggestion.name || suggestion.address || "");
    
    // Call the original onChange if provided
    if (onChange) {
      onChange(suggestion.name || suggestion.address || "");
    }
    
    // Call onLocationChange if provided
    if (onLocationChange) {
      onLocationChange(suggestion);
    }
    
    setShowSuggestions(false);
  };
  
  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => setShowSuggestions(false), 150);
  };

     // Determine subtitle text based on props
   const getSubtitleText = () => {
     const isAirportTransfer = tripType === 'airport';
     const isTourTrip = tripType === 'tour';
     
     if (isPickupLocation && isTourTrip) {
       return "Please select a location within 15km of Visakhapatnam";
     } else if (isPickupLocation) {
       return "Please select a location within 35km of Visakhapatnam";
     } else if (isAirportTransfer) {
       return "Please select a location within 35km of Visakhapatnam";
     }
     // For outstation drop locations, no subtitle needed
     return "";
   };
  
  const subtitleText = getSubtitleText();
  
  return (
    <div className={`relative ${className}`}>
      {/* Show error message if Google Maps failed to load */}
      {error && (
        <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          <strong>Location search limited:</strong> {error.message}
          <br />
          <span className="text-xs">You can still type locations manually.</span>
        </div>
      )}
      
      {/* Floating label implementation: only show when focused or has value */}
      {label && (isFocused || inputValue) && (
        <label
          htmlFor={id}
          className={`absolute left-10 -top-2.5 text-xs bg-white px-1 text-blue-600 z-10 pointer-events-none transition-all duration-200`}
          style={{
            background: 'white',
            paddingLeft: '0.25rem',
            paddingRight: '0.25rem',
            zIndex: 10,
          }}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="ios-search-input-wrapper relative">
        <Input
          id={id}
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          placeholder={!isFocused && !inputValue ? label : ''}
          disabled={disabled}
          readOnly={readOnly}
          style={{ fontSize: isDesktop ? '1.2rem' : '1rem', height: '3.5rem' }}
          className="border-gray-300 focus:ring-blue-500 focus:border-blue-500 pr-10 ios-search-input"
          onFocus={() => { setShowSuggestions(inputValue.length > 0); setIsFocused(true); }}
          onBlur={e => { handleInputBlur(); setIsFocused(false); }}
        />
        {inputValue && !readOnly && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-2"
            onClick={() => {
              setInputValue("");
              if (onChange) onChange("");
              if (onLocationChange) {
                onLocationChange({ id: '', name: '', address: '', lat: 0, lng: 0, city: '', state: '', type: 'other', popularityScore: 50 });
              }
              setShowSuggestions(false);
            }}
            tabIndex={-1}
            aria-label="Clear location"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {subtitleText && (
        <p className="text-xs text-gray-500 mt-1 text-left">{subtitleText}</p>
      )}
      
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-y-auto border border-gray-200">
          {filteredSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-0"
              onMouseDown={() => handleSuggestionClick(suggestion)}
            >
              <div className="font-medium">{suggestion.name}</div>
              {suggestion.address && suggestion.address !== suggestion.name && (
                <div className="text-sm text-gray-500">{suggestion.address}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}