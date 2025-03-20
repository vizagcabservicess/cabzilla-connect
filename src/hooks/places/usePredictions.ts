
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
  const searchAttemptCount = useRef<number>(0);
  
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
    searchAttemptCount.current = 0;
    
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
        
        const trySearch = (attempt: number = 0, searchType: 'normal' | 'broad' | 'unrestricted' = 'normal') => {
          // Check if query is still relevant
          if (query !== lastQuery.current) {
            setIsLoading(false);
            resolve([]);
            return;
          }
          
          // Create appropriate request based on search type
          let requestOptions;
          
          if (searchType === 'broad') {
            // Create a broader search with minimal restrictions
            requestOptions = {
              input: query,
              types: [],
              componentRestrictions: options?.country ? { country: options.country } : undefined
            };
            
            if (bounds) {
              requestOptions.bounds = bounds;
              requestOptions.strictBounds = false;
            }
            
          } else if (searchType === 'unrestricted') {
            // Final attempt with absolute minimum restrictions
            requestOptions = {
              input: query,
              // No types, no restrictions at all
            };
          } else {
            // Normal search with standard options
            requestOptions = createAutocompleteRequest(query, bounds, options);
          }
          
          try {
            console.log(`Making Places autocomplete request (attempt ${attempt+1}, type: ${searchType}): ${query}`);
            
            autocompleteServiceRef.current!.getPlacePredictions(
              requestOptions,
              (results, status) => {
                // Check if this request is still relevant
                if (query !== lastQuery.current) {
                  setIsLoading(false);
                  resolve([]);
                  return;
                }
                
                if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                  console.log(`${searchType} search found ${results.length} matches for "${query}"`);
                  setSuggestions(results);
                  setIsLoading(false);
                  resolve(results);
                } else {
                  console.log(`${searchType} search found no results (status: ${status})`);
                  
                  // Try next search type if available
                  if (searchType === 'normal') {
                    console.log("Trying broader search");
                    trySearch(attempt + 1, 'broad');
                  } else if (searchType === 'broad' && attempt < 1) {
                    console.log("Trying unrestricted search");
                    trySearch(attempt + 1, 'unrestricted');
                  } else {
                    // No more search types or attempts left
                    console.log("No results found in any search attempt");
                    setSuggestions([]);
                    setIsLoading(false);
                    resolve([]);
                  }
                }
              }
            );
          } catch (error) {
            console.error(`Error in ${searchType} search attempt:`, error);
            
            if (searchType === 'normal') {
              trySearch(attempt + 1, 'broad');
            } else if (searchType === 'broad') {
              trySearch(attempt + 1, 'unrestricted');
            } else {
              setIsLoading(false);
              setSuggestions([]);
              reject(error);
            }
          }
        };
        
        // Start with normal search
        trySearch(0, 'normal');
        
      }, debounceTime);
    });
  }, [google, autocompleteServiceRef, debounceTime]);

  return {
    suggestions,
    isLoading,
    getPlacePredictions
  };
}
