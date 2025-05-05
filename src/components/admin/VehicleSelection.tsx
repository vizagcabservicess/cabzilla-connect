
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getVehicleData } from '@/services/vehicleDataService';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

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
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadVehicles();
  }, [includeInactive]);

  const loadVehicles = async () => {
    setLoading(true);
    setLoadError(null);
    
    try {
      // Force refresh to ensure we get the most up-to-date data with the correct domain
      const vehicleData = await getVehicleData(true, includeInactive);
      
      if (vehicleData && Array.isArray(vehicleData) && vehicleData.length > 0) {
        console.log(`VehicleSelection: Loaded ${vehicleData.length} vehicles`);
        setVehicles(vehicleData);
      } else {
        console.warn('VehicleSelection: No vehicle data returned or empty array');
        setLoadError('No vehicles found');
        toast.warning('No vehicle data found. Please check your connection.');
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
      setLoadError('Failed to load vehicles');
      toast.error('Failed to load vehicle data');
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleChange = (value: string) => {
    onVehicleSelect(value);
  };

  const handleRetry = () => {
    loadVehicles();
  };

  return (
    <div>
      <Select
        value={selectedVehicleId}
        onValueChange={handleVehicleChange}
        disabled={loading}
      >
        <SelectTrigger>
          {loading ? (
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              <span>Loading vehicles...</span>
            </div>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent>
          {vehicles.length > 0 ? (
            vehicles.map((vehicle) => (
              <SelectItem 
                key={vehicle.id || vehicle.vehicle_id} 
                value={vehicle.vehicle_id || vehicle.id}
              >
                {vehicle.name || vehicle.label || vehicle.make + ' ' + vehicle.model || vehicle.vehicle_id || vehicle.id}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no-vehicles" disabled>
              {loadError || 'No vehicles available'}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      
      {loadError && (
        <div className="flex justify-end mt-1">
          <button 
            onClick={handleRetry}
            className="text-xs text-blue-500 hover:underline"
            type="button"
          >
            Retry loading
          </button>
        </div>
      )}
    </div>
  );
};

export default VehicleSelection;
