
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState, useCallback, useRef } from 'react';
import { getApiUrl } from '@/config/api';
import { toast } from 'sonner';

// Type definitions
interface FareQueryResult {
  fare: number;
  isFetching: boolean;
  error: string | null;
  hourlyPackage: string;
  changePackage: (packageId: string) => void;
  refetchFare: () => Promise<void>;
  currentVehicleId: string | null;
  setVehicleId: (id: string) => void;
}

interface FareResponse {
  status: string;
  fares: Array<{
    vehicleId: string;
    price4hrs40km: number;
    price8hrs80km: number;
    price10hrs100km: number;
    [key: string]: any;
  }>;
}

/**
 * React Query implementation of local package fare hook
 * 
 * This implementation leverages React Query for automatic request deduplication,
 * caching, and cancellation of stale requests.
 */
export function useLocalPackageFareQuery(
  initialPackage: string = '8hrs-80km'
): FareQueryResult {
  const [hourlyPackage, setHourlyPackage] = useState<string>(initialPackage);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const normalizedVehicleIdRef = useRef<string | null>(null);
  
  // Normalize vehicle ID consistently
  const normalizeVehicleId = useCallback((id: string): string => {
    if (!id) return '';
    return id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }, []);
  
  // Change the selected hourly package
  const changePackage = useCallback((packageId: string) => {
    if (packageId === hourlyPackage) return;
    
    console.log(`Changing package from ${hourlyPackage} to ${packageId}`);
    setHourlyPackage(packageId);
    
    // Invalidate current queries to force refetch with new package
    if (vehicleId) {
      queryClient.invalidateQueries({ 
        queryKey: ['localPackageFare', normalizeVehicleId(vehicleId)]
      });
    }
  }, [hourlyPackage, queryClient, vehicleId, normalizeVehicleId]);
  
  // Set the current vehicle ID and normalize it
  const setCurrentVehicleId = useCallback((id: string) => {
    if (!id) return;
    
    const normalizedId = normalizeVehicleId(id);
    normalizedVehicleIdRef.current = normalizedId;
    setVehicleId(id);
    
    // When changing vehicle, clear other localStorage entries to prevent cross-contamination
    const allKeys = Object.keys(localStorage);
    const currentKey = `fare_local_${normalizedId}`;
    const fareKeysToRemove = allKeys.filter(key => 
      key.startsWith('fare_local_') && key !== currentKey
    );
    
    console.log(`Purging ${fareKeysToRemove.length} other vehicle fare entries from localStorage`);
    fareKeysToRemove.forEach(key => localStorage.removeItem(key));
  }, [normalizeVehicleId]);
  
  // The main query to fetch fare data
  const {
    data: fare = 0,
    isFetching,
    error,
    refetch
  } = useQuery({
    queryKey: ['localPackageFare', vehicleId ? normalizeVehicleId(vehicleId) : 'noVehicle', hourlyPackage],
    queryFn: async ({ queryKey, signal }) => {
      // Extract vehicle ID from query key
      const [_, normalizedVehicleId, packageId] = queryKey as [string, string, string];
      
      if (normalizedVehicleId === 'noVehicle' || !vehicleId) {
        return 0;
      }
      
      console.log(`Fetching fare for ${vehicleId} with package ${packageId}`);
      
      try {
        // Try to get from localStorage first
        const cacheKey = `fare_local_${normalizedVehicleId}`;
        const cachedFare = localStorage.getItem(cacheKey);
        
        if (cachedFare && !isNaN(Number(cachedFare))) {
          const parsedFare = Number(cachedFare);
          if (parsedFare > 0) {
            console.log(`Using cached fare for ${vehicleId}: ${parsedFare}`);
            return parsedFare;
          }
        }
        
        // No valid cache, fetch from API
        const apiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${encodeURIComponent(vehicleId)}`);
        
        const response = await axios.get<FareResponse>(apiUrl, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          signal,
          timeout: 8000
        });
        
        // Process the response
        if (response.data?.fares && response.data.fares.length > 0) {
          // Find fare that matches our vehicle ID
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
          if (packageId.includes('4hrs-40km')) {
            price = Number(farePricing.price4hrs40km);
          } else if (packageId.includes('8hrs-80km')) {
            price = Number(farePricing.price8hrs80km);
          } else if (packageId.includes('10hrs-100km')) {
            price = Number(farePricing.price10hrs100km);
          }
          
          if (price > 0) {
            console.log(`Retrieved valid fare for ${vehicleId}: ₹${price}`);
            
            // ✅ Write to localStorage only after ID match
            // Verify the vehicle ID is still the current one before caching
            if (normalizedVehicleIdRef.current === normalizedVehicleId) {
              localStorage.setItem(cacheKey, String(price));
            } else {
              console.log(`Skipping localStorage update: current vehicle is now ${normalizedVehicleIdRef.current}`);
            }
            
            return price;
          }
          
          throw new Error(`No valid price found for ${vehicleId} with package ${packageId}`);
        }
        
        throw new Error('No fare data found from API');
      } catch (error) {
        if (axios.isCancel(error)) {
          console.log(`Request for ${vehicleId} was cancelled by React Query`);
          return 0;
        }
        
        console.error('Error fetching fare:', error);
        toast.error('Failed to load fare. Please try again.');
        throw error;
      }
    },
    enabled: !!vehicleId,
    staleTime: 60000,     // Consider data fresh for 1 minute
    gcTime: 300000,       // Keep unused data in cache for 5 minutes
    refetchOnWindowFocus: false
  });
  
  // Manual refetch function that ensures the current vehicle ID is used
  const refetchFare = async () => {
    if (vehicleId) {
      await refetch();
    }
  };
  
  return {
    fare,
    isFetching,
    error: error ? (error instanceof Error ? error.message : String(error)) : null,
    hourlyPackage,
    changePackage,
    refetchFare,
    currentVehicleId: vehicleId,
    setVehicleId: setCurrentVehicleId
  };
}
