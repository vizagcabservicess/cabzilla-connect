
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFleetVehicles } from '@/utils/fleetDataUtils';

interface VehicleSelectionProps {
  onVehicleSelect: (vehicleId: string) => void;
  selectedVehicleId?: string;
  label?: string;
  placeholder?: string;
  includeInactive?: boolean;
}

const VehicleSelection: React.FC<VehicleSelectionProps> = ({
  onVehicleSelect,
  selectedVehicleId = '',
  label = 'Select Vehicle',
  placeholder = 'Select a vehicle...',
  includeInactive = false
}) => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadVehicles();
  }, [includeInactive]);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const vehicleData = await getFleetVehicles(false, includeInactive);
      if (vehicleData && Array.isArray(vehicleData)) {
        setVehicles(vehicleData);
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleChange = (value: string) => {
    onVehicleSelect(value);
  };

  return (
    <Select
      value={selectedVehicleId}
      onValueChange={handleVehicleChange}
      disabled={loading}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {vehicles.map((vehicle) => (
          <SelectItem 
            key={vehicle.id || vehicle.vehicle_id} 
            value={vehicle.vehicle_id || vehicle.id}
          >
            {vehicle.name || vehicle.label || vehicle.vehicleNumber || vehicle.vehicle_id || vehicle.id}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default VehicleSelection;
