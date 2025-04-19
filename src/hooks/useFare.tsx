
import { useState, useCallback, useRef } from 'react';
import { CabType } from '@/types/cab';
import { getApiUrl } from '@/config/api';
import { safeFetch } from '@/config/requestConfig';

export type FareType = 'local' | 'outstation' | 'airport' | 'tour';
export type TripDirectionType = 'one-way' | 'round-trip';

export interface FareParams {
  vehicleId: string;
  tripType: FareType;
  distance?: number;
  tripMode?: TripDirectionType;
  packageId?: string;
  pickupDate?: Date;
  returnDate?: Date;
}

export interface FareDetails {
  basePrice: number;
  totalPrice: number;
  breakdown?: Record<string, number>;
}

export function useFare() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const abortControllersRef = useRef<Record<string, AbortController>>({});
  const fareCache = useRef<Record<string, FareDetails>>({});
  
  const getEndpoint = (tripType: FareType): string => {
    switch (tripType) {
      case 'local':
        return '/api/direct-local-fares.php';
      case 'outstation':
        return '/api/direct-outstation-fares.php';
      case 'airport':
        return '/api/direct-airport-fares.php';
      case 'tour':
        return '/api/direct-tour-fares.php';
      default:
        return '/api/direct-local-fares.php';
    }
  };
  
  // Function to normalize vehicle ID
  const normalizeVehicleId = (vehicleId: string): string => {
    return vehicleId.toLowerCase().replace(/\s+/g, '_');
  };
  
  // Clear cache for a specific trip type
  const clearCacheForTripType = useCallback((tripType: FareType) => {
    console.log(`Clearing cache for trip type: ${tripType}`);
    Object.keys(fareCache.current).forEach(key => {
      if (key.includes(tripType)) {
        delete fareCache.current[key];
      }
    });
  }, []);
  
  const fetchFare = useCallback(async (params: FareParams): Promise<FareDetails> => {
    const { vehicleId, tripType, distance = 0, tripMode = 'one-way', packageId } = params;
    
    // Normalize the vehicle ID for consistent matching
    const normalizedVehicleId = normalizeVehicleId(vehicleId);
    
    // Cancel any existing request for this vehicle
    if (abortControllersRef.current[vehicleId]) {
      console.log(`Aborting previous fare request for ${vehicleId}`);
      abortControllersRef.current[vehicleId].abort();
    }
    
    // Create new abort controller
    abortControllersRef.current[vehicleId] = new AbortController();
    
    setLoading(prev => ({ ...prev, [vehicleId]: true }));
    
    try {
      const endpoint = getEndpoint(tripType);
      const apiUrl = getApiUrl(endpoint);
      
      console.log(`Fetching fare from ${apiUrl} for vehicle ${normalizedVehicleId}, tripType ${tripType}`);
      
      // Build query params
      const query = new URLSearchParams({
        vehicle_id: normalizedVehicleId,
        _t: Date.now().toString(), // Add timestamp to prevent caching
        forceRefresh: 'true'
      });
      
      if (distance > 0) query.append('distance', distance.toString());
      if (tripMode) query.append('trip_mode', tripMode);
      if (packageId) query.append('package_id', packageId);
      
      const response = await safeFetch(`${apiUrl}?${query.toString()}`, {
        signal: abortControllersRef.current[vehicleId].signal,
        headers: {
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      const data = await response.json();
      console.log(`Fare response for ${vehicleId}:`, data);
      
      let fareDetails: FareDetails = { basePrice: 0, totalPrice: 0 };
      
      if (data.status === 'success') {
        if (tripType === 'local' && data.fares && data.fares.length > 0) {
          const localFare = data.fares[0];
          
          // Use the fare object directly if it contains basePrice and totalPrice
          if (localFare.basePrice !== undefined && localFare.totalPrice !== undefined) {
            fareDetails = {
              basePrice: parseFloat(localFare.basePrice),
              totalPrice: parseFloat(localFare.totalPrice),
              breakdown: localFare.breakdown || { [packageId || '8hrs-80km']: localFare.basePrice }
            };
          } else {
            // Find the correct package price
            let packagePrice = 0;
            if (packageId === '4hrs-40km' && localFare.price4hrs40km) {
              packagePrice = localFare.price4hrs40km;
            } else if (packageId === '10hrs-100km' && localFare.price10hrs100km) {
              packagePrice = localFare.price10hrs100km;
            } else if (localFare.price8hrs80km) {
              // Default to 8hrs-80km package
              packagePrice = localFare.price8hrs80km;
            }
            
            fareDetails = {
              basePrice: packagePrice,
              totalPrice: packagePrice,
              breakdown: { [packageId || '8hrs-80km']: packagePrice }
            };
          }
          
          console.log(`Local package fare for ${vehicleId}:`, fareDetails);
        } else if (tripType === 'outstation' && data.fare) {
          // Use the fare object directly from the API response
          const outstationFare = data.fare;
          fareDetails = {
            basePrice: outstationFare.basePrice || 0,
            totalPrice: outstationFare.totalPrice || 0,
            breakdown: outstationFare.breakdown || {
              'Base fare': outstationFare.basePrice || 0,
              'Distance charge': (outstationFare.pricePerKm || 0) * Math.max(distance, 300),
              'Driver allowance': outstationFare.driverAllowance || 0
            }
          };
          
          console.log(`Outstation fare for ${vehicleId}:`, fareDetails);
        } else if (tripType === 'airport' && data.fare) {
          // Use the fare object directly from the API response
          const airportFare = data.fare;
          fareDetails = {
            basePrice: airportFare.basePrice || 0,
            totalPrice: airportFare.totalPrice || 0,
            breakdown: airportFare.breakdown || {
              'Base fare': airportFare.basePrice || 0,
              'Airport pickup fee': airportFare.pickupPrice || 0,
              'Airport drop fee': airportFare.dropPrice || 0
            }
          };
          
          console.log(`Airport fare for ${vehicleId}:`, fareDetails);
        } else if (tripType === 'tour' && data.fare) {
          fareDetails = {
            basePrice: data.fare.basePrice || 0,
            totalPrice: data.fare.totalPrice || 0,
            breakdown: data.fare.breakdown || { 'Tour package': data.fare.basePrice || 0 }
          };
          
          console.log(`Tour fare for ${vehicleId}:`, fareDetails);
        }
      } else {
        console.warn(`Failed to fetch fare for ${vehicleId}, status: ${data.status}`);
      }
      
      // Store in cache
      const cacheKey = `${tripType}_${vehicleId}_${distance}_${tripMode}_${packageId}`;
      fareCache.current[cacheKey] = fareDetails;
      
      return fareDetails;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`Fare request for ${vehicleId} was aborted`);
        return { basePrice: 0, totalPrice: 0 };
      }
      console.error(`Error fetching fare for ${vehicleId}:`, error);
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, [vehicleId]: false }));
    }
  }, []);
  
  // Fetch fares for multiple vehicle IDs
  const fetchFares = useCallback(async (
    paramsArray: FareParams[]
  ): Promise<Record<string, FareDetails>> => {
    const results: Record<string, FareDetails> = {};
    
    console.log(`Fetching fares for ${paramsArray.length} vehicles`);
    
    // Fetch fares concurrently
    const promises = paramsArray.map(async (params) => {
      try {
        const fare = await fetchFare(params);
        results[params.vehicleId] = fare;
      } catch (error) {
        console.error(`Error fetching fare for ${params.vehicleId}:`, error);
      }
    });
    
    await Promise.all(promises);
    console.log('All fares fetched:', results);
    return results;
  }, [fetchFare]);
  
  return {
    fetchFare,
    fetchFares,
    clearCacheForTripType,
    isLoading: (vehicleId: string) => loading[vehicleId] || false
  };
}
