
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
  const [currentFare, setCurrentFare] = useState<number>(0);
  const queryClient = useQueryClient();
  const requestIdRef = useRef<number>(0);
  const currentCabIdRef = useRef<string>('');

  // Normalize vehicle ID to ensure consistency
  const normalizeVehicleId = (id: string): string => {
    if (!id) return '';
    return id.toLowerCase().replace(/\s+/g, '_');
  };

  // Clear fare function
  const clearFare = useCallback(() => {
    // Invalidate all queries related to fares
    queryClient.invalidateQueries({ queryKey: ['localPackageFare'] });
    setCurrentFare(0);
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

    // Generate a unique request ID
    const requestId = ++requestIdRef.current;
    // Store the current cab ID
    currentCabIdRef.current = cabId;
    
    const normalizedCabId = normalizeVehicleId(cabId);
    console.log(`Manually fetching local package fare for ${normalizedCabId}, package: ${packageId}`);
    
    try {
      const apiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${normalizedCabId}`);
      
      const response = await axios.get(apiUrl, {
        headers: forceRefreshHeaders,
        timeout: 8000,
      });
      
      // If this is not the most recent request, discard the results
      if (requestId !== requestIdRef.current || currentCabIdRef.current !== cabId) {
        console.log(`Discarding stale fare response for ${normalizedCabId} (request ${requestId}, current ${requestIdRef.current})`);
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
          
          // Update the current fare state
          setCurrentFare(price);
          
          // Update the query cache
          queryClient.setQueryData(
            ['localPackageFare', normalizedCabId, packageId],
            price
          );
          
          // Dispatch a fare update event
          window.dispatchEvent(new CustomEvent('fare-updated', {
            detail: {
              cabId: normalizedCabId,
              fare: price,
              packageId: packageId,
              source: 'useLocalPackageFare.fetchFare',
              requestId: requestId
            }
          }));
          
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
      console.error('Error fetching fare:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch fare';
      toast.error('Failed to load fare. Please try again.');
      throw error;
    }
  }, [hourlyPackage, queryClient]);

  // Use React Query to access cached fare data
  const { data: fare = 0, isFetching, error } = useQuery({
    queryKey: ['localPackageFare', 'current'],
    queryFn: async () => currentFare,
    enabled: true, // Always enabled to track current fare
  });

  return {
    fare: currentFare,
    isFetching,
    error: error ? (error instanceof Error ? error.message : String(error)) : null,
    hourlyPackage,
    changePackage,
    clearFare,
    fetchFare,
  };
}
