
import { useState, useEffect, useCallback, useRef } from 'react';
import axios, { AxiosResponse, CancelTokenSource } from 'axios';
import { CabType } from '@/types/cab';
import { getApiUrl } from '@/config/api';
import { getForcedRequestConfig, safeFetch } from '@/config/requestConfig';

export type FareType = 'local' | 'outstation' | 'airport' | 'tour';
export type TripDirectionType = 'one-way' | 'round-trip';

export interface FareParams {
  vehicleId: string;
  tripType: FareType;
  distance?: number;
  tripMode?: TripDirectionType;
  packageId?: string;
  returnDate?: Date | null;
  pickupDate?: Date | null;
}

export interface FareDetails {
  basePrice: number;
  totalPrice: number;
  extraKmCharge?: number;
  driverAllowance?: number;
  nightHaltCharge?: number;
  packagePrice?: number;
  extraInfo?: string;
  breakdown?: {
    [key: string]: number | string;
  };
}

interface FareCache {
  timestamp: number;
  fare: FareDetails;
}

// Helper to normalize vehicle IDs for consistent API calls and caching
const normalizeVehicleId = (id: string): string => {
  if (!id) return '';
  
  // Convert to lowercase and replace spaces with underscores
  const normalized = id.toLowerCase().replace(/\s+/g, '_');
  
  // Remove any special characters that aren't alphanumeric or underscore
  return normalized.replace(/[^a-z0-9_]/g, '');
};

// Generate a consistent cache key based on fare parameters
const generateCacheKey = (params: FareParams): string => {
  const { vehicleId, tripType, distance = 0, tripMode = 'one-way', packageId = '' } = params;
  const normalizedId = normalizeVehicleId(vehicleId);
  
  return `fare_${tripType}_${normalizedId}_${distance}_${tripMode}_${packageId}_${Date.now() % 86400000}`;
};

// Cache expiration time (15 minutes)
const CACHE_EXPIRATION = 15 * 60 * 1000;

export function useFare() {
  const [fares, setFares] = useState<Record<string, FareDetails>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  
  // Use refs to prevent excessive re-renders and manage request lifecycle
  const cancelTokensRef = useRef<Record<string, CancelTokenSource>>({});
  const cacheTimestampsRef = useRef<Record<string, number>>({});
  const requestCountRef = useRef<Record<string, number>>({});
  const abortControllersRef = useRef<Record<string, AbortController>>({});
  
  // Clear all pending requests
  const clearPendingRequests = useCallback(() => {
    // Cancel all axios requests
    Object.values(cancelTokensRef.current).forEach(source => {
      if (source) {
        try {
          source.cancel('Request canceled due to new request');
        } catch (e) {
          console.error('Error canceling request:', e);
        }
      }
    });
    
    // Abort all fetch requests
    Object.values(abortControllersRef.current).forEach(controller => {
      if (controller) {
        try {
          controller.abort();
        } catch (e) {
          console.error('Error aborting request:', e);
        }
      }
    });
    
    // Reset refs
    cancelTokensRef.current = {};
    abortControllersRef.current = {};
  }, []);
  
  // Get endpoint based on trip type
  const getEndpointForTripType = (tripType: FareType): string => {
    switch (tripType) {
      case 'local':
        return '/api/direct-local-fares.php';
      case 'outstation':
        return '/api/outstation-fares.php';
      case 'airport':
        return '/api/direct-airport-fares.php';
      case 'tour':
        return '/api/fares/tours.php';
      default:
        return '/api/direct-local-fares.php';
    }
  };
  
  // Check cache for fare
  const getCachedFare = useCallback((params: FareParams): FareDetails | null => {
    const cacheKey = generateCacheKey(params);
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData) as FareCache;
        if (Date.now() - parsed.timestamp < CACHE_EXPIRATION) {
          console.log(`Using cached fare for ${params.vehicleId} (${params.tripType}):`, parsed.fare);
          return parsed.fare;
        }
      } catch (err) {
        console.error('Error parsing cached fare:', err);
      }
      
      // Remove expired cache
      localStorage.removeItem(cacheKey);
    }
    
    return null;
  }, []);
  
  // Save fare to cache
  const cacheFare = useCallback((params: FareParams, fare: FareDetails): void => {
    if (fare.totalPrice <= 0) {
      console.log(`Not caching invalid fare for ${params.vehicleId} (${params.tripType}):`, fare);
      return;
    }
    
    const cacheKey = generateCacheKey(params);
    const cacheData: FareCache = {
      timestamp: Date.now(),
      fare
    };
    
    try {
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`Cached fare for ${params.vehicleId} (${params.tripType}):`, fare);
    } catch (err) {
      console.error('Error caching fare:', err);
    }
  }, []);
  
  // Primary function to fetch fare from API
  const fetchFare = useCallback(async (params: FareParams, forceRefresh = false): Promise<FareDetails> => {
    const { vehicleId, tripType, distance = 0, tripMode = 'one-way', packageId = '' } = params;
    const normalizedVehicleId = normalizeVehicleId(vehicleId);
    
    if (!normalizedVehicleId) {
      console.error('Invalid vehicle ID:', vehicleId);
      return { basePrice: 0, totalPrice: 0 };
    }
    
    // Generate a request key for tracking this specific request
    const requestKey = `${tripType}_${normalizedVehicleId}_${distance}_${tripMode}_${packageId}`;
    
    // Throttle requests to the same endpoint
    const now = Date.now();
    const lastRequest = cacheTimestampsRef.current[requestKey] || 0;
    
    if (!forceRefresh && now - lastRequest < 3000) {
      console.log(`Throttling fare request for ${normalizedVehicleId} (${tripType}): last request was ${Math.round((now - lastRequest)/1000)}s ago`);
      return fares[normalizedVehicleId] || { basePrice: 0, totalPrice: 0 };
    }
    
    // Try to get from cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedFare = getCachedFare(params);
      if (cachedFare) {
        // Update fares state with cached value
        setFares(prev => ({
          ...prev,
          [normalizedVehicleId]: cachedFare
        }));
        
        return cachedFare;
      }
    }
    
    // Clear any previous requests for this vehicle
    if (cancelTokensRef.current[requestKey]) {
      cancelTokensRef.current[requestKey].cancel('New request initiated');
    }
    
    if (abortControllersRef.current[requestKey]) {
      abortControllersRef.current[requestKey].abort();
    }
    
    // Create new cancel token and abort controller
    const cancelTokenSource = axios.CancelToken.source();
    cancelTokensRef.current[requestKey] = cancelTokenSource;
    
    const abortController = new AbortController();
    abortControllersRef.current[requestKey] = abortController;
    
    // Update timestamps
    cacheTimestampsRef.current[requestKey] = now;
    
    // Increment request counter
    requestCountRef.current[requestKey] = (requestCountRef.current[requestKey] || 0) + 1;
    const currentRequestId = requestCountRef.current[requestKey];
    
    // Set loading state
    setLoading(prev => ({
      ...prev,
      [normalizedVehicleId]: true
    }));
    
    // Clear previous errors
    setErrors(prev => ({
      ...prev,
      [normalizedVehicleId]: null
    }));
    
    try {
      // Get the correct endpoint
      const endpoint = getEndpointForTripType(tripType);
      const apiUrl = getApiUrl(endpoint);
      
      // Prepare URL parameters
      const urlParams = new URLSearchParams({
        vehicle_id: normalizedVehicleId,
        forceRefresh: forceRefresh ? 'true' : 'false',
        _t: Date.now().toString()
      });
      
      if (distance > 0) {
        urlParams.append('distance', distance.toString());
      }
      
      if (tripMode) {
        urlParams.append('trip_mode', tripMode);
      }
      
      if (packageId) {
        urlParams.append('package_id', packageId);
      }
      
      // Use safeFetch with consistent options
      const response = await safeFetch(`${apiUrl}?${urlParams.toString()}`, {
        method: 'GET',
        headers: {
          ...getForcedRequestConfig().headers,
          'X-Force-Refresh': forceRefresh ? 'true' : 'false'
        },
        signal: abortController.signal
      });
      
      // Parse response
      const data = await response.json();
      
      // If this is not the latest request, ignore the result
      if (currentRequestId !== requestCountRef.current[requestKey]) {
        console.log(`Ignoring stale response for ${normalizedVehicleId} (${tripType})`);
        return fares[normalizedVehicleId] || { basePrice: 0, totalPrice: 0 };
      }
      
      // Process response based on trip type
      let fareDetails: FareDetails = { basePrice: 0, totalPrice: 0 };
      
      if (data.status === 'success') {
        if (tripType === 'local') {
          // Find the matching fare in the response
          const matchedFare = data.fares?.find((f: any) => 
            normalizeVehicleId(f.vehicleId) === normalizedVehicleId
          );
          
          if (matchedFare) {
            const packageKey = packageId || '8hrs-80km';
            let packagePrice = 0;
            
            if (packageKey === '4hrs-40km') {
              packagePrice = matchedFare.price4hrs40km || 0;
            } else if (packageKey === '8hrs-80km') {
              packagePrice = matchedFare.price8hrs80km || 0;
            } else if (packageKey === '10hrs-100km') {
              packagePrice = matchedFare.price10hrs100km || 0;
            }
            
            fareDetails = {
              basePrice: packagePrice,
              totalPrice: packagePrice,
              packagePrice,
              extraKmCharge: matchedFare.priceExtraKm || 0,
              breakdown: {
                [packageKey]: packagePrice
              }
            };
          }
        } else if (tripType === 'outstation') {
          if (data.fare) {
            // Process outstation fare response
            const baseFare = data.fare.basePrice || 0;
            const perKm = data.fare.pricePerKm || 0;
            const driverAllowance = data.fare.driverAllowance || 0;
            const nightHalt = data.fare.nightHaltCharge || 0;
            
            // Apply distance calculations
            let distanceFare = 0;
            if (distance > 0) {
              const minDistance = 300; // Minimum billable distance
              
              if (tripMode === 'one-way') {
                // For one-way, driver returns so calculate for return journey
                const effectiveDistance = Math.max(distance * 2, minDistance);
                distanceFare = effectiveDistance * perKm;
              } else {
                // For round trip
                const effectiveDistance = Math.max(distance * 2, minDistance);
                distanceFare = effectiveDistance * perKm;
              }
            }
            
            const totalFare = baseFare + distanceFare + driverAllowance;
            
            fareDetails = {
              basePrice: baseFare,
              totalPrice: totalFare,
              driverAllowance,
              nightHaltCharge: nightHalt,
              extraKmCharge: perKm,
              breakdown: {
                'Base fare': baseFare,
                'Distance fare': distanceFare,
                'Driver allowance': driverAllowance
              }
            };
          }
        } else if (tripType === 'airport') {
          if (data.fare) {
            // Process airport fare response
            let baseFare = 0;
            const airportFee = data.fare.airportFee || 0;
            
            // Apply tiered pricing based on distance
            if (distance <= 10) {
              baseFare = data.fare.tier1Price || 0;
            } else if (distance <= 20) {
              baseFare = data.fare.tier2Price || 0;
            } else if (distance <= 30) {
              baseFare = data.fare.tier3Price || 0;
            } else {
              baseFare = data.fare.tier4Price || 0;
              
              // Add extra km charges
              if (distance > 30) {
                const extraKm = distance - 30;
                const extraKmCost = extraKm * (data.fare.extraKmCharge || 0);
                baseFare += extraKmCost;
              }
            }
            
            // Add airport fee
            const totalFare = baseFare + airportFee;
            
            fareDetails = {
              basePrice: baseFare,
              totalPrice: totalFare,
              extraInfo: `Airport transfer (${distance} km)`,
              breakdown: {
                'Base fare': baseFare,
                'Airport fee': airportFee
              }
            };
          }
        } else if (tripType === 'tour') {
          if (data.tourFare) {
            fareDetails = {
              basePrice: data.tourFare.price || 0,
              totalPrice: data.tourFare.price || 0,
              extraInfo: data.tourFare.name || 'Tour package',
              breakdown: {
                'Tour package': data.tourFare.price || 0
              }
            };
          }
        }
      }
      
      // Cache valid fare
      if (fareDetails.totalPrice > 0) {
        cacheFare(params, fareDetails);
        
        // Also cache with consistent keys for component use
        if (tripType === 'local' && packageId) {
          localStorage.setItem(`local_fare_${normalizedVehicleId}_${packageId}`, fareDetails.totalPrice.toString());
        } else if (tripType === 'outstation') {
          const outstationKey = `outstation_${normalizedVehicleId}_${distance}_${tripMode}`;
          localStorage.setItem(outstationKey, fareDetails.totalPrice.toString());
        }
        
        // Update fares state
        setFares(prev => ({
          ...prev,
          [normalizedVehicleId]: fareDetails
        }));
        
        // Dispatch fare-calculated event
        const now = Date.now();
        const eventKey = `fare_${normalizedVehicleId}_${tripType}`;
        const lastEventTime = cacheTimestampsRef.current[`event_${eventKey}`] || 0;
        
        if (now - lastEventTime > 3000) {
          cacheTimestampsRef.current[`event_${eventKey}`] = now;
          
          try {
            window.dispatchEvent(new CustomEvent('fare-calculated', {
              detail: {
                cabId: normalizedVehicleId,
                tripType,
                tripMode,
                fare: fareDetails.totalPrice,
                timestamp: now
              }
            }));
          } catch (e) {
            console.error('Error dispatching fare-calculated event:', e);
          }
        }
      }
      
      return fareDetails;
    } catch (error) {
      // Ignore cancelled requests
      if (axios.isCancel(error) || error.name === 'AbortError') {
        console.log(`Request for ${normalizedVehicleId} (${tripType}) was cancelled`);
        return fares[normalizedVehicleId] || { basePrice: 0, totalPrice: 0 };
      }
      
      console.error(`Error fetching ${tripType} fare for ${normalizedVehicleId}:`, error);
      
      // Update error state
      setErrors(prev => ({
        ...prev,
        [normalizedVehicleId]: error.message || 'Failed to fetch fare'
      }));
      
      // Try to use previously cached fare
      const cachedFare = getCachedFare(params);
      if (cachedFare) {
        return cachedFare;
      }
      
      // Fallback to existing fare or default
      return fares[normalizedVehicleId] || { basePrice: 0, totalPrice: 0 };
    } finally {
      // Update loading state
      setLoading(prev => ({
        ...prev,
        [normalizedVehicleId]: false
      }));
      
      // Clean up references to prevent memory leaks
      delete cancelTokensRef.current[requestKey];
      delete abortControllersRef.current[requestKey];
    }
  }, [fares, getCachedFare, cacheFare]);
  
  // Fetch multiple fares at once
  const fetchFares = useCallback(async (
    params: FareParams[], 
    forceRefresh = false
  ): Promise<Record<string, FareDetails>> => {
    // Clear any existing requests
    clearPendingRequests();
    
    const results: Record<string, FareDetails> = {};
    
    for (const param of params) {
      try {
        const fare = await fetchFare(param, forceRefresh);
        if (fare.totalPrice > 0) {
          const normalizedVehicleId = normalizeVehicleId(param.vehicleId);
          results[normalizedVehicleId] = fare;
        }
        
        // Small delay between requests to prevent API rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Error in fetchFares:', error);
      }
    }
    
    return results;
  }, [fetchFare, clearPendingRequests]);
  
  // Clear all fare caches
  const clearCache = useCallback(() => {
    // Prevent multiple cache clears within 30 seconds
    const now = Date.now();
    const lastCacheClear = cacheTimestampsRef.current.lastCacheClear || 0;
    
    if (now - lastCacheClear < 30000) {
      console.log('Fare cache clear throttled - last clear was too recent');
      return;
    }
    
    cacheTimestampsRef.current.lastCacheClear = now;
    
    // Clear all fare-related items from localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('fare_') || 
          key.startsWith('local_fare_') || 
          key.startsWith('outstation_')) {
        localStorage.removeItem(key);
      }
    });
    
    // Reset state
    setFares({});
    setLoading({});
    setErrors({});
    
    // Cancel pending requests
    clearPendingRequests();
    
    localStorage.setItem('fareCacheLastCleared', now.toString());
    localStorage.setItem('forceCacheRefresh', 'true');
    
    // Dispatch event
    try {
      window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
        detail: { timestamp: now, forceRefresh: true }
      }));
    } catch (e) {
      console.error('Error dispatching fare-cache-cleared event:', e);
    }
    
    // Clear the force refresh flag after a short delay
    setTimeout(() => {
      localStorage.removeItem('forceCacheRefresh');
    }, 5000);
    
    console.log('Fare cache cleared at', new Date(now).toISOString());
  }, [clearPendingRequests]);
  
  // Clear cache for specific trip type
  const clearCacheForTripType = useCallback((tripType: FareType) => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(`fare_${tripType}_`) || 
         (tripType === 'local' && key.startsWith('local_fare_')) ||
         (tripType === 'outstation' && key.startsWith('outstation_'))) {
        localStorage.removeItem(key);
      }
    });
    
    console.log(`Cache cleared for trip type: ${tripType}`);
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPendingRequests();
    };
  }, [clearPendingRequests]);
  
  return {
    fares,
    loading,
    errors,
    fetchFare,
    fetchFares,
    clearCache,
    clearCacheForTripType,
    isFareLoading: (vehicleId: string) => loading[normalizeVehicleId(vehicleId)] || false,
    getFare: (vehicleId: string) => fares[normalizeVehicleId(vehicleId)] || null,
    getFareError: (vehicleId: string) => errors[normalizeVehicleId(vehicleId)] || null
  };
}

export default useFare;
