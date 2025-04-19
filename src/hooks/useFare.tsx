
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
  [key: string]: any; // Allow additional properties
}

// Helper function to normalize vehicle ID - matching the PHP backend
const normalizeVehicleId = (vehicleId: string): string => {
  return vehicleId.toLowerCase().replace(/[^a-z0-9]/g, '_');
};

// Cache key generator
const generateCacheKey = (params: FareParams): string => {
  if (!params || !params.vehicleId) {
    console.warn('Invalid params for generating cache key:', params);
    return 'invalid-params';
  }
  
  const { vehicleId, tripType, distance = 0, tripMode = 'one-way', packageId = '' } = params;
  return `fare_${tripType}_${vehicleId}_${distance}_${tripMode}_${packageId}`;
};

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
  
  // Clear cache for a specific trip type
  const clearCacheForTripType = useCallback((tripType: FareType) => {
    console.log(`Clearing cache for trip type: ${tripType}`);
    Object.keys(fareCache.current).forEach(key => {
      if (key.includes(`fare_${tripType}`)) {
        console.log(`Deleting cache key: ${key}`);
        delete fareCache.current[key];
      }
    });
  }, []);
  
  const fetchFare = useCallback(async (params: FareParams): Promise<FareDetails> => {
    const { vehicleId, tripType, distance = 0, tripMode = 'one-way', packageId } = params;
    
    if (!vehicleId) {
      console.warn('No vehicleId provided to fetchFare');
      return { basePrice: 0, totalPrice: 0 };
    }
    
    // Normalize the vehicle ID for consistent matching with PHP backend
    const normalizedVehicleId = normalizeVehicleId(vehicleId);
    
    // Check if we have a cached result
    const cacheKey = generateCacheKey({...params, vehicleId: normalizedVehicleId});
    if (fareCache.current[cacheKey]) {
      console.log(`Using cached fare for ${normalizedVehicleId}, tripType ${tripType}`, fareCache.current[cacheKey]);
      return fareCache.current[cacheKey];
    }
    
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
      
      // Build query params based on trip type
      const query = new URLSearchParams({
        vehicle_id: normalizedVehicleId,
        _t: Date.now().toString(), // Add timestamp to prevent caching
      });
      
      if (distance > 0 && (tripType === 'outstation' || tripType === 'airport')) {
        query.append('distance', distance.toString());
      }
      
      if (tripType === 'outstation' && tripMode) {
        query.append('trip_mode', tripMode);
      }
      
      if (tripType === 'local' && packageId) {
        query.append('package_id', packageId);
      }
      
      const response = await safeFetch(`${apiUrl}?${query.toString()}`, {
        signal: abortControllersRef.current[vehicleId].signal,
        headers: {
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      const data = await response.json();
      console.log(`Fare response for ${vehicleId} (${tripType}):`, data);
      
      // Default fare details
      let fareDetails: FareDetails = { basePrice: 0, totalPrice: 0 };
      
      if (data.status === 'success') {
        if (tripType === 'local') {
          // Process local fare - look for the matching vehicle in fares array
          if (data.fares && Array.isArray(data.fares) && data.fares.length > 0) {
            // Find the fare for this vehicle
            const vehicleFare = data.fares.find((fare: any) => 
              normalizeVehicleId(fare.vehicleId) === normalizedVehicleId
            ) || data.fares[0]; // Fallback to first fare if no match
            
            // Get the right package price
            let basePrice = vehicleFare.basePrice;
            if (!basePrice && packageId) {
              if (packageId === '4hrs-40km' && vehicleFare.price4hrs40km) {
                basePrice = parseFloat(vehicleFare.price4hrs40km);
              } else if (packageId === '8hrs-80km' && vehicleFare.price8hrs80km) {
                basePrice = parseFloat(vehicleFare.price8hrs80km);
              } else if (packageId === '10hrs-100km' && vehicleFare.price10hrs100km) {
                basePrice = parseFloat(vehicleFare.price10hrs100km);
              }
            }
            
            // Get total price (use provided total or base as fallback)
            const totalPrice = vehicleFare.totalPrice ? parseFloat(vehicleFare.totalPrice) : basePrice;
            
            // Use provided breakdown or create a simple one
            const breakdown = vehicleFare.breakdown || 
              { [packageId || '8hrs-80km']: basePrice };
            
            fareDetails = {
              basePrice,
              totalPrice,
              breakdown,
              price4hrs40km: parseFloat(vehicleFare.price4hrs40km) || 0,
              price8hrs80km: parseFloat(vehicleFare.price8hrs80km) || 0,
              price10hrs100km: parseFloat(vehicleFare.price10hrs100km) || 0,
              priceExtraKm: parseFloat(vehicleFare.priceExtraKm) || 0,
              priceExtraHour: parseFloat(vehicleFare.priceExtraHour) || 0
            };
          }
        } else if (tripType === 'outstation') {
          // Process outstation fare - use fares array (new format) or fare object (legacy)
          if (data.fares && Array.isArray(data.fares) && data.fares.length > 0) {
            const fare = data.fares[0]; // Use first fare in array
            
            // Parse base price and components
            const basePrice = parseFloat(fare.basePrice) || 0;
            const pricePerKm = parseFloat(fare.pricePerKm) || 0;
            const driverAllowance = parseFloat(fare.driverAllowance) || 0;
            
            // Use provided total or calculate
            let totalPrice = parseFloat(fare.totalPrice) || 0;
            if (!totalPrice && basePrice > 0) {
              // Calculate total if not provided
              const distanceCost = distance * pricePerKm;
              totalPrice = basePrice + distanceCost + driverAllowance;
            }
            
            // Use provided breakdown or create one
            const breakdown = fare.breakdown || {
              'Base fare': basePrice,
              'Distance charge': distance * pricePerKm,
              'Driver allowance': driverAllowance
            };
            
            fareDetails = {
              basePrice,
              totalPrice,
              breakdown,
              pricePerKm,
              driverAllowance,
              nightHaltCharge: parseFloat(fare.nightHaltCharge) || 0
            };
          }
        } else if (tripType === 'airport') {
          // Process airport fare - use fares array
          if (data.fares && Array.isArray(data.fares) && data.fares.length > 0) {
            const fare = data.fares[0]; // Use first fare in array
            
            // Parse base components
            const basePrice = parseFloat(fare.basePrice) || 0;
            const pickupPrice = parseFloat(fare.pickupPrice) || 0;
            const dropPrice = parseFloat(fare.dropPrice) || 0;
            
            // Use provided total or calculate
            let totalPrice = parseFloat(fare.totalPrice) || 0;
            if (!totalPrice && basePrice >= 0) {
              totalPrice = basePrice + pickupPrice + dropPrice;
            }
            
            // Use provided breakdown or create one
            const breakdown = fare.breakdown || {
              'Base fare': basePrice,
              'Airport pickup fee': pickupPrice,
              'Airport drop fee': dropPrice
            };
            
            fareDetails = {
              basePrice,
              totalPrice,
              breakdown,
              pickupPrice,
              dropPrice,
              pricePerKm: parseFloat(fare.pricePerKm) || 0,
              extraKmCharge: parseFloat(fare.extraKmCharge) || 0
            };
          }
        }
      }
      
      // Store in cache using normalized vehicle ID
      fareCache.current[cacheKey] = fareDetails;
      
      return fareDetails;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`Fare request for ${vehicleId} was aborted`);
        return { basePrice: 0, totalPrice: 0 };
      }
      console.error(`Error fetching fare for ${vehicleId}:`, error);
      return { basePrice: 0, totalPrice: 0 };
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
