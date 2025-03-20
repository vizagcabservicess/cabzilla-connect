
import { useState, useEffect, useRef, useCallback } from 'react';
import { useGoogleMaps } from './useGoogleMaps';
import { toast } from 'sonner';
import { createMapCanvas } from '@/utils/googleMapsUtils';

interface PlacesAutocompleteOptions {
  debounceTime?: number;
  radius?: number; 
  country?: string;
  vizagOnly?: boolean;
}

export function usePlacesAutocomplete(options: PlacesAutocompleteOptions = {}) {
  const { isLoaded, google, placesInitialized } = useGoogleMaps();
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const initializationAttempts = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoggedError = useRef<boolean>(false);
  
  const MAX_INITIALIZATION_ATTEMPTS = 5;
  const debounceTime = options.debounceTime || 300;

  // Initialize services with better error handling
  useEffect(() => {
    if (!isLoaded || !google?.maps) return;
    
    const initializeServices = () => {
      try {
        console.log("Initializing Places services in usePlacesAutocomplete hook");
        
        // Check if Places API is available
        if (!google.maps.places) {
          if (initializationAttempts.current < MAX_INITIALIZATION_ATTEMPTS) {
            throw new Error("Google Maps Places API not available yet");
          } else {
            console.warn("Places API unavailable after max attempts");
            return;
          }
        }
        
        // Initialize autocomplete service
        try {
          autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
          console.log("AutocompleteService initialized successfully");
        } catch (e) {
          console.error("Failed to initialize AutocompleteService:", e);
        }
        
        // Get or create map canvas for places service
        const mapCanvas = createMapCanvas();
        if (!mapCanvas) {
          console.error("Failed to create map canvas for Places service");
        } else {
          // Initialize places service
          try {
            placesServiceRef.current = new google.maps.places.PlacesService(mapCanvas);
            console.log("PlacesService initialized successfully");
          } catch (e) {
            console.error("Failed to initialize PlacesService:", e);
          }
        }
        
        // If either service was successfully initialized, mark as initialized
        if (autocompleteServiceRef.current || placesServiceRef.current) {
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
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isLoaded, google, placesInitialized]);

  // Get place details from place ID with better error handling
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
            console.error("Places detail request failed with status:", status);
            reject(new Error(`Places detail request failed: ${status}`));
          }
        }
      );
    });
  }, [google]);

  // Search for places with debounce and improved error handling
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
            console.log("Initializing AutocompleteService on-demand");
            autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
            setIsInitialized(true);
          } catch (error) {
            console.error("Failed to initialize Autocomplete service on-demand:", error);
          }
        }
        
        if (!autocompleteServiceRef.current) {
          console.log("AutocompleteService not available, using fallback");
          setIsLoading(false);
          reject(new Error('Autocomplete service not initialized'));
          return;
        }
        
        const requestOptions: google.maps.places.AutocompletionRequest = {
          input: query,
          componentRestrictions: { country: options.country || 'in' },
          types: ['geocode', 'establishment', 'address', 'regions', 'cities']
        };
        
        if (bounds) {
          requestOptions.bounds = bounds;
          
          // Only set strictBounds for Vizag pickup locations
          if (options.vizagOnly) {
            requestOptions.strictBounds = true;
          }
        }
        
        try {
          console.log("Making Places autocomplete request:", query);
          autocompleteServiceRef.current.getPlacePredictions(
            requestOptions,
            (results, status) => {
              setIsLoading(false);
              
              if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                console.log("Autocomplete results:", results.length);
                setSuggestions(results);
                resolve(results);
              } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                console.log("No autocomplete results found");
                setSuggestions([]);
                resolve([]);
              } else {
                console.error("Autocomplete request failed:", status);
                
                // Try one more time without bounds restrictions if it failed
                if (requestOptions.strictBounds || requestOptions.bounds) {
                  console.log("Retrying without bounds restrictions");
                  
                  delete requestOptions.strictBounds;
                  delete requestOptions.bounds;
                  
                  autocompleteServiceRef.current?.getPlacePredictions(
                    requestOptions,
                    (retryResults, retryStatus) => {
                      if (retryStatus === google.maps.places.PlacesServiceStatus.OK && retryResults && retryResults.length > 0) {
                        console.log("Retry autocomplete results:", retryResults.length);
                        setSuggestions(retryResults);
                        resolve(retryResults);
                      } else {
                        console.log("Retry also failed:", retryStatus);
                        setSuggestions([]);
                        resolve([]);
                      }
                    }
                  );
                } else {
                  setSuggestions([]);
                  reject(new Error(`Autocomplete request failed: ${status}`));
                }
              }
            }
          );
        } catch (error) {
          console.error("Error making autocomplete request:", error);
          setIsLoading(false);
          setSuggestions([]);
          reject(error);
        }
      }, debounceTime);
    });
  }, [google, options.country, options.vizagOnly, debounceTime]);

  // Helper to force initialization
  const forceInitialization = useCallback(() => {
    if (google?.maps?.places && !isInitialized) {
      try {
        console.log("Force initializing Places services");
        // Initialize autocomplete service
        try {
          autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
          console.log("AutocompleteService force initialized successfully");
        } catch (e) {
          console.error("Error force initializing AutocompleteService:", e);
        }
        
        // Initialize places service
        const mapCanvas = createMapCanvas();
        if (mapCanvas) {
          try {
            placesServiceRef.current = new google.maps.places.PlacesService(mapCanvas);
            console.log("PlacesService force initialized successfully");
          } catch (e) {
            console.error("Error force initializing PlacesService:", e);
          }
        }
        
        // If either service was successfully initialized, mark as initialized
        if (autocompleteServiceRef.current || placesServiceRef.current) {
          setIsInitialized(true);
          hasLoggedError.current = false;
          return true;
        }
      } catch (error) {
        console.error("Error in force initialization:", error);
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
