import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Location } from "@/types/api";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";
import { X } from "lucide-react";

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

// Helper to calculate distance between two lat/lng points (Haversine formula)
function getDistanceFromVizag(lat, lng) {
  const vizagLat = 17.6868;
  const vizagLng = 83.2185;
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat - vizagLat);
  const dLng = toRad(lng - vizagLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(vizagLat)) *
      Math.cos(toRad(lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
        suggestion.name.toLowerCase().includes(inputValue.toLowerCase())
      );
      // If this is a pickup location, filter to within 30km of Vizag
      if (isPickupLocation) {
        filtered = filtered.filter(suggestion => {
          if (suggestion.lat && suggestion.lng) {
            return getDistanceFromVizag(suggestion.lat, suggestion.lng) <= 30;
          }
          return false;
        });
      }
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions([]);
    }
  }, [inputValue, suggestions, isPickupLocation]);
  
  // Initialize Google Maps Autocomplete when ready
  useEffect(() => {
    if (!isLoaded || !google || !inputRef.current || autocompleteInitializedRef.current) return;
    try {
      const options: google.maps.places.AutocompleteOptions = {
        types: ["geocode"],
        componentRestrictions: { country: "in" },
      };
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current as HTMLInputElement, options);
      // Restrict to 30km radius for pickup locations
      if (isPickupLocation) {
        const vizagCenter = new google.maps.LatLng(17.6868, 83.2185);
        const circle = new google.maps.Circle({
          center: vizagCenter,
          radius: 30000, // 30km in meters
        });
        autocompleteRef.current.setBounds(circle.getBounds());
        autocompleteRef.current.setOptions({ strictBounds: true });
      }
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        if (place && place.formatted_address) {
          setInputValue(place.formatted_address);
          if (onChange) onChange(place.formatted_address);
          if (onLocationChange) onLocationChange({
            id: place.place_id || place.formatted_address,
            name: place.name || place.formatted_address,
            address: place.formatted_address,
            lat: place.geometry?.location?.lat() || 0,
            lng: place.geometry?.location?.lng() || 0,
          });
        }
      });
      autocompleteInitializedRef.current = true;
      initializationAttemptsRef.current = 0;
    } catch (error) {
      initializationAttemptsRef.current++;
      if (initializationAttemptsRef.current < 3) {
        setTimeout(() => {
          autocompleteInitializedRef.current = false;
        }, 500 * initializationAttemptsRef.current);
      } else {
        console.error("Failed to initialize Google Maps Autocomplete after multiple attempts:", error);
      }
    }
  }, [isLoaded, google, inputRef.current, isPickupLocation]);
  
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
      return "Please select a location in Visakhapatnam";
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
          <Label htmlFor={id} className="block font-medium text-gray-700 text-left">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        </div>
      )}
      <div className="relative">
        <Input
          id={id}
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className="border-gray-300 focus:ring-blue-500 focus:border-blue-500 pr-10"
          onFocus={() => inputValue.length > 0 && setShowSuggestions(true)}
          onBlur={handleInputBlur}
        />
        {inputValue && !readOnly && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
            onClick={() => {
              setInputValue("");
              if (onChange) onChange("");
              if (onLocationChange) onLocationChange({ id: "", name: "", address: "", lat: 0, lng: 0 });
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
              className="px-4 py-2 hover:bg-slate-100 cursor-pointer"
              onMouseDown={() => handleSuggestionClick(suggestion)}
            >
              <div className="font-medium">{suggestion.name}</div>
              {suggestion.address && suggestion.address !== suggestion.name && (
                <div className="text-xs text-gray-500">{suggestion.address}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
