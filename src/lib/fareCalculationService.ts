import { differenceInHours, differenceInDays, differenceInMinutes, addDays, subDays, isAfter } from 'date-fns';
import { CabType, FareCalculationParams } from '@/types/cab';
import { TripType, TripMode } from './tripTypes';
import { getLocalPackagePrice } from './packageData';
import { tourFares } from './tourData';
import axios from 'axios';
import { getOutstationFaresForVehicle, getLocalFaresForVehicle, getAirportFaresForVehicle } from '@/services/fareService';

// Create a fare cache with expiration
const fareCache = new Map<string, { expire: number, price: number }>();
let lastCacheClearTime = Date.now();
let lastEventDispatchTime = Date.now();
let eventDispatchCount = 0;
const MAX_EVENTS_PER_MINUTE = 5;

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
    
    let fare = 0;
    
    // FIXED: Ensure consistent fare calculation with tier-based pricing
    if (distance <= 10) {
      fare = airportFares.tier1Price || 800;
    } else if (distance <= 20) {
      fare = airportFares.tier2Price || 1200;
    } else if (distance <= 30) {
      fare = airportFares.tier3Price || 1800;
    } else {
      fare = airportFares.tier4Price || 2500;
    }
    
    // Add extra km costs if distance exceeds tiers
    if (distance > 30) {
      const extraKm = distance - 30;
      const extraKmCost = extraKm * (airportFares.extraKmCharge || 14);
      fare += extraKmCost;
    }
    
    // Add driver allowance (fixed at 250 for consistency)
    const driverAllowance = 250;
    fare += driverAllowance;
    
    // Log the calculated fare for debugging
    console.log(`Airport fare calculation for ${cabType.name}: Base=${fare-driverAllowance}, Driver=${driverAllowance}, Distance=${distance}km, Total=${fare}`);
    
    // Ensure we're using consistent rounding
    fare = Math.ceil(fare / 10) * 10;
    
    // Cache the result
    fareCache.set(cacheKey, {
      expire: Date.now() + 15 * 60 * 1000,
      price: fare
    });
    
    // Dispatch event to update UI
    window.dispatchEvent(new CustomEvent('fare-calculated', {
      detail: {
        cabId: cabType.id,
        tripType: 'airport',
        fare: fare,
        timestamp: Date.now(),
        breakdown: {
          baseFare: fare - driverAllowance,
          driverAllowance: driverAllowance
        }
      }
    }));
    
    return fare;
  } catch (error) {
    console.error(`Error calculating airport fare for ${cabType.name}:`, error);
    
    // If API fails, fallback to values from cab type or default
    const defaultFare = {
      basePrice: 800,
      pricePerKm: 14,
      airportFee: 0,
      dropPrice: 0,
      pickupPrice: 0,
      tier1Price: 800,    // 0-10 KM
      tier2Price: 1200,   // 11-20 KM
      tier3Price: 1800,   // 21-30 KM
      tier4Price: 2500,   // 31+ KM
      extraKmCharge: 14
    };
    
    let fare = 0;
    
    // Get fares from cabType if available, otherwise use defaults
    const airportFares = cabType.airportFares || defaultFare;
    
    // FIXED: Ensure consistent fare calculation with tier-based pricing
    if (distance <= 10) {
      fare = airportFares.tier1Price || 800;
    } else if (distance <= 20) {
      fare = airportFares.tier2Price || 1200;
    } else if (distance <= 30) {
      fare = airportFares.tier3Price || 1800;
    } else {
      fare = airportFares.tier4Price || 2500;
    }
    
    // Add extra km costs if distance exceeds tiers
    if (distance > 30) {
      const extraKm = distance - 30;
      const extraKmCost = extraKm * (airportFares.extraKmCharge || 14);
      fare += extraKmCost;
    }
    
    // Add driver allowance (fixed at 250 for consistency)
    const driverAllowance = 250;
    fare += driverAllowance;
    
    // Log the calculated fare for debugging
    console.log(`Fallback airport fare for ${cabType.name}: Base=${fare-driverAllowance}, Driver=${driverAllowance}, Distance=${distance}km, Total=${fare}`);
    
    // Ensure we're using consistent rounding
    fare = Math.ceil(fare / 10) * 10;
    
    // Cache the result
    fareCache.set(cacheKey, {
      expire: Date.now() + 15 * 60 * 1000,
      price: fare
    });
    
    // Dispatch event to update UI
    window.dispatchEvent(new CustomEvent('fare-calculated', {
      detail: {
        cabId: cabType.id,
        tripType: 'airport',
        fare: fare,
        timestamp: Date.now(),
        breakdown: {
          baseFare: fare - driverAllowance,
          driverAllowance: driverAllowance
        }
      }
    }));
    
    return fare;
  }
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
      // For airport transfers - use the fixed calculation method
      calculatedFare = await calculateAirportFare(cabType, distance);
      console.log(`Calculated airport fare: ₹${calculatedFare}`);
    }
    else if (tripType === 'local') {
      try {
        // Always fetch the latest local fares from vehicle_pricing table
        const localFares = await getLocalFaresForVehicle(cabType.id);
        console.log(`Retrieved local fares for ${cabType.name} from vehicle_pricing:`, localFares);
        
        // For local hourly packages
        const packageId = hourlyPackage || '8hrs-80km';
        
        if (packageId === '4hrs-40km') {
          calculatedFare = localFares.price4hrs40km || localFares.package4hr40km || 0;
        } else if (packageId === '8hrs-80km') {
          calculatedFare = localFares.price8hrs80km || localFares.package8hr80km || 0;
        } else if (packageId === '10hrs-100km') {
          calculatedFare = localFares.price10hrs100km || localFares.package10hr100km || 0;
        }
        
        // If we couldn't get from API, try to get from package price matrix
        if (calculatedFare <= 0) {
          try {
            calculatedFare = getLocalPackagePrice(packageId, cabType.id);
            console.log(`Retrieved local package price from matrix: ₹${calculatedFare}`);
          } catch (error) {
            console.error('Error getting local package price:', error);
          }
        }
        
        // If still not available, use default prices
        if (calculatedFare <= 0) {
          const cabNameLower = safeToLowerCase(cabType.name);
          
          if (packageId === '4hrs-40km') {
            if (cabNameLower.includes('sedan')) calculatedFare = 800;
            else if (cabNameLower.includes('ertiga')) calculatedFare = 1000;
            else if (cabNameLower.includes('innova')) calculatedFare = 1200;
            else calculatedFare = 800;
          } else if (packageId === '8hrs-80km') {
            if (cabNameLower.includes('sedan')) calculatedFare = 1500;
            else if (cabNameLower.includes('ertiga')) calculatedFare = 1800;
            else if (cabNameLower.includes('innova')) calculatedFare = 2200;
            else calculatedFare = 1500;
          } else if (packageId === '10hrs-100km') {
            if (cabNameLower.includes('sedan')) calculatedFare = 1800;
            else if (cabNameLower.includes('ertiga')) calculatedFare = 2200;
            else if (cabNameLower.includes('innova')) calculatedFare = 2600;
            else calculatedFare = 1800;
          }
        }
      } catch (error) {
        console.error(`Error fetching local fares for ${cabType.name}:`, error);
        
        // Fallback to cab type local package fares
        if (cabType.localPackageFares) {
          const packageId = hourlyPackage || '8hrs-80km';
          
          if (packageId === '4hrs-40km') {
            calculatedFare = cabType.localPackageFares.price4hrs40km || cabType.localPackageFares.package4hr40km || 0;
          } else if (packageId === '8hrs-80km') {
            calculatedFare = cabType.localPackageFares.price8hrs80km || cabType.localPackageFares.package8hr80km || 0;
          } else if (packageId === '10hrs-100km') {
            calculatedFare = cabType.localPackageFares.price10hrs100km || cabType.localPackageFares.package10hr100km || 0;
          }
        }
        
        // If still no fare, use default
        if (calculatedFare <= 0) {
          const cabNameLower = safeToLowerCase(cabType.name);
          
          if (hourlyPackage === '4hrs-40km') {
            if (cabNameLower.includes('sedan')) calculatedFare = 800;
            else if (cabNameLower.includes('ertiga')) calculatedFare = 1000;
            else if (cabNameLower.includes('innova')) calculatedFare = 1200;
            else calculatedFare = 800;
          } else if (hourlyPackage === '8hrs-80km') {
            if (cabNameLower.includes('sedan')) calculatedFare = 1500;
            else if (cabNameLower.includes('ertiga')) calculatedFare = 1800;
            else if (cabNameLower.includes('innova')) calculatedFare = 2200;
            else calculatedFare = 1500;
          } else if (hourlyPackage === '10hrs-100km') {
            if (cabNameLower.includes('sedan')) calculatedFare = 1800;
            else if (cabNameLower.includes('ertiga')) calculatedFare = 2200;
            else if (cabNameLower.includes('innova')) calculatedFare = 2600;
            else calculatedFare = 1800;
          }
        }
      }
      
      console.log(`Calculated local package fare for ${hourlyPackage || '8hrs-80km'}: ₹${calculatedFare}`);
    }
    else if (tripType === 'outstation') {
      try {
        // Always fetch the latest outstation fares from vehicle_pricing table
        const outstationFares = await getOutstationFaresForVehicle(cabType.id);
        console.log(`Retrieved outstation fares for ${cabType.name} from vehicle_pricing:`, outstationFares);
        
        // For outstation trips
        const minimumKm = 300; // Minimum 300km for one-way trips
        let perKmRate = 0;
        let baseFare = 0;
        let driverAllowance = outstationFares.driverAllowance || 250;
        
        if (tripMode === 'one-way') {
          perKmRate = outstationFares.pricePerKm;
          baseFare = outstationFares.basePrice;
          
          // FIXED: For one-way trips, we need to consider the driver has to return
          // so we should calculate extra distance considering round trip for driver
          // Calculate total effective distance (one-way for customer, round trip for driver)
          const effectiveDistance = distance * 2; // Double the distance to account for return journey
          
          if (effectiveDistance > minimumKm) {
            // If total effective distance is greater than minimum
            const extraDistance = effectiveDistance - minimumKm;
            const extraDistanceFare = extraDistance * perKmRate;
            calculatedFare = baseFare + extraDistanceFare + driverAllowance;
          } else {
            // If total effective distance is less than minimum, just use base fare
            calculatedFare = baseFare + driverAllowance;
          }
          
          console.log(`One-way outstation fare (with return kilometers): Base=${baseFare}, Driver=${driverAllowance}, Effective distance=${effectiveDistance}km, Total=${calculatedFare}, Rate=${perKmRate}/km`);
        }
        // For round trip
        else {
          perKmRate = outstationFares.roundTripPricePerKm || outstationFares.pricePerKm * 0.85;
          
          // For round trips, use the roundTripBasePrice
          baseFare = outstationFares.roundTripBasePrice || outstationFares.basePrice * 0.9;
          
          // For round trips, the effective distance is doubled
          const effectiveDistance = distance * 2;
          
          if (effectiveDistance < minimumKm) {
            // If total round trip distance is less than minimum, use base fare
            calculatedFare = baseFare + driverAllowance;
          } else {
            // Calculate extra distance if actual round trip distance > minimum
            const extraDistance = effectiveDistance - minimumKm;
            const extraDistanceFare = extraDistance * perKmRate;
            calculatedFare = baseFare + extraDistanceFare + driverAllowance;
          }
          
          console.log(`Round-trip outstation fare: Base=${baseFare}, Driver=${driverAllowance}, Total=${calculatedFare}, Rate=${perKmRate}/km`);
        }
        
        // Add night charges if pickup is during night hours (10 PM to 5 AM)
        if (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) {
          const nightCharges = Math.round(baseFare * 0.1);
          calculatedFare += nightCharges;
          console.log(`Added night charges: ${nightCharges}`);
        }
      } catch (error) {
        console.error(`Error fetching outstation fares for ${cabType.name}:`, error);
        
        // Fallback to cab type outstation fares
        if (cabType.outstationFares) {
          const outstationFares = cabType.outstationFares;
          const minimumKm = 300;
          let perKmRate = 0;
          let baseFare = 0;
          let driverAllowance = outstationFares.driverAllowance || 250;
          
          if (tripMode === 'one-way') {
            perKmRate = outstationFares.pricePerKm;
            baseFare = outstationFares.basePrice;
            
            // For one-way trips, double the distance for driver return journey
            const effectiveDistance = distance * 2;
            
            if (effectiveDistance > minimumKm) {
              const extraDistance = effectiveDistance - minimumKm;
              const extraDistanceFare = extraDistance * perKmRate;
              calculatedFare = baseFare + extraDistanceFare + driverAllowance;
            } else {
              calculatedFare = baseFare + driverAllowance;
            }
          } else {
            perKmRate = outstationFares.roundTripPricePerKm || outstationFares.pricePerKm * 0.85;
            baseFare = outstationFares.roundTripBasePrice || outstationFares.basePrice * 0.9;
            
            const effectiveDistance = distance * 2;
            
            if (effectiveDistance < minimumKm) {
              calculatedFare = baseFare + driverAllowance;
            } else {
              const extraDistance = effectiveDistance - minimumKm;
              const extraDistanceFare = extraDistance * perKmRate;
              calculatedFare = baseFare + extraDistanceFare + driverAllowance;
            }
          }
          
          // Add night charges if pickup is during night hours (10 PM to 5 AM)
          if (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) {
            const nightCharges = Math.round(baseFare * 0.1);
            calculatedFare += nightCharges;
          }
        } else {
          // Fallback to default pricing if no outstation fares defined
          const defaultPricing = getDefaultCabPricing(cabType.name);
          const minimumKm = 300;
          
          if (tripMode === 'one-way') {
            const perKmRate = defaultPricing.pricePerKm;
            const baseFare = defaultPricing.basePrice;
            const driverAllowance = defaultPricing.driverAllowance;
            
            // For one-way trips, double the distance for driver return journey
            const effectiveDistance = distance * 2;
            
            if (effectiveDistance > minimumKm) {
              const extraDistance = effectiveDistance - minimumKm;
              const extraDistanceFare = extraDistance * perKmRate;
              calculatedFare = baseFare + extraDistanceFare + driverAllowance;
            } else {
              calculatedFare = baseFare + driverAllowance;
            }
            
            // Add night charges if pickup is during night hours
            if (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) {
              const nightCharges = Math.round(baseFare * 0.1);
              calculatedFare += nightCharges;
            }
          } else {
            const perKmRate = defaultPricing.pricePerKm * 0.85;
            const baseFare = defaultPricing.basePrice * 0.9;
            const driverAllowance = defaultPricing.driverAllowance;
            
            const effectiveDistance = distance * 2;
            
            if (effectiveDistance < minimumKm) {
              calculatedFare = baseFare + driverAllowance;
            } else {
              const extraDistance = effectiveDistance - minimumKm;
              const extraDistanceFare = extraDistance * perKmRate;
              calculatedFare = baseFare + extraDistanceFare + driverAllowance;
            }
            
            // Add night charges if pickup is during night hours
            if (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) {
              const nightCharges = Math.round(baseFare * 0.1);
              calculatedFare += nightCharges;
            }
          }
        }
      }
    }
    else if (tripType === 'tour') {
      // For tour packages - check if we have tour fares defined
      let tourId = 'araku'; // Default tour ID
      
      // Try to extract tour ID from the trip details
      if (cabType.id && tourFares[tourId] && tourFares[tourId][cabType.id as keyof typeof tourFares[typeof tourId]]) {
        calculatedFare = tourFares[tourId][cabType.id as keyof typeof tourFares[typeof tourId]] as number;
      } else {
        // Use default tour pricing if tour fare not found
        if (safeToLowerCase(cabType.name).includes('sedan')) calculatedFare = 3500;
        else if (safeToLowerCase(cabType.name).includes('ertiga')) calculatedFare = 4500;
        else if (safeToLowerCase(cabType.name).includes('innova')) calculatedFare = 5500;
        else calculatedFare = 4000;
      }
      
      console.log(`Calculated tour fare: ₹${calculatedFare}`);
    }
    
    // Ensure consistent rounding
    calculatedFare = Math.ceil(calculatedFare / 10) * 10;
    
    // Dispatch fare calculation event to update UI components
    window.dispatchEvent(new CustomEvent('fare-calculated', {
      detail: {
        cabId: cabType.id,
        tripType,
        tripMode,
        fare: calculatedFare,
        timestamp: Date.now()
      }
    }));
    
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
