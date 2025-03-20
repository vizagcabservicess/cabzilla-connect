
import React from 'react';
import { Location } from '@/lib/locationData';
import { MapPin, Navigation } from 'lucide-react';

interface SuggestionsListProps {
  showSuggestions: boolean;
  useLocalSuggestions: boolean;
  localSuggestions: Location[];
  googleSuggestions: google.maps.places.AutocompletePrediction[];
  onLocalSuggestionClick: (location: Location) => void;
  onGoogleSuggestionClick: (suggestion: google.maps.places.AutocompletePrediction) => void;
}

export const SuggestionsList: React.FC<SuggestionsListProps> = ({
  showSuggestions,
  useLocalSuggestions,
  localSuggestions,
  googleSuggestions,
  onLocalSuggestionClick,
  onGoogleSuggestionClick
}) => {
  if (!showSuggestions) return null;

  const hasLocalSuggestions = localSuggestions && localSuggestions.length > 0;
  const hasGoogleSuggestions = googleSuggestions && googleSuggestions.length > 0;
  const noSuggestions = !hasLocalSuggestions && !hasGoogleSuggestions;

  if (noSuggestions) return null;

  return (
    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
      {useLocalSuggestions && hasLocalSuggestions ? (
        <div className="py-1">
          {localSuggestions.map((location) => (
            <div
              key={location.id}
              className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex items-start"
              onClick={() => onLocalSuggestionClick(location)}
            >
              <MapPin className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0 text-gray-500" />
              <div>
                <div className="font-medium text-sm">{location.name}</div>
                <div className="text-xs text-gray-500">{location.address}</div>
              </div>
            </div>
          ))}
        </div>
      ) : hasGoogleSuggestions ? (
        <div className="py-1">
          {googleSuggestions.map((suggestion) => (
            <div
              key={suggestion.place_id}
              className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex items-start"
              onClick={() => onGoogleSuggestionClick(suggestion)}
            >
              <Navigation className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0 text-gray-500" />
              <div>
                {suggestion.structured_formatting ? (
                  <>
                    <div className="font-medium text-sm">{suggestion.structured_formatting.main_text}</div>
                    <div className="text-xs text-gray-500">{suggestion.structured_formatting.secondary_text}</div>
                  </>
                ) : (
                  <div className="text-sm">{suggestion.description}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
