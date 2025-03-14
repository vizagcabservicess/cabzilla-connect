
import { useState, useRef, useEffect } from "react";
import { Autocomplete } from "@react-google-maps/api";
import { Search, X } from "lucide-react";
import { Location } from "@/lib/locationData";
import { cn } from "@/lib/utils";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";

interface LocationInputProps {
  label: string;
  placeholder: string;
  value: Location | null;
  onChange: (location: Location | null) => void;
  className?: string;
  readOnly?: boolean;
  isPickupLocation?: boolean;
}

export function LocationInput({
  label,
  placeholder,
  value,
  onChange,
  className,
  readOnly = false,
  isPickupLocation = false,
}: LocationInputProps) {
  const { isLoaded, google } = useGoogleMaps();
  const [searchQuery, setSearchQuery] = useState(value ? value.name : "");
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  // Set the initial search query when value changes
  useEffect(() => {
    if (value) {
      setSearchQuery(value.name);
    }
  }, [value]);

  // Auto-fill airport for airport trips
  useEffect(() => {
    if (label.includes("AIRPORT") && isPickupLocation) {
      // This would be set by the parent component when airport trip type is selected
    }
  }, [label, isPickupLocation]);

  // Handle Google Places selection
  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      
      if (place.geometry && place.formatted_address) {
        console.log("Selected place:", place);
        
        // Extract city and state information
        let city = "";
        let state = "";
        
        if (place.address_components) {
          for (const component of place.address_components) {
            if (component.types.includes("locality")) {
              city = component.long_name;
            } else if (component.types.includes("administrative_area_level_1")) {
              state = component.long_name;
            }
          }
        }
        
        // If it's a pickup location, validate it's in Visakhapatnam area
        if (isPickupLocation) {
          const isVizagArea = 
            city.toLowerCase().includes("visakhapatnam") ||
            place.formatted_address.toLowerCase().includes("visakhapatnam") ||
            place.formatted_address.toLowerCase().includes("vizag");
          
          if (!isVizagArea) {
            alert("Pickup locations must be within Visakhapatnam area.");
            return;
          }
        }
        
        // Create location object
        const selectedLocation: Location = {
          id: place.place_id || Date.now().toString(),
          name: place.formatted_address,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          city: city || "Visakhapatnam", // Default to Visakhapatnam if city not found
          state: state || "Andhra Pradesh", // Default to Andhra Pradesh if state not found
          type: determineLocationType(place.types),
          popularityScore: 50, // Default popularity score
        };
        
        onChange(selectedLocation);
        setSearchQuery(selectedLocation.name);
      }
    }
  };
  
  // Function to map Google Place types to valid Location.type values
  const determineLocationType = (placeTypes: string[] | undefined): Location["type"] => {
    if (!placeTypes) return "other";
  
    if (placeTypes.includes("airport")) return "airport";
    if (placeTypes.includes("train_station")) return "train_station";
    if (placeTypes.includes("bus_station")) return "bus_station";
    if (placeTypes.includes("lodging") || placeTypes.includes("hotel")) return "hotel";
    if (placeTypes.includes("point_of_interest") || placeTypes.includes("tourist_attraction")) return "landmark";
  
    return "other";
  };
  
  // Clear search input
  const handleClear = () => {
    onChange(null);
    setSearchQuery("");
  };

  // If Google Maps hasn't loaded yet, show a simple input
  if (!isLoaded || !google) {
    return (
      <div className={cn("relative w-full", className)}>
        <label className="input-label">{label}</label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cabGray-500">
            <Search size={18} />
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-10 py-3 shadow-input bg-gray-100"
            placeholder="Loading places..."
            disabled
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full", className)}>
      <label className="input-label">{label}</label>

      <Autocomplete
        onLoad={setAutocomplete}
        onPlaceChanged={onPlaceChanged}
        options={{
          componentRestrictions: { country: "IN" },
          // Set bounds to Visakhapatnam area for pickup locations
          ...(isPickupLocation && {
            bounds: {
              north: 17.8,  // North boundary
              south: 17.6,  // South boundary
              east: 83.35,  // East boundary
              west: 83.15   // West boundary
            },
            strictBounds: true
          }),
          types: ['geocode', 'establishment'],
        }}
      >
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cabGray-500">
            <Search size={18} />
          </div>

          <input
            ref={inputRef}
            type="text"
            className={cn("w-full pl-10 pr-10 py-3 shadow-input", readOnly ? "bg-gray-100 cursor-not-allowed" : "")}
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            readOnly={readOnly}
          />

          {searchQuery && !readOnly && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cabGray-400 hover:text-cabGray-600 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </Autocomplete>
    </div>
  );
}
