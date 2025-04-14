
import { FareCalculationParams } from '@/types/cab';
import fareStateManager from '@/services/FareStateManager';
import { normalizeHourlyPackage, getLocalPackagePrice } from '@/services/localFareService';

// Cache for fare calculations to prevent redundant API calls
const fareCache = new Map<string, { price: number, timestamp: number }>();
let lastCacheClearTime = Date.now();
let eventThrottleCount = 0;
const MAX_EVENTS_PER_MINUTE = 5;
const CACHE_DURATION = 60 * 1000; // 1 minute

// Clear the fare cache and notify the UI components
export const clearFareCache = () => {
  const now = Date.now();
  if (now - lastCacheClearTime < 30000) {
    console.log('Fare cache was cleared recently, throttling');
    return;
  }
  
  lastCacheClearTime = now;
  fareCache.clear();
  
  // Also clear the FareStateManager cache
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
  const packageStr = hourlyPackage ? normalizeHourlyPackage(hourlyPackage) : 'none';
  
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
  
  // Use cached value if available and recent
  if (cachedFare && Date.now() - cachedFare.timestamp < CACHE_DURATION) {
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
      console.log(`Successfully calculated airport fare for ${cabType.id}: ${fare}`);
      
      // Cache the result
      fareCache.set(cacheKey, { price: fare, timestamp: Date.now() });
      
      // Dispatch event for UI update
      window.dispatchEvent(new CustomEvent('fare-calculated', {
        detail: {
          cabId: cabType.id,
          fare: fare,
          tripType: 'airport',
          timestamp: Date.now()
        }
      }));
      
      return fare;
    }
    
    console.error(`Invalid airport fare calculated for ${cabType.id}: ${fare}`);
  } catch (error) {
    console.error(`FareCalculationService: Error calculating airport fare for ${cabType.id}:`, error);
  }
  
  // If calculation failed, try to get the fare directly from database
  try {
    const fareData = await fareStateManager.getAirportFareForVehicle(cabType.id);
    if (fareData) {
      // Based on distance, determine which tier to use
      let fare = 0;
      if (distance <= 15) {
        fare = parseFloat(fareData.tier1Price || 0);
      } else if (distance <= 25) {
        fare = parseFloat(fareData.tier2Price || 0);
      } else if (distance <= 35) {
        fare = parseFloat(fareData.tier3Price || 0);
      } else {
        fare = parseFloat(fareData.tier4Price || 0);
        // Add extra charges for additional distance
        const extraDistance = distance - 35;
        if (extraDistance > 0) {
          fare += extraDistance * parseFloat(fareData.extraKmCharge || 0);
        }
      }
      
      if (fare > 0) {
        console.log(`Retrieved airport fare for ${cabType.id} from database: ${fare}`);
        fareCache.set(cacheKey, { price: fare, timestamp: Date.now() });
        
        // Dispatch event for UI update
        window.dispatchEvent(new CustomEvent('fare-calculated', {
          detail: {
            cabId: cabType.id,
            fare: fare,
            tripType: 'airport',
            timestamp: Date.now()
          }
        }));
        
        return fare;
      }
    }
  } catch (e) {
    console.error(`Error getting airport fare from database for ${cabType.id}:`, e);
  }
  
  // If everything fails, return 0
  return 0;
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
      
      if (cachedFare && Date.now() - cachedFare.timestamp < CACHE_DURATION) {
        console.log(`FareCalculationService: Using cached fare: ${cachedFare.price} for ${cacheKey}`);
        return cachedFare.price;
      }
    }
    
    console.log(`Calculating fare for ${cabType.id} (${tripType})`);
    
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
      
      // Normalize hourly package format
      const normalizedPackage = normalizeHourlyPackage(hourlyPackage);
      
      calculatedFare = await fareStateManager.calculateLocalFare({
        vehicleId: cabType.id,
        hourlyPackage: normalizedPackage
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
      console.log(`Successfully calculated fare for ${cabType.id} (${tripType}): ${calculatedFare}`);
      
      // Cache the result
      const cacheKey = generateCacheKey(params);
      fareCache.set(cacheKey, { price: calculatedFare, timestamp: Date.now() });
      
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
    
    // If no fare was calculated, try direct database access
    console.warn(`No fare calculated for ${cabType.id} ${tripType}, attempting direct database access`);
    
    if (tripType === 'airport') {
      const fareData = await fareStateManager.getAirportFareForVehicle(cabType.id);
      if (fareData) {
        // Based on distance, determine which tier to use
        let directFare = 0;
        if (distance <= 15) {
          directFare = parseFloat(fareData.tier1Price || 0);
        } else if (distance <= 25) {
          directFare = parseFloat(fareData.tier2Price || 0);
        } else if (distance <= 35) {
          directFare = parseFloat(fareData.tier3Price || 0);
        } else {
          directFare = parseFloat(fareData.tier4Price || 0);
          // Add extra charges for additional distance
          const extraDistance = distance - 35;
          if (extraDistance > 0) {
            directFare += extraDistance * parseFloat(fareData.extraKmCharge || 0);
          }
        }
        
        if (directFare > 0) {
          console.log(`Direct airport fare for ${cabType.id}: ${directFare}`);
          
          // Cache this fare
          const cacheKey = generateCacheKey(params);
          fareCache.set(cacheKey, { price: directFare, timestamp: Date.now() });
          
          // Dispatch event
          window.dispatchEvent(new CustomEvent('fare-calculated', {
            detail: {
              cabId: cabType.id,
              fare: directFare,
              tripType: tripType,
              timestamp: Date.now()
            }
          }));
          
          return directFare;
        }
      }
    } else if (tripType === 'local' && hourlyPackage) {
      const fareData = await fareStateManager.getLocalFareForVehicle(cabType.id);
      if (fareData) {
        const normalizedPackage = normalizeHourlyPackage(hourlyPackage);
        const directFare = getLocalPackagePrice(fareData, normalizedPackage);
        
        if (directFare > 0) {
          console.log(`Direct local fare for ${cabType.id} (${normalizedPackage}): ${directFare}`);
          
          // Cache this fare
          const cacheKey = generateCacheKey(params);
          fareCache.set(cacheKey, { price: directFare, timestamp: Date.now() });
          
          // Dispatch event
          window.dispatchEvent(new CustomEvent('fare-calculated', {
            detail: {
              cabId: cabType.id,
              fare: directFare,
              tripType: tripType,
              timestamp: Date.now()
            }
          }));
          
          return directFare;
        }
      }
    } else if (tripType === 'outstation') {
      const fareData = await fareStateManager.getOutstationFareForVehicle(cabType.id);
      if (fareData) {
        let directFare = 0;
        
        if (tripMode === 'one-way') {
          const basePrice = parseFloat(fareData.basePrice || fareData.oneWayBasePrice || 0);
          const pricePerKm = parseFloat(fareData.pricePerKm || fareData.oneWayPricePerKm || 0);
          directFare = basePrice + (distance * pricePerKm);
        } else {
          const basePrice = parseFloat(fareData.roundTripBasePrice || 0);
          const pricePerKm = parseFloat(fareData.roundTripPricePerKm || 0);
          directFare = basePrice + (distance * pricePerKm);
        }
        
        if (directFare > 0) {
          console.log(`Direct outstation fare for ${cabType.id} (${tripMode}): ${directFare}`);
          
          // Cache this fare
          const cacheKey = generateCacheKey(params);
          fareCache.set(cacheKey, { price: directFare, timestamp: Date.now() });
          
          // Dispatch event
          window.dispatchEvent(new CustomEvent('fare-calculated', {
            detail: {
              cabId: cabType.id,
              fare: directFare,
              tripType: tripType,
              timestamp: Date.now()
            }
          }));
          
          return directFare;
        }
      }
    }
    
    // If still no fare, return 0
    console.warn(`No fare available for ${cabType.id} ${tripType}`);
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
