
import { differenceInHours, differenceInDays, differenceInMinutes, addDays, subDays, isAfter } from 'date-fns';
import { CabType, FareCalculationParams } from '@/types/cab';
import { TripType, TripMode } from './tripTypes';
import { getLocalPackagePrice } from './packageData';
import { tourFares } from './tourData';

const fareCache = new Map<string, { expire: number, price: number }>();
let lastCacheClearTime = Date.now();
let lastEventDispatchTime = Date.now();
let eventDispatchCount = 0;
const MAX_EVENTS_PER_MINUTE = 10; // Increased from 5 to 10

export const clearFareCache = (forceDispatch = false) => {
  // Always allow cache clear when force dispatch is requested
  const now = Date.now();
  if (!forceDispatch && now - lastCacheClearTime < 5000) { // Reduced from 30s to 5s
    console.log('Fare cache clear throttled - last clear was too recent');
    return;
  }
  
  // Reset the cache
  fareCache.clear();
  lastCacheClearTime = now;
  console.log('Fare calculation cache cleared at', new Date().toISOString());
  
  // Update localStorage
  localStorage.setItem('fareCacheLastCleared', lastCacheClearTime.toString());
  localStorage.setItem('forceCacheRefresh', 'true');
  localStorage.setItem('fareDataLastRefreshed', now.toString());
  
  // Dispatch event with minimal throttling
  eventDispatchCount++;
  
  // Reset counter every 30 seconds (rather than every minute)
  if (now - lastEventDispatchTime > 30000) {
    eventDispatchCount = 1;
    lastEventDispatchTime = now;
  }
  
  // Always dispatch if forceDispatch is true or if we haven't exceeded the limit
  if (forceDispatch || eventDispatchCount <= MAX_EVENTS_PER_MINUTE) {
    try {
      // Dispatch with force refresh flag
      window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
        detail: { timestamp: lastCacheClearTime, forceRefresh: true }
      }));
      console.log('Dispatched fare-cache-cleared event with forceRefresh flag');
      
      // Also dispatch specific fare type events
      window.dispatchEvent(new CustomEvent('airport-fares-updated', {
        detail: { timestamp: lastCacheClearTime, forceRefresh: true }
      }));
      window.dispatchEvent(new CustomEvent('local-fares-updated', {
        detail: { timestamp: lastCacheClearTime, forceRefresh: true }
      }));
      window.dispatchEvent(new CustomEvent('trip-fares-updated', {
        detail: { timestamp: lastCacheClearTime, forceRefresh: true }
      }));
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

export const fareService = {
  clearCache: clearFareCache,
  forceRefresh: () => clearFareCache(true),
  getLastCacheClearTime: () => lastCacheClearTime
};

const generateCacheKey = (params: FareCalculationParams): string => {
  if (!params || !params.cabType) {
    console.warn('Invalid params for generating cache key:', params);
    return 'invalid-params';
  }
  
  const { cabType, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate } = params;
  const cabId = cabType && cabType.id ? cabType.id : 'unknown-cab';
  
  const forceRefresh = localStorage.getItem('forceCacheRefresh') === 'true' ? Date.now() : '';
  const cacheClearTime = localStorage.getItem('fareCacheLastCleared') || lastCacheClearTime;
  const priceMatrixTime = localStorage.getItem('localPackagePriceMatrixUpdated') || '0';
  const globalRefreshToken = localStorage.getItem('globalFareRefreshToken') || '0';
  
  return `${cabId}_${distance}_${tripType}_${tripMode}_${hourlyPackage || ''}_${pickupDate?.getTime() || 0}_${returnDate?.getTime() || 0}_${forceRefresh}_${cacheClearTime}_${priceMatrixTime}_${globalRefreshToken}`;
};

const safeToLowerCase = (value: any): string => {
  if (typeof value === 'string') {
    return value.toLowerCase();
  }
  return String(value).toLowerCase();
};

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
  }
  
  return pricing;
};

export const calculateAirportFare = (cabName: string, distance: number): number => {
  // Always get a fresh token for cache busting
  const forceRefresh = localStorage.getItem('forceCacheRefresh') === 'true';
  const refreshToken = localStorage.getItem('fareDataLastRefreshed') || lastCacheClearTime.toString();
  
  const cacheKey = `airport_${cabName}_${distance}_${refreshToken}`;
  
  const cachedFare = fareCache.get(cacheKey);
  if (!forceRefresh && cachedFare && cachedFare.expire > Date.now()) {
    console.log(`Using cached airport fare for ${cabName}: ₹${cachedFare.price}`);
    return cachedFare.price;
  }
  
  const defaultFare = {
    basePrice: 1000,
    pricePerKm: 14,
    airportFee: 150
  };
  
  let basePrice = defaultFare.basePrice;
  let pricePerKm = defaultFare.pricePerKm;
  
  const cabNameLower = safeToLowerCase(cabName);
  
  if (cabNameLower.includes('sedan') || cabNameLower.includes('dzire') || 
      cabNameLower.includes('etios') || cabNameLower.includes('amaze') || 
      cabNameLower.includes('swift')) {
    basePrice = 1200;
    pricePerKm = 14;
  } else if (cabNameLower.includes('ertiga') || cabNameLower.includes('suv')) {
    basePrice = 1500;
    pricePerKm = 16;
  } else if (cabNameLower.includes('innova')) {
    basePrice = 1800;
    pricePerKm = 18;
  } else if (cabNameLower.includes('tempo') || cabNameLower.includes('traveller')) {
    basePrice = 2500;
    pricePerKm = 22;
  } else if (cabNameLower.includes('luxury')) {
    basePrice = 1800; // Set similar to Innova
    pricePerKm = 18;
  }
  
  let fare = Math.round(basePrice * 0.7);
  fare += Math.round(distance * pricePerKm);
  fare += defaultFare.airportFee;
  fare = Math.round(fare * 1.05);
  
  // Shorter expiration - 5 minutes instead of 15
  fareCache.set(cacheKey, {
    expire: Date.now() + 5 * 60 * 1000,
    price: fare
  });
  
  console.log(`Calculated airport fare for ${cabName}: ₹${fare}`);
  return fare;
};

export const calculateFare = async (params: FareCalculationParams): Promise<number> => {
  if (!params || !params.cabType) {
    console.warn('Invalid parameters for fare calculation, missing cabType:', params);
    return 0;
  }
  
  const { cabType, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate } = params;
  
  if (!cabType || !distance || distance <= 0) {
    console.warn('Invalid parameters for fare calculation:', params);
    return 0;
  }

  const cacheKey = generateCacheKey(params);
  
  // Check for force refresh flags with higher priority
  const forceRefresh = localStorage.getItem('forceCacheRefresh') === 'true' || 
                       localStorage.getItem('forceTripFaresRefresh') === 'true';
  
  console.log(`Calculating fare for ${cabType.name}, forceRefresh: ${forceRefresh}`);
  
  // Only use cache for non-local trip types and when not forcing refresh
  const cachedFare = fareCache.get(cacheKey);
  if (!forceRefresh && tripType !== 'local' && cachedFare && cachedFare.expire > Date.now()) {
    console.log(`Using cached fare calculation for ${cabType.name}: ₹${cachedFare.price}`);
    return cachedFare.price;
  }
  
  if (forceRefresh) {
    console.log('Force refresh flag active, using fresh calculation');
  }
  
  console.log(`Calculating fresh fare for ${tripType} trip with ${cabType.name}, distance: ${distance}km`);
  
  let fare = 0;
  
  try {
    console.log(`Cab pricing details for ${cabType.name}:`, {
      price: cabType.price,
      pricePerKm: cabType.pricePerKm,
      nightHaltCharge: cabType.nightHaltCharge,
      driverAllowance: cabType.driverAllowance
    });
    
    const isValidPricing = cabType.price > 0 || cabType.pricePerKm > 0;
    if (!isValidPricing) {
      console.warn('Cab has invalid pricing, using defaults:', cabType);
      const defaultPricing = getDefaultCabPricing(cabType.name);
      cabType.price = cabType.price || defaultPricing.basePrice;
      cabType.pricePerKm = cabType.pricePerKm || defaultPricing.pricePerKm;
      cabType.nightHaltCharge = cabType.nightHaltCharge || defaultPricing.nightHaltCharge;
      cabType.driverAllowance = cabType.driverAllowance || defaultPricing.driverAllowance;
      
      console.log('Using default pricing:', {
        price: cabType.price,
        pricePerKm: cabType.pricePerKm,
        nightHaltCharge: cabType.nightHaltCharge,
        driverAllowance: cabType.driverAllowance
      });
    }
    
    if (tripType === 'local') {
      if (hourlyPackage) {
        const cabId = cabType.id ? safeToLowerCase(cabType.id) : '';
        fare = getLocalPackagePrice(hourlyPackage, cabId);
        
        console.log(`Local trip with ${hourlyPackage} for ${cabType.name}, base fare: ${fare}`);
        
        const packageKm = hourlyPackage === '8hrs-80km' ? 80 : 
                          hourlyPackage === '10hrs-100km' ? 100 : 
                          hourlyPackage === '4hrs-40km' ? 40 : 80;
        
        if (distance > packageKm) {
          const extraKm = distance - packageKm;
          fare += extraKm * (cabType.pricePerKm || 14);
          console.log(`Added ${extraKm}km extra at ${cabType.pricePerKm || 14}/km = ${extraKm * (cabType.pricePerKm || 14)}`);
        }
        
        fare = Math.round(fare * 1.05);
        console.log(`Final fare with GST: ${fare}`);
      } else {
        console.warn('Hourly package not specified for local trip');
        fare = cabType.price;
      }
    } else if (tripType === 'tour') {
      const tourId = hourlyPackage;
      
      if (tourId && tourFares[tourId]) {
        const cabId = cabType.id ? safeToLowerCase(cabType.id) : '';
        if (tourFares[tourId][cabId]) {
          fare = tourFares[tourId][cabId];
          console.log(`Tour fare from database for ${tourId}, ${cabType.name}: ${fare}`);
        } else {
          fare = Math.round(distance * cabType.pricePerKm * 1.2);
          console.log(`Calculated fallback tour fare for ${tourId}, ${cabType.name}: ${fare}`);
        }
      } else {
        fare = Math.round(distance * cabType.pricePerKm * 1.2);
        console.log(`Calculated fallback tour fare (no tour ID): ${fare}`);
      }
      
      fare = Math.round(fare * 1.05);
    } else if (tripType === 'outstation') {
      if (tripMode === 'one-way') {
        fare = cabType.price;
        console.log(`One-way outstation trip base fare: ${fare}`);
        
        const includedKm = 300;
        const extraKm = Math.max(0, distance - includedKm);
        
        if (extraKm > 0) {
          const extraCost = extraKm * cabType.pricePerKm;
          fare += extraCost;
          console.log(`Added ${extraKm}km extra at ${cabType.pricePerKm}/km = ${extraCost}`);
        }
        
        fare += cabType.driverAllowance;
        console.log(`Added driver allowance: ${cabType.driverAllowance}`);
        
        if (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) {
          const nightCharge = Math.round(fare * 0.1);
          fare += nightCharge;
          console.log(`Added night driving charge: ${nightCharge}`);
        }
      } else {
        const days = returnDate && pickupDate ? 
          Math.max(1, differenceInDays(returnDate, pickupDate) + 1) : 1;
        
        fare = cabType.price;
        console.log(`Round-trip base fare: ${fare}`);
        
        if (days > 1) {
          const extraDaysCost = Math.round((days - 1) * cabType.price * 0.8);
          fare += extraDaysCost;
          console.log(`Added ${days-1} extra days cost: ${extraDaysCost}`);
        }
        
        const distanceCost = Math.round(distance * cabType.pricePerKm);
        fare += distanceCost;
        console.log(`Added distance cost for ${distance}km: ${distanceCost}`);
        
        const driverCost = days * cabType.driverAllowance;
        fare += driverCost;
        console.log(`Added driver allowance for ${days} days: ${driverCost}`);
        
        if (days > 1) {
          const nightHaltCost = (days - 1) * cabType.nightHaltCharge;
          fare += nightHaltCost;
          console.log(`Added night halt charge for ${days-1} nights: ${nightHaltCost}`);
        }
      }
      
      fare = Math.round(fare * 1.05);
    } else if (tripType === 'airport') {
      return calculateAirportFare(cabType.name, distance);
    }
    
    // Shorter expiration time for all cached fares - 5 minutes instead of 15
    fareCache.set(cacheKey, {
      expire: Date.now() + 5 * 60 * 1000,
      price: fare
    });
    
    // More aggressive event dispatching
    const now = Date.now();
    eventDispatchCount++;
    
    // Reset counter every 30 seconds
    if (now - lastEventDispatchTime > 30000) {
      eventDispatchCount = 1;
      lastEventDispatchTime = now;
    }
    
    // Higher limit and special handling for airport fares
    const maxEvents = tripType === 'airport' ? MAX_EVENTS_PER_MINUTE * 2 : MAX_EVENTS_PER_MINUTE;
    
    // Allow more events for certain trip types
    if (eventDispatchCount <= maxEvents) {
      const eventName = tripType === 'local' ? 'local-fares-updated' :
                        tripType === 'outstation' ? 'trip-fares-updated' :
                        tripType === 'airport' ? 'airport-fares-updated' : 'fare-cache-cleared';
                        
      const updateId = `${tripType}_${cabType.id}_${Date.now()}`;
      
      try {
        window.dispatchEvent(new CustomEvent(eventName, {
          detail: {
            cabId: cabType.id,
            tripType,
            fare,
            updateId,
            timestamp: Date.now(),
            forceRefresh: true
          }
        }));
        
        console.log(`Dispatched ${eventName} event for ${cabType.id} with fare ${fare}`);
        
        // For airport fares, also dispatch a generic fare update event
        if (tripType === 'airport') {
          window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
            detail: {
              timestamp: Date.now(),
              forceRefresh: true,
              tripType: 'airport',
              cabId: cabType.id
            }
          }));
        }
      } catch (e) {
        console.error(`Error dispatching ${eventName} event:`, e);
      }
    } else {
      console.log(`Skipped event dispatch for ${tripType} fare update (throttled: ${eventDispatchCount}/${maxEvents})`);
    }
    
    return fare;
  } catch (error) {
    console.error('Error in fare calculation:', error);
    
    const fallbackFare = 4000 + (distance * 10);
    console.log(`Using fallback fare calculation: ₹${fallbackFare}`);
    
    return fallbackFare;
  }
};
