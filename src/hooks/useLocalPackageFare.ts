
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
    return id.toLowerCase().replace(/\s+/g, '_');
  };

  // Clear fare function
  const clearFare = useCallback(() => {
    // Invalidate all queries related to fares
    queryClient.removeQueries({ queryKey: ['localPackageFare'] });
    
    // Abort any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Clear any localStorage cache that might contain stale fares
    const cacheKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('localPackageFare_') || 
      key.startsWith('fare_')
    );
    
    cacheKeys.forEach(key => localStorage.removeItem(key));
    
    // Reset current cab ID reference
    currentCabIdRef.current = null;
    
    console.log('Cleared all fare data and aborted pending requests');
  }, [queryClient]);

  // Change package function
  const changePackage = useCallback((packageId: string) => {
    setHourlyPackage(packageId);
    clearFare();
  }, [clearFare]);

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
