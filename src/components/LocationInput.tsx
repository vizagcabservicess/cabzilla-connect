
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2 } from 'lucide-react';
import { isVizagLocation, apDestinations, vizagLocations } from '@/lib/locationData';
import { toast } from 'sonner';

type LocationInputProps = {
  label: string;
  placeholder: string;
  value?: google.maps.places.AutocompletePrediction | null;
  onLocationChange: (location: any) => void;
  isPickupLocation?: boolean;
  isAirportTransfer?: boolean;
  readOnly?: boolean;
};

export function LocationInput({
  label,
  placeholder,
  value,
  onLocationChange,
  isPickupLocation = false,
  isAirportTransfer = false,
  readOnly = false
}: LocationInputProps) {
  const [inputValue, setInputValue] = useState<string>(value?.description || value?.structured_formatting?.main_text || '');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const { isLoaded, google } = useGoogleMaps();

  // Track if autocomplete has been initialized
  const autocompleteInitialized = useRef<boolean>(false);
  const initializationAttempts = useRef<number>(0);
  const MAX_INITIALIZATION_ATTEMPTS = 3;

  // Initialize autocomplete service
  useEffect(() => {
    const initializeAutocomplete = () => {
      if (!google || !google.maps || !google.maps.places) {
        console.warn("Google Maps Places API not available yet, retrying...");
        
        // Increment attempt counter and retry if under max attempts
        if (initializationAttempts.current < MAX_INITIALIZATION_ATTEMPTS) {
          initializationAttempts.current++;
          setTimeout(initializeAutocomplete, 1000);
        } else {
          console.error("Failed to initialize Google Places after multiple attempts");
          toast.error("Maps service is temporarily unavailable. Please try refreshing the page.");
        }
        return;
      }
      
      try {
        console.log("Initializing Google Places Autocomplete service");
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        
        // Initialize PlacesService if we have a valid DOM element
        const mapCanvas = document.getElementById('map-canvas');
        if (mapCanvas) {
          placesServiceRef.current = new google.maps.places.PlacesService(mapCanvas);
          console.log("Places Service initialized");
        } else {
          console.warn("No map-canvas element found for PlacesService");
          
          // Create map-canvas if it doesn't exist
          const newMapCanvas = document.createElement('div');
          newMapCanvas.id = 'map-canvas';
          newMapCanvas.style.display = 'none';
          newMapCanvas.style.width = '200px';
          newMapCanvas.style.height = '200px';
          document.body.appendChild(newMapCanvas);
          
          // Try again to initialize PlacesService
          placesServiceRef.current = new google.maps.places.PlacesService(newMapCanvas);
        }
        
        autocompleteInitialized.current = true;
        console.log("Autocomplete service initialization complete");
      } catch (error) {
        console.error("Error initializing Google Places:", error);
        
        // Retry initialization on error
        if (initializationAttempts.current < MAX_INITIALIZATION_ATTEMPTS) {
          initializationAttempts.current++;
          setTimeout(initializeAutocomplete, 1000);
        }
      }
    };

    if (isLoaded && !autocompleteInitialized.current) {
      initializeAutocomplete();
    }
    
    // Clean up
    return () => {
      autocompleteInitialized.current = false;
    };
  }, [isLoaded, google]);

  // Function to fetch place details
  const getPlaceDetails = useCallback((placeId: string) => {
    return new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
      if (!placesServiceRef.current) {
        reject(new Error('Places service not initialized'));
        return;
      }
      
      placesServiceRef.current.getDetails(
        {
          placeId: placeId,
          fields: ['name', 'formatted_address', 'geometry', 'address_components']
        },
        (result, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && result) {
            resolve(result);
          } else {
            reject(new Error(`Places detail request failed: ${status}`));
          }
        }
      );
    });
  }, []);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    if (!autocompleteServiceRef.current) {
      console.warn("Autocomplete service not initialized yet");
      
      // Try to initialize on demand
      if (google && google.maps && google.maps.places) {
        try {
          autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        } catch (error) {
          console.error("Failed to initialize autocomplete on demand:", error);
        }
      }
      
      if (!autocompleteServiceRef.current) {
        // Still not initialized, show error
        toast.error("Location search is temporarily unavailable");
        return;
      }
    }
    
    setIsLoading(true);
    
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
    
    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: value,
        bounds: bounds,
        componentRestrictions: { country: 'in' },
        types: ['geocode', 'establishment']
      },
      (results, status) => {
        setIsLoading(false);
        
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setSuggestions(results);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          
          if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            // No need to show error for zero results
            console.log("No suggestions found for:", value);
          } else {
            console.error("Autocomplete request failed:", status);
          }
        }
      }
    );
  }, [google, isPickupLocation]);

  // Handle suggestion selection
  const handleSuggestionClick = useCallback(async (suggestion: google.maps.places.AutocompletePrediction) => {
    setInputValue(suggestion.description);
    setShowSuggestions(false);
    setIsLoading(true);
    
    try {
      const placeDetails = await getPlaceDetails(suggestion.place_id);
      
      if (placeDetails && placeDetails.geometry) {
        const { lat, lng } = placeDetails.geometry.location.toJSON();
        
        const location = {
          id: suggestion.place_id,
          name: suggestion.structured_formatting?.main_text || placeDetails.name || suggestion.description,
          address: placeDetails.formatted_address || suggestion.description,
          lat,
          lng,
          type: 'custom',
          isInVizag: isVizagLocation({ lat, lng })
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

  // Effect to initialize input with value
  useEffect(() => {
    if (value) {
      if (typeof value === 'string') {
        setInputValue(value);
      } else if (value.description) {
        setInputValue(value.description);
      } else if (value.structured_formatting?.main_text) {
        setInputValue(value.structured_formatting.main_text);
      } else if ((value as any).name) {
        setInputValue((value as any).name);
      } else if ((value as any).address) {
        setInputValue((value as any).address);
      }
    }
  }, [value]);

  // Handle input focus to ensure autocomplete is initialized
  const handleInputFocus = useCallback(() => {
    // Re-initialize autocomplete service on focus if needed
    if (!autocompleteServiceRef.current && google && google.maps && google.maps.places) {
      try {
        console.log("Re-initializing autocomplete service on focus");
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        
        // Also re-initialize places service
        const mapCanvas = document.getElementById('map-canvas');
        if (mapCanvas) {
          placesServiceRef.current = new google.maps.places.PlacesService(mapCanvas);
        }
        
        autocompleteInitialized.current = true;
      } catch (error) {
        console.error("Failed to re-initialize autocomplete on focus:", error);
      }
    }
    
    setShowSuggestions(!!suggestions.length);
  }, [google, suggestions.length]);

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
    <div className="relative mb-4">
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
        
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.place_id}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="font-medium">{suggestion.structured_formatting?.main_text}</div>
                <div className="text-sm text-gray-500">{suggestion.structured_formatting?.secondary_text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
