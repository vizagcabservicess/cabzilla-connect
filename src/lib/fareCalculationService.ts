
import { differenceInHours, differenceInDays, differenceInMinutes, addDays, subDays, isAfter } from 'date-fns';
import { CabType, FareCalculationParams } from '@/types/cab';
import { TripType, TripMode } from './tripTypes';
import { getLocalPackagePrice } from './packageData';
import { tourFares } from './tourData';
import axios from 'axios';

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
    console.log('Fare cache clear throttled - last clear was too recent');
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
export const calculateAirportFare = (cabType: CabType, distance: number): number => {
  const cacheKey = `airport_${cabType.id}_${distance}_${lastCacheClearTime}`;
  const forceRefresh = localStorage.getItem('forceCacheRefresh') === 'true';
  
  const cachedFare = fareCache.get(cacheKey);
  if (!forceRefresh && cachedFare && cachedFare.expire > Date.now()) {
    console.log(`Using cached airport fare for ${cabType.name}: ₹${cachedFare.price}`);
    return cachedFare.price;
  }
  
  // First check if the cab has airport fares defined
  if (cabType.airportFares) {
    console.log(`Using predefined airport fares for ${cabType.name}:`, cabType.airportFares);
    
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
};

// Calculate fare for a trip
export const calculateFare = async (params: FareCalculationParams): Promise<number> => {
  try {
    const { cabType, distance, tripType, tripMode = 'one-way', hourlyPackage, pickupDate, returnDate, forceRefresh } = params;
    
    // Generate a cache key
    const cacheKey = generateCacheKey(params);
    
    // Check if we have a cached result and it hasn't expired
    const cachedFare = fareCache.get(cacheKey);
    if (!forceRefresh && cachedFare && cachedFare.expire > Date.now()) {
      console.log(`Using cached fare for ${cacheKey}: ₹${cachedFare.price}`);
      return cachedFare.price;
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
      hasOutstationFares: !!cabType.outstationFares,
      hasLocalPackageFares: !!cabType.localPackageFares,
      hasAirportFares: !!cabType.airportFares
    });
    
    // Calculate fare based on trip type
    let calculatedFare = 0;
    
    if (tripType === 'airport') {
      // For airport transfers
      calculatedFare = calculateAirportFare(cabType, distance);
      console.log(`Calculated airport fare: ₹${calculatedFare}`);
    }
    else if (tripType === 'local') {
      // For local hourly packages
      const packageId = hourlyPackage || '8hrs-80km';
      
      // First try to get from local package fares in the cab type
      if (cabType.localPackageFares) {
        if (packageId === '4hrs-40km') {
          calculatedFare = cabType.localPackageFares.price4hrs40km || cabType.localPackageFares.package4hr40km || 0;
        } else if (packageId === '8hrs-80km') {
          calculatedFare = cabType.localPackageFares.price8hrs80km || cabType.localPackageFares.package8hr80km || 0;
        } else if (packageId === '10hrs-100km') {
          calculatedFare = cabType.localPackageFares.price10hrs100km || cabType.localPackageFares.package10hr100km || 0;
        }
      }
      
      // If we couldn't get from cab type, try to get from package price matrix
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
      
      console.log(`Calculated local package fare for ${packageId}: ₹${calculatedFare}`);
    }
    else if (tripType === 'outstation') {
      // For outstation trips
      const minimumKm = 300; // Minimum 300km for one-way trips
      let perKmRate = 0;
      let baseFare = 0;
      let driverAllowance = 250;
      
      // First check if the cab has outstation fares defined
      if (cabType.outstationFares) {
        const outstationFares = cabType.outstationFares;
        
        if (tripMode === 'one-way') {
          perKmRate = outstationFares.pricePerKm;
        } else {
          perKmRate = outstationFares.roundTripPricePerKm || outstationFares.pricePerKm * 0.85;
        }
        
        driverAllowance = outstationFares.driverAllowance || 250;
      }
      else {
        // Default per km rates if no outstation fares defined
        if (tripMode === 'one-way') {
          if (safeToLowerCase(cabType.name).includes('sedan')) perKmRate = 14;
          else if (safeToLowerCase(cabType.name).includes('ertiga')) perKmRate = 16;
          else if (safeToLowerCase(cabType.name).includes('innova')) perKmRate = 20;
          else perKmRate = 16;
        } else {
          if (safeToLowerCase(cabType.name).includes('sedan')) perKmRate = 12;
          else if (safeToLowerCase(cabType.name).includes('ertiga')) perKmRate = 14;
          else if (safeToLowerCase(cabType.name).includes('innova')) perKmRate = 17;
          else perKmRate = 14;
        }
      }
      
      // For one-way trips
      if (tripMode === 'one-way') {
        // Always ensure minimum 300 km for one-way trips
        const effectiveDistance = Math.max(distance, minimumKm);
        
        // Calculate base fare for minimum 300 km
        baseFare = minimumKm * perKmRate;
        
        // Add extra distance fare if distance exceeds minimum
        if (distance > minimumKm) {
          const extraDistance = distance - minimumKm;
          const extraDistanceFare = extraDistance * perKmRate;
          baseFare += extraDistanceFare;
        }
        
        calculatedFare = baseFare + driverAllowance;
        
        console.log(`One-way outstation fare: Base=${baseFare}, Driver=${driverAllowance}, Total=${calculatedFare}`);
      }
      // For round trip
      else {
        // For round trips, the effective distance is the one-way distance × 2
        const effectiveDistance = distance * 2;
        const effectiveMinimumKm = minimumKm; // Per day minimum
        
        // Base fare calculation considering round trip distance
        if (effectiveDistance < effectiveMinimumKm) {
          // If total round trip distance is less than minimum, charge for minimum
          baseFare = effectiveMinimumKm * perKmRate;
        } else {
          // If total round trip distance exceeds minimum, charge for actual distance
          baseFare = effectiveDistance * perKmRate;
        }
        
        // Add driver allowance
        calculatedFare = baseFare + driverAllowance;
        
        console.log(`Round-trip outstation fare: Base=${baseFare}, Driver=${driverAllowance}, Total=${calculatedFare}`);
      }
      
      // Add night charges if pickup is during night hours (10 PM to 5 AM)
      if (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) {
        const nightCharges = Math.round(baseFare * 0.1);
        calculatedFare += nightCharges;
        console.log(`Added night charges: ${nightCharges}`);
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
