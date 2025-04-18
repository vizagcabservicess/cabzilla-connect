
import { differenceInHours, differenceInDays, differenceInMinutes, addDays, subDays, isAfter } from 'date-fns';
import { CabType, FareCalculationParams } from '@/types/cab';
import { TripType, TripMode } from './tripTypes';
import { getLocalPackagePrice } from './packageData';
import { tourFares } from './tourData';
import axios from 'axios';
import { getOutstationFaresForVehicle, getLocalFaresForVehicle, getAirportFaresForVehicle } from '@/services/fareService';
import { safeFetch } from '@/config/requestConfig';

// Create a fare cache with expiration
const fareCache = new Map<string, { expire: number, price: number }>();
let lastCacheClearTime = Date.now();
let lastEventDispatchTime = Date.now();
let eventDispatchCount = 0;
const MAX_EVENTS_PER_MINUTE = 5;
const eventDispatchThrottleRef: Record<string, number> = {};

// Clear the fare cache
export const clearFareCache = () => {
  // Prevent multiple cache clears within 30 seconds
  const now = Date.now();
  if (now - lastCacheClearTime < 30000) {
    console.log('Fare calculation cache clear throttled - last clear was too recent');
    return;
  }
  
  // Reset the cache
  fareCache.clear();
  lastCacheClearTime = now;
  console.log('Fare calculation cache cleared at', new Date().toISOString());
  
  localStorage.setItem('fareCacheLastCleared', lastCacheClearTime.toString());
  localStorage.setItem('forceCacheRefresh', 'true');
  
  // Increment and throttle event dispatch
  eventDispatchCount++;
  
  // Reset counter every minute
  if (now - lastEventDispatchTime > 60000) {
    eventDispatchCount = 1;
    lastEventDispatchTime = now;
  }
  
  // Only dispatch events if we haven't exceeded the limit
  if (eventDispatchCount <= MAX_EVENTS_PER_MINUTE) {
    try {
      window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
        detail: { timestamp: lastCacheClearTime, forceRefresh: true }
      }));
      console.log('Dispatched fare-cache-cleared event');
    } catch (e) {
      console.error('Error dispatching fare-cache-cleared event:', e);
    }
  } else {
    console.log(`Skipping fare-cache-cleared event dispatch (throttled: ${eventDispatchCount}/${MAX_EVENTS_PER_MINUTE} events this minute)`);
  }
  
  // Clear the force refresh flag after a short delay to prevent loops
  setTimeout(() => {
    localStorage.removeItem('forceCacheRefresh');
  }, 5000);
};

// Export the fare service
export const fareService = {
  clearCache: clearFareCache,
  getLastCacheClearTime: () => lastCacheClearTime
};

// Generate a unique key for caching fare calculations
const generateCacheKey = (params: FareCalculationParams): string => {
  if (!params || !params.cabType) {
    console.warn('Invalid params for generating cache key:', params);
    return 'invalid-params';
  }
  
  const { cabType, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate, forceRefresh } = params;
  const cabId = cabType && cabType.id ? cabType.id : 'unknown-cab';
  
  const shouldForceRefresh = forceRefresh || localStorage.getItem('forceCacheRefresh') === 'true' ? Date.now() : '';
  const cacheClearTime = localStorage.getItem('fareCacheLastCleared') || lastCacheClearTime;
  const priceMatrixTime = localStorage.getItem('localPackagePriceMatrixUpdated') || '0';
  const globalRefreshToken = localStorage.getItem('globalFareRefreshToken') || '0';
  
  return `${cabId}_${distance}_${tripType}_${tripMode}_${hourlyPackage || ''}_${pickupDate?.getTime() || 0}_${returnDate?.getTime() || 0}_${shouldForceRefresh}_${cacheClearTime}_${priceMatrixTime}_${globalRefreshToken}`;
};

// Helper to safely convert a value to lowercase
const safeToLowerCase = (value: any): string => {
  if (typeof value === 'string') {
    return value.toLowerCase();
  }
  return String(value).toLowerCase();
};

// Get default pricing for a cab type
const getDefaultCabPricing = (cabName: string = 'sedan') => {
  const cabNameLower = safeToLowerCase(cabName);
  
  let pricing = {
    basePrice: 4200,
    pricePerKm: 14,
    nightHaltCharge: 700,
    driverAllowance: 250
  };
  
  if (cabNameLower.includes('sedan') || cabNameLower.includes('dzire') || 
      cabNameLower.includes('etios') || cabNameLower.includes('amaze') || 
      cabNameLower.includes('swift')) {
    // Default pricing for sedan class
  } else if (cabNameLower.includes('ertiga') || cabNameLower.includes('suv')) {
    pricing = {
      basePrice: 5400,
      pricePerKm: 18,
      nightHaltCharge: 1000,
      driverAllowance: 250
    };
  } else if (cabNameLower.includes('innova')) {
    pricing = {
      basePrice: 6000,
      pricePerKm: 20,
      nightHaltCharge: 1000,
      driverAllowance: 250
    };
  } else if (cabNameLower.includes('tempo') || cabNameLower.includes('traveller')) {
    pricing = {
      basePrice: 9000,
      pricePerKm: 22,
      nightHaltCharge: 1500,
      driverAllowance: 300
    };
  } else if (cabNameLower.includes('luxury')) {
    pricing = {
      basePrice: 5000,
      pricePerKm: 16,
      nightHaltCharge: 1000,
      driverAllowance: 300
    };
  }
  
  return pricing;
};

// Calculate airport transfer fares
export const calculateAirportFare = async (cabType: CabType, distance: number): Promise<number> => {
  const cacheKey = `airport_${cabType.id}_${distance}_${lastCacheClearTime}`;
  const forceRefresh = localStorage.getItem('forceCacheRefresh') === 'true';
  
  const cachedFare = fareCache.get(cacheKey);
  if (!forceRefresh && cachedFare && cachedFare.expire > Date.now()) {
    console.log(`Using cached airport fare for ${cabType.name}: ₹${cachedFare.price}`);
    return cachedFare.price;
  }
  
  try {
    // Always fetch the latest airport fares from vehicle_pricing table
    const airportFares = await getAirportFaresForVehicle(cabType.id);
    console.log(`Retrieved airport fares for ${cabType.name} from vehicle_pricing:`, airportFares);
    
    let fare = airportFares.basePrice;
    
    // Determine tier based on distance
    if (distance <= 10) {
      fare = airportFares.tier1Price;
    } else if (distance <= 20) {
      fare = airportFares.tier2Price;
    } else if (distance <= 30) {
      fare = airportFares.tier3Price;
    } else {
      fare = airportFares.tier4Price;
    }
    
    // Add extra km costs if distance exceeds tiers
    if (distance > 30) {
      const extraKm = distance - 30;
      const extraKmCost = extraKm * airportFares.extraKmCharge;
      fare += extraKmCost;
    }
    
    // Add driver allowance
    fare += airportFares.dropPrice > 0 ? 250 : 0;
    
    // Cache the result
    fareCache.set(cacheKey, {
      expire: Date.now() + 15 * 60 * 1000,
      price: fare
    });
    
    return fare;
  } catch (error) {
    console.error(`Error calculating airport fare for ${cabType.name}:`, error);
    
    // If API fails, fallback to values from cab type
    if (cabType.airportFares) {
      console.log(`Using fallback airport fares for ${cabType.name} from cabType:`, cabType.airportFares);
      
      let fare = cabType.airportFares.basePrice;
      
      // Determine tier based on distance
      if (distance <= 10) {
        fare = cabType.airportFares.tier1Price;
      } else if (distance <= 20) {
        fare = cabType.airportFares.tier2Price;
      } else if (distance <= 30) {
        fare = cabType.airportFares.tier3Price;
      } else {
        fare = cabType.airportFares.tier4Price;
      }
      
      // Add extra km costs if distance exceeds tiers
      if (distance > 30) {
        const extraKm = distance - 30;
        const extraKmCost = extraKm * cabType.airportFares.extraKmCharge;
        fare += extraKmCost;
      }
      
      // Add driver allowance
      fare += cabType.airportFares.dropPrice > 0 ? 250 : 0;
      
      // Cache the result
      fareCache.set(cacheKey, {
        expire: Date.now() + 15 * 60 * 1000,
        price: fare
      });
      
      return fare;
    }
    
    // Default airport fare values for fallback
    const defaultFare = {
      basePrice: 1000,
      pricePerKm: 14,
      airportFee: 150,
      dropPrice: 1200,
      pickupPrice: 1500,
      tier1Price: 800,    // 0-10 KM
      tier2Price: 1200,   // 11-20 KM
      tier3Price: 1800,   // 21-30 KM
      tier4Price: 2500,   // 31+ KM
      extraKmCharge: 14
    };
    
    let fare = defaultFare.basePrice;
    
    // Determine tier based on distance
    if (distance <= 10) {
      fare = defaultFare.tier1Price;
    } else if (distance <= 20) {
      fare = defaultFare.tier2Price;
    } else if (distance <= 30) {
      fare = defaultFare.tier3Price;
    } else {
      fare = defaultFare.tier4Price;
    }
    
    // Add extra km costs if distance exceeds tiers
    if (distance > 30) {
      const extraKm = distance - 30;
      const extraKmCost = extraKm * defaultFare.extraKmCharge;
      fare += extraKmCost;
    }
    
    // Add driver allowance
    fare += 250;
    
    // Add airport fee
    fare += defaultFare.airportFee;
    
    // Cache the result
    fareCache.set(cacheKey, {
      expire: Date.now() + 15 * 60 * 1000,
      price: fare
    });
    
    return fare;
  }
};

// Helper function to ensure consistent local package pricing
const getConsistentLocalPackagePrice = (packageId: string, cabTypeId: string): number => {
  const packageMapping: Record<string, Record<string, number>> = {
    'sedan': {
      '4hrs-40km': 800,
      '8hrs-80km': 1500,
      '10hrs-100km': 2000
    },
    'ertiga': {
      '4hrs-40km': 1000,
      '8hrs-80km': 2200,
      '10hrs-100km': 3600
    },
    'innova_crysta': {
      '4hrs-40km': 1200,
      '8hrs-80km': 2500,
      '10hrs-100km': 4500
    },
    'luxury': {
      '4hrs-40km': 1400,
      '8hrs-80km': 2800,
      '10hrs-100km': 4800
    },
    'tempo': {
      '4hrs-40km': 2000,
      '8hrs-80km': 3500,
      '10hrs-100km': 5500
    }
  };
  
  // Return the fixed price if available
  if (packageMapping[cabTypeId] && packageMapping[cabTypeId][packageId]) {
    return packageMapping[cabTypeId][packageId];
  }
  
  // Default fallbacks
  const defaultPrices: Record<string, number> = {
    '4hrs-40km': 1000,
    '8hrs-80km': 2000,
    '10hrs-100km': 3000
  };
  
  return defaultPrices[packageId] || 2000;
};

// Calculate fare for a trip
export const calculateFare = async (params: FareCalculationParams): Promise<number> => {
  try {
    const { cabType, distance, tripType, tripMode = 'one-way', hourlyPackage, pickupDate, returnDate, forceRefresh } = params;
    
    // Generate a cache key
    const cacheKey = generateCacheKey(params);
    
    // Check if we should force refresh
    const shouldForceRefresh = forceRefresh || localStorage.getItem('forceCacheRefresh') === 'true';
    
    // Only use cache if not forcing refresh
    if (!shouldForceRefresh) {
      const cachedFare = fareCache.get(cacheKey);
      if (cachedFare && cachedFare.expire > Date.now()) {
        console.log(`Using cached fare for ${cacheKey}: ₹${cachedFare.price}`);
        return cachedFare.price;
      }
    }
    
    // Log the calculation parameters
    console.log('Calculating fare with params:', {
      cabType: cabType.name,
      cabId: cabType.id,
      distance,
      tripType,
      tripMode,
      hourlyPackage,
      pickupDate: pickupDate?.toISOString(),
      returnDate: returnDate?.toISOString(),
      shouldForceRefresh,
      cacheClear: lastCacheClearTime
    });
    
    // Calculate fare based on trip type
    let calculatedFare = 0;
    
    if (tripType === 'airport') {
      // For airport transfers
      calculatedFare = await calculateAirportFare(cabType, distance);
      console.log(`Calculated airport fare: ₹${calculatedFare}`);
    }
    else if (tripType === 'local') {
      try {
        // Use consistent local package pricing instead of API calls for stability
        const packageId = hourlyPackage || '8hrs-80km';
        calculatedFare = getConsistentLocalPackagePrice(packageId, cabType.id);
        
        console.log(`Using consistent local package pricing for ${packageId}, ${cabType.id}: ₹${calculatedFare}`);
        
        // If price seems too low, try the API version as fallback
        if (calculatedFare < 500) {
          try {
            const localFares = await getLocalFaresForVehicle(cabType.id);
            console.log(`Retrieved local fares for ${cabType.name} from API as fallback:`, localFares);
            
            if (packageId === '4hrs-40km' && localFares.price4hrs40km > 0) {
              calculatedFare = localFares.price4hrs40km;
            } else if (packageId === '8hrs-80km' && localFares.price8hrs80km > 0) {
              calculatedFare = localFares.price8hrs80km;
            } else if (packageId === '10hrs-100km' && localFares.price10hrs100km > 0) {
              calculatedFare = localFares.price10hrs100km;
            }
          } catch (error) {
            console.error('Error getting local package price from API:', error);
          }
        }
        
        // Cache the price to ensure consistency in booking summary
        localStorage.setItem(`local_fare_${cabType.id}_${packageId}`, calculatedFare.toString());
      } catch (error) {
        console.error(`Error calculating local fare for ${cabType.name}:`, error);
        
        // Try to load from localStorage if available
        const storedPrice = localStorage.getItem(`local_fare_${cabType.id}_${hourlyPackage}`);
        if (storedPrice) {
          calculatedFare = parseInt(storedPrice, 10);
        } else {
          // Use fallback pricing
          calculatedFare = getConsistentLocalPackagePrice(hourlyPackage || '8hrs-80km', cabType.id);
        }
      }
      console.log(`Final local package fare for ${hourlyPackage || '8hrs-80km'}: ₹${calculatedFare}`);
    }
    else if (tripType === 'outstation') {
      try {
        // Use consistent outstation pricing based on cab type and distance
        const baseRate = {
          'sedan': { perKm: 14, basePrice: 4200, driverAllowance: 250 },
          'ertiga': { perKm: 18, basePrice: 5400, driverAllowance: 250 },
          'innova_crysta': { perKm: 20, basePrice: 6000, driverAllowance: 250 },
          'luxury': { perKm: 25, basePrice: 8000, driverAllowance: 300 },
          'tempo': { perKm: 22, basePrice: 9000, driverAllowance: 300 }
        };
        
        const rateInfo = baseRate[cabType.id as keyof typeof baseRate] || baseRate['sedan'];
        const minimumKm = 300;
        
        if (tripMode === 'one-way') {
          // For one-way trips, calculate with driver return journey
          const effectiveDistance = distance * 2;
          
          if (effectiveDistance > minimumKm) {
            const extraDistance = effectiveDistance - minimumKm;
            const extraDistanceFare = extraDistance * rateInfo.perKm;
            calculatedFare = rateInfo.basePrice + extraDistanceFare + rateInfo.driverAllowance;
          } else {
            calculatedFare = rateInfo.basePrice + rateInfo.driverAllowance;
          }
        } else {
          // For round-trip
          const roundTripPerKm = rateInfo.perKm * 0.85; // 15% discount for round trip
          const roundTripBase = rateInfo.basePrice * 0.9; // 10% discount on base price
          
          const effectiveDistance = distance * 2;
          
          if (effectiveDistance < minimumKm) {
            calculatedFare = roundTripBase + rateInfo.driverAllowance;
          } else {
            const extraDistance = effectiveDistance - minimumKm;
            const extraDistanceFare = extraDistance * roundTripPerKm;
            calculatedFare = roundTripBase + extraDistanceFare + rateInfo.driverAllowance;
          }
        }
        
        // Add night charges if pickup is during night hours (10 PM to 5 AM)
        if (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) {
          const nightCharges = Math.round(rateInfo.basePrice * 0.1);
          calculatedFare += nightCharges;
        }
        
        console.log(`Calculated outstation fare: ₹${calculatedFare}`);
        
        // Cache the result in localStorage for consistency
        const outstationKey = `outstation_${cabType.id}_${distance}_${tripMode}`;
        localStorage.setItem(outstationKey, calculatedFare.toString());
      } catch (error) {
        console.error(`Error calculating outstation fare for ${cabType.name}:`, error);
        
        // Try to retrieve from localStorage
        const outstationKey = `outstation_${cabType.id}_${distance}_${tripMode}`;
        const storedFare = localStorage.getItem(outstationKey);
        
        if (storedFare) {
          calculatedFare = parseInt(storedFare, 10);
        } else {
          // Use default pricing as fallback
          const defaultPricing = getDefaultCabPricing(cabType.name);
          
          if (tripMode === 'one-way') {
            calculatedFare = defaultPricing.basePrice + (distance * defaultPricing.pricePerKm) + defaultPricing.driverAllowance;
          } else {
            calculatedFare = (defaultPricing.basePrice * 0.9) + (distance * 2 * defaultPricing.pricePerKm * 0.85) + defaultPricing.driverAllowance;
          }
        }
      }
    }
    else if (tripType === 'tour') {
      // For tour packages - use fixed prices based on cab type
      const tourPricing: Record<string, number> = {
        'sedan': 3500,
        'ertiga': 4500,
        'innova_crysta': 5500,
        'luxury': 6500,
        'tempo': 8500
      };
      
      calculatedFare = tourPricing[cabType.id] || 4000;
      console.log(`Calculated tour fare: ₹${calculatedFare}`);
    }
    
    // Throttle event dispatching to prevent excessive refreshes
    const dispatchFareCalculatedEvent = (cabId: string, fare: number) => {
      const now = Date.now();
      const eventKey = `fare_${cabId}_${tripType}`;
      const lastDispatch = eventDispatchThrottleRef[eventKey] || 0;
      
      // Limit to one event per cab per 3 seconds
      if (now - lastDispatch < 3000) {
        console.log(`Throttling fare-calculated event for ${cabId} (${tripType})`);
        return;
      }
      
      eventDispatchThrottleRef[eventKey] = now;
      
      // Dispatch with minimal data to reduce overhead
      window.dispatchEvent(new CustomEvent('fare-calculated', {
        detail: {
          cabId,
          tripType,
          tripMode,
          fare,
          timestamp: now
        }
      }));
    };
    
    // Only dispatch the event if the fare is valid
    if (calculatedFare > 0) {
      dispatchFareCalculatedEvent(cabType.id, calculatedFare);
    }
    
    // Cache the calculated fare
    fareCache.set(cacheKey, {
      expire: Date.now() + 15 * 60 * 1000, // Cache for 15 minutes
      price: calculatedFare
    });
    
    return calculatedFare;
  } catch (error) {
    console.error('Error calculating fare:', error);
    return 0;
  }
};
