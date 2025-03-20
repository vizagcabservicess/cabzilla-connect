
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2 } from 'lucide-react';
import { isVizagLocation, searchLocations } from '@/lib/locationData';
import { toast } from 'sonner';
import { Location } from '@/types/api';

type LocationInputProps = {
  label: string;
  placeholder: string;
  value?: google.maps.places.AutocompletePrediction | Location | null;
  onLocationChange: (location: Location) => void;
  isPickupLocation?: boolean;
  isAirportTransfer?: boolean;
  readOnly?: boolean;
  className?: string;
};

// Ensure the compiler knows that structured_formatting exists on the prediction object
declare global {
  namespace google.maps.places {
    interface AutocompletePrediction {
      structured_formatting: {
        main_text: string;
        main_text_matched_substrings: Array<{
          length: number;
          offset: number;
        }>;
        secondary_text: string;
      };
    }
  }
}

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
  // Initialize inputValue from value prop
  const getInitialInputValue = () => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    
    // Handle Location type
    if ('address' in value) {
      return value.name || value.address || '';
    }
    
    // Handle AutocompletePrediction type
    if ('description' in value) {
      return value.description;
    }
    
    return '';
  };

  const [inputValue, setInputValue] = useState<string>(getInitialInputValue());
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [localSuggestions, setLocalSuggestions] = useState<Location[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [useLocalSuggestions, setUseLocalSuggestions] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isLoaded, google, placesInitialized } = useGoogleMaps();
  const {
    suggestions: autocompleteSuggestions,
    isLoading: isAutocompleteLoading,
    getPlacePredictions,
    getPlaceDetails,
    isInitialized: isAutocompleteInitialized
  } = usePlacesAutocomplete();

  // Handle input change with throttling
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (!value.trim()) {
      setSuggestions([]);
      setLocalSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    setIsLoading(true);
    
    // Try to use Google Places API if available
    const useGoogle = isLoaded && google && placesInitialized && isAutocompleteInitialized;
    
    if (useGoogle) {
      try {
        // Set India bounds for autocomplete
        const indiaBounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(8.0, 68.0),   // SW corner of India
          new google.maps.LatLng(37.0, 97.0)   // NE corner of India
        );
        
        // Set Vizag bounds for more local results
        const vizagBounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(17.5, 83.1),  // SW corner of Vizag
          new google.maps.LatLng(17.8, 83.4)   // NE corner of Vizag
        );
        
        // Use appropriate bounds based on pickup/dropoff
        const bounds = isPickupLocation ? vizagBounds : indiaBounds;
        
        // Get predictions with the usePlacesAutocomplete hook
        getPlacePredictions(value, bounds)
          .then(results => {
            setSuggestions(results);
            setShowSuggestions(true);
            setUseLocalSuggestions(false);
          })
          .catch(error => {
            console.error("Failed to get Google predictions:", error);
            // Fallback to local suggestions
            const localResults = searchLocations(value, isPickupLocation);
            setLocalSuggestions(localResults);
            setUseLocalSuggestions(true);
            setShowSuggestions(true);
          })
          .finally(() => {
            setIsLoading(false);
          });
      } catch (error) {
        console.error("Error in Google Places autocomplete:", error);
        fallbackToLocalSearch(value);
      }
    } else {
      console.log("Using local location search as fallback");
      fallbackToLocalSearch(value);
    }
  }, [google, isLoaded, isPickupLocation, placesInitialized, isAutocompleteInitialized, getPlacePredictions]);

  // Fallback to local search when Google Places API is not available
  const fallbackToLocalSearch = (query: string) => {
    // Call our local search function instead
    const localResults = searchLocations(query, isPickupLocation);
    console.log("Using fallback location for manual input:", localResults);
    setLocalSuggestions(localResults);
    setUseLocalSuggestions(true);
    setShowSuggestions(true);
    setIsLoading(false);
  };

  // Handle suggestion selection from Google Places
  const handleSuggestionClick = useCallback(async (suggestion: google.maps.places.AutocompletePrediction) => {
    setInputValue(suggestion.description);
    setShowSuggestions(false);
    setIsLoading(true);
    
    try {
      // Get details using the hook's getPlaceDetails
      const placeDetails = await getPlaceDetails(suggestion.place_id);
      
      if (placeDetails && placeDetails.geometry) {
        const { lat, lng } = placeDetails.geometry.location.toJSON();
        
        // Create a Location object
        const location: Location = {
          id: suggestion.place_id,
          name: suggestion.structured_formatting ? 
                suggestion.structured_formatting.main_text : 
                (placeDetails.name || suggestion.description),
          address: placeDetails.formatted_address || suggestion.description,
          lat,
          lng,
          type: 'custom',
          isInVizag: isVizagLocation({ 
            id: suggestion.place_id,
            name: suggestion.structured_formatting ? 
                  suggestion.structured_formatting.main_text : '',
            address: placeDetails.formatted_address || suggestion.description,
            city: '',
            state: '',
            lat, 
            lng,
            type: 'other',
            popularityScore: 0
          })
        };
        
        onLocationChange(location);
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
      toast.error("Failed to get location details. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [getPlaceDetails, onLocationChange]);

  // Handle local suggestion selection
  const handleLocalSuggestionClick = useCallback((location: Location) => {
    setInputValue(location.name || location.address);
    setShowSuggestions(false);
    onLocationChange(location);
  }, [onLocationChange]);

  // Effect to initialize input with value
  useEffect(() => {
    if (value) {
      const newInputValue = getInitialInputValue();
      if (newInputValue !== inputValue) {
        setInputValue(newInputValue);
      }
    }
  }, [value]);

  // Handle input focus to show suggestions
  const handleInputFocus = useCallback(() => {
    if (inputValue.trim()) {
      setShowSuggestions(true);
    }
  }, [inputValue]);

  // Effect to show toast if Google Maps is not loaded
  useEffect(() => {
    if (isLoaded && !placesInitialized && !useLocalSuggestions) {
      console.warn("Google Places API not initialized yet, will use local suggestions");
    }
  }, [isLoaded, placesInitialized, useLocalSuggestions]);

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
  }, []);

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
        
        {showSuggestions && (
          <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto">
            {useLocalSuggestions ? (
              // Local suggestions from our data
              localSuggestions.length > 0 ? (
                localSuggestions.map((location) => (
                  <div
                    key={location.id}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleLocalSuggestionClick(location)}
                  >
                    <div className="font-medium">{location.name}</div>
                    <div className="text-sm text-gray-500">{location.address}</div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-2 text-gray-500">No locations found</div>
              )
            ) : (
              // Google Places suggestions
              suggestions.length > 0 ? (
                suggestions.map((suggestion) => (
                  <div
                    key={suggestion.place_id}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="font-medium">
                      {suggestion.structured_formatting ? 
                        suggestion.structured_formatting.main_text : 
                        suggestion.description}
                    </div>
                    <div className="text-sm text-gray-500">
                      {suggestion.structured_formatting ? 
                        suggestion.structured_formatting.secondary_text : 
                        ''}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-2 text-gray-500">No locations found</div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
