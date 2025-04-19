
import { useState, useCallback, useRef } from 'react';
import { CabType } from '@/types/cab';
import { getApiUrl } from '@/config/api';
import { safeFetch } from '@/config/requestConfig';
import { localFareEndpoints, getLocalFareUrlVariants } from '@/config/apiEndpoints';
import { toast } from 'sonner';

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
  forceRefresh?: boolean;
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
  const endpointStatusCache = useRef<Record<string, boolean>>({});
  
  const getEndpoint = (tripType: FareType): string => {
    switch (tripType) {
      case 'local':
        return localFareEndpoints.directLocalFares;
      case 'outstation':
        return '/api/outstation-fares.php';
      case 'airport':
        return '/api/airport-fares.php';
      case 'tour':
        return '/api/direct-tour-fares.php';
      default:
        return localFareEndpoints.directLocalFares;
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
  
  // Function to try multiple URL variants until one works
  const tryMultipleEndpoints = useCallback(async (
    baseEndpoint: string,
    queryParams: URLSearchParams,
    abortSignal: AbortSignal
  ): Promise<Response> => {
    // Get the URL variants to try
    const urls = getLocalFareUrlVariants(baseEndpoint);
    
    // Try each URL in sequence
    for (let i = 0; i < urls.length; i++) {
      const url = `${urls[i]}?${queryParams.toString()}`;
      
      // Skip URLs we know have failed recently
      if (endpointStatusCache.current[url] === false) {
        continue;
      }
      
      try {
        console.log(`Trying endpoint (${i+1}/${urls.length}): ${url}`);
        const response = await fetch(url, {
          signal: abortSignal,
          headers: {
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (response.ok) {
          // Mark this endpoint as working
          endpointStatusCache.current[url] = true;
          console.log(`Successfully fetched from: ${url}`);
          return response;
        } else {
          // Mark this endpoint as not working
          endpointStatusCache.current[url] = false;
          console.warn(`Endpoint ${url} returned ${response.status}`);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          throw error; // Re-throw abort errors
        }
        // Mark this endpoint as not working
        endpointStatusCache.current[url] = false;
        console.warn(`Failed to fetch from ${url}:`, error);
      }
    }
    
    // If we've tried all URLs and none worked, throw an error
    throw new Error(`All endpoints failed for ${baseEndpoint}`);
  }, []);
  
  const fetchFare = useCallback(async (params: FareParams): Promise<FareDetails> => {
    const { vehicleId, tripType, distance = 0, tripMode = 'one-way', packageId, forceRefresh = false } = params;
    
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
      
      console.log(`Fetching fare for vehicle ${vehicleId}, tripType ${tripType}`);
      
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
      
      try {
        // Try multiple endpoints until one works
        const response = await tryMultipleEndpoints(
          endpoint,
          query,
          abortControllersRef.current[vehicleId].signal
        );
        
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
        console.error(`Error fetching fare from multiple endpoints for ${vehicleId}:`, error);
        
        // Fall back to mock data or cached values
        toast.error(`Could not fetch fares. Using fallback data.`, {
          duration: 3000,
          id: 'fare-fetch-error'
        });
        
        // Try to get data from localStorage cache
        const cacheKey = generateCacheKey({...params, vehicleId: normalizeVehicleId(vehicleId)});
        const cachedFare = localStorage.getItem(cacheKey);
        
        if (cachedFare) {
          try {
            const parsedFare = JSON.parse(cachedFare);
            console.log(`Using cached fare data for ${vehicleId}:`, parsedFare);
            return parsedFare;
          } catch (e) {
            console.error(`Error parsing cached fare for ${vehicleId}:`, e);
          }
        }
        
        // Return mock data based on vehicle type
        // This structure should match what the API would return
        return getMockFareData(vehicleId, tripType, params);
      }
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
  }, [tryMultipleEndpoints]);

  // Helper function to generate mock fare data when API fails
  const getMockFareData = (vehicleId: string, tripType: FareType, params: FareParams): FareDetails => {
    const { packageId } = params;
    const normalizedId = vehicleId.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Mock data for different vehicle types
    const mockFares: Record<string, any> = {
      'sedan': {
        price4hrs40km: 1400,
        price8hrs80km: 2400,
        price10hrs100km: 3000,
        priceExtraKm: 13,
        priceExtraHour: 300,
        basePrice: 2500,
        pricePerKm: 14
      },
      'ertiga': {
        price4hrs40km: 1500,
        price8hrs80km: 3000,
        price10hrs100km: 3500,
        priceExtraKm: 18,
        priceExtraHour: 250,
        basePrice: 3200,
        pricePerKm: 18
      },
      'innova_crysta': {
        price4hrs40km: 1800,
        price8hrs80km: 3500,
        price10hrs100km: 4000,
        priceExtraKm: 20,
        priceExtraHour: 400,
        basePrice: 3800,
        pricePerKm: 20
      },
      'tempo_traveller': {
        price4hrs40km: 6500,
        price8hrs80km: 6500,
        price10hrs100km: 7500,
        priceExtraKm: 35,
        priceExtraHour: 750,
        basePrice: 5500,
        pricePerKm: 25
      },
      'luxury': {
        price4hrs40km: 3500,
        price8hrs80km: 5500,
        price10hrs100km: 6500,
        priceExtraKm: 25,
        priceExtraHour: 300,
        basePrice: 4500,
        pricePerKm: 25
      },
      'default': {
        price4hrs40km: 2000,
        price8hrs80km: 3500,
        price10hrs100km: 4000,
        priceExtraKm: 20,
        priceExtraHour: 300,
        basePrice: 3000,
        pricePerKm: 15
      }
    };
    
    // Get the fare data for this vehicle, or use default if not found
    const fare = mockFares[normalizedId] || mockFares['default'];
    
    // Calculate total price based on trip type and package
    let totalPrice = fare.basePrice;
    
    if (tripType === 'local' && packageId) {
      if (packageId === '4hrs-40km') {
        totalPrice = fare.price4hrs40km;
      } else if (packageId === '8hrs-80km') {
        totalPrice = fare.price8hrs80km;
      } else if (packageId === '10hrs-100km') {
        totalPrice = fare.price10hrs100km;
      }
    }
    
    // Return a properly structured fare object
    return {
      ...fare,
      totalPrice,
      price: totalPrice,
      vehicleId
    };
  };
  
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
