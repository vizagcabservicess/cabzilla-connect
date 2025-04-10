
import { MapPin } from "lucide-react";
import { Location } from "@/lib/locationData";
import { convertToApiLocation } from "@/lib/locationUtils";
import { LocationInput } from "@/components/LocationInput";

interface MobileLocationFieldProps {
  type: "pickup" | "dropoff";
  location: Location | null;
  onLocationChange: (location: Location) => void;
  placeholder: string;
  isAirportTransfer?: boolean;
  readOnly?: boolean;
}

export function MobileLocationField({
  type,
  location,
  onLocationChange,
  placeholder,
  isAirportTransfer = false,
  readOnly = false
}: MobileLocationFieldProps) {
  const isPickup = type === "pickup";
  const label = isPickup ? "FROM" : "DROP ADDRESS";
  
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center mb-1">
        <div className="flex items-center">
          {isPickup ? (
            <div className="w-5 h-5 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-gray-600"></div>
              <div className="w-1 h-6 bg-gray-400 ml-2 absolute mt-8"></div>
            </div>
          ) : (
            <div className="w-5 h-5 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full border-2 border-gray-600"></div>
            </div>
          )}
          <span className="text-xs font-medium text-gray-500 ml-3">{label}</span>
        </div>
      </div>
      
      {location ? (
        <div className="pl-8 font-medium">
          {location.name}
          {location.address && location.address !== location.name && (
            <div className="text-xs text-gray-500 mt-0.5">{location.address}</div>
          )}
        </div>
      ) : (
        <div className="relative">
          <LocationInput
            value={location ? convertToApiLocation(location) : undefined}
            onLocationChange={onLocationChange}
            isPickupLocation={isPickup}
            isAirportTransfer={isAirportTransfer}
            readOnly={readOnly}
            placeholder={placeholder}
            className="pl-8 py-2 border-none bg-transparent !shadow-none text-sm focus:ring-0"
          />
        </div>
      )}
    </div>
  );
}
