
import { useState, useEffect, useRef, useCallback } from 'react';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';
import { toast } from 'sonner';
import { Location } from '@/lib/locationData';
import { isLocationInVizag } from '@/lib/locationUtils';
import { searchLocations } from '@/lib/locationData';
import { getInitialInputValue, getDistanceFromLatLonInKm } from './locationUtils';

export function useLocationInput(
  value: google.maps.places.AutocompletePrediction | Location | null | undefined,
  onLocationChange: (location: Location) => void,
  isPickupLocation: boolean = false
) {
  const [inputValue, setInputValue] = useState<string>('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [localSuggestions, setLocalSuggestions] = useState<Location[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [useLocalSuggestions, setUseLocalSuggestions] = useState<boolean>(false);
  const [searchAttempts, setSearchAttempts] = useState<number>(0);
  
  const { isLoaded, google, placesInitialized } = useGoogleMaps();
  const {
    suggestions: autocompleteSuggestions,
    isLoading: isAutocompleteLoading,
    getPlacePredictions,
    getPlaceDetails,
    isInitialized: isAutocompleteInitialized,
    forceInitialization
  } = usePlacesAutocomplete({
    country: 'in', // Always restrict to India
    vizagOnly: isPickupLocation // Only restrict to Vizag for pickup locations
  });

  useEffect(() => {
    if (value) {
      const newInputValue = getInitialInputValue(value);
      if (newInputValue !== inputValue) {
        setInputValue(newInputValue);
      }
    }
  }, [value, inputValue]);

  useEffect(() => {
    if (isLoaded && google && !isAutocompleteInitialized) {
      console.log("Forcing Places initialization in LocationInput");
      forceInitialization();
    }
  }, [isLoaded, google, isAutocompleteInitialized, forceInitialization]);

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
    
    const useGoogle = isLoaded && google && (placesInitialized || isAutocompleteInitialized);
    
    if (useGoogle) {
      try {
        console.log("Using Google Places API for search");
        
        let bounds;
        
        if (isPickupLocation) {
          // For pickup locations, set a wider radius around Visakhapatnam (approximately 20km)
          bounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(17.5615, 83.0315), // SW corner - expanded
            new google.maps.LatLng(17.8815, 83.4115)  // NE corner - expanded
          );
        } else {
          // For drop locations, use all of India
          bounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(8.0, 68.0), // SW corner of India
            new google.maps.LatLng(37.0, 97.0)  // NE corner of India
          );
        }
        
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

  const fallbackToLocalSearch = useCallback((query: string) => {
    const localResults = searchLocations(query, isPickupLocation);
    console.log(`Using fallback location search: found ${localResults.length} results`);
    setLocalSuggestions(localResults);
    setUseLocalSuggestions(true);
    setShowSuggestions(true);
    setIsLoading(false);
  }, [isPickupLocation]);

  const handleSuggestionClick = useCallback(async (suggestion: google.maps.places.AutocompletePrediction) => {
    setInputValue(suggestion.description);
    setShowSuggestions(false);
    setIsLoading(true);
    
    try {
      const placeDetails = await getPlaceDetails(suggestion.place_id);
      
      if (placeDetails && placeDetails.geometry) {
        const { lat, lng } = placeDetails.geometry.location.toJSON();
        
        let isInVizag = false;
        
        if (isPickupLocation) {
          const vizagCenter = { lat: 17.6868, lng: 83.2185 };
          const distance = getDistanceFromLatLonInKm(lat, lng, vizagCenter.lat, vizagCenter.lng);
          isInVizag = distance <= 25; // Increased from original 20km
          
          if (!isInVizag) {
            toast.error("Pickup location must be within 25km of Visakhapatnam", {
              duration: 3000
            });
            setIsLoading(false);
            return;
          }
        }
        
        const location: Location = {
          id: suggestion.place_id,
          name: suggestion.structured_formatting ? 
                suggestion.structured_formatting.main_text : 
                (placeDetails.name || suggestion.description),
          address: placeDetails.formatted_address || suggestion.description,
          lat,
          lng,
          type: 'other', // Changed from 'custom' to 'other' to match type definition
          isInVizag,
          city: extractCityFromPlaceDetails(placeDetails) || 'Visakhapatnam',
          state: extractStateFromPlaceDetails(placeDetails) || 'Andhra Pradesh',
          popularityScore: 50
        };
        
        console.log("Selected location details:", location);
        onLocationChange(location);
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
      
      const basicLocation: Location = {
        id: suggestion.place_id || `loc_${Date.now()}`,
        name: suggestion.structured_formatting ? 
              suggestion.structured_formatting.main_text : 
              suggestion.description,
        address: suggestion.description,
        lat: 0,
        lng: 0,
        type: 'other', // Changed from 'custom' to 'other' to match type definition
        isInVizag: isPickupLocation,
        city: 'Visakhapatnam',
        state: 'Andhra Pradesh',
        popularityScore: 50
      };
      
      console.log("Created basic location from suggestion:", basicLocation);
      onLocationChange(basicLocation);
    } finally {
      setIsLoading(false);
    }
  }, [getPlaceDetails, onLocationChange, isPickupLocation]);

  const handleLocalSuggestionClick = useCallback((location: Location) => {
    setInputValue(location.name || location.address);
    setShowSuggestions(false);
    console.log("Selected local location:", location);
    
    if (isPickupLocation && !location.isInVizag) {
      toast.error("Pickup location must be within Visakhapatnam", {
        duration: 3000
      });
      return;
    }
    
    onLocationChange(location);
  }, [onLocationChange, isPickupLocation]);

  const handleInputFocus = useCallback(() => {
    if (inputValue.trim()) {
      setShowSuggestions(true);
      
      // If no suggestions are currently shown, trigger a search
      if ((!suggestions || suggestions.length === 0) && 
          (!localSuggestions || localSuggestions.length === 0)) {
        handleInputChange({ target: { value: inputValue } } as React.ChangeEvent<HTMLInputElement>);
      }
    }
  }, [inputValue, suggestions, localSuggestions, handleInputChange]);

  useEffect(() => {
    if (searchAttempts > 0 && inputValue && !suggestions.length && !localSuggestions.length && !isLoading) {
      console.log("No suggestions found after search attempt, trying local search");
      fallbackToLocalSearch(inputValue);
    }
  }, [searchAttempts, suggestions.length, localSuggestions.length, inputValue, isLoading, fallbackToLocalSearch]);

  return {
    inputValue,
    suggestions,
    localSuggestions,
    showSuggestions,
    isLoading,
    useLocalSuggestions,
    setShowSuggestions,
    handleInputChange,
    handleInputFocus,
    handleSuggestionClick,
    handleLocalSuggestionClick
  };
}

// Helper functions to extract city and state from place details
function extractCityFromPlaceDetails(placeDetails: google.maps.places.PlaceResult): string {
  if (!placeDetails.address_components) return '';
  
  // Look for locality (city)
  const cityComponent = placeDetails.address_components.find(component => 
    component.types.includes('locality')
  );
  
  // Fall back to administrative_area_level_2 (district)
  if (!cityComponent) {
    const districtComponent = placeDetails.address_components.find(component => 
      component.types.includes('administrative_area_level_2')
    );
    if (districtComponent) return districtComponent.long_name;
  } else {
    return cityComponent.long_name;
  }
  
  return '';
}

function extractStateFromPlaceDetails(placeDetails: google.maps.places.PlaceResult): string {
  if (!placeDetails.address_components) return '';
  
  // Look for administrative_area_level_1 (state)
  const stateComponent = placeDetails.address_components.find(component => 
    component.types.includes('administrative_area_level_1')
  );
  
  return stateComponent ? stateComponent.long_name : '';
}
