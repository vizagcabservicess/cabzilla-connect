
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
  const [searchAttempts, setSearchAttempts] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isLoaded, google, placesInitialized } = useGoogleMaps();
  const {
    suggestions: autocompleteSuggestions,
    isLoading: isAutocompleteLoading,
    getPlacePredictions,
    getPlaceDetails,
    isInitialized: isAutocompleteInitialized,
    forceInitialization
  } = usePlacesAutocomplete({
    country: 'in' // Always restrict to India
  });

  // Force initialization on component mount
  useEffect(() => {
    if (isLoaded && google && !isAutocompleteInitialized) {
      console.log("Forcing Places initialization in LocationInput");
      forceInitialization();
    }
  }, [isLoaded, google, isAutocompleteInitialized, forceInitialization]);

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
    setSearchAttempts(prev => prev + 1);
    
    // Try to use Google Places API if available
    const useGoogle = isLoaded && google && (placesInitialized || isAutocompleteInitialized);
    
    if (useGoogle) {
      try {
        console.log("Using Google Places API for search");
        
        // Set bounds for search
        let bounds;
        
        // For pickup locations, restrict to Vizag area (25km radius)
        if (isPickupLocation) {
          // Vizag centered bounds with 25km radius approximately
          bounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(17.6315, 83.1015),  // SW corner of Vizag + 25km
            new google.maps.LatLng(17.8115, 83.3415)   // NE corner of Vizag + 25km
          );
        } else {
          // For drop locations, allow all of India
          bounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(8.0, 68.0),   // SW corner of India
            new google.maps.LatLng(37.0, 97.0)   // NE corner of India
          );
        }
        
        // Get predictions with the usePlacesAutocomplete hook
        getPlacePredictions(value, bounds)
          .then(results => {
            if (results && results.length > 0) {
              setSuggestions(results);
              setShowSuggestions(true);
              setUseLocalSuggestions(false);
              console.log(`Found ${results.length} Google places suggestions`);
            } else {
              console.log("No Google predictions found, falling back to local");
              fallbackToLocalSearch(value);
            }
          })
          .catch(error => {
            console.error("Failed to get Google predictions:", error);
            // Fallback to local suggestions
            fallbackToLocalSearch(value);
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
    console.log(`Using fallback location search: found ${localResults.length} results`);
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
        
        // Determine if the location is in Vizag (important for pickup validation)
        let isInVizag = false;
        
        if (isPickupLocation) {
          // Check if it's within ~25km of Vizag center (17.6868° N, 83.2185° E)
          const vizagCenter = { lat: 17.6868, lng: 83.2185 };
          const distance = getDistanceFromLatLonInKm(lat, lng, vizagCenter.lat, vizagCenter.lng);
          isInVizag = distance <= 25;
          
          // If it's a pickup location and not in Vizag, show an error
          if (!isInVizag) {
            toast.error("Pickup location must be within 25km of Visakhapatnam", {
              duration: 3000
            });
            setIsLoading(false);
            return;
          }
        }
        
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
          isInVizag
        };
        
        console.log("Selected location details:", location);
        onLocationChange(location);
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
      
      // Create a basic location even if details fail
      const basicLocation: Location = {
        id: suggestion.place_id || `loc_${Date.now()}`,
        name: suggestion.structured_formatting ? 
              suggestion.structured_formatting.main_text : 
              suggestion.description,
        address: suggestion.description,
        lat: 0, // Default coordinates
        lng: 0,
        type: 'custom',
        isInVizag: isPickupLocation // Assume it's in Vizag if it's a pickup location (user selected it)
      };
      
      console.log("Created basic location from suggestion:", basicLocation);
      onLocationChange(basicLocation);
    } finally {
      setIsLoading(false);
    }
  }, [getPlaceDetails, onLocationChange, isPickupLocation]);

  // Helper function to calculate distance between two coordinates
  function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; // Distance in km
    return d;
  }
  
  function deg2rad(deg: number) {
    return deg * (Math.PI/180);
  }

  // Handle local suggestion selection
  const handleLocalSuggestionClick = useCallback((location: Location) => {
    setInputValue(location.name || location.address);
    setShowSuggestions(false);
    console.log("Selected local location:", location);
    
    // For pickup locations, ensure it's in Vizag
    if (isPickupLocation && !location.isInVizag) {
      toast.error("Pickup location must be within Visakhapatnam", {
        duration: 3000
      });
      return;
    }
    
    onLocationChange(location);
  }, [onLocationChange, isPickupLocation]);

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
      
      // If we have no suggestions yet, try to get some based on current input
      if ((!suggestions || suggestions.length === 0) && 
          (!localSuggestions || localSuggestions.length === 0)) {
        handleInputChange({ target: { value: inputValue } } as React.ChangeEvent<HTMLInputElement>);
      }
    }
  }, [inputValue, suggestions, localSuggestions, handleInputChange]);

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

  // Force a retry with local search if Google search fails
  useEffect(() => {
    if (searchAttempts > 0 && inputValue && !suggestions.length && !localSuggestions.length && !isLoading) {
      console.log("No suggestions found after search attempt, trying local search");
      fallbackToLocalSearch(inputValue);
    }
  }, [searchAttempts, suggestions.length, localSuggestions.length, inputValue, isLoading]);

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
                <div className="px-4 py-2 text-gray-500">No locations found. Please try a different search term.</div>
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
                <div className="px-4 py-2 text-gray-500">No locations found. Please try a different search term.</div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
