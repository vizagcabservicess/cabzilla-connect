
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
  price?: number;
  breakdown?: Record<string, number>;
  price4hrs40km?: number;
  price8hrs80km?: number;
  price10hrs100km?: number;
  priceExtraKm?: number;
  priceExtraHour?: number;
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
        return '/api/outstation-fares.php';
      case 'airport':
        return '/api/airport-fares.php';
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
      
      console.log(`Fetching fare from ${apiUrl} for vehicle ${vehicleId}, tripType ${tripType}`);
      
      // Build query params based on trip type
      const query = new URLSearchParams({
        vehicle_id: vehicleId,
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
      
      const fullUrl = `${apiUrl}?${query.toString()}`;
      console.log(`Full request URL: ${fullUrl}`);
      
      const response = await safeFetch(fullUrl, {
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
        // First try to get fare from the 'fare' property
        if (data.fare) {
          const fare = data.fare;
          
          // Extract all relevant fields
          fareDetails = {
            basePrice: parseFloat(fare.basePrice) || 0,
            totalPrice: parseFloat(fare.totalPrice) || parseFloat(fare.price) || 0,
            price: parseFloat(fare.price) || parseFloat(fare.totalPrice) || 0,
            breakdown: fare.breakdown || {},
            pricePerKm: parseFloat(fare.pricePerKm) || 0,
            driverAllowance: parseFloat(fare.driverAllowance) || 0,
            price4hrs40km: parseFloat(fare.price4hrs40km) || 0,
            price8hrs80km: parseFloat(fare.price8hrs80km) || 0,
            price10hrs100km: parseFloat(fare.price10hrs100km) || 0,
            priceExtraKm: parseFloat(fare.priceExtraKm) || 0,
            priceExtraHour: parseFloat(fare.priceExtraHour) || 0,
            extraKmCharge: parseFloat(fare.extraKmCharge) || 0,
            pickupPrice: parseFloat(fare.pickupPrice) || 0,
            dropPrice: parseFloat(fare.dropPrice) || 0
          };
          
          console.log(`Extracted fare details from 'fare' property:`, fareDetails);
        } 
        // If no fare, try the 'fares' array
        else if (data.fares && Array.isArray(data.fares) && data.fares.length > 0) {
          const fare = data.fares[0];
          
          fareDetails = {
            basePrice: parseFloat(fare.basePrice) || 0,
            totalPrice: parseFloat(fare.totalPrice) || parseFloat(fare.price) || 0,
            price: parseFloat(fare.price) || parseFloat(fare.totalPrice) || 0,
            breakdown: fare.breakdown || {},
            pricePerKm: parseFloat(fare.pricePerKm) || 0,
            driverAllowance: parseFloat(fare.driverAllowance) || 0,
            price4hrs40km: parseFloat(fare.price4hrs40km) || 0,
            price8hrs80km: parseFloat(fare.price8hrs80km) || 0,
            price10hrs100km: parseFloat(fare.price10hrs100km) || 0,
            priceExtraKm: parseFloat(fare.priceExtraKm) || 0,
            priceExtraHour: parseFloat(fare.priceExtraHour) || 0,
            extraKmCharge: parseFloat(fare.extraKmCharge) || 0,
            pickupPrice: parseFloat(fare.pickupPrice) || 0,
            dropPrice: parseFloat(fare.dropPrice) || 0
          };
          
          console.log(`Extracted fare details from 'fares' array:`, fareDetails);
        }
        
        // Ensure we have totalPrice and price set correctly
        if (tripType === 'local') {
          // For local, set totalPrice based on the package
          if (packageId === '4hrs-40km' && fareDetails.price4hrs40km) {
            fareDetails.totalPrice = fareDetails.price4hrs40km;
            fareDetails.price = fareDetails.price4hrs40km;
          } else if (packageId === '8hrs-80km' && fareDetails.price8hrs80km) {
            fareDetails.totalPrice = fareDetails.price8hrs80km;
            fareDetails.price = fareDetails.price8hrs80km;
          } else if (packageId === '10hrs-100km' && fareDetails.price10hrs100km) {
            fareDetails.totalPrice = fareDetails.price10hrs100km;
            fareDetails.price = fareDetails.price10hrs100km;
          }
        }
        
        // Set basePrice from totalPrice if not present
        if (!fareDetails.basePrice && fareDetails.totalPrice) {
          fareDetails.basePrice = fareDetails.totalPrice;
        }
        
        // Make sure totalPrice exists
        if (!fareDetails.totalPrice && fareDetails.price) {
          fareDetails.totalPrice = fareDetails.price;
        } else if (!fareDetails.totalPrice && fareDetails.basePrice) {
          fareDetails.totalPrice = fareDetails.basePrice;
        }
        
        // Make sure price exists
        if (!fareDetails.price && fareDetails.totalPrice) {
          fareDetails.price = fareDetails.totalPrice;
        }
        
        console.log(`Final processed fare details for ${vehicleId}:`, fareDetails);
      }
      
      // Cache the result using normalized vehicle ID
      const cacheKey = generateCacheKey({...params, vehicleId: normalizeVehicleId(vehicleId)});
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
    
    // Fetch fares sequentially to prevent overwhelming the server
    for (const params of paramsArray) {
      try {
        const fare = await fetchFare(params);
        results[params.vehicleId] = fare;
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Error fetching fare for ${params.vehicleId}:`, error);
      }
    }
    
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
