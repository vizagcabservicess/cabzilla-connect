
import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';

export interface Location {
  address: string;
  lat: number;
  lng: number;
  city?: string;
}

interface LocationInputProps {
  value: string;
  onChange: (location: Location) => void;
  placeholder?: string;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  value,
  onChange,
  placeholder = "Enter location"
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const { isLoaded, google } = useGoogleMaps();
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const mapDiv = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoaded && google && !autocompleteService.current) {
      autocompleteService.current = new google.maps.places.AutocompleteService();
      
      // Create a temporary map for PlacesService
      const map = new google.maps.Map(document.createElement('div'));
      placesService.current = new google.maps.places.PlacesService(map);
    }
  }, [isLoaded, google]);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (newValue.length > 2 && autocompleteService.current) {
      autocompleteService.current.getPlacePredictions(
        {
          input: newValue,
          componentRestrictions: { country: 'in' }
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setPredictions(predictions);
            setShowPredictions(true);
          } else {
            setPredictions([]);
            setShowPredictions(false);
          }
        }
      );
    } else {
      setPredictions([]);
      setShowPredictions(false);
    }
  };

  const handlePredictionClick = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService.current) return;

    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['geometry', 'formatted_address', 'address_components']
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const location: Location = {
            address: place.formatted_address || prediction.description,
            lat: place.geometry?.location?.lat() || 0,
            lng: place.geometry?.location?.lng() || 0,
            city: place.address_components?.find(
              component => component.types.includes('locality')
            )?.long_name
          };

          setInputValue(location.address);
          setShowPredictions(false);
          onChange(location);
        }
      }
    );
  };

  return (
    <div className="relative">
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="w-full"
        onFocus={() => {
          if (predictions.length > 0) {
            setShowPredictions(true);
          }
        }}
        onBlur={() => {
          // Delay hiding to allow for clicks
          setTimeout(() => setShowPredictions(false), 200);
        }}
      />
      
      {showPredictions && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {predictions.map((prediction) => (
            <div
              key={prediction.place_id}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
              onClick={() => handlePredictionClick(prediction)}
            >
              <div className="font-medium">{prediction.structured_formatting.main_text}</div>
              <div className="text-gray-600">{prediction.structured_formatting.secondary_text}</div>
            </div>
          ))}
        </div>
      )}
      
      {/* Hidden div for PlacesService initialization */}
      <div ref={mapDiv} style={{ display: 'none' }} />
    </div>
  );
};
