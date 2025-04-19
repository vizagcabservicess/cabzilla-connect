
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

// Helper function to normalize vehicle ID
const normalizeVehicleId = (vehicleId: string): string => {
  return vehicleId.toLowerCase().replace(/\s+/g, '_');
};

// Cache key generator
const generateCacheKey = (params: FareParams): string => {
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
      if (key.includes(tripType)) {
        delete fareCache.current[key];
      }
    });
  }, []);
  
  const fetchFare = useCallback(async (params: FareParams): Promise<FareDetails> => {
    const { vehicleId, tripType, distance = 0, tripMode = 'one-way', packageId } = params;
    
    // Normalize the vehicle ID for consistent matching
    const normalizedVehicleId = normalizeVehicleId(vehicleId);
    
    // Check if we have a cached result
    const cacheKey = generateCacheKey(params);
    if (fareCache.current[cacheKey]) {
      console.log(`Using cached fare for ${normalizedVehicleId}, tripType ${tripType}`);
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
      console.log(`Fare response for ${vehicleId} (${tripType}):`, data);
      
      let fareDetails: FareDetails = { basePrice: 0, totalPrice: 0 };
      
      if (data.status === 'success') {
        // AIRPORT FARE HANDLING
        if (tripType === 'airport' && data.fare) {
          // Handle direct-airport-fares.php response format
          const airportFare = data.fare;
          
          // Ensure we have numeric values
          const basePrice = parseFloat(airportFare.basePrice) || 0;
          const pickupPrice = parseFloat(airportFare.pickupPrice) || 0;
          const dropPrice = parseFloat(airportFare.dropPrice) || 0;
          const totalPrice = parseFloat(airportFare.totalPrice) || (basePrice + pickupPrice + dropPrice);
          
          fareDetails = {
            basePrice: basePrice,
            totalPrice: totalPrice,
            pickupPrice: pickupPrice,
            dropPrice: dropPrice,
            pricePerKm: parseFloat(airportFare.pricePerKm) || 0,
            extraKmCharge: parseFloat(airportFare.extraKmCharge) || 0,
            breakdown: airportFare.breakdown || {
              'Base fare': basePrice,
              'Airport pickup fee': pickupPrice,
              'Airport drop fee': dropPrice
            }
          };
          
          console.log(`Airport fare for ${vehicleId}:`, fareDetails);
        }
        // LOCAL FARE HANDLING
        else if (tripType === 'local' && data.fares && data.fares.length > 0) {
          // Find the matching fare by vehicle ID (case insensitive)
          const normalizedRequestedId = normalizeVehicleId(vehicleId);
          
          let localFare = null;
          
          // Try to find an exact match first
          for (const fare of data.fares) {
            const fareVehicleId = normalizeVehicleId(fare.vehicleId || '');
            if (fareVehicleId === normalizedRequestedId) {
              localFare = fare;
              break;
            }
          }
          
          // If no exact match found, just use the first fare
          if (!localFare && data.fares.length > 0) {
            localFare = data.fares[0];
          }
          
          if (localFare) {
            // Determine the price based on the package
            let basePrice = 0;
            let packageLabel = '';
            
            if (packageId === '4hrs-40km' && localFare.price4hrs40km !== undefined) {
              basePrice = parseFloat(localFare.price4hrs40km);
              packageLabel = '4 Hours / 40 KM Package';
            } else if (packageId === '10hrs-100km' && localFare.price10hrs100km !== undefined) {
              basePrice = parseFloat(localFare.price10hrs100km);
              packageLabel = '10 Hours / 100 KM Package';
            } else {
              // Default to 8hrs-80km package
              basePrice = parseFloat(localFare.price8hrs80km);
              packageLabel = '8 Hours / 80 KM Package';
            }
            
            // Handle case where basePrice and totalPrice are directly provided
            if (localFare.basePrice !== undefined && localFare.totalPrice !== undefined) {
              fareDetails = {
                basePrice: parseFloat(localFare.basePrice),
                totalPrice: parseFloat(localFare.totalPrice),
                breakdown: localFare.breakdown || { 
                  [packageLabel]: parseFloat(localFare.basePrice) 
                }
              };
            } else {
              // Construct from package prices
              fareDetails = {
                basePrice: basePrice,
                totalPrice: basePrice,
                pricePerKm: parseFloat(localFare.priceExtraKm || 0),
                extraHourCharge: parseFloat(localFare.priceExtraHour || 0),
                breakdown: { 
                  [packageLabel]: basePrice 
                }
              };
            }
            
            console.log(`Local fare for ${vehicleId}:`, fareDetails);
          }
        }
        // OUTSTATION FARE HANDLING
        else if (tripType === 'outstation' && data.fare) {
          // Use the fare object directly from the API response
          const outstationFare = data.fare;
          
          const basePrice = parseFloat(outstationFare.basePrice) || 0;
          const distanceCharge = distance * (parseFloat(outstationFare.pricePerKm) || 0);
          const driverAllowance = parseFloat(outstationFare.driverAllowance) || 0;
          const totalPrice = parseFloat(outstationFare.totalPrice) || (basePrice + distanceCharge + driverAllowance);
          
          fareDetails = {
            basePrice: basePrice,
            totalPrice: totalPrice,
            pricePerKm: parseFloat(outstationFare.pricePerKm) || 0,
            driverAllowance: driverAllowance,
            nightHaltCharge: parseFloat(outstationFare.nightHaltCharge) || 0,
            breakdown: outstationFare.breakdown || {
              'Base fare': basePrice,
              'Distance charge': distanceCharge,
              'Driver allowance': driverAllowance
            }
          };
          
          console.log(`Outstation fare for ${vehicleId}:`, fareDetails);
        }
        // TOUR FARE HANDLING
        else if (tripType === 'tour' && data.fare) {
          const tourFare = data.fare;
          
          const basePrice = parseFloat(tourFare.basePrice) || 0;
          const totalPrice = parseFloat(tourFare.totalPrice) || basePrice;
          
          fareDetails = {
            basePrice: basePrice,
            totalPrice: totalPrice,
            breakdown: tourFare.breakdown || { 
              'Tour package': basePrice 
            }
          };
          
          console.log(`Tour fare for ${vehicleId}:`, fareDetails);
        }
      } else {
        console.warn(`Failed to fetch fare for ${vehicleId}, status: ${data.status}`);
      }
      
      // Store in cache
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
