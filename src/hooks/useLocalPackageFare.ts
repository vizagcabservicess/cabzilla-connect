
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState, useCallback, useRef, useEffect } from 'react';
import { getApiUrl, forceRefreshHeaders } from '@/config/api';
import { toast } from 'sonner';

// Type for the hook return
interface LocalPackageFareResult {
  fare: number;
  isFetching: boolean;
  error: string | null;
  hourlyPackage: string;
  changePackage: (packageId: string) => void;
  clearFare: () => void;
  fetchFare: (cabId: string, packageId?: string, forceRefresh?: boolean) => Promise<number>;
}

export function useLocalPackageFare(initialPackage: string = '8hrs-80km'): LocalPackageFareResult {
  const [hourlyPackage, setHourlyPackage] = useState<string>(initialPackage);
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentCabIdRef = useRef<string | null>(null);
  const lastFareRequestTimestampRef = useRef<number>(0);
  
  // Normalize vehicle ID to ensure consistency
  const normalizeVehicleId = (id: string): string => {
    if (!id) return '';
    // Ensure consistent normalization by converting to lowercase and replacing spaces/special chars
    return id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  };

  // Clear fare function - purges all cached fares
  const clearFare = useCallback(() => {
    // Invalidate all queries related to fares
    queryClient.removeQueries({ queryKey: ['localPackageFare'] });
    
    // Abort any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Clear any localStorage cache for all cab fares
    purgeAllFareCacheEntries();
    
    // Reset current cab ID reference
    currentCabIdRef.current = null;
    
    console.log('Cleared all fare data and aborted pending requests');
  }, [queryClient]);
  
  // Function to purge all fare-related localStorage entries
  const purgeAllFareCacheEntries = () => {
    // Get all localStorage keys
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) allKeys.push(key);
    }
    
    // Filter and remove all fare-related keys
    const fareKeys = allKeys.filter(key => 
      key.startsWith('fare_') || 
      key.startsWith('localPackageFare_')
    );
    
    console.log(`Purging ${fareKeys.length} cached fare entries from localStorage`);
    fareKeys.forEach(key => localStorage.removeItem(key));
  };
  
  // Function to purge all fare entries except for the current cab
  const purgeFareCacheExceptCurrent = (currentCabId: string) => {
    if (!currentCabId) return;
    
    const normalizedCabId = normalizeVehicleId(currentCabId);
    const currentCabCacheKey = `fare_local_${normalizedCabId}`;
    
    // Get all localStorage keys
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) allKeys.push(key);
    }
    
    // Filter fareKeys to remove
    const fareKeysToRemove = allKeys.filter(key => 
      (key.startsWith('fare_local_') && key !== currentCabCacheKey) ||
      (key.startsWith('localPackageFare_') && !key.includes(normalizedCabId))
    );
    
    console.log(`Purging ${fareKeysToRemove.length} stale fare entries from localStorage`);
    fareKeysToRemove.forEach(key => localStorage.removeItem(key));
  };

  // Change package function
  const changePackage = useCallback((packageId: string) => {
    if (packageId === hourlyPackage) return;
    
    setHourlyPackage(packageId);
    clearFare();
  }, [clearFare, hourlyPackage]);

  // Fetch fare function that can be called manually
  const fetchFare = useCallback(async (
    cabId: string, 
    packageId: string = hourlyPackage, 
    forceRefresh: boolean = false
  ): Promise<number> => {
    if (!cabId || !packageId) {
      console.warn('Missing cabId or packageId in fetchFare call');
      return 0;
    }

    // Store the current cab ID for request validation
    const normalizedCabId = normalizeVehicleId(cabId);
    currentCabIdRef.current = normalizedCabId;
    
    // Abort any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    // Create a timestamp for this request to track it
    const requestTimestamp = Date.now();
    lastFareRequestTimestampRef.current = requestTimestamp;
    
    // Before fetching new fare, purge all other cab fares
    purgeFareCacheExceptCurrent(cabId);
    
    console.log(`Fetching local package fare for ${normalizedCabId}, package: ${packageId}, timestamp: ${requestTimestamp}`);
    
    try {
      const apiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${normalizedCabId}`);
      
      const response = await axios.get(apiUrl, {
        headers: forceRefreshHeaders,
        timeout: 8000,
        signal: abortControllerRef.current.signal
      });
      
      // Check if this is still the current request for the current cab
      if (requestTimestamp !== lastFareRequestTimestampRef.current || normalizedCabId !== currentCabIdRef.current) {
        console.log(`Discarding stale fare response for ${normalizedCabId} (timestamp: ${requestTimestamp}, current: ${lastFareRequestTimestampRef.current})`);
        return 0;
      }
      
      if (response.data && response.data.fares && response.data.fares.length > 0) {
        const fareData = response.data.fares[0];
        
        // Extract the correct price for the selected package
        let price = 0;
        if (packageId.includes('4hrs-40km') && fareData.price4hrs40km) {
          price = Number(fareData.price4hrs40km);
        } else if (packageId.includes('8hrs-80km') && fareData.price8hrs80km) {
          price = Number(fareData.price8hrs80km);
        } else if (packageId.includes('10hrs-100km') && fareData.price10hrs100km) {
          price = Number(fareData.price10hrs100km);
        }
        
        if (price > 0) {
          console.log(`Retrieved fare from API for ${normalizedCabId}: ₹${price}`);
          
          // Clear any stale localStorage entries first
          purgeFareCacheExceptCurrent(cabId);
          
          // Update localStorage with the new fare using the normalized key
          const cacheKey = `fare_local_${normalizedCabId}`;
          localStorage.setItem(cacheKey, String(price));
          console.log(`Stored fare in localStorage: ${cacheKey} = ${price}`);
          
          // Update the query cache with the latest fare data
          queryClient.setQueryData(
            ['localPackageFare', normalizedCabId, packageId],
            price
          );
          
          return price;
        } else {
          const errorMsg = `No valid price found for ${cabId} with package ${packageId}`;
          console.warn(errorMsg);
          throw new Error(errorMsg);
        }
      } else {
        const errorMsg = 'No fare data found from API';
        console.warn(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      // Don't show error if it was from an aborted request
      if (axios.isCancel(error)) {
        console.log(`Request for ${normalizedCabId} was cancelled`);
        return 0;
      }
      
      console.error('Error fetching fare:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch fare';
      toast.error('Failed to load fare. Please try again.');
      throw error;
    }
  }, [hourlyPackage, queryClient]);

  // Use React Query to fetch and cache fare data
  const { 
    data: fare = 0, 
    isFetching, 
    error 
  } = useQuery({
    queryKey: ['localPackageFare', currentCabIdRef.current || 'noVehicleSelected', hourlyPackage],
    queryFn: async () => {
      if (!currentCabIdRef.current) return 0;
      
      // Before fetching from the API, try to get from localStorage
      const normalizedCabId = normalizeVehicleId(currentCabIdRef.current);
      const cacheKey = `fare_local_${normalizedCabId}`;
      const cachedFare = localStorage.getItem(cacheKey);
      
      if (cachedFare && !isNaN(Number(cachedFare))) {
        const parsedFare = Number(cachedFare);
        console.log(`Using cached local package price for ${normalizedCabId}: ${parsedFare}`);
        
        // If we're not forcing refresh, use the cached value
        return parsedFare;
      }
      
      // No valid cache found, fetch from API
      return fetchFare(currentCabIdRef.current, hourlyPackage);
    },
    enabled: !!currentCabIdRef.current,
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 300000,   // Keep unused data in cache for 5 minutes
    refetchOnWindowFocus: false
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    fare,
    isFetching,
    error: error ? (error instanceof Error ? error.message : String(error)) : null,
    hourlyPackage,
    changePackage,
    clearFare,
    fetchFare,
  };
}
