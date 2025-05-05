
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getVehicleData } from '@/services/vehicleDataService';

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
      // Force refresh to ensure we get the most up-to-date data with the correct domain
      const vehicleData = await getVehicleData(true, includeInactive);
      if (vehicleData && Array.isArray(vehicleData)) {
        console.log(`VehicleSelection: Loaded ${vehicleData.length} vehicles`);
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
            {vehicle.name || vehicle.label || vehicle.vehicle_id || vehicle.id}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default VehicleSelection;
