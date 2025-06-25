import { differenceInHours, differenceInDays, differenceInMinutes, addDays, subDays, isAfter } from 'date-fns';
import { CabType, FareCalculationParams } from '@/types/cab';
import { TripType, TripMode } from './tripTypes';
import { getLocalPackagePrice } from './packageData';
import axios from 'axios';
import { getOutstationFaresForVehicle, getLocalFaresForVehicle, getAirportFaresForVehicle } from '@/services/fareService';

// Create a fare cache with expiration and strict validation
const fareCache = new Map<string, { expire: number, price: number, source: string }>();
let lastCacheClearTime = Date.now();

// Helper to validate fare amounts
const validateFare = (fare: number, cabType: CabType, tripType: string): boolean => {
  if (!fare || isNaN(fare) || fare <= 0) return false;
  
  const cabId = cabType.id.toLowerCase();
  let minFare = 500;
  let maxFare = 20000;
  
  // Set min/max fares based on cab type and trip type
  if (cabId.includes('sedan')) {
    minFare = tripType === 'local' ? 1000 : (tripType === 'airport' ? 800 : 2000);
    maxFare = 8000;
  } else if (cabId.includes('ertiga') || cabId.includes('suv')) {
    minFare = tripType === 'local' ? 1500 : (tripType === 'airport' ? 1000 : 2500);
    maxFare = 12000;
  } else if (cabId.includes('innova')) {
    minFare = tripType === 'local' ? 2000 : (tripType === 'airport' ? 1200 : 3000);
    maxFare = 15000;
  }
  
  return fare >= minFare && fare <= maxFare;
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
  
  sessionStorage.setItem(key, JSON.stringify(fareDetails));
  return true;
};

// Get fare from cache or session storage
const getFare = (key: string, details: any = {}): number | null => {
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
  
  return null;
};

// Declare variables for event dispatch throttling
let eventDispatchCount = 1;
let lastEventDispatchTime = Date.now();
const MAX_EVENTS_PER_MINUTE = 5; // Reasonable default for throttling events

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

// Calculate airport transfer fares with improved validation
export const calculateAirportFare = async (cabType: CabType, distance: number): Promise<number> => {
  const cacheKey = `airport_${cabType.id}_${distance}`;
  
  // Try to get existing valid fare
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
    const airportFee = 40;
    
    if (distance <= 10) {
      basePrice = airportFares.tier1Price || 1200;
    } else if (distance <= 20) {
      basePrice = airportFares.tier2Price || 1800;
    } else if (distance <= 30) {
      basePrice = airportFares.tier3Price || 2400;
    } else if (distance <= 40) {
      basePrice = airportFares.tier4Price || 1500;
    } else {
      basePrice = airportFares.tier4Price || 1500;
      const extraKm = distance - 40;
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

// Enhanced calculateFare function with strict validation
export const calculateFare = async (params: FareCalculationParams): Promise<number> => {
  const { cabType, distance, tripType, tripMode = 'one-way', hourlyPackage } = params;
  
  const cacheKey = generateCacheKey(params);
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

/**
 * Calculate fare breakdown for outstation round trip bookings.
 * @param {Object} params
 * @param {Date} params.pickupDate - Pickup date/time
 * @param {Date} params.returnDate - Return date/time
 * @param {number} params.actualDistance - Total distance (two-way, in KM)
 * @param {number} params.perKmRate - Rate per KM (₹)
 * @param {number} params.nightAllowancePerNight - Night allowance per night (₹)
 * @param {number} params.driverAllowancePerDay - Driver allowance per day (₹)
 * @returns {Object} Fare breakdown and total
 */
export function calculateOutstationRoundTripFare({
  pickupDate,
  returnDate,
  actualDistance,
  perKmRate,
  nightAllowancePerNight,
  driverAllowancePerDay
}: {
  pickupDate: Date,
  returnDate: Date,
  actualDistance: number,
  perKmRate: number,
  nightAllowancePerNight: number,
  driverAllowancePerDay: number
}) {
  // 1. KM included per calendar day: 300 KM
  // 2. calendarDays = ceil((returnDate - pickupDate) / (24 * 60 * 60 * 1000)), min 1
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  let calendarDays = Math.ceil((returnDate.getTime() - pickupDate.getTime()) / MS_PER_DAY);
  if (calendarDays < 1) calendarDays = 1;
  // 3. includedKM = calendarDays × 300
  const includedKM = calendarDays * 300;
  // 4. baseFare = includedKM × perKmRate
  const baseFare = includedKM * perKmRate;
  // 5. extraDistance = max(0, actualDistance - includedKM)
  const extraDistance = Math.max(0, actualDistance - includedKM);
  // 6. extraDistanceCharges = extraDistance × perKmRate
  const extraDistanceCharges = extraDistance * perKmRate;
  // 7. nightAllowance = (calendarDays - 1) × nightAllowancePerNight
  const nightAllowance = (calendarDays - 1) * nightAllowancePerNight;
  // 8. driverAllowance = calendarDays × driverAllowancePerDay
  const driverAllowance = calendarDays * driverAllowancePerDay;
  // 9. totalFare = baseFare + extraDistanceCharges + nightAllowance + driverAllowance
  const totalFare = baseFare + extraDistanceCharges + nightAllowance + driverAllowance;
  return {
    calendarDays,
    includedKM,
    baseFare,
    extraDistance,
    extraDistanceCharges,
    nightAllowance,
    driverAllowance,
    totalFare
  };
}
