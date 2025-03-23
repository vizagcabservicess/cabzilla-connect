
import { useState, useEffect, useRef } from 'react';
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
  const refreshCountRef = useRef<number>(0);
  const lastRefreshRef = useRef<number>(Date.now());
  const loadingRef = useRef<boolean>(false);
  
  const loadCabOptions = async (forceRefresh = false) => {
    // Prevent multiple simultaneous loads and throttle forced refreshes
    if (loadingRef.current) {
      console.log('Already loading cab options, skipping');
      return;
    }
    
    // Throttle forced refreshes to once every 10 seconds maximum
    const now = Date.now();
    if (forceRefresh && now - lastRefreshRef.current < 10000) {
      console.log('Throttling forced refresh - last refresh was too recent');
      return;
    }
    
    // Limit refreshes to 5 per page session to avoid infinite loops
    if (refreshCountRef.current >= 5 && forceRefresh) {
      console.log('Reached maximum refresh count, not reloading');
      if (cabOptions.length === 0) {
        // If we still don't have cab options after max attempts, try to load default vehicles
        try {
          const defaultVehicles = [
            {
              id: 'sedan',
              name: 'Sedan',
              capacity: 4,
              luggageCapacity: 2,
              price: 2500,
              pricePerKm: 14,
              image: '/cars/sedan.png',
              amenities: ['AC', 'Bottle Water', 'Music System'],
              description: 'Comfortable sedan suitable for 4 passengers.',
              ac: true,
              nightHaltCharge: 700,
              driverAllowance: 250,
              isActive: true
            },
            {
              id: 'ertiga',
              name: 'Ertiga',
              capacity: 6,
              luggageCapacity: 3,
              price: 3200,
              pricePerKm: 18,
              image: '/cars/ertiga.png',
              amenities: ['AC', 'Bottle Water', 'Music System', 'Extra Legroom'],
              description: 'Spacious SUV suitable for 6 passengers.',
              ac: true,
              nightHaltCharge: 1000,
              driverAllowance: 250,
              isActive: true
            },
            {
              id: 'innova_crysta',
              name: 'Innova Crysta',
              capacity: 7,
              luggageCapacity: 4,
              price: 3800,
              pricePerKm: 20,
              image: '/cars/innova.png',
              amenities: ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point'],
              description: 'Premium SUV with ample space for 7 passengers.',
              ac: true,
              nightHaltCharge: 1000,
              driverAllowance: 250,
              isActive: true
            }
          ];
          
          setCabOptions(defaultVehicles);
          setIsLoading(false);
          setError(null);
        } catch (e) {
          console.error('Failed to load default vehicles as fallback', e);
        }
      }
      return;
    }
    
    try {
      loadingRef.current = true;
      
      if (forceRefresh) {
        setIsLoading(true);
        // Only clear fare cache if this is a user-initiated refresh, not an auto-refresh
        fareService.clearCache();
        // Update the refresh timestamp
        const timestamp = Date.now();
        setLastRefreshTime(timestamp);
        lastRefreshRef.current = timestamp;
        refreshCountRef.current += 1;
        localStorage.setItem('cabOptionsLastRefreshed', timestamp.toString());
      }
      
      setError(null);
      
      // Use local cache if available and not doing a forced refresh
      if (!forceRefresh && tripType) {
        const cachedTimestamp = localStorage.getItem(`cabOptions_${tripType}_timestamp`);
        const cachedVehicles = localStorage.getItem(`cabOptions_${tripType}`);
        
        if (cachedTimestamp && cachedVehicles) {
          const timestamp = parseInt(cachedTimestamp, 10);
          const now = Date.now();
          const fiveMinutes = 5 * 60 * 1000;
          
          if (now - timestamp < fiveMinutes) {
            try {
              const vehicles = JSON.parse(cachedVehicles);
              if (Array.isArray(vehicles) && vehicles.length > 0) {
                console.log(`Using cached vehicles for ${tripType} trip:`, vehicles.length);
                setCabOptions(vehicles);
                setIsLoading(false);
                loadingRef.current = false;
                return;
              }
            } catch (error) {
              console.error('Error parsing cached vehicles:', error);
            }
          }
        }
      }
      
      // Fetch vehicle data with different approaches
      let vehicles = await getVehicleData();
      
      // Filter active vehicles only
      vehicles = vehicles.filter(vehicle => vehicle.isActive !== false);
      
      // Ensure we have at least one vehicle
      if (!vehicles || vehicles.length === 0) {
        setError('No vehicles available. Please try again later.');
        setIsLoading(false);
        loadingRef.current = false;
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
      loadingRef.current = false;
    }
  };
  
  // Initial load
  useEffect(() => {
    loadCabOptions();
    
    // Set up event listeners for fare updates with throttling
    const lastEventTimes = new Map<string, number>();
    
    const handleFareCacheCleared = () => {
      const now = Date.now();
      if (lastEventTimes.get('fare-cache-cleared') && 
          now - lastEventTimes.get('fare-cache-cleared')! < 10000) {
        console.log('useCabOptions: Ignoring fare cache cleared event (throttled)');
        return;
      }
      
      lastEventTimes.set('fare-cache-cleared', now);
      console.log('useCabOptions: Detected fare cache cleared event');
      loadCabOptions(true);
    };
    
    const handleFareUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      const eventType = event.type;
      const now = Date.now();
      
      // Throttle events of the same type
      if (lastEventTimes.get(eventType) && 
          now - lastEventTimes.get(eventType)! < 10000) {
        console.log(`useCabOptions: Ignoring ${eventType} event (throttled):`, customEvent.detail);
        return;
      }
      
      lastEventTimes.set(eventType, now);
      console.log(`useCabOptions: Detected ${eventType} event:`, customEvent.detail);
      
      // Only do a full refresh if we don't have cab options yet
      if (cabOptions.length === 0) {
        loadCabOptions(true);
      } else {
        // Just update the timestamp to trigger recalculation of fares
        setLastRefreshTime(Date.now());
      }
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
        
        // We'll skip the fare cache clearing here to prevent loops
        // fareService.clearCache();
        
        // Reload with filters based on trip type/mode
        await loadCabOptions(false); // Use false to avoid triggering a full forced refresh
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
