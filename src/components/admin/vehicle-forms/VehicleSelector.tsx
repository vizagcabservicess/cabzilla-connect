
import React from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VehicleSelectorProps {
  vehicles: {id: string, name: string}[];
  selectedVehicle: string;
  onVehicleChange: (vehicleId: string) => void;
}

export const VehicleSelector: React.FC<VehicleSelectorProps> = ({
  vehicles,
  selectedVehicle,
  onVehicleChange
}) => {
  return (
    <div>
      <label className="text-sm font-medium">Select Vehicle</label>
      <Select value={selectedVehicle} onValueChange={onVehicleChange}>
        <SelectTrigger className="w-full mt-1">
          <SelectValue placeholder="Select a vehicle" />
        </SelectTrigger>
        <SelectContent>
          {vehicles.map((vehicle) => (
            <SelectItem key={vehicle.id} value={vehicle.id}>
              {vehicle.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
