
import { useState, useEffect, useRef } from 'react';
import { CabType } from '@/types/cab';
import { getVehicleData, clearVehicleDataCache } from '@/services/vehicleDataService';
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
  const maxRefreshesRef = useRef<number>(5);
  const vehicleDataCache = useRef<Map<string, { data: CabType[], timestamp: number }>>(new Map());
  const eventThrottleTimestamps = useRef<Record<string, number>>({});
  
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
    if (loadingRef.current) {
      console.log('Already loading cab options, skipping');
      return cabOptions;
    }
    
    const isAdminTrip = isAdminTripType(tripType);
    if (isAdminTrip) {
      forceRefresh = true;
      console.log('Admin trip type detected, forcing refresh');
    }
    
    const throttleDuration = isAdminTrip ? 5000 : 15000;
    
    if (forceRefresh && !isAdminTrip) {
      if (shouldThrottleEvent('force-refresh', throttleDuration)) {
        return cabOptions;
      }
      
      if (refreshCountRef.current >= maxRefreshesRef.current) {
        if (Date.now() - lastRefreshRef.current > 60000) {
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
      
      const shouldIncludeInactive = isAdminTripType(tripType);
      
      if (isAdminTrip) {
        console.log('Admin trip - clearing cache and fetching fresh data');
        clearVehicleDataCache();
        
        const vehicles = await getVehicleData(true, true);
        
        if (!vehicles || vehicles.length === 0) {
          setError('No vehicles found. Please try refreshing the data.');
          setIsLoading(false);
          loadingRef.current = false;
          return [];
        }
        
        console.log(`Loaded ${vehicles.length} vehicles for admin view`);
        setCabOptions(vehicles);
        setIsLoading(false);
        loadingRef.current = false;
        return vehicles;
      }
      
      const cacheValidityDuration = isAdminTrip ? 5000 : 30000;
      
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
      
      const includeInactive = shouldIncludeInactive;
      console.log(`Getting vehicle data with includeInactive=${includeInactive}, forceRefresh=${forceRefresh}`);
      
      const timeoutPromise = new Promise<CabType[]>((_, reject) => {
        setTimeout(() => reject(new Error('Vehicle data fetch timeout')), 5000);
      });
      
      const dataPromise = getVehicleData(forceRefresh, includeInactive);
      
      let vehicles: CabType[];
      try {
        vehicles = await Promise.race([dataPromise, timeoutPromise]);
      } catch (e) {
        console.warn('Fetch with timeout failed, falling back to direct API call');
        vehicles = await getVehicleData(true, includeInactive);
      }
      
      console.log(`Received ${vehicles?.length || 0} vehicles from getVehicleData:`, vehicles);
      
      if (!vehicles || vehicles.length === 0) {
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
      
      if (!vehicles || vehicles.length === 0) {
        if (cabOptions.length > 0) {
          console.log('No new vehicles available, keeping existing options');
          setIsLoading(false);
          loadingRef.current = false;
          return cabOptions;
        }
        
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
      
      const filteredVehicles = filterVehiclesByTripType(vehicles, tripType);
      console.log(`Loaded ${filteredVehicles.length} vehicles for ${tripType} trip`);
      setCabOptions(filteredVehicles);
      
      setIsLoading(false);
      loadingRef.current = false;
      return filteredVehicles;
    } catch (error) {
      console.error("Error loading cab options:", error);
      setError('Failed to load vehicle options. Please try again.');
      
      if (tripType) {
        try {
          const cachedVehicles = localStorage.getItem(`cabOptions_${tripType}`);
          if (cachedVehicles) {
            const vehicles = JSON.parse(cachedVehicles);
            console.log(`Using cached vehicles for ${tripType} trip:`, vehicles.length);
            setCabOptions(vehicles);
            setError(null);
            setIsLoading(false);
            loadingRef.current = false;
            return vehicles;
          }
        } catch (cacheError) {
          console.error('Error loading cached vehicles:', cacheError);
        }
      }
      
      if (cabOptions.length > 0) {
        setIsLoading(false);
        loadingRef.current = false;
        return cabOptions;
      }
      
      setIsLoading(false);
      loadingRef.current = false;
      return [];
    }
  };
  
  const filterVehiclesByTripType = (vehicles: CabType[], tripType: TripType): CabType[] => {
    if (isTourTripType(tripType)) {
      return vehicles.filter(v => v.capacity >= 4);
    } else if (isAdminTripType(tripType)) {
      console.log(`Showing all ${vehicles.length} vehicles for admin trip type`);
      return vehicles;
    } else if (!isRegularTripType(tripType)) {
      return vehicles.filter(v => v.isActive !== false);
    } else {
      return vehicles.filter(v => v.isActive !== false);
    }
  };
  
  useEffect(() => {
    const isAdmin = isAdminTripType(tripType);
    console.log(`Initial load for tripType ${tripType}, isAdmin=${isAdmin}`);
    
    loadCabOptions(isAdmin);
    
    const handleFareCacheCleared = () => {
      if (shouldThrottleEvent('fare-cache-cleared', 60000)) return;
      
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
      
      if (shouldThrottleEvent(eventType, 60000)) return;
      
      if (refreshCountRef.current >= maxRefreshesRef.current) {
        console.log(`useCabOptions: Ignoring ${eventType} event (max refreshes reached)`);
        return;
      }
      
      console.log(`useCabOptions: Detected ${eventType} event:`, customEvent.detail);
      
      if (eventType === 'vehicle-data-refreshed') {
        refreshCountRef.current = Math.max(refreshCountRef.current - 1, 0);
        
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
    
    const handleFareDataUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      
      if (shouldThrottleEvent('fare-data-updated', 30000)) return;
      
      console.log('Fare data has been updated, refreshing cab options', customEvent.detail);
      setTimeout(() => loadCabOptions(true), 500);
    };
    
    window.addEventListener('fare-cache-cleared', handleFareCacheCleared, { passive: true });
    window.addEventListener('vehicle-data-refreshed', handleDataRefreshed, { passive: true });
    window.addEventListener('fare-data-updated', handleFareDataUpdated, { passive: true });
    window.addEventListener('vehicle-data-updated', handleFareDataUpdated, { passive: true });
    
    return () => {
      window.removeEventListener('fare-cache-cleared', handleFareCacheCleared);
      window.removeEventListener('vehicle-data-refreshed', handleDataRefreshed);
      window.removeEventListener('fare-data-updated', handleFareDataUpdated);
      window.removeEventListener('vehicle-data-updated', handleFareDataUpdated);
    };
  }, []);
  
  useEffect(() => {
    const handleTripChange = async () => {
      setFilterLoading(true);
      
      try {
        const shouldForceRefresh = isAdminTripType(tripType);
        
        if (shouldForceRefresh) {
          console.log("Admin trip type detected, forcing total refresh");
          clearVehicleDataCache();
        }
        
        await loadCabOptions(shouldForceRefresh);
      } catch (error) {
        console.error("Error updating cab options for trip change:", error);
        toast.error("Failed to update vehicle options");
      } finally {
        setFilterLoading(false);
      }
    };
    
    handleTripChange();
  }, [tripType, tripMode]);
  
  const refresh = () => {
    console.log("Manual refresh triggered");
    setIsLoading(true);
    return loadCabOptions(true);
  };
  
  return {
    cabOptions,
    isLoading,
    error,
    filterLoading,
    lastRefreshTime,
    refresh
  };
};
