
import { createMapCanvas } from '@/utils/googleMapsUtils';

/**
 * Attempts to initialize the Places service
 */
export function initializePlacesService(
  google: typeof window.google | undefined, 
  autocompleteServiceRef: React.MutableRefObject<google.maps.places.AutocompleteService | null>,
  placesServiceRef: React.MutableRefObject<google.maps.places.PlacesService | null>
): boolean {
  if (!google?.maps) return false;
  
  try {
    console.log("Initializing Places services");
    
    // Check if Places API is available
    if (!google.maps.places) {
      console.warn("Google Maps Places API not available yet");
      return false;
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
    
    // If either service was successfully initialized
    return !!(autocompleteServiceRef.current || placesServiceRef.current);
  } catch (error) {
    console.error("Error initializing Places services:", error);
    return false;
  }
}

/**
 * Creates a request options object for Places autocomplete
 */
export function createAutocompleteRequest(
  query: string,
  bounds?: google.maps.LatLngBounds,
  options?: { country?: string; vizagOnly?: boolean }
): google.maps.places.AutocompletionRequest {
  const requestOptions: google.maps.places.AutocompletionRequest = {
    input: query,
    componentRestrictions: { country: options?.country || 'in' },
    // Using the broadest set of types for more results
    types: ['geocode', 'establishment', 'address', 'regions', 'cities', '(regions)']
  };
  
  if (bounds) {
    requestOptions.bounds = bounds;
    
    // Always setting strictBounds to false to expand search area
    (requestOptions as any).strictBounds = false;
  }
  
  return requestOptions;
}
