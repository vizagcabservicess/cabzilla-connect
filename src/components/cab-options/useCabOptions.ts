
import { useState, useEffect } from 'react';
import { CabType } from '@/types/cab';
import { getVehicleData } from '@/services/vehicleDataService';
import { TripType, TripMode } from '@/lib/tripTypes';
import { fareService } from '@/services/fareService';
import { toast } from 'sonner';

interface CabOptionsProps {
  tripType: TripType;
  tripMode?: TripMode;
  distance?: number;
}

export const useCabOptions = ({ tripType, tripMode, distance }: CabOptionsProps) => {
  const [cabOptions, setCabOptions] = useState<CabType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterLoading, setFilterLoading] = useState(false);
  
  const loadCabOptions = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setIsLoading(true);
        // Clear fare cache to ensure fresh data
        fareService.clearCache();
      }
      
      setError(null);
      
      // Fetch vehicle data with different approaches
      let vehicles = await getVehicleData();
      
      // Filter active vehicles only
      vehicles = vehicles.filter(vehicle => vehicle.isActive !== false);
      
      // Ensure we have at least one vehicle
      if (!vehicles || vehicles.length === 0) {
        setError('No vehicles available. Please try again later.');
        setIsLoading(false);
        return;
      }
      
      // For certain trip types like tours, we may want to filter vehicles
      if (tripType === 'tour') {
        // Filter vehicles that are suitable for tours
        // This is just an example - implement actual filtering logic as needed
        vehicles = vehicles.filter(v => v.capacity >= 4);
      }
      
      // Set the cab options
      console.log(`Loaded ${vehicles.length} vehicles for ${tripType} trip`);
      setCabOptions(vehicles);
    } catch (error) {
      console.error("Error loading cab options:", error);
      setError('Failed to load vehicle options. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    loadCabOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Reload when trip type or mode changes
  useEffect(() => {
    const handleTripChange = async () => {
      setFilterLoading(true);
      
      try {
        // Clear fare cache when trip parameters change
        fareService.clearCache();
        
        // Reload with filters based on trip type/mode
        await loadCabOptions();
      } catch (error) {
        console.error("Error updating cab options for trip change:", error);
        toast.error("Failed to update vehicle options");
      } finally {
        setFilterLoading(false);
      }
    };
    
    handleTripChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripType, tripMode]);
  
  return {
    cabOptions,
    isLoading,
    error,
    filterLoading,
    refresh: () => loadCabOptions(true)
  };
};
