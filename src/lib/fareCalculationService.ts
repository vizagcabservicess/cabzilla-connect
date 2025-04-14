
// Import the required types
import { 
  CabType, 
  FareCalculationParams
} from '@/types/cab';
import fareStateManager from '@/services/FareStateManager';

// Define a cache to store fare data
const fareCache = new Map<string, { timestamp: number; fares: any }>();
const CACHE_EXPIRY = 60 * 1000; // 1 minute

// Function to clear the fare cache
export const clearFareCache = () => {
  fareCache.clear();
  console.log('Fare cache cleared.');
  
  // Clear FareStateManager cache as well
  fareStateManager.clearCache();
  
  // Notify components that cache has been cleared
  window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
    detail: { timestamp: Date.now() }
  }));
};

// Helper function to format cache key
const getCacheKey = (params: FareCalculationParams): string => {
  const { cabType, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate } = params;
  return `
    cabType:${typeof cabType === 'object' ? cabType.id : cabType},
    distance:${distance},
    tripType:${tripType},
    tripMode:${tripMode || 'NA'},
    hourlyPackage:${hourlyPackage || 'NA'},
    pickupDate:${pickupDate ? pickupDate.toISOString() : 'NA'},
    returnDate:${returnDate ? returnDate.toISOString() : 'NA'}
  `;
};

// Main function to calculate fare
export const calculateFare = async (params: FareCalculationParams): Promise<number> => {
  const { cabType, distance, tripType, tripMode, hourlyPackage, forceRefresh } = params;
  
  // Check if cabType is valid
  if (!cabType || typeof cabType !== 'object') {
    console.error('Invalid cabType provided:', cabType);
    throw new Error(`Invalid cabType provided: ${JSON.stringify(cabType)}`);
  }
  
  // Check if distance is a valid number
  if (typeof distance !== 'number' || isNaN(distance)) {
    console.error('Invalid distance provided:', distance);
    throw new Error(`Invalid distance provided: ${distance}`);
  }
  
  // Check if tripType is a valid string
  if (typeof tripType !== 'string' || !['local', 'outstation', 'airport'].includes(tripType.toLowerCase())) {
    console.error('Invalid tripType provided:', tripType);
    throw new Error(`Invalid tripType provided: ${tripType}`);
  }
  
  // Check if tripMode is valid for outstation trips
  if (tripType === 'outstation' && (typeof tripMode !== 'string' || !['one-way', 'round-trip'].includes(tripMode.toLowerCase()))) {
    console.error('Invalid tripMode provided for outstation trip:', tripMode);
    throw new Error(`Invalid tripMode provided for outstation trip: ${tripMode}`);
  }
  
  // Check if hourlyPackage is valid for local trips
  if (tripType === 'local' && hourlyPackage && typeof hourlyPackage !== 'string') {
    console.error('Invalid hourlyPackage provided for local trip:', hourlyPackage);
    throw new Error(`Invalid hourlyPackage provided for local trip: ${hourlyPackage}`);
  }
  
  const cacheKey = getCacheKey(params);
  
  if (!forceRefresh && fareCache.has(cacheKey)) {
    const cachedData = fareCache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_EXPIRY) {
      console.log(`Returning cached fare for ${cacheKey}`);
      return cachedData.fares.totalFare;
    } else {
      console.log(`Cache expired for ${cacheKey}, recalculating.`);
      fareCache.delete(cacheKey); // Remove expired cache entry
    }
  }
  
  let totalFare = 0;
  
  try {
    // Make sure FareStateManager is synced
    if (forceRefresh) {
      await fareStateManager.syncFareData();
    }
    
    if (tripType === 'local') {
      if (hourlyPackage) {
        totalFare = await fareStateManager.calculateLocalFare({
          vehicleId: cabType.id,
          hourlyPackage
        });
        
        if (totalFare <= 0) {
          throw new Error(`No local fare found for vehicle ${cabType.id} with package ${hourlyPackage}`);
        }
      } else {
        throw new Error('Hourly package is required for local trips');
      }
    } else if (tripType === 'outstation') {
      totalFare = await fareStateManager.calculateOutstationFare({
        vehicleId: cabType.id,
        distance,
        tripMode: tripMode as 'one-way' | 'round-trip',
        pickupDate: params.pickupDate
      });
      
      if (totalFare <= 0) {
        throw new Error(`No outstation fare found for vehicle ${cabType.id}`);
      }
    } else if (tripType === 'airport') {
      totalFare = await fareStateManager.calculateAirportFare({
        vehicleId: cabType.id,
        distance
      });
      
      if (totalFare <= 0) {
        throw new Error(`No airport fare found for vehicle ${cabType.id}`);
      }
    } else {
      throw new Error(`Unsupported trip type: ${tripType}`);
    }
    
    // Only store valid fares in the cache
    if (totalFare > 0) {
      // Store the calculated fare in the cache
      fareCache.set(cacheKey, {
        timestamp: Date.now(),
        fares: { totalFare }
      });
      
      // Dispatch event for hooks that listen for fare calculations
      window.dispatchEvent(new CustomEvent('fare-calculated', {
        detail: {
          cabId: cabType.id,
          fare: totalFare,
          tripType: tripType,
          timestamp: Date.now()
        }
      }));
      
      console.log(`Calculated fare for ${cacheKey}:`, totalFare);
      return totalFare;
    } else {
      throw new Error(`Zero or invalid fare calculated for ${cabType.id} with trip type ${tripType}`);
    }
  } catch (error) {
    console.error('Error calculating fare:', error);
    throw error; // Propagate error instead of returning 0
  }
};
