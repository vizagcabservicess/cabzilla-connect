import { useState, useRef, useEffect } from "react";
import { Autocomplete } from "@react-google-maps/api";
import { Search, X, MapPin } from "lucide-react";
import { Location, vizagLocations, apDestinations, isVizagLocation } from "@/lib/locationData";
import { cn } from "@/lib/utils";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";
import { useToast } from "@/components/ui/use-toast";

interface LocationInputProps {
  label: string;
  placeholder: string;
  value: Location | null;
  onChange: (location: Location | null) => void;
  className?: string;
  readOnly?: boolean;
  isPickupLocation?: boolean;
  isAirportTransfer?: boolean;
}

export function LocationInput({
  label,
  placeholder,
  value,
  onChange,
  className,
  readOnly = false,
  isPickupLocation = false,
  isAirportTransfer = false,
}: LocationInputProps) {
  const { isLoaded, google } = useGoogleMaps();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState(value ? value.name : "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [suggestedLocations, setSuggestedLocations] = useState<Location[]>([]);

  // Set the initial search query when value changes
  useEffect(() => {
    if (value) {
      setSearchQuery(value.name);
    } else {
      setSearchQuery("");
    }
  }, [value]);

  // Filter location suggestions based on search query
  useEffect(() => {
    if (!isLoaded || readOnly || !searchQuery || searchQuery.length < 2) {
      setSuggestedLocations([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    let locationSource = isPickupLocation ? vizagLocations : apDestinations;
    
    // Filter the appropriate source based on isPickupLocation
    const filteredLocations = locationSource.filter(
      location => 
        location.name.toLowerCase().includes(query) || 
        location.city.toLowerCase().includes(query)
    );

    setSuggestedLocations(filteredLocations.slice(0, 5));
  }, [searchQuery, isPickupLocation, isLoaded, readOnly]);

  // Auto-fill airport only for airport trips
  useEffect(() => {
    if (isAirportTransfer) {
      // Only for airport transfers
      const airport = vizagLocations.find(loc => loc.type === 'airport');
      
      if (airport) {
        // For pickup with airport label OR drop with destination label
        if ((isPickupLocation && label.toLowerCase().includes("airport")) || 
            (!isPickupLocation && label.toLowerCase().includes("destination"))) {
          onChange(airport);
          setSearchQuery(airport.name);
        }
      }
    }
  }, [isAirportTransfer, isPickupLocation, label, onChange]);

  // Handle Google Places selection - Fix for locations outside Andhra Pradesh
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
        
        // If it's a pickup location, strictly validate it's in Visakhapatnam area
        if (isPickupLocation) {
          const isVizagArea = 
            city.toLowerCase().includes("visakhapatnam") ||
            place.formatted_address.toLowerCase().includes("visakhapatnam") ||
            place.formatted_address.toLowerCase().includes("vizag");
          
          if (!isVizagArea) {
            toast({
              title: "Location not supported",
              description: "Pickup locations must be within Visakhapatnam area.",
              variant: "destructive",
            });
            return;
          }
        }
        
        // Create location object
        const selectedLocation: Location = {
          id: place.place_id || Date.now().toString(),
          name: place.formatted_address,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          city: city || "Unknown City", // Default to Unknown if city not found
          state: state || "Unknown State", // Default to Unknown if state not found
          type: determineLocationType(place.types),
          popularityScore: 50, // Default popularity score
        };
        
        onChange(selectedLocation);
        setSearchQuery(selectedLocation.name);
        setShowSuggestions(false);
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

  // Select a suggested location
  const handleSelectSuggestion = (location: Location) => {
    onChange(location);
    setSearchQuery(location.name);
    setShowSuggestions(false);
  };

  // Clear search input
  const handleClear = () => {
    onChange(null);
    setSearchQuery("");
    setShowSuggestions(false);
  };

  // If Google Maps hasn't loaded yet, show a simple input
  if (!isLoaded || !google) {
    return (
      <div className={cn("relative w-full", className)}>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            <Search size={18} />
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-md bg-gray-100"
            placeholder="Loading places..."
            disabled
          />
        </div>
      </div>
    );
  }

  // Determine if this input should be read-only based on airport transfers
  const isReadOnly = readOnly || (isAirportTransfer && 
    ((isPickupLocation && label.toLowerCase().includes("airport")) || 
    (!isPickupLocation && label.toLowerCase().includes("destination"))));

  return (
    <div className={cn("relative w-full", className)}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>

      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
          <Search size={18} />
        </div>

        {isReadOnly ? (
          // Fixed readonly input
          <input
            type="text"
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-md bg-gray-100"
            value={searchQuery}
            readOnly
          />
        ) : (
          <Autocomplete
            onLoad={setAutocomplete}
            onPlaceChanged={onPlaceChanged}
            options={{
              componentRestrictions: { country: "IN" },
              // Set bounds to Visakhapatnam area for pickup locations
              ...(isPickupLocation && {
                bounds: {
                  north: 18.0, // North boundary
                  south: 17.5, // South boundary
                  east: 83.5,  // East boundary
                  west: 83.0   // West boundary
                },
                strictBounds: true
              }),
              types: ['geocode', 'establishment'],
            }}
          >
            <input
              ref={inputRef}
              type="text"
              className={cn(
                "w-full pl-10 pr-10 py-3 border border-gray-300 rounded-md"
              )}
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                // Delay hiding suggestions to allow clicking on them
                setTimeout(() => setShowSuggestions(false), 200);
              }}
            />
          </Autocomplete>
        )}

        {searchQuery && !isReadOnly && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        )}

        {/* Suggested Locations */}
        {showSuggestions && suggestedLocations.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
            {suggestedLocations.map((location) => (
              <button
                key={location.id}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-start"
                onClick={() => handleSelectSuggestion(location)}
                type="button"
              >
                <MapPin size={16} className="mr-2 mt-1 flex-shrink-0 text-blue-500" />
                <div>
                  <div className="font-medium">{location.name}</div>
                  <div className="text-xs text-gray-500">{location.city}, {location.state}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
