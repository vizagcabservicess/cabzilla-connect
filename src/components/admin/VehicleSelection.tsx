
import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { directVehicleOperation } from '@/utils/apiHelper';

interface VehicleSelectionProps {
  onVehicleSelect: (vehicleId: string) => void;
  selectedVehicleId?: string;
}

interface Vehicle {
  id: string;
  vehicleId?: string;
  name: string;
}

const VehicleSelection: React.FC<VehicleSelectionProps> = ({ onVehicleSelect, selectedVehicleId }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const timestamp = Date.now();
      const response = await directVehicleOperation(
        `api/admin/direct-vehicle-modify.php?action=load&includeInactive=false&_t=${timestamp}`, 
        'GET', 
        {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }
      );

      if (response?.vehicles && Array.isArray(response.vehicles)) {
        const vehicleData = response.vehicles.map((v: any) => ({
          id: v.vehicleId || v.id,
          name: v.name || v.vehicleId || v.id
        }));
        setVehicles(vehicleData);
        
        // Auto-select first vehicle if none selected
        if (!selectedVehicleId && vehicleData.length > 0) {
          onVehicleSelect(vehicleData[0].id);
        }
      } else {
        console.warn('Invalid vehicles data format:', response);
        setError('Failed to load vehicles data');
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Failed to load vehicles');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full">
      <Select
        value={selectedVehicleId}
        onValueChange={onVehicleSelect}
        disabled={isLoading || vehicles.length === 0}
      >
        <SelectTrigger className="w-full">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Spinner className="h-4 w-4" />
              <span>Loading vehicles...</span>
            </div>
          ) : (
            <SelectValue placeholder="Select a vehicle" />
          )}
        </SelectTrigger>
        <SelectContent>
          {vehicles.length > 0 ? (
            vehicles.map((vehicle) => (
              <SelectItem key={vehicle.id} value={vehicle.id}>
                {vehicle.name}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no-vehicles" disabled>
              {error || "No vehicles available"}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default VehicleSelection;
