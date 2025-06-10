import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";
import { X, Search, MapPin } from "lucide-react";
import { toast } from "sonner";
import type { Location } from '@/lib/locationData';

// Vizag coordinates
const VIZAG_LAT = 17.6868;
const VIZAG_LNG = 83.2185;
const MAX_DISTANCE_KM = 30;

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
  isAirportTransfer?: boolean;
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
  isAirportTransfer = false,
  readOnly = false,
}: LocationInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<Location[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const valueRef = useRef<Location | string | undefined>(value);
  const locationRef = useRef(location);
  const initializedRef = useRef(false);
  const { isLoaded, google } = useGoogleMaps();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const autocompleteInitializedRef = useRef(false);
  const initializationAttemptsRef = useRef(0);
  
  // Initialize input value from either value or location only on first render
  // or when value/location changes from external sources
  useEffect(() => {
    // Skip if the value hasn't actually changed to avoid loops
    if (valueRef.current === value && locationRef.current === location) {
      return;
    }
    
    // Update refs
    valueRef.current = value;
    locationRef.current = location;
    
    // Set input value based on value or location
    if (typeof value === 'string') {
      setInputValue(value);
    } else if (value && typeof value === 'object') {
      setInputValue(value.name || value.address || "");
    } else if (location) {
      setInputValue(location.name || location.address || "");
    }
    
    // Mark as initialized
    initializedRef.current = true;
  }, [value, location]);
  
  // Filter suggestions based on input value
  useEffect(() => {
    if (inputValue && suggestions.length > 0) {
      let filtered = suggestions.filter(suggestion => 
        (suggestion.name || "").toLowerCase().includes(inputValue.toLowerCase()) &&
        (!isPickupLocation || isWithinVizagRange(suggestion.lat, suggestion.lng))
      );
      
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions([]);
    }
  }, [inputValue, suggestions, isPickupLocation]);
  
  // Initialize Google Maps Autocomplete when ready
  useEffect(() => {
    if (!isLoaded || !google || !inputRef.current || autocompleteInitializedRef.current) return;
    
    try {
      console.log("Initializing Google Maps Autocomplete with restricted bounds");
      
      // Create a circle around Vizag city center
      const vizagCenter = new google.maps.LatLng(VIZAG_LAT, VIZAG_LNG);
      const circle = new google.maps.Circle({
        center: vizagCenter,
        radius: MAX_DISTANCE_KM * 1000, // Convert km to meters
      });
      
      const strictBounds = circle.getBounds() as google.maps.LatLngBounds;
      
      // Configure Autocomplete options with strict bounds
      const options: google.maps.places.AutocompleteOptions = {
        types: ["geocode", "establishment"],
        componentRestrictions: { country: "in" },
        bounds: strictBounds,
        strictBounds: isPickupLocation, // Enforce strict bounds for pickup locations
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
          if (isPickupLocation && !isWithinVizagRange(lat, lng)) {
            toast("Selected location is outside the 30km radius from Visakhapatnam. Please select a location within Visakhapatnam city limits.");
            setInputValue("");
            if (onChange) onChange("");
            if (onLocationChange) onLocationChange({ id: '', name: '', address: '', lat: 0, lng: 0, city: '', state: '', type: 'other', popularityScore: 50 });
            return;
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
  }, [isLoaded, google, inputRef.current, isPickupLocation, isAirportTransfer, onLocationChange, onChange]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Call the original onChange if provided
    if (onChange) {
      onChange(newValue);
    }
    
    setShowSuggestions(newValue.length > 0);
  };
  
  const handleSuggestionClick = (suggestion: Location) => {
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
    if (isPickupLocation) {
      return "Please select a location within 30km of Visakhapatnam";
    } else if (isAirportTransfer) {
      return "Please select a location in Visakhapatnam";
    }
    return "";
  };
  
  const subtitleText = getSubtitleText();
  
  return (
    <div className={`relative ${className}`}>
      {label && (
        <div className="mb-2">
          <Label htmlFor={id} className="block font-medium text-gray-700 text-left mobile-label text-xs">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        </div>
      )}
      <div className="ios-search-input-wrapper relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          id={id}
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className="border-gray-300 focus:ring-blue-500 focus:border-blue-500 pl-10 pr-10 ios-search-input text-sm"
          onFocus={() => inputValue.length > 0 && setShowSuggestions(true)}
          onBlur={handleInputBlur}
        />
        {inputValue && !readOnly && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-2"
            onClick={() => {
              setInputValue("");
              if (onChange) onChange("");
              if (onLocationChange) onLocationChange({ id: '', name: '', address: '', lat: 0, lng: 0, city: '', state: '', type: 'other', popularityScore: 50 });
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
