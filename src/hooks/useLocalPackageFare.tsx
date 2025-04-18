
import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { toast } from 'sonner';

interface LocalPackageFareResult {
  fare: number;
  isFetching: boolean;
  error: string | null;
  hourlyPackage: string;
  fetchFare: (vehicleId: string, packageId?: string, forceRefresh?: boolean) => Promise<number>;
  changePackage: (newPackage: string) => void;
  clearFare: () => void;
}

export function useLocalPackageFare(
  defaultPackage: string = '8hrs-80km'
): LocalPackageFareResult {
  const [hourlyPackage, setHourlyPackage] = useState<string>(defaultPackage);
  const [fare, setFare] = useState<number>(0);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentVehicleIdRef = useRef<string | null>(null);

  // Normalize vehicle ID consistently
  const normalizeVehicleId = (id: string): string => {
    if (!id) return '';
    return id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  };

  // Clear all fare cache entries
  const clearFare = useCallback(() => {
    // Get all localStorage keys
    const allKeys = Object.keys(localStorage);
    
    // Filter fare-related keys and remove them
    const fareKeys = allKeys.filter(key => key.startsWith('fare_local_'));
    
    console.log(`Purging ${fareKeys.length} cached fare entries from localStorage`);
    fareKeys.forEach(key => localStorage.removeItem(key));
    
    // Reset current vehicle ID reference
    currentVehicleIdRef.current = null;
    
    // Abort any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const fetchFare = useCallback(async (
    vehicleId: string, 
    packageId: string = hourlyPackage,
    forceRefresh: boolean = false
  ): Promise<number> => {
    if (!vehicleId) {
      console.warn('No vehicle ID provided to fetchFare');
      return 0;
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    // Store the normalized vehicle ID for validation
    const normalizedVehicleId = normalizeVehicleId(vehicleId);
    currentVehicleIdRef.current = normalizedVehicleId;

    // Clear all other vehicle fare caches to prevent cross-contamination
    const allKeys = Object.keys(localStorage);
    const currentKey = `fare_local_${normalizedVehicleId}`;
    const fareKeysToRemove = allKeys.filter(key => 
      key.startsWith('fare_local_') && key !== currentKey
    );
    fareKeysToRemove.forEach(key => localStorage.removeItem(key));

    try {
      setIsFetching(true);
      setError(null);

      // Try cache first unless forcing refresh
      if (!forceRefresh) {
        const cachedFare = localStorage.getItem(currentKey);
        if (cachedFare && !isNaN(Number(cachedFare))) {
          const parsedFare = Number(cachedFare);
          if (parsedFare > 0) {
            console.log(`Using cached fare for ${vehicleId}: ${parsedFare}`);
            setFare(parsedFare);
            setIsFetching(false);
            return parsedFare;
          }
        }
      }

      // Fetch from API
      const apiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${encodeURIComponent(vehicleId)}`);
      
      const response = await axios.get(apiUrl, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Force-Refresh': forceRefresh ? 'true' : 'false'
        },
        timeout: 8000
      });

      // Verify the response is for the current vehicle
      if (normalizedVehicleId !== currentVehicleIdRef.current) {
        console.log(`Discarding stale response for ${vehicleId}, current vehicle is ${currentVehicleIdRef.current}`);
        return 0;
      }

      if (response.data?.fares && response.data.fares.length > 0) {
        // Find exact matching fare for this vehicle
        const matchingFares = response.data.fares.filter(fare => {
          const fareVehicleId = normalizeVehicleId(fare.vehicleId || '');
          return fareVehicleId === normalizedVehicleId;
        });

        if (matchingFares.length === 0) {
          throw new Error(`No matching fare found for ${vehicleId}`);
        }

        const farePricing = matchingFares[0];
        let price = 0;

        // Extract price based on package
        if (packageId.includes('4hrs-40km')) {
          price = Number(farePricing.price4hrs40km);
        } else if (packageId.includes('8hrs-80km')) {
          price = Number(farePricing.price8hrs80km);
        } else if (packageId.includes('10hrs-100km')) {
          price = Number(farePricing.price10hrs100km);
        }

        if (price > 0) {
          console.log(`Retrieved valid fare for ${vehicleId}: ${price}`);
          
          // ✅ Write to localStorage only after ID match
          if (normalizedVehicleId === currentVehicleIdRef.current) {
            localStorage.setItem(currentKey, String(price));
            setFare(price);
          } else {
            console.log(`Skipping localStorage update: vehicle ID mismatch`);
          }

          return price;
        }

        throw new Error(`No valid price found for ${vehicleId} with package ${packageId}`);
      }

      throw new Error('No fare data found from API');
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log(`Request for ${vehicleId} was cancelled`);
        return 0;
      }

      console.error('Error fetching fare:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch fare');
      toast.error('Failed to load fare. Please try again.');
      return 0;
    } finally {
      setIsFetching(false);
    }
  }, [hourlyPackage]);

  const changePackage = useCallback((newPackage: string) => {
    setHourlyPackage(newPackage);
  }, []);

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
    error,
    hourlyPackage,
    fetchFare,
    changePackage,
    clearFare
  };
}
