
import { useState, useEffect, useRef } from 'react';
import { CabType } from '@/types/cab';
import { getVehicleData } from '@/services/vehicleDataService';
import { TripType, TripMode, isAdminTripType, isTourTripType, isRegularTripType } from '@/lib/tripTypes';
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
  const maxRefreshesRef = useRef<number>(5); // Increased from 3 to 5 for more refreshes
  const vehicleDataCache = useRef<Map<string, { data: CabType[], timestamp: number }>>(new Map());
  const eventThrottleTimestamps = useRef<Record<string, number>>({});
  
  // Add strong throttling for all refresh events - prevent infinite loops
  const shouldThrottleEvent = (eventType: string, throttleDuration = 45000): boolean => {
    const now = Date.now();
    const lastTime = eventThrottleTimestamps.current[eventType] || 0;
    
    if (now - lastTime < throttleDuration) {
      console.log(`useCabOptions: Throttling ${eventType} event (last occurred ${Math.round((now - lastTime)/1000)}s ago)`);
      return true;
    }
    
    eventThrottleTimestamps.current[eventType] = now;
    return false;
  };
  
  const loadCabOptions = async (forceRefresh = false) => {
    // IMPORTANT: Prevent multiple simultaneous loads and throttle forced refreshes
    if (loadingRef.current) {
      console.log('Already loading cab options, skipping');
      return cabOptions; // Return existing options
    }
    
    // Less aggressive throttling for admin trip types - allow faster refreshes
    const isAdminTrip = isAdminTripType(tripType);
    const throttleDuration = isAdminTrip ? 10000 : 15000; // Shorter throttle for admin trips
    
    if (forceRefresh && !isAdminTrip) {
      if (shouldThrottleEvent('force-refresh', throttleDuration)) {
        return cabOptions;
      }
      
      if (refreshCountRef.current >= maxRefreshesRef.current) {
        // Reset refresh count after a while to allow refreshes again
        if (Date.now() - lastRefreshRef.current > 60000) { // 1 minute
          console.log('Resetting refresh count after 1 minute');
          refreshCountRef.current = 0;
        } else {
          console.log(`Reached maximum refresh count (${maxRefreshesRef.current}), not reloading`);
          return cabOptions;
        }
      }
    }
    
    try {
      loadingRef.current = true;
      
      if (forceRefresh) {
        setIsLoading(true);
        refreshCountRef.current += 1;
        lastRefreshRef.current = Date.now();
        setLastRefreshTime(Date.now());
        localStorage.setItem('cabOptionsLastRefreshed', Date.now().toString());
      }
      
      setError(null);
      
      // For admin-related trip types, always use includeInactive=true to get all vehicles
      const shouldIncludeInactive = isAdminTripType(tripType);
      
      // For admin trip types, use shorter cache validity
      const cacheValidityDuration = isAdminTrip ? 5000 : 30000; // 5 seconds for admin, 30 seconds for others
      
      // Try local cache first with appropriate validity duration
      const cachedData = vehicleDataCache.current.get('json') || vehicleDataCache.current.get('api');
      const now = Date.now();
      
      if (!forceRefresh && !shouldIncludeInactive && cachedData && now - cachedData.timestamp < cacheValidityDuration) {
        console.log('Using in-memory cached vehicle data');
        const filteredVehicles = filterVehiclesByTripType(cachedData.data, tripType);
        setCabOptions(filteredVehicles);
        setIsLoading(false);
        loadingRef.current = false;
        return filteredVehicles;
      }
      
      // For admin trips, check most recent cache with shorter validity
      if (isAdminTrip && cachedData && now - cachedData.timestamp < 5000 && !forceRefresh) {
        console.log('Using very fresh cached data for admin trip type');
        const filteredVehicles = filterVehiclesByTripType(cachedData.data, tripType);
        setCabOptions(filteredVehicles);
        setIsLoading(false);
        loadingRef.current = false;
        return filteredVehicles;
      }
      
      // Use local cache if available (reduced from 5 minutes to 2 minutes validity)
      if (!forceRefresh && !shouldIncludeInactive && tripType) {
        const cachedTimestamp = localStorage.getItem(`cabOptions_${tripType}_timestamp`);
        const cachedVehicles = localStorage.getItem(`cabOptions_${tripType}`);
        
        if (cachedTimestamp && cachedVehicles) {
          const timestamp = parseInt(cachedTimestamp, 10);
          const twoMinutes = 2 * 60 * 1000;
          
          if (now - timestamp < twoMinutes) {
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
      
      // Always pass includeInactive=true for admin trip types
      const includeInactive = shouldIncludeInactive;
      console.log(`Getting vehicle data with includeInactive=${includeInactive}, forceRefresh=${forceRefresh}`);
      
      // Fetch vehicle data with a shorter timeout (5s)
      const timeoutPromise = new Promise<CabType[]>((_, reject) => {
        setTimeout(() => reject(new Error('Vehicle data fetch timeout')), 5000);
      });
      
      const dataPromise = getVehicleData(forceRefresh, includeInactive); // Pass both parameters
      
      // Race the fetch against the timeout
      let vehicles: CabType[];
      try {
        vehicles = await Promise.race([dataPromise, timeoutPromise]);
      } catch (e) {
        console.warn('Fetch with timeout failed, falling back to direct API call');
        vehicles = await getVehicleData(true, includeInactive); // Force API call on error with includeInactive
      }
      
      // Log received vehicles for debugging
      console.log(`Received ${vehicles?.length || 0} vehicles from getVehicleData:`, vehicles);
      
      // Ensure we have at least one vehicle
      if (!vehicles || vehicles.length === 0) {
        // Try the cached data one more time, no matter how old
        const cachedVehicles = localStorage.getItem(`cabOptions_all`);
        if (cachedVehicles) {
          try {
            const parsedVehicles = JSON.parse(cachedVehicles);
            if (Array.isArray(parsedVehicles) && parsedVehicles.length > 0) {
              console.log('Using older cached vehicles as last resort');
              vehicles = parsedVehicles;
            }
          } catch (error) {
            console.error('Error parsing cached vehicles:', error);
          }
        }
      }
      
      // If we still have no vehicles, use defaults
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
      
      // Cache the raw vehicle data
      try {
        localStorage.setItem(`cabOptions_all`, JSON.stringify(vehicles));
        localStorage.setItem(`cabOptions_all_timestamp`, now.toString());
        
        // Update our in-memory cache
        vehicleDataCache.current.set('latest', {
          data: vehicles,
          timestamp: now
        });
      } catch (cacheError) {
        console.warn('Error caching raw vehicle data:', cacheError);
      }
      
      // Filter based on trip type
      const filteredVehicles = filterVehiclesByTripType(vehicles, tripType);
      
      // Set the cab options
      console.log(`Loaded ${filteredVehicles.length} vehicles for ${tripType} trip`);
      setCabOptions(filteredVehicles);
      
      // Cache the vehicles by trip type
      if (tripType) {
        try {
          localStorage.setItem(`cabOptions_${tripType}`, JSON.stringify(filteredVehicles));
          localStorage.setItem(`cabOptions_${tripType}_timestamp`, now.toString());
        } catch (cacheError) {
          console.warn('Could not cache cab options:', cacheError);
        }
      }
      
      setIsLoading(false);
      loadingRef.current = false;
      return filteredVehicles;
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
      
      // Otherwise return empty array
      setIsLoading(false);
      loadingRef.current = false;
      return [];
    }
  };
  
  // Helper function to filter vehicles based on trip type
  const filterVehiclesByTripType = (vehicles: CabType[], tripType: TripType): CabType[] => {
    if (isTourTripType(tripType)) {
      // Filter vehicles that are suitable for tours
      return vehicles.filter(v => v.capacity >= 4);
    } else if (isAdminTripType(tripType)) {
      // For admin trip types, show all vehicles including inactive ones
      return vehicles;
    } else if (!isRegularTripType(tripType)) {
      // For custom or other non-regular trip types, show all active vehicles
      return vehicles.filter(v => v.isActive !== false);
    } else {
      // For regular trips, show only active vehicles
      return vehicles.filter(v => v.isActive !== false);
    }
  };
  
  // Initial load
  useEffect(() => {
    // Initial load should only happen once
    loadCabOptions();
    
    // Setup event handlers with extreme throttling to prevent infinite loops
    const handleFareCacheCleared = () => {
      if (shouldThrottleEvent('fare-cache-cleared', 60000)) return; // Reduced from 120s to 60s
      
      // Only respond if we haven't reached max refreshes
      if (refreshCountRef.current >= maxRefreshesRef.current) {
        console.log('useCabOptions: Ignoring fare cache cleared event (max refreshes reached)');
        return;
      }
      
      console.log('useCabOptions: Detected fare cache cleared event');
      loadCabOptions(true);
    };
    
    const handleDataRefreshed = (event: Event) => {
      const customEvent = event as CustomEvent;
      const eventType = event.type;
      
      // Ultra-strong throttling - 60 seconds between each event type (reduced from 120s)
      if (shouldThrottleEvent(eventType, 60000)) return;
      
      // Only respond if we haven't reached max refreshes
      if (refreshCountRef.current >= maxRefreshesRef.current) {
        console.log(`useCabOptions: Ignoring ${eventType} event (max refreshes reached)`);
        return;
      }
      
      console.log(`useCabOptions: Detected ${eventType} event:`, customEvent.detail);
      
      // Reset the refresh counter for vehicle-data-refreshed events only
      if (eventType === 'vehicle-data-refreshed') {
        refreshCountRef.current = Math.max(refreshCountRef.current - 1, 0);
        
        // Use local storage to avoid multiple component instances all refreshing
        const lastRefreshKey = `vehicle-refresh-${eventType}`;
        const lastRefresh = localStorage.getItem(lastRefreshKey);
        const now = Date.now();
        
        if (lastRefresh && now - parseInt(lastRefresh, 10) < 30000) {
          console.log(`Another instance already processed this ${eventType} event recently`);
          return;
        }
        
        localStorage.setItem(lastRefreshKey, now.toString());
        loadCabOptions(true);
      }
    };
    
    // Listen for fare-data-updated event for immediate UI updates
    const handleFareDataUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      
      if (shouldThrottleEvent('fare-data-updated', 30000)) return; // Reduced from 60s to 30s for quicker updates
      
      console.log('Fare data has been updated, refreshing cab options', customEvent.detail);
      // Use a shorter delay to ensure the backend has had time to update
      setTimeout(() => loadCabOptions(true), 500); // Reduced from 1000ms to 500ms
    };
    
    // Use passive event listeners to reduce performance impact
    window.addEventListener('fare-cache-cleared', handleFareCacheCleared, { passive: true });
    window.addEventListener('vehicle-data-refreshed', handleDataRefreshed, { passive: true });
    window.addEventListener('fare-data-updated', handleFareDataUpdated, { passive: true });
    
    return () => {
      window.removeEventListener('fare-cache-cleared', handleFareCacheCleared);
      window.removeEventListener('vehicle-data-refreshed', handleDataRefreshed);
      window.removeEventListener('fare-data-updated', handleFareDataUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Handle trip type/mode changes with minimal reloads
  useEffect(() => {
    const handleTripChange = async () => {
      // Only show loading state for completely new trip types
      setFilterLoading(true);
      
      try {
        // For admin trip types, always force refresh
        const shouldForceRefresh = isAdminTripType(tripType);
        
        // Load with filters based on trip type/mode
        await loadCabOptions(shouldForceRefresh);
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
