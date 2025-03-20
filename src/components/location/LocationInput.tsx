
import React, { useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2, X } from 'lucide-react';
import { LocationInputProps } from './types';
import { useLocationInput } from './useLocationInput';
import { SuggestionsList } from './SuggestionsList';
import { Button } from '@/components/ui/button';

export function LocationInput({
  label,
  placeholder,
  value,
  onLocationChange,
  isPickupLocation = false,
  isAirportTransfer = false,
  readOnly = false,
  className = ''
}: LocationInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsListRef = useRef<HTMLDivElement>(null);
  const clearClickRef = useRef<boolean>(false);
  
  const {
    inputValue,
    suggestions,
    localSuggestions,
    showSuggestions,
    isLoading,
    useLocalSuggestions,
    setShowSuggestions,
    handleInputChange,
    handleInputFocus,
    handleSuggestionClick,
    handleLocalSuggestionClick,
    resetInputValue,
    clearLocation
  } = useLocationInput(value, onLocationChange, isPickupLocation);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        clearClickRef.current ||
        (inputRef.current && 
        inputRef.current.contains(event.target as Node)) || 
        (suggestionsListRef.current && 
        suggestionsListRef.current.contains(event.target as Node))
      ) {
        // Don't close if clicking on input, suggestions, or the clear button
        clearClickRef.current = false;
        return;
      }
      setShowSuggestions(false);
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setShowSuggestions]);

  // Function to clear input and notify parent
  const handleClearInput = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Set flag to prevent closing suggestions
    clearClickRef.current = true;
    
    // Clear both the input value and the location
    resetInputValue();
    clearLocation();
    
    // Focus input after clearing
    if (inputRef.current) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 10);
    }
  };

  return (
    <div className={`relative mb-4 ${className}`}>
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      </div>
      
      <div className="relative">
        <div className="flex items-center relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
            <MapPin className="h-4 w-4" />
          </div>
          
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onClick={handleInputFocus}
            placeholder={placeholder}
            className="pl-10 pr-12 py-2 w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            readOnly={readOnly}
            autoComplete="off" // Disable browser autocomplete
          />
          
          {inputValue && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClearInput}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-6 w-6 z-10"
              aria-label="Clear input"
            >
              <X className="h-4 w-4 text-gray-400" />
            </Button>
          )}
          
          {isLoading && (
            <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          )}
        </div>
        
        <div ref={suggestionsListRef}>
          <SuggestionsList
            showSuggestions={showSuggestions}
            useLocalSuggestions={useLocalSuggestions}
            localSuggestions={localSuggestions}
            googleSuggestions={suggestions}
            onLocalSuggestionClick={handleLocalSuggestionClick}
            onGoogleSuggestionClick={handleSuggestionClick}
          />
        </div>
      </div>
    </div>
  );
}
