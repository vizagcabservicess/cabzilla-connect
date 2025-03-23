
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
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  
  const loadCabOptions = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setIsLoading(true);
        // Clear fare cache to ensure fresh data
        fareService.clearCache();
        // Update the refresh timestamp
        setLastRefreshTime(Date.now());
        localStorage.setItem('cabOptionsLastRefreshed', Date.now().toString());
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
        vehicles = vehicles.filter(v => v.capacity >= 4);
      }
      
      // Set the cab options
      console.log(`Loaded ${vehicles.length} vehicles for ${tripType} trip`);
      setCabOptions(vehicles);
      
      // Cache the vehicles by trip type
      if (tripType) {
        try {
          localStorage.setItem(`cabOptions_${tripType}`, JSON.stringify(vehicles));
          localStorage.setItem(`cabOptions_${tripType}_timestamp`, Date.now().toString());
        } catch (cacheError) {
          console.warn('Could not cache cab options:', cacheError);
        }
      }
    } catch (error) {
      console.error("Error loading cab options:", error);
      setError('Failed to load vehicle options. Please try again.');
      
      // Try to load cached vehicles as a fallback
      if (tripType) {
        try {
          const cachedVehicles = localStorage.getItem(`cabOptions_${tripType}`);
          if (cachedVehicles) {
            const vehicles = JSON.parse(cachedVehicles);
            console.log(`Using cached vehicles for ${tripType} trip:`, vehicles.length);
            setCabOptions(vehicles);
            setError(null);
          }
        } catch (cacheError) {
          console.error('Error loading cached vehicles:', cacheError);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    loadCabOptions();
    
    // Set up event listeners for fare updates
    const handleFareCacheCleared = () => {
      console.log('useCabOptions: Detected fare cache cleared event');
      loadCabOptions(true);
    };
    
    const handleFareUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('useCabOptions: Detected fare update event:', customEvent.detail);
      loadCabOptions(true);
    };
    
    window.addEventListener('fare-cache-cleared', handleFareCacheCleared);
    window.addEventListener('local-fares-updated', handleFareUpdated);
    window.addEventListener('trip-fares-updated', handleFareUpdated);
    window.addEventListener('airport-fares-updated', handleFareUpdated);
    
    return () => {
      window.removeEventListener('fare-cache-cleared', handleFareCacheCleared);
      window.removeEventListener('local-fares-updated', handleFareUpdated);
      window.removeEventListener('trip-fares-updated', handleFareUpdated);
      window.removeEventListener('airport-fares-updated', handleFareUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Reload when trip type or mode changes
  useEffect(() => {
    const handleTripChange = async () => {
      setFilterLoading(true);
      
      try {
        // Check if we have cached data for this trip type
        if (tripType) {
          const cachedTimestamp = localStorage.getItem(`cabOptions_${tripType}_timestamp`);
          const cachedVehicles = localStorage.getItem(`cabOptions_${tripType}`);
          
          if (cachedTimestamp && cachedVehicles) {
            // If cached data is less than 5 minutes old, use it
            const timestamp = parseInt(cachedTimestamp, 10);
            const now = Date.now();
            const fiveMinutes = 5 * 60 * 1000;
            
            if (now - timestamp < fiveMinutes) {
              try {
                const vehicles = JSON.parse(cachedVehicles);
                console.log(`Using cached vehicles for ${tripType} trip:`, vehicles.length);
                setCabOptions(vehicles);
                setFilterLoading(false);
                return;
              } catch (error) {
                console.error('Error parsing cached vehicles:', error);
              }
            }
          }
        }
        
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
    lastRefreshTime,
    refresh: () => loadCabOptions(true)
  };
};
