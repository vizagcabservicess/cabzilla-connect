
import { useState, useEffect, useRef, useCallback } from 'react';
import { useGoogleMaps } from './useGoogleMaps';
import { toast } from 'sonner';
import { PlacesAutocompleteOptions, PlacesServiceResult } from './places/types';
import { initializePlacesService } from './places/placesUtils';
import { usePlaceDetails } from './places/usePlaceDetails';
import { usePredictions } from './places/usePredictions';

export function usePlacesAutocomplete(options: PlacesAutocompleteOptions = {}): PlacesServiceResult {
  const { isLoaded, google, placesInitialized } = useGoogleMaps();
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const initializationAttempts = useRef<number>(0);
  const hasLoggedError = useRef<boolean>(false);
  
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  
  const MAX_INITIALIZATION_ATTEMPTS = 5;
  const debounceTime = options.debounceTime || 300;

  // Get prediction functionality from the usePredictions hook
  const { 
    suggestions,
    isLoading,
    getPlacePredictions: basePredictions
  } = usePredictions(google, autocompleteServiceRef, debounceTime);

  // Get place details functionality
  const { getPlaceDetails } = usePlaceDetails(google);

  // Initialize services with better error handling
  useEffect(() => {
    if (!isLoaded || !google?.maps) return;
    
    const initializeServices = () => {
      try {
        const success = initializePlacesService(google, autocompleteServiceRef, placesServiceRef);
        
        if (success) {
          setIsInitialized(true);
          initializationAttempts.current = 0;
          hasLoggedError.current = false;
          console.log("Places services initialized successfully");
        } else {
          throw new Error("Failed to initialize any Places services");
        }
      } catch (error) {
        console.error("Error initializing Places services:", error);
        
        if (initializationAttempts.current < MAX_INITIALIZATION_ATTEMPTS) {
          initializationAttempts.current++;
          console.log(`Retrying Places initialization (${initializationAttempts.current}/${MAX_INITIALIZATION_ATTEMPTS})`);
          setTimeout(initializeServices, 800);
        } else if (!hasLoggedError.current) {
          console.error(`Failed to initialize Places services after ${MAX_INITIALIZATION_ATTEMPTS} attempts`);
          hasLoggedError.current = true;
        }
      }
    };
    
    // Call initialization function
    initializeServices();
    
    // Cleanup function
    return () => {
      if (isLoading) {
        // cancel any pending requests
      }
    };
  }, [isLoaded, google, placesInitialized, isLoading]);

  // Wrapper for getPlacePredictions to apply options
  const getPlacePredictions = useCallback((
    query: string, 
    bounds?: google.maps.LatLngBounds
  ): Promise<google.maps.places.AutocompletePrediction[]> => {
    return basePredictions(query, bounds, {
      country: options.country,
      vizagOnly: options.vizagOnly
    });
  }, [basePredictions, options.country, options.vizagOnly]);

  // Helper to force initialization
  const forceInitialization = useCallback(() => {
    if (google?.maps?.places && !isInitialized) {
      const success = initializePlacesService(google, autocompleteServiceRef, placesServiceRef);
      if (success) {
        setIsInitialized(true);
        hasLoggedError.current = false;
        return true;
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
