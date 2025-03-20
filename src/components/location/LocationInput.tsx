
import React, { useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';
import { LocationInputProps } from './types';
import { useLocationInput } from './useLocationInput';
import { SuggestionsList } from './SuggestionsList';

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
    handleLocalSuggestionClick
  } = useLocationInput(value, onLocationChange, isPickupLocation);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setShowSuggestions]);

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
          />
          
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          )}
        </div>
        
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
  );
}
