
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState, useCallback, useRef, useEffect } from 'react';
import { getApiUrl } from '@/config/api';
import { toast } from 'sonner';

// Type definitions
interface LocalPackageFareResult {
  fare: number;
  isFetching: boolean;
  error: string | null;
  hourlyPackage: string;
  changePackage: (packageId: string) => void;
  clearFare: () => void;
  fetchFare: (cabId: string, packageId?: string, forceRefresh?: boolean) => Promise<number>;
}

interface FareResponse {
  status: string;
  fares: Array<{
    vehicleId: string;
    price4hrs40km: number;
    price8hrs80km: number;
    price10hrs100km: number;
    priceExtraKm: number;
    priceExtraHour: number;
    [key: string]: any;
  }>;
  [key: string]: any;
}

/**
 * Custom hook for managing local package fares
 * 
 * Fetches and caches vehicle-specific package fares with strict ID validation
 * to prevent race conditions and cross-talk between different vehicle selections.
 */
export function useLocalPackageFare(initialPackage: string = '8hrs-80km'): LocalPackageFareResult {
  const [hourlyPackage, setHourlyPackage] = useState<string>(initialPackage);
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentVehicleIdRef = useRef<string | null>(null);
  
  // Normalize vehicle ID consistently across the application
  const normalizeVehicleId = useCallback((id: string): string => {
    if (!id) return '';
    // Standardize ID format: lowercase, replace spaces and special chars with underscores
    return id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }, []);
  
  // Clear all fare cache entries
  const clearAllFareCaches = useCallback(() => {
    // Get all localStorage keys
    const allKeys = Object.keys(localStorage);
    
    // Filter fare-related keys and remove them
    const fareKeys = allKeys.filter(key => key.startsWith('fare_local_'));
    
    console.log(`Purging ${fareKeys.length} cached fare entries from localStorage`);
    fareKeys.forEach(key => localStorage.removeItem(key));
  }, []);
  
  // Clear all fare cache entries except the current one
  const clearOtherFareCaches = useCallback((currentVehicleId: string) => {
    if (!currentVehicleId) return;
    
    const normalizedId = normalizeVehicleId(currentVehicleId);
    const currentKey = `fare_local_${normalizedId}`;
    
    // Get all localStorage keys
    const allKeys = Object.keys(localStorage);
    
    // Filter fare keys excluding the current vehicle's key
    const fareKeysToRemove = allKeys.filter(key => 
      key.startsWith('fare_local_') && key !== currentKey
    );
    
    console.log(`Purging ${fareKeysToRemove.length} other vehicle fare entries from localStorage`);
    fareKeysToRemove.forEach(key => localStorage.removeItem(key));
  }, [normalizeVehicleId]);
  
  // Clear all fares (used when changing package)
  const clearFare = useCallback(() => {
    // Remove all queries with the 'localPackageFare' key prefix
    queryClient.removeQueries({ queryKey: ['localPackageFare'] });
    
    // Abort any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Clear all fare cache entries
    clearAllFareCaches();
    
    // Reset current vehicle ID reference
    currentVehicleIdRef.current = null;
    
    console.log('Cleared all fare data and aborted pending requests');
  }, [queryClient, clearAllFareCaches]);
  
  // Change the selected hourly package
  const changePackage = useCallback((packageId: string) => {
    if (packageId === hourlyPackage) return;
    
    console.log(`Changing package from ${hourlyPackage} to ${packageId}`);
    setHourlyPackage(packageId);
    
    // Clear all fare data when package changes
    clearFare();
  }, [clearFare, hourlyPackage]);
  
  // Fetch fare function that can be called manually
  const fetchFare = useCallback(async (
    vehicleId: string, 
    packageId: string = hourlyPackage, 
    forceRefresh: boolean = false
  ): Promise<number> => {
    if (!vehicleId) {
      console.warn('Missing vehicleId in fetchFare call');
      return 0;
    }
    
    // Normalize the vehicle ID for consistent caching
    const normalizedVehicleId = normalizeVehicleId(vehicleId);
    
    // Store the current vehicle ID for validation
    currentVehicleIdRef.current = normalizedVehicleId;
    
    // Abort any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    // Clear other vehicle fare caches to prevent cross-contamination
    clearOtherFareCaches(normalizedVehicleId);
    
    console.log(`Fetching local package fare for ${normalizedVehicleId}, package: ${packageId}, forceRefresh: ${forceRefresh}`);
    
    try {
      // Try getting from cache first unless forcing refresh
      if (!forceRefresh) {
        const cacheKey = `fare_local_${normalizedVehicleId}`;
        const cachedFare = localStorage.getItem(cacheKey);
        
        if (cachedFare && !isNaN(Number(cachedFare))) {
          const parsedFare = Number(cachedFare);
          if (parsedFare > 0) {
            console.log(`Using cached fare for ${normalizedVehicleId}: ${parsedFare}`);
            return parsedFare;
          }
        }
      }
      
      // Build API URL with vehicle ID
      const apiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${encodeURIComponent(vehicleId)}`);
      
      // Set headers for forced refresh if needed
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      };
      
      if (forceRefresh) {
        headers['X-Force-Refresh'] = 'true';
      }
      
      // Make the API request
      const response = await axios.get<FareResponse>(apiUrl, {
        headers,
        signal: abortControllerRef.current.signal,
        timeout: 8000
      });
      
      // Verify this request is still relevant
      if (normalizedVehicleId !== currentVehicleIdRef.current) {
        console.log(`Discarding stale response for ${normalizedVehicleId}, current vehicle is ${currentVehicleIdRef.current}`);
        return 0;
      }
      
      // Process the response
      if (response.data?.fares && response.data.fares.length > 0) {
        // Find fares matching the requested vehicle ID
        const matchingFares = response.data.fares.filter(fare => {
          const fareVehicleId = normalizeVehicleId(fare.vehicleId || '');
          return fareVehicleId === normalizedVehicleId;
        });
        
        if (matchingFares.length === 0) {
          throw new Error(`No matching fare found for ${vehicleId}`);
        }
        
        // Use the first matching fare
        const farePricing = matchingFares[0];
        
        // Extract price based on package
        let price = 0;
        if (packageId.includes('4hrs-40km') && farePricing.price4hrs40km) {
          price = Number(farePricing.price4hrs40km);
        } else if (packageId.includes('8hrs-80km') && farePricing.price8hrs80km) {
          price = Number(farePricing.price8hrs80km);
        } else if (packageId.includes('10hrs-100km') && farePricing.price10hrs100km) {
          price = Number(farePricing.price10hrs100km);
        }
        
        if (price > 0) {
          console.log(`Retrieved valid fare for ${vehicleId}: ₹${price}`);
          
          // Store in localStorage for future use
          const cacheKey = `fare_local_${normalizedVehicleId}`;
          localStorage.setItem(cacheKey, String(price));
          
          // Update React Query cache
          queryClient.setQueryData(
            ['localPackageFare', normalizedVehicleId, packageId],
            price
          );
          
          return price;
        }
        
        throw new Error(`No valid price found for ${vehicleId} with package ${packageId}`);
      }
      
      throw new Error('No fare data found from API');
    } catch (error) {
      // Don't report errors for cancelled requests
      if (axios.isCancel(error)) {
        console.log(`Request for ${vehicleId} was cancelled`);
        return 0;
      }
      
      console.error('Error fetching fare:', error);
      
      // Only show toast for non-cancelled errors
      if (normalizedVehicleId === currentVehicleIdRef.current) {
        toast.error('Failed to load fare. Please try again.');
      }
      
      throw error;
    }
  }, [hourlyPackage, normalizeVehicleId, queryClient, clearOtherFareCaches]);
  
  // Use React Query to handle the fare data fetching with proper caching
  const {
    data: fare = 0,
    isFetching,
    error
  } = useQuery({
    queryKey: ['localPackageFare', currentVehicleIdRef.current || '', hourlyPackage],
    queryFn: async () => {
      if (!currentVehicleIdRef.current) return 0;
      
      try {
        // Try to get from localStorage first
        const normalizedVehicleId = currentVehicleIdRef.current;
        const cacheKey = `fare_local_${normalizedVehicleId}`;
        const cachedFare = localStorage.getItem(cacheKey);
        
        if (cachedFare && !isNaN(Number(cachedFare))) {
          const parsedFare = Number(cachedFare);
          if (parsedFare > 0) {
            console.log(`Query using cached fare for ${normalizedVehicleId}: ${parsedFare}`);
            return parsedFare;
          }
        }
        
        // No valid cache, fetch from API
        return await fetchFare(currentVehicleIdRef.current, hourlyPackage);
      } catch (error) {
        console.error('Error in query function:', error);
        throw error;
      }
    },
    enabled: !!currentVehicleIdRef.current,
    staleTime: 60000, // Consider data fresh for 1 minute
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
