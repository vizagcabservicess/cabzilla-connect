import { FareCalculationParams } from '@/types/cab';
import { getAirportFaresForVehicle, getLocalFaresForVehicle, getOutstationFaresForVehicle } from '@/services/fareService';

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
  
  // Throttle event dispatching to prevent loops
  if (eventThrottleCount < MAX_EVENTS_PER_MINUTE) {
    eventThrottleCount += 1;
    
    try {
      window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
        detail: { timestamp: now, forceRefresh: true }
      }));
      
      console.log('Fare cache cleared, event dispatched');
      
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

// Get default pricing for a cab based on its type
const getDefaultPricing = (cabType: any): { basePrice: number, pricePerKm: number, driverAllowance: number } => {
  const cabId = cabType?.id?.toLowerCase() || '';
  
  if (cabId.includes('sedan')) {
    return {
      basePrice: 2000,
      pricePerKm: 11,
      driverAllowance: 250
    };
  } else if (cabId.includes('ertiga')) {
    return {
      basePrice: 2500,
      pricePerKm: 14,
      driverAllowance: 250
    };
  } else if (cabId.includes('innova')) {
    return {
      basePrice: 3000,
      pricePerKm: 18,
      driverAllowance: 300
    };
  } else if (cabId.includes('tempo') || cabId.includes('traveller')) {
    return {
      basePrice: 4500,
      pricePerKm: 22,
      driverAllowance: 350
    };
  } else {
    return {
      basePrice: 2200,
      pricePerKm: 12,
      driverAllowance: 250
    };
  }
};

// Calculate airport transfer fare
export const calculateAirportFare = async (cabType: any, distance: number): Promise<number> => {
  if (!cabType || !cabType.id) {
    console.error('Invalid cab type for airport fare calculation');
    return 0;
  }
  
  const cacheKey = `airport_${cabType.id}_${distance}`;
  const cachedFare = fareCache.get(cacheKey);
  
  // Use cached value if available and recent (less than 5 minutes old)
  if (cachedFare && Date.now() - cachedFare.timestamp < 300000) {
    console.log(`Using cached airport fare for ${cabType.id}: ${cachedFare.price}`);
    return cachedFare.price;
  }
  
  try {
    // Try to get fares from API or vehicle pricing data
    const airportFares = await getAirportFaresForVehicle(cabType.id);
    
    if (airportFares && Object.keys(airportFares).length > 0) {
      console.log(`Retrieved airport fares for ${cabType.id}:`, airportFares);
      
      let fare = 0;
      
      // Determine tier based on distance
      if (distance <= 10) {
        fare = airportFares.tier1Price || 800;
      } else if (distance <= 20) {
        fare = airportFares.tier2Price || 1200;
      } else if (distance <= 30) {
        fare = airportFares.tier3Price || 1600;
      } else {
        fare = airportFares.tier4Price || 2000;
        
        // Add cost for extra kilometers
        if (distance > 30) {
          const extraKm = distance - 30;
          const extraRate = airportFares.extraKmCharge || 12;
          fare += extraKm * extraRate;
        }
      }
      
      // Round to nearest 10
      fare = Math.round(fare / 10) * 10;
      
      // Cache the result
      fareCache.set(cacheKey, { price: fare, timestamp: Date.now() });
      
      // Store in localStorage for other components
      try {
        const localStorageKey = `fare_airport_${cabType.id.toLowerCase()}`;
        localStorage.setItem(localStorageKey, fare.toString());
      } catch (error) {
        console.error('Error storing airport fare in localStorage:', error);
      }
      
      console.log(`Calculated airport fare for ${cabType.id}: ${fare}`);
      return fare;
    }
  } catch (error) {
    console.error(`Error fetching airport fares for ${cabType.id}:`, error);
  }
  
  // Fallback to default pricing if API call fails
  const defaultPricing = getDefaultPricing(cabType);
  let fare = 0;
  
  if (distance <= 10) {
    fare = cabType.id.includes('sedan') ? 800 : 
           cabType.id.includes('ertiga') ? 1000 : 
           cabType.id.includes('innova') ? 1200 : 900;
  } else if (distance <= 20) {
    fare = cabType.id.includes('sedan') ? 1200 : 
           cabType.id.includes('ertiga') ? 1500 : 
           cabType.id.includes('innova') ? 1800 : 1400;
  } else {
    // Base fare for distances over 20km
    const baseFare = cabType.id.includes('sedan') ? 1200 : 
                    cabType.id.includes('ertiga') ? 1500 : 
                    cabType.id.includes('innova') ? 1800 : 1400;
    
    // Extra per km charge
    const extraKm = distance - 20;
    const extraRate = defaultPricing.pricePerKm;
    fare = baseFare + (extraKm * extraRate);
  }
  
  // Round to nearest 10
  fare = Math.round(fare / 10) * 10;
  
  // Cache the result
  fareCache.set(cacheKey, { price: fare, timestamp: Date.now() });
  
  // Store in localStorage
  try {
    const localStorageKey = `fare_airport_${cabType.id.toLowerCase()}`;
    localStorage.setItem(localStorageKey, fare.toString());
  } catch (error) {
    console.error('Error storing airport fare in localStorage:', error);
  }
  
  console.log(`Calculated fallback airport fare for ${cabType.id}: ${fare}`);
  return fare;
};

// Main fare calculation function
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
        console.log(`Using cached fare: ${cachedFare.price} for ${cacheKey}`);
        return cachedFare.price;
      }
    }
    
    // Calculate fare based on trip type
    let calculatedFare = 0;
    
    if (tripType === 'airport') {
      // Airport transfers
      calculatedFare = await calculateAirportFare(cabType, distance);
    } 
    else if (tripType === 'local') {
      // Local packages
      try {
        const localFares = await getLocalFaresForVehicle(cabType.id);
        
        if (localFares && Object.keys(localFares).length > 0) {
          console.log(`Retrieved local package fares for ${cabType.id}:`, localFares);
          
          if (hourlyPackage === '4hrs-40km') {
            calculatedFare = localFares.price4hrs40km || localFares.package4hr40km || 0;
          } else if (hourlyPackage === '8hrs-80km') {
            calculatedFare = localFares.price8hrs80km || localFares.package8hr80km || 0;
          } else if (hourlyPackage === '10hrs-100km') {
            calculatedFare = localFares.price10hrs100km || localFares.package10hr100km || 0;
          }
          
          // If we got a valid fare, add driver allowance
          if (calculatedFare > 0) {
            // Get driver allowance from the cab type or use default
            const driverAllowance = cabType.driverAllowance || 250;
            calculatedFare += driverAllowance;
            
            // Cache the result
            const cacheKey = generateCacheKey(params);
            fareCache.set(cacheKey, { price: calculatedFare, timestamp: Date.now() });
            
            console.log(`Calculated local package fare for ${cabType.id}: ${calculatedFare}`);
            
            // Store in localStorage
            try {
              const localStorageKey = `fare_${tripType}_${cabType.id.toLowerCase()}`;
              localStorage.setItem(localStorageKey, calculatedFare.toString());
            } catch (error) {
              console.error('Error storing local package fare in localStorage:', error);
            }
            
            return calculatedFare;
          }
        }
      } catch (error) {
        console.error(`Error fetching local package fares for ${cabType.id}:`, error);
      }
      
      // Fallback to stored price matrix
      try {
        const priceMatrixStr = localStorage.getItem('localPackagePriceMatrix');
        if (priceMatrixStr && hourlyPackage) {
          const priceMatrix = JSON.parse(priceMatrixStr);
          
          if (priceMatrix && priceMatrix[hourlyPackage] && 
              priceMatrix[hourlyPackage][cabType.id.toLowerCase()]) {
            calculatedFare = priceMatrix[hourlyPackage][cabType.id.toLowerCase()];
            
            // Add driver allowance
            const defaultPricing = getDefaultPricing(cabType);
            calculatedFare += defaultPricing.driverAllowance;
            
            console.log(`Using price matrix fare for ${cabType.id}, ${hourlyPackage}: ${calculatedFare}`);
            
            // Cache the result
            const cacheKey = generateCacheKey(params);
            fareCache.set(cacheKey, { price: calculatedFare, timestamp: Date.now() });
            
            // Store in localStorage
            try {
              const localStorageKey = `fare_${tripType}_${cabType.id.toLowerCase()}`;
              localStorage.setItem(localStorageKey, calculatedFare.toString());
            } catch (error) {
              console.error('Error storing local package fare in localStorage:', error);
            }
            
            return calculatedFare;
          }
        }
      } catch (error) {
        console.error('Error fetching from price matrix:', error);
      }
      
      // Fallback to default package pricing
      const defaultPricing = getDefaultPricing(cabType);
      let baseFare = 0;
      
      if (hourlyPackage === '4hrs-40km') {
        baseFare = cabType.id?.includes('sedan') ? 1000 : 
                   cabType.id?.includes('ertiga') ? 1200 : 
                   cabType.id?.includes('innova') ? 1500 : 1100;
      } else if (hourlyPackage === '8hrs-80km') {
        baseFare = cabType.id?.includes('sedan') ? 1800 : 
                   cabType.id?.includes('ertiga') ? 2200 : 
                   cabType.id?.includes('innova') ? 2800 : 2000;
      } else if (hourlyPackage === '10hrs-100km') {
        baseFare = cabType.id?.includes('sedan') ? 2200 : 
                   cabType.id?.includes('ertiga') ? 2700 : 
                   cabType.id?.includes('innova') ? 3300 : 2400;
      } else {
        // Default to 8hrs package
        baseFare = cabType.id?.includes('sedan') ? 1800 : 
                   cabType.id?.includes('ertiga') ? 2200 : 
                   cabType.id?.includes('innova') ? 2800 : 2000;
      }
      
      // Add driver allowance
      calculatedFare = baseFare + defaultPricing.driverAllowance;
      
      // Cache the result
      const cacheKey = generateCacheKey(params);
      fareCache.set(cacheKey, { price: calculatedFare, timestamp: Date.now() });
      
      console.log(`Calculated default local package fare for ${cabType.id}: ${calculatedFare}`);
      
      // Store in localStorage
      try {
        const localStorageKey = `fare_${tripType}_${cabType.id.toLowerCase()}`;
        localStorage.setItem(localStorageKey, calculatedFare.toString());
      } catch (error) {
        console.error('Error storing default local package fare in localStorage:', error);
      }
    } 
    else if (tripType === 'outstation') {
      // Outstation trips
      try {
        const outstationFares = await getOutstationFaresForVehicle(cabType.id);
        
        if (outstationFares && Object.keys(outstationFares).length > 0) {
          console.log(`Retrieved outstation fares for ${cabType.id}:`, outstationFares);
          
          const minKm = 300;
          let effectiveDistance = distance;
          
          // For one-way trips, double the distance for driver return
          if (tripMode === 'one-way') {
            effectiveDistance = Math.max(distance * 2, minKm);
          } else {
            effectiveDistance = Math.max(distance, minKm);
          }
          
          // Calculate base fare
          const perKmRate = tripMode === 'one-way' ? 
            (outstationFares.pricePerKm || 12) : 
            (outstationFares.roundTripPricePerKm || outstationFares.pricePerKm * 0.85 || 10);
          
          const baseFare = effectiveDistance * perKmRate;
          
          // Add driver allowance for outstation trips
          const driverAllowance = outstationFares.driverAllowance || 250;
          calculatedFare = baseFare + driverAllowance;
          
          // Add night charges if applicable (usually 10% of base fare)
          if (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) {
            const nightCharges = Math.round(baseFare * 0.1);
            calculatedFare += nightCharges;
          }
          
          // Round to nearest 10
          calculatedFare = Math.round(calculatedFare / 10) * 10;
          
          // Cache the result
          const cacheKey = generateCacheKey(params);
          fareCache.set(cacheKey, { price: calculatedFare, timestamp: Date.now() });
          
          console.log(`Calculated outstation fare for ${cabType.id}: ${calculatedFare}`);
          
          // Store in localStorage
          try {
            const localStorageKey = `fare_${tripType}_${cabType.id.toLowerCase()}`;
            localStorage.setItem(localStorageKey, calculatedFare.toString());
          } catch (error) {
            console.error('Error storing outstation fare in localStorage:', error);
          }
          
          return calculatedFare;
        }
      } catch (error) {
        console.error(`Error fetching outstation fares for ${cabType.id}:`, error);
      }
      
      // Fallback to default outstation pricing
      const defaultPricing = getDefaultPricing(cabType);
      const minKm = 300;
      let effectiveDistance = distance;
      
      // For one-way trips, double the distance for driver return
      if (tripMode === 'one-way') {
        effectiveDistance = Math.max(distance * 2, minKm);
      } else {
        effectiveDistance = Math.max(distance, minKm);
        defaultPricing.pricePerKm = Math.round(defaultPricing.pricePerKm * 0.85);
      }
      
      // Calculate base fare
      const baseFare = effectiveDistance * defaultPricing.pricePerKm;
      
      // Add driver allowance
      calculatedFare = baseFare + defaultPricing.driverAllowance;
      
      // Add night charges if applicable
      if (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) {
        const nightCharges = Math.round(baseFare * 0.1);
        calculatedFare += nightCharges;
      }
      
      // Round to nearest 10
      calculatedFare = Math.round(calculatedFare / 10) * 10;
      
      // Cache the result
      const cacheKey = generateCacheKey(params);
      fareCache.set(cacheKey, { price: calculatedFare, timestamp: Date.now() });
      
      console.log(`Calculated default outstation fare for ${cabType.id}: ${calculatedFare}`);
      
      // Store in localStorage
      try {
        const localStorageKey = `fare_${tripType}_${cabType.id.toLowerCase()}`;
        localStorage.setItem(localStorageKey, calculatedFare.toString());
      } catch (error) {
        console.error('Error storing default outstation fare in localStorage:', error);
      }
    }
    
    // Dispatch event with calculated fare
    try {
      if (calculatedFare > 0) {
        window.dispatchEvent(new CustomEvent('fare-calculated', {
          detail: {
            cabId: cabType.id,
            fare: calculatedFare,
            tripType: tripType,
            timestamp: Date.now()
          }
        }));
      }
    } catch (error) {
      console.error('Error dispatching fare-calculated event:', error);
    }
    
    return calculatedFare;
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
