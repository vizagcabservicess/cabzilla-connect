
import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Location } from "@/types/api";

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
      const filtered = suggestions.filter(suggestion => 
        suggestion.name.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions([]);
    }
  }, [inputValue, suggestions]);
  
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
          <Label htmlFor={id} className="block">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {subtitleText && (
            <p className="text-xs text-gray-500 mt-0.5">{subtitleText}</p>
          )}
        </div>
      )}
      
      <Input
        id={id}
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        onFocus={() => inputValue.length > 0 && setShowSuggestions(true)}
        onBlur={handleInputBlur}
      />
      
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-y-auto border">
          {filteredSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="px-4 py-2 hover:bg-slate-100 cursor-pointer"
              onMouseDown={() => handleSuggestionClick(suggestion)}
            >
              {suggestion.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
