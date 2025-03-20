
import React from 'react';
import { SuggestionsListProps } from './types';

export function SuggestionsList({
  showSuggestions,
  useLocalSuggestions,
  localSuggestions,
  googleSuggestions,
  onLocalSuggestionClick,
  onGoogleSuggestionClick
}: SuggestionsListProps) {
  if (!showSuggestions) {
    return null;
  }

  return (
    <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto">
      {useLocalSuggestions ? (
        // Local suggestions from our data
        localSuggestions.length > 0 ? (
          localSuggestions.map((location) => (
            <div
              key={location.id}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => onLocalSuggestionClick(location)}
            >
              <div className="font-medium">{location.name}</div>
              <div className="text-sm text-gray-500">{location.address}</div>
            </div>
          ))
        ) : (
          <div className="px-4 py-2 text-gray-500">No locations found. Please try a different search term.</div>
        )
      ) : (
        // Google Places suggestions
        googleSuggestions.length > 0 ? (
          googleSuggestions.map((suggestion) => (
            <div
              key={suggestion.place_id}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => onGoogleSuggestionClick(suggestion)}
            >
              <div className="font-medium">
                {suggestion.structured_formatting ? 
                  suggestion.structured_formatting.main_text : 
                  suggestion.description}
              </div>
              <div className="text-sm text-gray-500">
                {suggestion.structured_formatting ? 
                  suggestion.structured_formatting.secondary_text : 
                  ''}
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-2 text-gray-500">No locations found. Please try a different search term.</div>
        )
      )}
    </div>
  );
}
