
import React from "react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TripType } from "@/lib/tripTypes";

interface TripTypeSelectorProps {
  selectedTripType: TripType;
  onSelectTripType: (tripType: TripType) => void;
  showTourOption?: boolean;
  showLocalOption?: boolean;
  showAirportOption?: boolean;
}

export const TripTypeSelector: React.FC<TripTypeSelectorProps> = ({
  selectedTripType,
  onSelectTripType,
  showTourOption = true,
  showLocalOption = true,
  showAirportOption = true,
}) => {
  return (
    <div className="flex flex-col space-y-2 w-full sm:w-64">
      <label htmlFor="trip-type" className="font-medium">
        Trip Type
      </label>
      <Select
        value={selectedTripType}
        onValueChange={(value) => onSelectTripType(value as TripType)}
      >
        <SelectTrigger id="trip-type">
          <SelectValue placeholder="Select trip type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="outstation">Outstation</SelectItem>
          {showLocalOption && <SelectItem value="local">Local</SelectItem>}
          {showAirportOption && <SelectItem value="airport">Airport</SelectItem>}
          {showTourOption && <SelectItem value="tour">Tour</SelectItem>}
        </SelectContent>
      </Select>
    </div>
  );
};
