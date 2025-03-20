
import { useState, useEffect, useRef, useCallback } from 'react';
import { useGoogleMaps } from './useGoogleMaps';
import { toast } from 'sonner';

interface PlacesAutocompleteOptions {
  debounceTime?: number;
  radius?: number; 
  country?: string;
}

export function usePlacesAutocomplete(options: PlacesAutocompleteOptions = {}) {
  const { isLoaded, google } = useGoogleMaps();
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const autocompleteInitialized = useRef<boolean>(false);
  const initializationAttempts = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const MAX_INITIALIZATION_ATTEMPTS = 3;
  const debounceTime = options.debounceTime || 300;

  // Initialize services
  useEffect(() => {
    if (!isLoaded || autocompleteInitialized.current) return;
    
    const initializeServices = () => {
      if (!google?.maps?.places) {
        if (initializationAttempts.current < MAX_INITIALIZATION_ATTEMPTS) {
          console.warn("Google Places API not available yet, retrying...");
          initializationAttempts.current++;
          setTimeout(initializeServices, 1000);
        } else {
          console.error("Failed to initialize Places services after multiple attempts");
          toast.error("Maps services are temporarily unavailable");
        }
        return;
      }
      
      try {
        // Initialize autocomplete service
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        
        // Initialize places service with existing map-canvas element
        const mapCanvas = document.getElementById('map-canvas');
        if (mapCanvas) {
          placesServiceRef.current = new google.maps.places.PlacesService(mapCanvas as HTMLDivElement);
        } else {
          console.warn("No map-canvas element found for PlacesService");
        }
        
        autocompleteInitialized.current = true;
        console.log("Places services initialization complete");
      } catch (error) {
        console.error("Error initializing Places services:", error);
        
        if (initializationAttempts.current < MAX_INITIALIZATION_ATTEMPTS) {
          initializationAttempts.current++;
          setTimeout(initializeServices, 1000);
        }
      }
    };
    
    initializeServices();
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isLoaded, google]);

  // Get place details from place ID
  const getPlaceDetails = useCallback((placeId: string): Promise<google.maps.places.PlaceResult> => {
    return new Promise((resolve, reject) => {
      if (!placesServiceRef.current) {
        reject(new Error('Places service not initialized'));
        return;
      }
      
      placesServiceRef.current.getDetails(
        {
          placeId,
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

  // Search for places with debounce
  const getPlacePredictions = useCallback((
    query: string, 
    bounds?: google.maps.LatLngBounds
  ): Promise<google.maps.places.AutocompletePrediction[]> => {
    if (!query?.trim()) {
      setSuggestions([]);
      setIsLoading(false);
      return Promise.resolve([]);
    }
    
    return new Promise((resolve, reject) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      setIsLoading(true);
      
      debounceTimerRef.current = setTimeout(() => {
        if (!autocompleteServiceRef.current) {
          setIsLoading(false);
          reject(new Error('Autocomplete service not initialized'));
          return;
        }
        
        const requestOptions: google.maps.places.AutocompletionRequest = {
          input: query,
          componentRestrictions: { country: options.country || 'in' },
          types: ['geocode', 'establishment']
        };
        
        if (bounds) {
          requestOptions.bounds = bounds;
        }
        
        autocompleteServiceRef.current.getPlacePredictions(
          requestOptions,
          (results, status) => {
            setIsLoading(false);
            
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              setSuggestions(results);
              resolve(results);
            } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              setSuggestions([]);
              resolve([]);
            } else {
              console.error("Autocomplete request failed:", status);
              setSuggestions([]);
              reject(new Error(`Autocomplete request failed: ${status}`));
            }
          }
        );
      }, debounceTime);
    });
  }, [options.country, debounceTime]);

  return {
    suggestions,
    isLoading,
    getPlacePredictions,
    getPlaceDetails,
    isInitialized: autocompleteInitialized.current
  };
}
