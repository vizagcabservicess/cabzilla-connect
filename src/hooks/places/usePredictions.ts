
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
  const lastQuery = useRef<string>('');
  
  const getPlacePredictions = useCallback((
    query: string, 
    bounds?: google.maps.LatLngBounds,
    options?: { country?: string; vizagOnly?: boolean }
  ): Promise<google.maps.places.AutocompletePrediction[]> => {
    // Don't search if the query is empty
    if (!query?.trim()) {
      setSuggestions([]);
      setIsLoading(false);
      return Promise.resolve([]);
    }
    
    // Store the current query for comparison later
    lastQuery.current = query;
    
    return new Promise((resolve, reject) => {
      // Clear any existing timer to avoid multiple simultaneous requests
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      setIsLoading(true);
      
      debounceTimerRef.current = setTimeout(() => {
        // Check if this request is still relevant (query hasn't changed)
        if (query !== lastQuery.current) {
          setIsLoading(false);
          resolve([]);
          return;
        }
        
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
        
        // Create a request with all necessary options
        const requestOptions = createAutocompleteRequest(query, bounds, options);
        
        try {
          console.log("Making Places autocomplete request:", query);
          autocompleteServiceRef.current.getPlacePredictions(
            requestOptions,
            (results, status) => {
              // Check if this request is still relevant (query hasn't changed)
              if (query !== lastQuery.current) {
                setIsLoading(false);
                resolve([]);
                return;
              }
              
              setIsLoading(false);
              
              if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                console.log(`Found ${results.length} matches for "${query}"`);
                setSuggestions(results);
                resolve(results);
              } else {
                console.log(`No results found for "${query}", trying broader search`);
                
                // Try a much broader search without any restrictions
                const broadRequest = {
                  input: query,
                  // Remove all restrictions for a broad search
                  types: [],
                  componentRestrictions: options?.country ? { country: options.country } : undefined
                };
                
                autocompleteServiceRef.current?.getPlacePredictions(
                  broadRequest,
                  (broadResults, broadStatus) => {
                    if (broadStatus === google.maps.places.PlacesServiceStatus.OK && broadResults && broadResults.length > 0) {
                      console.log(`Broader search found ${broadResults.length} results`);
                      setSuggestions(broadResults);
                      resolve(broadResults);
                    } else {
                      console.log("No results found in broader search either, trying unrestricted search");
                      
                      // Final attempt with minimum restrictions
                      const finalRequest = {
                        input: query
                      };
                      
                      autocompleteServiceRef.current?.getPlacePredictions(
                        finalRequest,
                        (finalResults, finalStatus) => {
                          if (finalStatus === google.maps.places.PlacesServiceStatus.OK && finalResults && finalResults.length > 0) {
                            console.log(`Final search found ${finalResults.length} results`);
                            setSuggestions(finalResults);
                            resolve(finalResults);
                          } else {
                            console.log("No results found in any search attempt");
                            setSuggestions([]);
                            resolve([]);
                          }
                        }
                      );
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
