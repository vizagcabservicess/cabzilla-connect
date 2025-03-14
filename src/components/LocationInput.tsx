import { useState, useRef } from "react";
import { Autocomplete } from "@react-google-maps/api";
import { Search, X } from "lucide-react";
import { Location } from "@/lib/locationData";
import { cn } from "@/lib/utils";

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
}: LocationInputProps) {
  const [searchQuery, setSearchQuery] = useState(value ? value.name : "");
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Handle Google Places selection
  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        const selectedLocation: Location = {
          id: place.place_id,
          name: place.formatted_address || "",
          lat: place.geometry.location?.lat() || 0,
          lng: place.geometry.location?.lng() || 0,
          city: place.address_components?.find((c) => c.types.includes("locality"))?.long_name || "",
          state: place.address_components?.find((c) => c.types.includes("administrative_area_level_1"))?.long_name || "",
          type: "other", // Provide a default type if it's not available
          popularityScore: 0, // Provide a default score if it's not available
        };
        onChange(selectedLocation);
        setSearchQuery(selectedLocation.name);
      }
    }
  };
  
  
  /**
   * ✅ Function to map Google Place types to valid `Location.type` values
   */
  const determineLocationType = (placeTypes: string[] | undefined): Location["type"] => {
    if (!placeTypes) return "other"; // Default to "other" if no type is provided
  
    if (placeTypes.includes("airport")) return "airport";
    if (placeTypes.includes("train_station")) return "train_station";
    if (placeTypes.includes("bus_station")) return "bus_station";
    if (placeTypes.includes("lodging") || placeTypes.includes("hotel")) return "hotel";
    if (placeTypes.includes("point_of_interest") || placeTypes.includes("tourist_attraction")) return "landmark";
  
    return "other"; // Default to "other" if none of the above match
  };
  
  
  // Clear search input
  const handleClear = () => {
    onChange(null);
    setSearchQuery("");
  };

  return (
    <div className={cn("relative w-full", className)}>
      <label className="input-label">{label}</label>

      {/* ✅ Google Places Autocomplete */}
      <Autocomplete
        onLoad={setAutocomplete}
        onPlaceChanged={onPlaceChanged}
        options={{ componentRestrictions: { country: "IN" } }} // Restrict to India (optional)
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
