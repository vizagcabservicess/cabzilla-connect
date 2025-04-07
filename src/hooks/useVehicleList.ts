
import { useState, useEffect } from 'react';
import { CabType } from '@/types/cab';
import { directApiCall } from '@/utils/directApiHelper';
import { toast } from 'sonner';

export function useVehicleList() {
  const [vehicles, setVehicles] = useState<CabType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchVehicles = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await directApiCall('/api/admin/vehicles.php', {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Debug': 'true'
        }
      });

      if (response && response.vehicles) {
        // Ensure all vehicles have vehicle_id property
        const processedVehicles = response.vehicles.map((vehicle: any) => {
          return {
            ...vehicle,
            // Ensure vehicle_id is always present
            vehicle_id: vehicle.vehicle_id || vehicle.id || vehicle.vehicleId || ''
          };
        });
        
        setVehicles(processedVehicles);
      } else {
        setVehicles([]);
      }
    } catch (err: any) {
      console.error('Error fetching vehicles:', err);
      setError(err);
      toast.error(`Failed to load vehicles: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  return {
    vehicles,
    isLoading,
    error,
    refetch: fetchVehicles
  };
}
