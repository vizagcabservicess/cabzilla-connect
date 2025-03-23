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
  const maxRefreshesRef = useRef<number>(3); // Maximum 3 refreshes per session
  
  const loadCabOptions = async (forceRefresh = false) => {
    // Prevent multiple simultaneous loads and throttle forced refreshes
    if (loadingRef.current) {
      console.log('Already loading cab options, skipping');
      return cabOptions; // Return existing options
    }
    
    // Skip if we've hit the maximum refresh count
    if (refreshCountRef.current >= maxRefreshesRef.current && forceRefresh) {
      console.log(`Reached maximum refresh count (${maxRefreshesRef.current}), not reloading`);
      return cabOptions; // Return existing options
    }
    
    // Throttle forced refreshes to once every 30 seconds maximum
    const now = Date.now();
    if (forceRefresh && now - lastRefreshRef.current < 30000) {
      console.log('Throttling forced refresh - last refresh was too recent');
      return cabOptions; // Return existing options
    }
    
    try {
      loadingRef.current = true;
      
      if (forceRefresh) {
        setIsLoading(true);
        // Only increment refresh count for forced refreshes
        refreshCountRef.current += 1;
        // Update the timestamp
        lastRefreshRef.current = now;
        setLastRefreshTime(now);
        localStorage.setItem('cabOptionsLastRefreshed', now.toString());
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
                return vehicles;
              }
            } catch (error) {
              console.error('Error parsing cached vehicles:', error);
            }
          }
        }
      }
      
      // If we have existing cab options and this isn't a forced refresh, use them
      if (!forceRefresh && cabOptions.length > 0) {
        console.log('Using existing cab options:', cabOptions.length);
        setIsLoading(false);
        loadingRef.current = false;
        return cabOptions;
      }
      
      // Fetch vehicle data
      let vehicles = await getVehicleData();
      
      // Filter active vehicles only
      vehicles = vehicles.filter(vehicle => vehicle.isActive !== false);
      
      // Ensure we have at least one vehicle
      if (!vehicles || vehicles.length === 0) {
        // If we already have cab options, keep using them
        if (cabOptions.length > 0) {
          console.log('No new vehicles available, keeping existing options');
          setIsLoading(false);
          loadingRef.current = false;
          return cabOptions;
        }
        
        // Otherwise use default vehicles
        vehicles = [
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
        
        console.log('Using default vehicles:', vehicles.length);
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
      
      return vehicles;
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
            return vehicles;
          }
        } catch (cacheError) {
          console.error('Error loading cached vehicles:', cacheError);
        }
      }
      
      // If we have existing cab options, keep using them
      if (cabOptions.length > 0) {
        return cabOptions;
      }
      
      // Otherwise return default vehicles
      return [];
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  };
  
  // Initial load
  useEffect(() => {
    // Initial load should only happen once
    loadCabOptions();
    
    // Set up event listeners for fare updates with strict throttling
    const lastEventTimes = new Map<string, number>();
    const throttleDuration = 60000; // 60 seconds throttle period
    
    const handleFareCacheCleared = () => {
      const now = Date.now();
      if (lastEventTimes.get('fare-cache-cleared') && 
          now - lastEventTimes.get('fare-cache-cleared')! < throttleDuration) {
        console.log('useCabOptions: Ignoring fare cache cleared event (throttled)');
        return;
      }
      
      // Only respond if we haven't reached max refreshes
      if (refreshCountRef.current >= maxRefreshesRef.current) {
        console.log('useCabOptions: Ignoring fare cache cleared event (max refreshes reached)');
        return;
      }
      
      lastEventTimes.set('fare-cache-cleared', now);
      console.log('useCabOptions: Detected fare cache cleared event');
      
      // Just update the timestamp rather than doing a full refresh
      setLastRefreshTime(now);
    };
    
    const handleFareUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      const eventType = event.type;
      const now = Date.now();
      
      // Strict throttling - only one event of each type per minute
      if (lastEventTimes.get(eventType) && 
          now - lastEventTimes.get(eventType)! < throttleDuration) {
        console.log(`useCabOptions: Ignoring ${eventType} event (throttled):`, customEvent.detail);
        return;
      }
      
      // Only respond if we haven't reached max refreshes
      if (refreshCountRef.current >= maxRefreshesRef.current) {
        console.log(`useCabOptions: Ignoring ${eventType} event (max refreshes reached)`);
        return;
      }
      
      lastEventTimes.set(eventType, now);
      console.log(`useCabOptions: Detected ${eventType} event:`, customEvent.detail);
      
      // Just update the timestamp to trigger recalculation
      setLastRefreshTime(now);
    };
    
    window.addEventListener('fare-cache-cleared', handleFareCacheCleared, { passive: true });
    window.addEventListener('local-fares-updated', handleFareUpdated, { passive: true });
    window.addEventListener('trip-fares-updated', handleFareUpdated, { passive: true });
    window.addEventListener('airport-fares-updated', handleFareUpdated, { passive: true });
    
    return () => {
      window.removeEventListener('fare-cache-cleared', handleFareCacheCleared);
      window.removeEventListener('local-fares-updated', handleFareUpdated);
      window.removeEventListener('trip-fares-updated', handleFareUpdated);
      window.removeEventListener('airport-fares-updated', handleFareUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Handle trip type/mode changes with minimal reloads
  useEffect(() => {
    const handleTripChange = async () => {
      // Only show loading state for completely new trip types
      setFilterLoading(true);
      
      try {
        // Check if we have cached data for this trip type first
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
        
        // Load with filters based on trip type/mode, but don't force refresh
        await loadCabOptions(false);
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
