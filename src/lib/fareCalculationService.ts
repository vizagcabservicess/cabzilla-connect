
import { differenceInHours, differenceInDays, differenceInMinutes, addDays, subDays, isAfter } from 'date-fns';
import { CabType, FareCalculationParams } from '@/types/cab';
import { TripType, TripMode } from './tripTypes';
import { getLocalPackagePrice } from './packageData';
import { tourFares } from './tourData';
import axios from 'axios';
import { getOutstationFaresForVehicle, getLocalFaresForVehicle, getAirportFaresForVehicle } from '@/services/fareService';

// Create a fare cache with expiration and strict validation
const fareCache = new Map<string, { expire: number, price: number, source: string, checksum?: string }>();
let lastCacheClearTime = Date.now();

// Add event throttling variables
let eventDispatchCount = 0;
let lastEventDispatchTime = Date.now();
const MAX_EVENTS_PER_MINUTE = 5;

// Fare version control - increment when fare calculation logic changes
const FARE_VERSION = '1.0.2';

// Minimum fare amounts by type to prevent invalid values
const MIN_FARES = {
  airport: 800,
  local: 1000,
  outstation: 2000,
  default: 500
};

// Helper to validate fare amounts
const validateFare = (fare: number, cabType: CabType, tripType: string): boolean => {
  if (!fare || isNaN(fare) || fare <= 0) return false;
  
  const cabId = cabType.id.toLowerCase();
  
  // Get minimum fare based on trip and cab type
  let minFare = MIN_FARES.default;
  if (tripType === 'airport') minFare = MIN_FARES.airport;
  if (tripType === 'local') minFare = MIN_FARES.local;
  if (tripType === 'outstation') minFare = MIN_FARES.outstation;
  
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

// Generate a checksum for the fare data
const generateFareChecksum = (cabType: CabType, tripType: string, fare: number): string => {
  const input = `${cabType.id}-${tripType}-${fare}-${FARE_VERSION}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
};

// Store fare in both cache and storage with checksum verification
const storeFare = (key: string, fare: number, source: string, details: any = {}) => {
  // Only store valid fares
  if (!validateFare(fare, details.cabType, details.tripType)) {
    console.error('Invalid fare amount:', fare, details);
    return false;
  }
  
  // Generate checksum
  const checksum = generateFareChecksum(details.cabType, details.tripType, fare);
  
  // Store in memory cache
  fareCache.set(key, {
    expire: Date.now() + 15 * 60 * 1000,
    price: fare,
    source,
    checksum
  });
  
  // Store in session storage for persistence
  const fareDetails = {
    fare,
    timestamp: Date.now(),
    source,
    checksum,
    version: FARE_VERSION,
    ...details
  };
  
  try {
    // Store in both localStorage and sessionStorage for redundancy
    sessionStorage.setItem(key, JSON.stringify(fareDetails));
    localStorage.setItem(key, JSON.stringify(fareDetails));
    
    // For outstation fares, also store a backup with prefixed key
    if (details.tripType === 'outstation') {
      const backupKey = `backup_${key}`;
      localStorage.setItem(backupKey, JSON.stringify(fareDetails));
    }
    
    return true;
  } catch (e) {
    console.error('Error storing fare:', e);
    return false;
  }
};

// Get fare from cache or storage with checksum verification
const getFare = (key: string, details: any = {}): number | null => {
  // Try cache first
  const cached = fareCache.get(key);
  if (cached && cached.expire > Date.now()) {
    if (validateFare(cached.price, details.cabType, details.tripType)) {
      return cached.price;
    }
  }
  
  // Try session storage
  const stored = sessionStorage.getItem(key) || localStorage.getItem(key);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.timestamp && Date.now() - parsed.timestamp < 15 * 60 * 1000) {
        // Verify checksum if available
        if (parsed.checksum) {
          const expectedChecksum = generateFareChecksum(details.cabType, details.tripType, parsed.fare);
          if (parsed.checksum !== expectedChecksum) {
            console.warn('Fare checksum mismatch, possible tampering detected');
            return null;
          }
        }
        
        if (validateFare(parsed.fare, details.cabType, details.tripType)) {
          // Refresh the cache
          fareCache.set(key, {
            expire: Date.now() + 15 * 60 * 1000,
            price: parsed.fare,
            source: parsed.source,
            checksum: parsed.checksum
          });
          return parsed.fare;
        }
      }
    } catch (e) {
      console.error('Error parsing stored fare:', e);
    }
  }
  
  // Try backup for outstation fares
  if (details.tripType === 'outstation') {
    const backupKey = `backup_${key}`;
    const backupStored = localStorage.getItem(backupKey);
    if (backupStored) {
      try {
        const parsed = JSON.parse(backupStored);
        if (validateFare(parsed.fare, details.cabType, details.tripType)) {
          return parsed.fare;
        }
      } catch (e) {
        console.error('Error parsing backup fare:', e);
      }
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
  const fareVersion = FARE_VERSION;
  
  return `${cabId}_${distance}_${tripType}_${tripMode}_${hourlyPackage || ''}_${pickupDate?.getTime() || 0}_${returnDate?.getTime() || 0}_${shouldForceRefresh}_${cacheClearTime}_${priceMatrixTime}_${globalRefreshToken}_${fareVersion}`;
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

// Calculate airport transfer fares with improved validation and enforcement
export const calculateAirportFare = async (cabType: CabType, distance: number): Promise<number> => {
  const cacheKey = `airport_${cabType.id}_${distance}_${FARE_VERSION}`;
  
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
    
    // Enforce minimum base price by distance tiers with hard minimums
    if (distance <= 10) {
      basePrice = Math.max(airportFares.tier1Price || 1200, 800);
    } else if (distance <= 20) {
      basePrice = Math.max(airportFares.tier2Price || 1800, 1000);
    } else if (distance <= 30) {
      basePrice = Math.max(airportFares.tier3Price || 2400, 1200);
    } else {
      basePrice = Math.max(airportFares.tier3Price || 2400, 1200);
      const extraKm = distance - 30;
      const extraKmCharge = airportFares.extraKmCharge || 14;
      const extraDistanceFare = extraKm * extraKmCharge;
      basePrice += extraDistanceFare;
    }
    
    // Ensure minimum total fare
    const totalFare = Math.max(basePrice + airportFee, MIN_FARES.airport);
    
    const breakdown = {
      basePrice,
      airportFee,
      extraKmCharge: airportFares.extraKmCharge || 14,
      extraDistanceFare: distance > 30 ? ((distance - 30) * (airportFares.extraKmCharge || 14)) : 0
    };
    
    if (storeFare(cacheKey, totalFare, 'database', {
      cabType,
      tripType: 'airport',
      distance,
      breakdown
    })) {
      // Double-check fare is valid before returning
      if (validateFare(totalFare, cabType, 'airport')) {
        // Store in alternative format as well for redundancy
        localStorage.setItem(`airport_fare_${cabType.id}`, JSON.stringify({
          fare: totalFare,
          timestamp: Date.now(),
          breakdown,
          version: FARE_VERSION
        }));
        return totalFare;
      }
      throw new Error('Invalid fare calculated');
    }
    
    throw new Error('Failed to store calculated fare');
  } catch (error) {
    console.error(`Error calculating airport fare for ${cabType.name}:`, error);
    
    // Fallback to safe minimum values if API fails
    const cabTypeId = safeToLowerCase(cabType.id);
    let fallbackBaseFare = 1000;
    
    // Set fallback fares based on cab type
    if (cabTypeId.includes('sedan') || cabTypeId.includes('hatchback')) {
      fallbackBaseFare = 1000;
    } else if (cabTypeId.includes('ertiga') || cabTypeId.includes('suv')) {
      fallbackBaseFare = 1200;
    } else if (cabTypeId.includes('innova') || cabTypeId.includes('crysta')) {
      fallbackBaseFare = 1500;
    } else if (cabTypeId.includes('tempo') || cabTypeId.includes('traveller')) {
      fallbackBaseFare = 2000;
    } else {
      fallbackBaseFare = 1000;
    }
    
    // Add distance based component
    if (distance > 10) {
      const extraDistance = distance - 10;
      const extraRate = cabTypeId.includes('sedan') ? 14 : 
                      cabTypeId.includes('suv') ? 16 : 
                      cabTypeId.includes('innova') ? 18 : 20;
      fallbackBaseFare += extraDistance * extraRate;
    }
    
    // Add airport fee
    const airportFee = 40;
    const totalFallbackFare = fallbackBaseFare + airportFee;
    
    // Store fallback fare
    storeFare(cacheKey, totalFallbackFare, 'fallback', {
      cabType,
      tripType: 'airport',
      distance,
      breakdown: {
        basePrice: fallbackBaseFare,
        airportFee,
        isApiFailure: true
      }
    });
    
    return totalFallbackFare;
  }
};

// Enhanced calculateFare function with strict validation and multiple fallbacks
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
    let fareBreakdown = {};
    let fareSource = 'calculated';
    
    if (tripType === 'airport') {
      calculatedFare = await calculateAirportFare(cabType, distance);
      fareBreakdown = {
        basePrice: calculatedFare - 40, // Subtract airport fee
        airportFee: 40
      };
    }
    else if (tripType === 'local') {
      try {
        const localFares = await getLocalFaresForVehicle(cabType.id);
        console.log(`Retrieved local fares for ${cabType.name}:`, localFares);
        
        if (!localFares) throw new Error('No local fares found');
        
        const packageId = hourlyPackage || '8hrs-80km';
        
        if (packageId === '4hrs-40km') {
          calculatedFare = Math.max(localFares.price4hrs40km || 1500, MIN_FARES.local);
        } else if (packageId === '8hrs-80km') {
          calculatedFare = Math.max(localFares.price8hrs80km || 2000, MIN_FARES.local);
        } else if (packageId === '10hrs-100km') {
          calculatedFare = Math.max(localFares.price10hrs100km || 2500, MIN_FARES.local);
        } else {
          calculatedFare = Math.max(localFares.price8hrs80km || 2000, MIN_FARES.local);
        }
        
        fareSource = 'database';
        fareBreakdown = {
          basePrice: calculatedFare,
          packageType: packageId
        };
      } catch (error) {
        console.error('Error fetching local fares:', error);
        
        // Fallback based on cab type
        const cabTypeId = safeToLowerCase(cabType.id);
        if (cabTypeId.includes('sedan')) calculatedFare = 2000;
        else if (cabTypeId.includes('ertiga') || cabTypeId.includes('suv')) calculatedFare = 2500;
        else if (cabTypeId.includes('innova') || cabTypeId.includes('crysta')) calculatedFare = 3000;
        else calculatedFare = 2000;
        
        fareSource = 'fallback';
        fareBreakdown = {
          basePrice: calculatedFare,
          packageType: hourlyPackage || '8hrs-80km',
          isApiFailure: true
        };
      }
      
      if (!validateFare(calculatedFare, cabType, tripType)) {
        const minFare = MIN_FARES.local;
        console.warn(`Invalid local fare calculated: ${calculatedFare}, using minimum: ${minFare}`);
        calculatedFare = minFare;
      }
    }
    else if (tripType === 'outstation') {
      try {
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
        
        fareSource = 'database';
        fareBreakdown = {
          basePrice: baseFare,
          driverAllowance,
          perKmRate,
          effectiveDistance,
          extraDistanceFare: effectiveDistance < minimumKm ? 0 : (effectiveDistance - minimumKm) * perKmRate
        };
      } catch (error) {
        console.error('Error fetching outstation fares:', error);
        
        // Fallback outstation calculation
        const cabTypeId = safeToLowerCase(cabType.id);
        const baseKm = 300;
        
        let perKmRate = 12;
        if (cabTypeId.includes('sedan')) perKmRate = 12;
        else if (cabTypeId.includes('ertiga') || cabTypeId.includes('suv')) perKmRate = 14;
        else if (cabTypeId.includes('innova') || cabTypeId.includes('crysta')) perKmRate = 16;
        else if (cabTypeId.includes('tempo') || cabTypeId.includes('traveller')) perKmRate = 18;
        else perKmRate = 12;
        
        const baseFare = baseKm * perKmRate;
        const driverAllowance = 250;
        const effectiveDistance = distance * (tripMode === 'one-way' ? 2 : 2);
        
        if (effectiveDistance < baseKm) {
          calculatedFare = baseFare + driverAllowance;
        } else {
          const extraDistance = effectiveDistance - baseKm;
          const extraDistanceFare = extraDistance * perKmRate;
          calculatedFare = baseFare + extraDistanceFare + driverAllowance;
        }
        
        fareSource = 'fallback';
        fareBreakdown = {
          basePrice: baseFare,
          driverAllowance,
          perKmRate,
          effectiveDistance,
          extraDistanceFare: effectiveDistance < baseKm ? 0 : (effectiveDistance - baseKm) * perKmRate,
          isApiFailure: true
        };
      }
      
      if (!validateFare(calculatedFare, cabType, tripType)) {
        const minFare = MIN_FARES.outstation;
        console.warn(`Invalid outstation fare calculated: ${calculatedFare}, using minimum: ${minFare}`);
        calculatedFare = minFare;
      }
    }
    
    // Final validation and storage
    if (calculatedFare > 0) {
      if (validateFare(calculatedFare, cabType, tripType)) {
        // Store in multiple locations for redundancy
        storeFare(cacheKey, calculatedFare, fareSource, {
          cabType,
          tripType,
          distance,
          tripMode,
          hourlyPackage,
          breakdown: fareBreakdown
        });
        
        // Store in alternative format as well
        localStorage.setItem(`${tripType}_fare_${cabType.id}`, JSON.stringify({
          fare: calculatedFare,
          timestamp: Date.now(),
          breakdown: fareBreakdown,
          version: FARE_VERSION
        }));
        
        // Dispatch event for fare calculated
        try {
          window.dispatchEvent(new CustomEvent('fare-calculated', {
            detail: {
              cabId: cabType.id,
              tripType,
              tripMode,
              fare: calculatedFare,
              source: fareSource,
              timestamp: Date.now(),
              breakdown: fareBreakdown
            }
          }));
        } catch (e) {
          console.error('Error dispatching fare event:', e);
        }
      } else {
        // If calculated fare is invalid, use minimum acceptable fare
        const minFare = MIN_FARES[tripType as keyof typeof MIN_FARES] || MIN_FARES.default;
        console.warn(`Invalid fare calculated: ${calculatedFare}, using minimum: ${minFare}`);
        calculatedFare = minFare;
        
        storeFare(cacheKey, calculatedFare, 'minimum', {
          cabType,
          tripType,
          distance,
          tripMode,
          hourlyPackage,
          breakdown: {
            basePrice: calculatedFare,
            isMinimumFare: true
          }
        });
      }
    } else {
      // If calculated fare is zero or negative, use minimum acceptable fare
      const minFare = MIN_FARES[tripType as keyof typeof MIN_FARES] || MIN_FARES.default;
      console.warn(`Invalid fare calculated (${calculatedFare}), using minimum: ${minFare}`);
      calculatedFare = minFare;
      
      storeFare(cacheKey, calculatedFare, 'minimum', {
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
    
    // Last resort fallback
    const minFare = MIN_FARES[tripType as keyof typeof MIN_FARES] || MIN_FARES.default;
    
    // Store the fallback fare
    storeFare(cacheKey, minFare, 'error_fallback', {
      cabType,
      tripType,
      distance,
      tripMode,
      hourlyPackage,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return minFare;
  }
};
