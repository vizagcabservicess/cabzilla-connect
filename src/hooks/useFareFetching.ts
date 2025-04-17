
import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl, forceRefreshHeaders } from '@/config/api';

export function useFareFetching() {
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [currentFare, setCurrentFare] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);
  const lastSelectedCabIdRef = useRef<string | null>(null);

  // Cleanup function to cancel any pending requests
  useEffect(() => {
    return () => {
      if (activeRequestRef.current) {
        activeRequestRef.current.abort();
      }
    };
  }, []);

  const normalizeVehicleId = (id: string): string => {
    if (!id) return '';
    return id.toLowerCase().replace(/\s+/g, '_');
  };

  const fetchFare = useCallback(async (vehicleId: string, packageId: string) => {
    // Skip if no vehicle or package ID provided
    if (!vehicleId || !packageId) {
      return 0;
    }

    // Cancel any in-flight requests
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
    }

    // Create new abort controller
    activeRequestRef.current = new AbortController();
    
    // Track the current cab ID for this request
    lastSelectedCabIdRef.current = vehicleId;
    
    // Start loading state
    setIsFetching(true);
    setError(null);
    
    try {
      const normalizedVehicleId = normalizeVehicleId(vehicleId);
      const apiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${normalizedVehicleId}`);
      
      console.log(`Fetching price from API: ${apiUrl}`);
      
      const response = await axios.get(apiUrl, {
        headers: forceRefreshHeaders,
        timeout: 8000,
        signal: activeRequestRef.current.signal
      });
      
      // If the selected cab changed during the request, discard the result
      if (lastSelectedCabIdRef.current !== vehicleId) {
        console.log(`Selected cab changed during API call, discarding results`);
        return 0;
      }
      
      if (response.data && response.data.fares && response.data.fares.length > 0) {
        const fareData = response.data.fares[0];
        console.log(`Retrieved local fares from service for ${normalizedVehicleId}:`, fareData);
        
        let price = 0;
        if (packageId.includes('4hrs-40km')) {
          price = Number(fareData.price4hrs40km || 0);
        } else if (packageId.includes('8hrs-80km')) {
          price = Number(fareData.price8hrs80km || 0);
        } else if (packageId.includes('10hrs-100km')) {
          price = Number(fareData.price10hrs100km || 0);
        }
        
        if (price > 0) {
          console.log(`Calculated fare details for ${normalizedVehicleId}:`, {
            baseFare: price
          });
          
          // Clear any stale cache
          try {
            localStorage.removeItem(`fare_local_${normalizedVehicleId}`);
          } catch (e) {
            console.warn('Failed to clear localStorage:', e);
          }
          
          setCurrentFare(price);
          return price;
        } else {
          console.warn(`No valid price found for ${vehicleId} with package ${packageId}`);
          setError(`No valid price found for ${vehicleId} with package ${packageId}`);
          return 0;
        }
      } else {
        console.warn('No fare data found from direct API fetch');
        setError('No fare data found');
        return 0;
      }
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log(`Request was cancelled`);
      } else {
        console.error('Error fetching fare directly:', error);
        setError('Failed to fetch fare');
      }
      return 0;
    } finally {
      setIsFetching(false);
      if (activeRequestRef.current && activeRequestRef.current.signal.aborted) {
        activeRequestRef.current = null;
      }
    }
  }, []);

  return {
    fetchFare,
    isFetching,
    currentFare,
    error
  };
}
