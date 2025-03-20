
import { Location } from '@/lib/locationData';

export interface LocationInputProps {
  label: string;
  placeholder: string;
  value?: google.maps.places.AutocompletePrediction | Location | null;
  onLocationChange: (location: Location) => void;
  isPickupLocation?: boolean;
  isAirportTransfer?: boolean;
  readOnly?: boolean;
  className?: string;
}

export interface SuggestionsListProps {
  showSuggestions: boolean;
  useLocalSuggestions: boolean;
  localSuggestions: Location[];
  googleSuggestions: google.maps.places.AutocompletePrediction[];
  onLocalSuggestionClick: (location: Location) => void;
  onGoogleSuggestionClick: (suggestion: google.maps.places.AutocompletePrediction) => void;
}

// Ensure the compiler knows that structured_formatting exists on the prediction object
declare global {
  namespace google.maps.places {
    interface AutocompletePrediction {
      structured_formatting: {
        main_text: string;
        main_text_matched_substrings: Array<{
          length: number;
          offset: number;
        }>;
        secondary_text: string;
      };
    }
  }
}
