
import { Location as ApiLocation } from '@/types/api';

export interface PlacesAutocompleteOptions {
  debounceTime?: number;
  radius?: number; 
  country?: string;
  vizagOnly?: boolean;
}

export interface PlacesServiceResult {
  suggestions: google.maps.places.AutocompletePrediction[];
  isLoading: boolean;
  getPlacePredictions: (query: string, bounds?: google.maps.LatLngBounds) => Promise<google.maps.places.AutocompletePrediction[]>;
  getPlaceDetails: (placeId: string) => Promise<google.maps.places.PlaceResult>;
  isInitialized: boolean;
  forceInitialization: () => boolean;
}
