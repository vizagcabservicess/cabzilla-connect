import { differenceInHours, differenceInDays, differenceInMinutes, addDays, subDays, isAfter } from 'date-fns';
import { CabType, FareCalculationParams } from '@/types/cab';
import { TripType, TripMode } from './tripTypes';
import { getLocalPackagePrice } from './packageData';
import { tourFares } from './tourData';
import axios from 'axios';
import { getOutstationFaresForVehicle, getLocalFaresForVehicle, getAirportFaresForVehicle } from '@/services/fareService';
import { validateFare, getValidatedFare } from '@/utils/fareValidator';

// Create a fare cache with expiration and strict validation
const fareCache = new Map<string, { expire: number, price: number, source: string }>();
let lastCacheClearTime = Date.now();
// Event throttling variables
let eventDispatchCount = 0;
let lastEventDispatchTime = Date.now();
const MAX_EVENTS_PER_MINUTE = 5;

// Helper to safely convert a value to lowercase
const safeToLowerCase = (value: any): string => {
  if (typeof value === 'string') {
    return value.toLowerCase();
  }
  return String(value).toLowerCase();
};

// Store fare in both cache and session storage
const storeFare = (key: string, fare: number, source: string, details: any = {}) => {
  // Only store valid fares
  if (!validateFare(fare, details.cabType, details.tripType)) {
    console.error('Invalid fare amount:', fare, details);
    return false;
  }
  
  fareCache.set(key, {
    expire: Date.now() + 15 * 60 * 1000,
    price: fare,
    source
  });
  
  // Store in session storage for persistence
  const fareDetails = {
    fare,
    timestamp: Date.now(),
    source,
    ...details
  };
  
  try {
    sessionStorage.setItem(key, JSON.stringify(fareDetails));
    // Also store in local storage for cross-page persistence
    localStorage.setItem(key, JSON.stringify(fareDetails));
    
    // Store the validated fare for booking confirmation
    if (details.cabType && details.tripType) {
      const cabId = typeof details.cabType === 'string' ? 
        details.cabType : 
        details.cabType.id || 'unknown';
      
      const validatedKey = `valid_fare_${cabId.toLowerCase().replace(/\s+/g, '_')}_${details.tripType}`;
      const validatedFare = {
        fare,
        cabId,
        tripType: details.tripType,
        timestamp: Date.now(),
        source,
        details
      };
      
      sessionStorage.setItem(validatedKey, JSON.stringify(validatedFare));
      localStorage.setItem(validatedKey, JSON.stringify(validatedFare));
    }
    
    return true;
  } catch (e) {
    console.error('Error storing fare data:', e);
    return false;
  }
};

// Get fare from cache or session storage
const getFare = (key: string, details: any = {}): number | null => {
  // Check for validated fare first
  if (details.cabType && details.tripType) {
    const cabId = typeof details.cabType === 'string' ? 
      details.cabType : 
      details.cabType.id || 'unknown';
    
    const validatedFare = getValidatedFare(cabId, details.tripType);
    if (validatedFare) {
      console.log(`Using validated fare: ₹${validatedFare}`);
      return validatedFare;
    }
  }
  
  // Try cache first
  const cached = fareCache.get(key);
  if (cached && cached.expire > Date.now()) {
    if (validateFare(cached.price, details.cabType, details.tripType)) {
      return cached.price;
    }
  }
  
  // Try session storage
  const stored = sessionStorage.getItem(key);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.timestamp && Date.now() - parsed.timestamp < 15 * 60 * 1000) {
        if (validateFare(parsed.fare, details.cabType, details.tripType)) {
          return parsed.fare;
        }
      }
    } catch (e) {
      console.error('Error parsing stored fare:', e);
    }
  }
  
  // Try localStorage as a fallback
  const localStored = localStorage.getItem(key);
  if (localStored) {
    try {
      const parsed = JSON.parse(localStored);
      if (parsed.timestamp && Date.now() - parsed.timestamp < 30 * 60 * 1000) {
        if (validateFare(parsed.fare, details.cabType, details.tripType)) {
          return parsed.fare;
        }
      }
    } catch (e) {
      console.error('Error parsing locally stored fare:', e);
    }
  }
  
  return null;
};

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

// Generate a unique key for caching fare calculations - improved with more parameters
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
  
  // Add time of day to the cache key to handle night rates properly
  const timeOfDay = pickupDate ? 
    (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5 ? 'night' : 'day') : 
    'day';
  
  // Include more specific distance information for better accuracy
  const distanceRounded = Math.round(distance / 10) * 10; // Round to nearest 10km
  
  return `${cabId}_${distanceRounded}_${tripType}_${tripMode}_${hourlyPackage || ''}_${pickupDate?.getTime() || 0}_${returnDate?.getTime() || 0}_${timeOfDay}_${shouldForceRefresh}_${cacheClearTime}_${priceMatrixTime}_${globalRefreshToken}`;
};

// Helper to get default pricing for a cab type
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

// Calculate airport transfer fares with improved validation
export const calculateAirportFare = async (cabType: CabType, distance: number): Promise<number> => {
  const cacheKey = `airport_${cabType.id}_${distance}`;
  
  // First check if we have a validated fare from previous calculations
  const validatedFare = getValidatedFare(cabType.id, 'airport');
  if (validatedFare) {
    console.log(`Using previously validated airport fare: ₹${validatedFare}`);
    return validatedFare;
  }
  
  // Try to get existing valid fare from cache
  const existingFare = getFare(cacheKey, { cabType, tripType: 'airport', distance });
  if (existingFare) {
    console.log(`Using existing airport fare: ₹${existingFare}`);
    return existingFare;
  }
  
  try {
    const airportFares = await getAirportFaresForVehicle(cabType.id);
    console.log(`Retrieved airport fares for ${cabType.name}:`, airportFares);
    
    if (!airportFares || !airportFares.basePrice) {
      throw new Error('Invalid airport fares retrieved');
    }
    
    let basePrice = 0;
    const airportFee = airportFares.airportFee || 40;
    
    if (distance <= 10) {
      basePrice = airportFares.tier1Price || 1200;
    } else if (distance <= 20) {
      basePrice = airportFares.tier2Price || 1800;
    } else if (distance <= 30) {
      basePrice = airportFares.tier3Price || 2400;
    } else {
      basePrice = airportFares.tier3Price || 2400;
      const extraKm = distance - 30;
      const extraKmCharge = airportFares.extraKmCharge || 14;
      const extraDistanceFare = extraKm * extraKmCharge;
      basePrice += extraDistanceFare;
    }
    
    const totalFare = basePrice + airportFee;
    
    if (storeFare(cacheKey, totalFare, 'database', {
      cabType,
      tripType: 'airport',
      distance,
      breakdown: {
        basePrice,
        airportFee,
        extraKmCharge: airportFares.extraKmCharge || 14
      }
    })) {
      return totalFare;
    }
    
    throw new Error('Invalid fare calculated');
  } catch (error) {
    console.error(`Error calculating airport fare for ${cabType.name}:`, error);
    throw error;
  }
};

// Enhanced calculateFare function with strict validation and fare reconciliation
export const calculateFare = async (params: FareCalculationParams): Promise<number> => {
  const { cabType, distance, tripType, tripMode = 'one-way', hourlyPackage } = params;
  
  const cacheKey = generateCacheKey(params);
  
  // First check if we have a validated fare from previous calculations
  const validatedFare = getValidatedFare(cabType.id, tripType);
  if (validatedFare) {
    console.log(`Using previously validated ${tripType} fare: ₹${validatedFare}`);
    return validatedFare;
  }
  
  // Try to get existing valid fare from cache
  const existingFare = getFare(cacheKey, { cabType, tripType, distance });
  
  if (existingFare) {
    console.log(`Using existing fare: ₹${existingFare}`);
    return existingFare;
  }
  
  try {
    let calculatedFare = 0;
    
    if (tripType === 'airport') {
      calculatedFare = await calculateAirportFare(cabType, distance);
    }
    else if (tripType === 'local') {
      const localFares = await getLocalFaresForVehicle(cabType.id);
      console.log(`Retrieved local fares for ${cabType.name}:`, localFares);
      
      if (!localFares) throw new Error('No local fares found');
      
      const packageId = hourlyPackage || '8hrs-80km';
      
      if (packageId === '4hrs-40km') {
        calculatedFare = localFares.price4hrs40km;
      } else if (packageId === '8hrs-80km') {
        calculatedFare = localFares.price8hrs80km;
      } else if (packageId === '10hrs-100km') {
        calculatedFare = localFares.price10hrs100km;
      }
      
      if (!calculatedFare || !validateFare(calculatedFare, cabType, tripType)) {
        throw new Error('Invalid local fare calculated');
      }
    }
    else if (tripType === 'outstation') {
      const outstationFares = await getOutstationFaresForVehicle(cabType.id);
      console.log(`Retrieved outstation fares for ${cabType.name}:`, outstationFares);
      
      if (!outstationFares) throw new Error('No outstation fares found');
      
      const minimumKm = 300;
      let perKmRate = tripMode === 'one-way' ? outstationFares.pricePerKm : (outstationFares.roundTripPricePerKm || outstationFares.pricePerKm * 0.85);
      let baseFare = tripMode === 'one-way' ? outstationFares.basePrice : (outstationFares.roundTripBasePrice || outstationFares.basePrice * 0.9);
      let driverAllowance = outstationFares.driverAllowance || 250;
      
      const effectiveDistance = distance * (tripMode === 'one-way' ? 2 : 2);
      
      if (effectiveDistance < minimumKm) {
        calculatedFare = baseFare + driverAllowance;
      } else {
        const extraDistance = effectiveDistance - minimumKm;
        const extraDistanceFare = extraDistance * perKmRate;
        calculatedFare = baseFare + extraDistanceFare + driverAllowance;
      }
      
      if (!validateFare(calculatedFare, cabType, tripType)) {
        throw new Error('Invalid outstation fare calculated');
      }
    }
    
    if (calculatedFare > 0) {
      storeFare(cacheKey, calculatedFare, 'calculated', {
        cabType,
        tripType,
        distance,
        tripMode,
        hourlyPackage
      });
    }
    
    return calculatedFare;
  } catch (error) {
    console.error('Error calculating fare:', error);
    throw error;
  }
};
