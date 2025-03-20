
import { useState, useRef, useCallback } from 'react';
import { createAutocompleteRequest } from './placesUtils';

/**
 * Hook for handling place predictions with debounce
 */
export function usePredictions(
  google: typeof window.google | undefined,
  autocompleteServiceRef: React.MutableRefObject<google.maps.places.AutocompleteService | null>,
  debounceTime: number = 300
) {
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const getPlacePredictions = useCallback((
    query: string, 
    bounds?: google.maps.LatLngBounds,
    options?: { country?: string; vizagOnly?: boolean }
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
        
        const requestOptions = createAutocompleteRequest(query, bounds, options);
        // Always turn off strictBounds for more results
        (requestOptions as any).strictBounds = false;
        
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
                console.log("No autocomplete results found, trying without restrictions");
                
                // Try without bounds and with broader types
                const broadRequest = {
                  input: query,
                  componentRestrictions: { country: options?.country || 'in' },
                  types: ['geocode', 'establishment', 'address', 'regions', 'cities']
                };
                
                autocompleteServiceRef.current?.getPlacePredictions(
                  broadRequest,
                  (broadResults, broadStatus) => {
                    if (broadStatus === google.maps.places.PlacesServiceStatus.OK && broadResults && broadResults.length > 0) {
                      console.log("Broader search results:", broadResults.length);
                      setSuggestions(broadResults);
                      resolve(broadResults);
                    } else {
                      console.log("All searches returned zero results");
                      setSuggestions([]);
                      resolve([]);
                    }
                  }
                );
              } else {
                console.error("Autocomplete request failed:", status);
                
                // Try one more time without any restrictions
                const fallbackRequest = {
                  input: query
                };
                
                autocompleteServiceRef.current?.getPlacePredictions(
                  fallbackRequest,
                  (fallbackResults, fallbackStatus) => {
                    if (fallbackStatus === google.maps.places.PlacesServiceStatus.OK && fallbackResults && fallbackResults.length > 0) {
                      console.log("Fallback search results:", fallbackResults.length);
                      setSuggestions(fallbackResults);
                      resolve(fallbackResults);
                    } else {
                      console.log("All searches failed:", fallbackStatus);
                      setSuggestions([]);
                      resolve([]);
                    }
                  }
                );
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
  }, [google, autocompleteServiceRef, debounceTime]);

  return {
    suggestions,
    isLoading,
    getPlacePredictions
  };
}
