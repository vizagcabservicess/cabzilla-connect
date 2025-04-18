
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { CabType } from '@/types/cab';
import { getApiUrl } from '@/config/api';
import { getForcedRequestConfig } from '@/config/requestConfig';

export type TripFareType = 'local' | 'outstation' | 'airport';

interface UseTripFareOptions {
  forceRefresh?: boolean;
  cacheTime?: number; // in milliseconds
}

const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

// Helper to normalize IDs for consistent comparison
const normalizeId = (id: string): string => {
  if (!id) return '';
  return id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
};

/**
 * Custom hook to fetch trip fares based on trip type and vehicle ID
 */
export function useTripFare(tripType: TripFareType, options: UseTripFareOptions = {}) {
  const [fares, setFares] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);

  // Map trip type to API endpoint
  const getEndpointForTripType = (type: TripFareType): string => {
    switch (type) {
      case 'local':
        return '/api/direct-local-fares.php';
      case 'outstation':
        return '/api/outstation-fares.php';
      case 'airport':
        return '/api/airport-fares.php';
      default:
        return '/api/direct-local-fares.php';
    }
  };

  // Generate cache key based on trip type and vehicle ID
  const generateCacheKey = (type: TripFareType, vehicleId: string): string => {
    return `fare_${type}_${normalizeId(vehicleId)}`;
  };

  // Clear cache for a specific vehicle and trip type
  const clearCache = useCallback((type: TripFareType, vehicleId: string): void => {
    const cacheKey = generateCacheKey(type, vehicleId);
    localStorage.removeItem(cacheKey);
  }, []);

  // Clear all caches for a specific trip type
  const clearAllCache = useCallback((type: TripFareType): void => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(`fare_${type}_`)) {
        localStorage.removeItem(key);
      }
    });
  }, []);

  // Check if cache is valid
  const isCacheValid = (timestamp: number): boolean => {
    const cacheTime = options.cacheTime || DEFAULT_CACHE_TIME;
    return Date.now() - timestamp < cacheTime;
  };

  // Fetch fare for a specific vehicle
  const fetchFare = useCallback(async (
    vehicleId: string,
    tripType: TripFareType,
    additionalParams: Record<string, string> = {},
    forceRefresh: boolean = false
  ): Promise<number> => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create a new abort controller
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    // Increment request ID to track the latest request
    const requestId = ++requestIdRef.current;

    // Generate cache key
    const cacheKey = generateCacheKey(tripType, vehicleId);
    
    // Clear cache if forcing refresh
    if (forceRefresh) {
      localStorage.removeItem(cacheKey);
    }

    // Try to get from cache first if not forcing refresh
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { timestamp, price } = JSON.parse(cached);
          if (isCacheValid(timestamp)) {
            console.log(`Using cached ${tripType} fare for vehicle ${vehicleId}: ₹${price}`);
            return price;
          }
        }
      } catch (e) {
        console.error('Error parsing cached fare:', e);
        // Continue to fetch if cache parsing fails
      }
    }

    // Set loading state
    setIsLoading(true);
    setError(null);

    try {
      // Determine endpoint based on trip type
      const endpoint = getEndpointForTripType(tripType);
      const apiUrl = getApiUrl(endpoint);

      // Prepare request params
      const params = new URLSearchParams({
        vehicle_id: vehicleId,
        ...additionalParams
      });

      // Fetch from API
      const response = await axios.get(`${apiUrl}?${params.toString()}`, {
        signal,
        ...getForcedRequestConfig(),
        headers: {
          ...getForcedRequestConfig().headers,
          'X-Force-Refresh': forceRefresh ? 'true' : 'false'
        }
      });

      // Exit if this is not the latest request
      if (requestId !== requestIdRef.current) {
        console.log('Ignoring stale response for fare request');
        return 0;
      }

      let price = 0;
      if (response.data && response.data.status === 'success') {
        // Handle different response formats based on trip type
        if (tripType === 'local' && response.data.fares) {
          // For local, find the matching fare by vehicle ID
          const normalizedRequestedId = normalizeId(vehicleId);
          const matchedFare = response.data.fares.find(
            (f: any) => normalizeId(f.vehicleId) === normalizedRequestedId
          );
          
          if (matchedFare) {
            price = matchedFare.price || 0;
          }
        } else if (tripType === 'outstation' && response.data.fare) {
          // For outstation, get the fare directly
          price = response.data.fare.price || 0;
        } else if (tripType === 'airport' && response.data.fare) {
          // For airport, get the fare based on tier
          price = response.data.fare.price || 0;
        } else if (response.data.price) {
          // Generic fallback
          price = response.data.price;
        }
      }

      // Cache the result
      if (price > 0) {
        localStorage.setItem(cacheKey, JSON.stringify({
          timestamp: Date.now(),
          price
        }));

        // Update fares state
        setFares(prev => ({
          ...prev,
          [vehicleId]: price
        }));
      }

      return price;
    } catch (e) {
      // Ignore if cancelled
      if (axios.isCancel(e)) {
        console.log('Request cancelled:', e.message);
        return 0;
      }
      
      // Set error state for other errors
      setError(e.message || 'Failed to fetch fare');
      console.error(`Error fetching ${tripType} fare:`, e);
      return 0;
    } finally {
      // Only update loading state if this is the latest request
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [options.cacheTime]);

  // Fetch fares for multiple vehicles
  const fetchFares = useCallback(async (
    vehicleIds: string[],
    tripType: TripFareType,
    additionalParams: Record<string, string> = {},
    forceRefresh: boolean = false
  ): Promise<Record<string, number>> => {
    setIsLoading(true);
    setError(null);

    const results: Record<string, number> = {};
    
    try {
      // Fetch fares in parallel
      const promises = vehicleIds.map(id => 
        fetchFare(id, tripType, additionalParams, forceRefresh)
          .then(price => {
            results[id] = price;
            return { id, price };
          })
      );
      
      await Promise.all(promises);
      
      // Update state with all fares
      setFares(prev => ({
        ...prev,
        ...results
      }));
      
      return results;
    } catch (e) {
      setError('Failed to fetch fares');
      console.error('Error fetching multiple fares:', e);
      return results;
    } finally {
      setIsLoading(false);
    }
  }, [fetchFare]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    fares,
    isLoading,
    error,
    fetchFare,
    fetchFares,
    clearCache,
    clearAllCache
  };
}
