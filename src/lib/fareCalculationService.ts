
import { FareCalculationParams } from '@/types/cab';
import fareStateManager from '@/services/FareStateManager';

// Cache for fare calculations to prevent redundant API calls
const fareCache = new Map<string, { price: number, timestamp: number }>();
let lastCacheClearTime = Date.now();
let eventThrottleCount = 0;
const MAX_EVENTS_PER_MINUTE = 5;

// Clear the fare cache and notify the UI components
export const clearFareCache = () => {
  const now = Date.now();
  if (now - lastCacheClearTime < 30000) {
    console.log('Fare cache was cleared recently, throttling');
    return;
  }
  
  lastCacheClearTime = now;
  fareCache.clear();
  fareStateManager.clearCache();
  
  // Throttle event dispatching to prevent loops
  if (eventThrottleCount < MAX_EVENTS_PER_MINUTE) {
    eventThrottleCount += 1;
    
    try {
      window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
        detail: { timestamp: now, forceRefresh: true }
      }));
      
      console.log('FareCalculationService: Fare cache cleared, event dispatched');
      
      // Reset throttle counter after a minute
      setTimeout(() => {
        eventThrottleCount = Math.max(0, eventThrottleCount - 1);
      }, 60000);
    } catch (error) {
      console.error('Error dispatching fare-cache-cleared event:', error);
    }
  }
};

// Generate cache key for fare calculations
const generateCacheKey = (params: FareCacheParams): string => {
  if (!params.cabType || !params.cabType.id) {
    console.warn('Invalid parameters for fare cache key');
    return 'invalid';
  }
  
  const { cabType, distance, tripType, tripMode, hourlyPackage } = params;
  const packageStr = hourlyPackage || 'none';
  
  return `${cabType.id}_${tripType}_${tripMode}_${distance}_${packageStr}`;
};

interface FareCacheParams {
  cabType: { id: string; [key: string]: any };
  distance: number;
  tripType: string;
  tripMode?: string;
  hourlyPackage?: string;
}

// Calculate airport transfer fare using FareStateManager
export const calculateAirportFare = async (cabType: any, distance: number): Promise<number> => {
  if (!cabType || !cabType.id) {
    console.error('Invalid cab type for airport fare calculation');
    return 0;
  }
  
  const cacheKey = `airport_${cabType.id}_${distance}`;
  const cachedFare = fareCache.get(cacheKey);
  
  // Use cached value if available and recent (less than 5 minutes old)
  if (cachedFare && Date.now() - cachedFare.timestamp < 300000) {
    console.log(`FareCalculationService: Using cached airport fare for ${cabType.id}: ${cachedFare.price}`);
    return cachedFare.price;
  }
  
  try {
    // Use the FareStateManager to calculate the fare
    const fare = await fareStateManager.calculateAirportFare({
      vehicleId: cabType.id,
      distance
    });
    
    if (fare > 0) {
      // Cache the result
      fareCache.set(cacheKey, { price: fare, timestamp: Date.now() });
      
      // Store in localStorage for other components
      try {
        const localStorageKey = `fare_airport_${cabType.id.toLowerCase()}`;
        localStorage.setItem(localStorageKey, fare.toString());
      } catch (error) {
        console.error('Error storing airport fare in localStorage:', error);
      }
      
      return fare;
    }
  } catch (error) {
    console.error(`FareCalculationService: Error calculating airport fare for ${cabType.id}:`, error);
  }
  
  // If FareStateManager failed, try to get from localStorage as a fallback
  try {
    const localStorageKey = `fare_airport_${cabType.id.toLowerCase()}`;
    const storedFare = localStorage.getItem(localStorageKey);
    if (storedFare && !isNaN(Number(storedFare))) {
      const fareValue = parseInt(storedFare, 10);
      if (fareValue > 0) {
        console.log(`FareCalculationService: Using localStorage fare for ${cabType.id}: ${fareValue}`);
        return fareValue;
      }
    }
  } catch (error) {
    console.error('Error getting airport fare from localStorage:', error);
  }
  
  // As a last resort, let the FareStateManager handle the fallback
  return await fareStateManager.calculateAirportFare({
    vehicleId: cabType.id,
    distance
  });
};

// Main fare calculation function using FareStateManager
export const calculateFare = async (params: FarCalculationParams): Promise<number> => {
  if (!params || !params.cabType || !params.tripType) {
    console.error('Invalid parameters for fare calculation');
    return 0;
  }
  
  const { cabType, distance, tripType, tripMode = 'one-way', hourlyPackage, pickupDate, forceRefresh } = params;
  
  try {
    // Store current trip type in localStorage
    try {
      localStorage.setItem('tripType', tripType);
    } catch (error) {
      console.error('Error storing trip type:', error);
    }
    
    // Check cache first unless forced refresh
    if (!forceRefresh) {
      const cacheKey = generateCacheKey(params);
      const cachedFare = fareCache.get(cacheKey);
      
      if (cachedFare && Date.now() - cachedFare.timestamp < 300000) {
        console.log(`FareCalculationService: Using cached fare: ${cachedFare.price} for ${cacheKey}`);
        return cachedFare.price;
      }
    }
    
    // Calculate fare based on trip type using FareStateManager
    let calculatedFare = 0;
    
    if (tripType === 'airport') {
      // Airport transfers
      calculatedFare = await fareStateManager.calculateAirportFare({
        vehicleId: cabType.id,
        distance
      });
    } 
    else if (tripType === 'local') {
      // Local packages
      if (!hourlyPackage) {
        console.error('Hourly package is required for local fare calculation');
        return 0;
      }
      
      calculatedFare = await fareStateManager.calculateLocalFare({
        vehicleId: cabType.id,
        hourlyPackage
      });
    } 
    else if (tripType === 'outstation') {
      // Outstation trips
      calculatedFare = await fareStateManager.calculateOutstationFare({
        vehicleId: cabType.id,
        distance,
        tripMode: tripMode as 'one-way' | 'round-trip',
        pickupDate
      });
    }
    
    if (calculatedFare > 0) {
      // Cache the result
      const cacheKey = generateCacheKey(params);
      fareCache.set(cacheKey, { price: calculatedFare, timestamp: Date.now() });
      
      // Store in localStorage for other components
      try {
        const localStorageKey = `fare_${tripType}_${cabType.id.toLowerCase()}`;
        localStorage.setItem(localStorageKey, calculatedFare.toString());
      } catch (error) {
        console.error('Error storing fare in localStorage:', error);
      }
      
      // Dispatch event with calculated fare
      try {
        window.dispatchEvent(new CustomEvent('fare-calculated', {
          detail: {
            cabId: cabType.id,
            fare: calculatedFare,
            tripType: tripType,
            timestamp: Date.now()
          }
        }));
      } catch (error) {
        console.error('Error dispatching fare-calculated event:', error);
      }
      
      return calculatedFare;
    }
    
    // If no fare was calculated, return 0
    console.warn(`No fare calculated for ${cabType.id} ${tripType}`);
    return 0;
  } catch (error) {
    console.error('Error calculating fare:', error);
    return 0;
  }
};

// Helper type for fare calculation
interface FarCalculationParams extends FareCalculationParams {
  [key: string]: any;
}

// Export the fareService
export const fareService = {
  calculateFare,
  calculateAirportFare,
  clearFareCache
};

export default fareService;
