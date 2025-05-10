
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
import { isPreviewMode } from '@/utils/apiHelper';

interface VehicleSelectionProps {
  onVehicleSelect: (vehicleId: string) => void;
  selectedVehicleId?: string;
}

interface Vehicle {
  id: string;
  vehicleId?: string;
  name: string;
}

// Mock vehicles data for preview mode
const mockVehicles: Vehicle[] = [
  { id: 'sedan', name: 'Sedan' },
  { id: 'ertiga', name: 'Ertiga' },
  { id: 'innova_crysta', name: 'Innova Crysta' },
  { id: 'tempo_traveller', name: 'Tempo Traveller' },
  { id: 'mpv', name: 'Innova Hycross' }
];

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
      // Check if we're in preview mode first
      if (isPreviewMode()) {
        console.log('Using mock vehicles in preview mode');
        setVehicles(mockVehicles);
        
        // Auto-select first vehicle if none selected
        if (!selectedVehicleId && mockVehicles.length > 0) {
          onVehicleSelect(mockVehicles[0].id);
        }
        setIsLoading(false);
        return;
      }
      
      // Real API call for production
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
        
        // Fallback to mock data
        setVehicles(mockVehicles);
        if (!selectedVehicleId && mockVehicles.length > 0) {
          onVehicleSelect(mockVehicles[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Failed to load vehicles');
      
      // Fallback to mock data
      setVehicles(mockVehicles);
      if (!selectedVehicleId && mockVehicles.length > 0) {
        onVehicleSelect(mockVehicles[0].id);
      }
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
