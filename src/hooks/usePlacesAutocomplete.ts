
import { useState, useEffect, useRef, useCallback } from 'react';
import { useGoogleMaps } from './useGoogleMaps';
import { toast } from 'sonner';
import { createMapCanvas } from '@/utils/googleMapsUtils';

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
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const initializationAttempts = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const MAX_INITIALIZATION_ATTEMPTS = 5;
  const debounceTime = options.debounceTime || 300;

  // Initialize services
  useEffect(() => {
    if (!isLoaded || !google?.maps) return;
    
    const initializeServices = () => {
      // Clear any previous services
      autocompleteServiceRef.current = null;
      placesServiceRef.current = null;
      
      try {
        console.log("Initializing Places services in usePlacesAutocomplete hook");
        
        // Check if Places API is available
        if (!google.maps.places) {
          throw new Error("Google Maps Places API not available");
        }
        
        // Initialize autocomplete service
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        
        // Get or create map canvas for places service
        const mapCanvas = createMapCanvas();
        if (!mapCanvas) {
          throw new Error("Failed to create map canvas for Places service");
        }
        
        // Initialize places service
        placesServiceRef.current = new google.maps.places.PlacesService(mapCanvas);
        
        // Set initialization flag
        setIsInitialized(true);
        initializationAttempts.current = 0;
        
        console.log("Places services initialized successfully");
      } catch (error) {
        console.error("Error initializing Places services:", error);
        
        if (initializationAttempts.current < MAX_INITIALIZATION_ATTEMPTS) {
          initializationAttempts.current++;
          console.log(`Retrying Places initialization (${initializationAttempts.current}/${MAX_INITIALIZATION_ATTEMPTS})`);
          setTimeout(initializeServices, 800);
        } else {
          console.error(`Failed to initialize Places services after ${MAX_INITIALIZATION_ATTEMPTS} attempts`);
          toast.error("Location search is temporarily unavailable", { id: "places-init-failed" });
        }
      }
    };
    
    // Call initialization function
    initializeServices();
    
    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isLoaded, google]);

  // Get place details from place ID
  const getPlaceDetails = useCallback((placeId: string): Promise<google.maps.places.PlaceResult> => {
    return new Promise((resolve, reject) => {
      // If Places service is not initialized, try to initialize it on-demand
      if (!placesServiceRef.current && google?.maps?.places) {
        const mapCanvas = createMapCanvas();
        if (mapCanvas) {
          try {
            placesServiceRef.current = new google.maps.places.PlacesService(mapCanvas);
          } catch (error) {
            console.error("Failed to initialize Places service on-demand:", error);
          }
        }
      }
      
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
  }, [google]);

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
        // If autocomplete service is not initialized, try to initialize it on-demand
        if (!autocompleteServiceRef.current && google?.maps?.places) {
          try {
            autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
            setIsInitialized(true);
          } catch (error) {
            console.error("Failed to initialize Autocomplete service on-demand:", error);
          }
        }
        
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
  }, [google, options.country, debounceTime]);

  // Helper to force initialization
  const forceInitialization = useCallback(() => {
    if (google?.maps?.places && !isInitialized) {
      try {
        // Initialize autocomplete service
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        
        // Initialize places service
        const mapCanvas = createMapCanvas();
        if (mapCanvas) {
          placesServiceRef.current = new google.maps.places.PlacesService(mapCanvas);
        }
        
        setIsInitialized(true);
        return true;
      } catch (error) {
        console.error("Error in force initialization:", error);
        return false;
      }
    }
    return false;
  }, [google, isInitialized]);

  return {
    suggestions,
    isLoading,
    getPlacePredictions,
    getPlaceDetails,
    isInitialized,
    forceInitialization
  };
}
