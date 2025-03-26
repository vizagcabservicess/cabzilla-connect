
import { differenceInHours, differenceInDays, differenceInMinutes, addDays, subDays, isAfter } from 'date-fns';
import { CabType, FareCalculationParams } from '@/types/cab';
import { TripType, TripMode } from './tripTypes';
import { getLocalPackagePrice } from './packageData';
import { tourFares } from './tourData';

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
  
  const { cabType, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate } = params;
  const cabId = cabType && cabType.id ? cabType.id : 'unknown-cab';
  
  const forceRefresh = localStorage.getItem('forceCacheRefresh') === 'true' ? Date.now() : '';
  const cacheClearTime = localStorage.getItem('fareCacheLastCleared') || lastCacheClearTime;
  const priceMatrixTime = localStorage.getItem('localPackagePriceMatrixUpdated') || '0';
  const globalRefreshToken = localStorage.getItem('globalFareRefreshToken') || '0';
  
  return `${cabId}_${distance}_${tripType}_${tripMode}_${hourlyPackage || ''}_${pickupDate?.getTime() || 0}_${returnDate?.getTime() || 0}_${forceRefresh}_${cacheClearTime}_${priceMatrixTime}_${globalRefreshToken}`;
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
export const calculateAirportFare = (cabName: string, distance: number): number => {
  const cacheKey = `airport_${cabName}_${distance}_${lastCacheClearTime}`;
  const forceRefresh = localStorage.getItem('forceCacheRefresh') === 'true';
  
  const cachedFare = fareCache.get(cacheKey);
  if (!forceRefresh && cachedFare && cachedFare.expire > Date.now()) {
    console.log(`Using cached airport fare for ${cabName}: ₹${cachedFare.price}`);
    return cachedFare.price;
  }
  
  // Default airport fare values
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
  
  let basePrice = defaultFare.basePrice;
  let pricePerKm = defaultFare.pricePerKm;
  let airportFee = defaultFare.airportFee;
  let tierPrice = 0;
  
  const cabNameLower = safeToLowerCase(cabName);
  
  // Determine vehicle type and set appropriate base prices
  if (cabNameLower.includes('sedan') || cabNameLower.includes('dzire') || 
      cabNameLower.includes('etios') || cabNameLower.includes('amaze') || 
      cabNameLower.includes('swift')) {
    basePrice = 1000;
    pricePerKm = 14;
    tierPrice = distance <= 10 ? 800 : 
                distance <= 20 ? 1200 : 
                distance <= 30 ? 1800 : 2500;
  } else if (cabNameLower.includes('luxury')) {
    basePrice = 1200;
    pricePerKm = 14;
    tierPrice = distance <= 10 ? 1000 : 
                distance <= 20 ? 1400 : 
                distance <= 30 ? 2000 : 2800;
  } else if (cabNameLower.includes('ertiga') || cabNameLower.includes('suv')) {
    basePrice = 1500;
    pricePerKm = 16;
    tierPrice = distance <= 10 ? 1200 : 
                distance <= 20 ? 1600 : 
                distance <= 30 ? 2200 : 3000;
  } else if (cabNameLower.includes('innova')) {
    basePrice = 1800;
    pricePerKm = 18;
    tierPrice = distance <= 10 ? 1500 : 
                distance <= 20 ? 2000 : 
                distance <= 30 ? 2500 : 3500;
  } else if (cabNameLower.includes('tempo') || cabNameLower.includes('traveller')) {
    basePrice = 2500;
    pricePerKm = 22;
    tierPrice = distance <= 10 ? 2000 : 
                distance <= 20 ? 2800 : 
                distance <= 30 ? 3500 : 4500;
  }
  
  // Calculate fare components
  // Base fare is 70-80% of the base price
  let fare = Math.round(basePrice * 0.75);  
  
  // Use tier price as a baseline
  if (tierPrice > 0) {
    fare = Math.round(tierPrice * 0.7);  // 70% of tier price as base
  } else {
    // Fallback to distance-based calculation
    fare += Math.round(distance * pricePerKm);
  }
  
  // Add airport fee
  const fee = distance <= 10 ? 30 : distance <= 20 ? 50 : airportFee;
  fare += fee;
  
  // Add driver allowance
  const allowance = distance <= 10 ? 30 : distance <= 20 ? 50 : 100;
  fare += allowance;
  
  // Add GST (5%)
  fare = Math.round(fare * 1.05);
  
  // Ensure minimum fare
  if (distance <= 10) {
    fare = Math.max(fare, 300);  // Minimum fare for short distances
  } else if (distance <= 20) {
    fare = Math.max(fare, 600);  // Minimum fare for medium distances
  } else {
    fare = Math.max(fare, 1000); // Minimum fare for long distances
  }
  
  // Cache the result
  fareCache.set(cacheKey, {
    expire: Date.now() + 15 * 60 * 1000,
    price: fare
  });
  
  console.log(`Calculated airport fare for ${cabName}, ${distance}km: ₹${fare}`);
  return fare;
};

// Main fare calculation function
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
  const forceRefresh = localStorage.getItem('forceCacheRefresh') === 'true';
  
  console.log(`Calculating fare for ${cabType.name}, forceRefresh: ${forceRefresh}`);
  
  // Try to use cached fare if available and valid
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
    // Log cab pricing details
    console.log(`Cab pricing details for ${cabType.name}:`, {
      price: cabType.price,
      pricePerKm: cabType.pricePerKm,
      nightHaltCharge: cabType.nightHaltCharge,
      driverAllowance: cabType.driverAllowance
    });
    
    // Validate pricing and use defaults if invalid
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
    
    // Calculate fare based on trip type
    if (tripType === 'local') {
      if (hourlyPackage) {
        // Get price from local package price matrix
        const cabId = cabType.id ? safeToLowerCase(cabType.id) : '';
        fare = getLocalPackagePrice(hourlyPackage, cabId);
        
        console.log(`Local trip with ${hourlyPackage} for ${cabType.name}, base fare: ${fare}`);
        
        // Extra km charges if distance exceeds package limit
        const packageKm = hourlyPackage === '8hrs-80km' ? 80 : 
                          hourlyPackage === '10hrs-100km' ? 100 : 
                          hourlyPackage === '4hrs-40km' ? 40 : 80;
        
        if (distance > packageKm) {
          const extraKm = distance - packageKm;
          const extraKmRate = cabType.pricePerKm || 14;
          fare += extraKm * extraKmRate;
          console.log(`Added ${extraKm}km extra at ${extraKmRate}/km = ${extraKm * extraKmRate}`);
        }
        
        // Add GST
        fare = Math.round(fare * 1.05);
        console.log(`Final local fare with GST: ${fare}`);
      } else {
        console.warn('Hourly package not specified for local trip');
        fare = cabType.price || 1500;
      }
    } else if (tripType === 'tour') {
      // For tour packages, use tour fares or calculate based on distance
      const tourId = hourlyPackage;
      
      if (tourId && tourFares[tourId]) {
        const cabId = cabType.id ? safeToLowerCase(cabType.id) : '';
        if (tourFares[tourId][cabId]) {
          fare = tourFares[tourId][cabId];
          console.log(`Tour fare from database for ${tourId}, ${cabType.name}: ${fare}`);
        } else {
          // Fallback calculation
          fare = Math.round(distance * cabType.pricePerKm * 1.2);
          console.log(`Calculated fallback tour fare for ${tourId}, ${cabType.name}: ${fare}`);
        }
      } else {
        // No tour ID, use distance-based calculation
        fare = Math.round(distance * cabType.pricePerKm * 1.2);
        console.log(`Calculated fallback tour fare (no tour ID): ${fare}`);
      }
      
      // Add GST
      fare = Math.round(fare * 1.05);
      console.log(`Final tour fare with GST: ${fare}`);
    } else if (tripType === 'outstation') {
      if (tripMode === 'one-way') {
        // One-way outstation trip
        fare = cabType.price || 4200;
        console.log(`One-way outstation trip base fare: ${fare}`);
        
        // Extra km charges if distance exceeds included kilometers
        const includedKm = 300;
        const totalDistance = distance * 1.2; // Account for local travel at destination
        const extraKm = Math.max(0, totalDistance - includedKm);
        
        if (extraKm > 0) {
          const extraCost = extraKm * cabType.pricePerKm;
          fare += extraCost;
          console.log(`Added ${extraKm}km extra at ${cabType.pricePerKm}/km = ${extraCost}`);
        }
        
        // Add driver allowance
        fare += cabType.driverAllowance || 250;
        console.log(`Added driver allowance: ${cabType.driverAllowance || 250}`);
        
        // Add night charges if applicable
        if (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) {
          const nightCharge = Math.round(fare * 0.1);
          fare += nightCharge;
          console.log(`Added night driving charge: ${nightCharge}`);
        }
      } else {
        // Round-trip calculation
        const days = returnDate && pickupDate ? 
          Math.max(1, differenceInDays(returnDate, pickupDate) + 1) : 1;
        
        // Base fare
        fare = cabType.price || 4200;
        console.log(`Round-trip base fare (${days} days): ${fare}`);
        
        // Extra days charges
        if (days > 1) {
          const extraDaysCost = Math.round((days - 1) * cabType.price * 0.8);
          fare += extraDaysCost;
          console.log(`Added ${days-1} extra days cost: ${extraDaysCost}`);
        }
        
        // Distance cost for kms beyond included kms
        const includedKm = 300 * days;
        const totalDistance = distance * 1.2; // Account for local travel
        const extraKm = Math.max(0, totalDistance - includedKm);
        
        if (extraKm > 0) {
          const extraKmCost = Math.round(extraKm * cabType.pricePerKm);
          fare += extraKmCost;
          console.log(`Added ${extraKm}km extra at ${cabType.pricePerKm}/km = ${extraKmCost}`);
        }
        
        // Driver allowance for all days
        const driverCost = days * (cabType.driverAllowance || 250);
        fare += driverCost;
        console.log(`Added driver allowance for ${days} days: ${driverCost}`);
        
        // Night halt charges
        if (days > 1) {
          const nightHaltCost = (days - 1) * (cabType.nightHaltCharge || 700);
          fare += nightHaltCost;
          console.log(`Added night halt charge for ${days-1} nights: ${nightHaltCost}`);
        }
      }
      
      // Add GST
      fare = Math.round(fare * 1.05);
      console.log(`Final outstation fare with GST: ${fare}`);
    } else if (tripType === 'airport') {
      // Use dedicated airport fare calculation
      return calculateAirportFare(cabType.name, distance);
    }
    
    // Store in cache if not local type (local fares are more dynamic)
    if (tripType !== 'local') {
      fareCache.set(cacheKey, {
        expire: Date.now() + 15 * 60 * 1000,
        price: fare
      });
    }
    
    // Throttle event dispatching to prevent cascading recalculations
    const now = Date.now();
    eventDispatchCount++;
    
    // Reset counter every minute
    if (now - lastEventDispatchTime > 60000) {
      eventDispatchCount = 1;
      lastEventDispatchTime = now;
    }
    
    // Only dispatch if we haven't exceeded the limit
    if (eventDispatchCount <= MAX_EVENTS_PER_MINUTE) {
      // Choose the appropriate event name
      const eventName = tripType === 'local' ? 'local-fares-updated' :
                        tripType === 'outstation' ? 'trip-fares-updated' :
                        tripType === 'airport' ? 'airport-fares-updated' : 'fare-cache-cleared';
                        
      const updateId = `${tripType}_${cabType.id}_${Date.now()}`;
      
      try {
        // Dispatch an event with the calculated fare
        window.dispatchEvent(new CustomEvent(eventName, {
          detail: {
            cabId: cabType.id,
            tripType,
            fare,
            updateId,
            timestamp: Date.now()
          }
        }));
        
        console.log(`Dispatched ${eventName} event for ${cabType.id} with fare ${fare}`);
      } catch (e) {
        console.error(`Error dispatching ${eventName} event:`, e);
      }
    } else {
      console.log(`Skipped event dispatch for ${tripType} fare update (throttled: ${eventDispatchCount}/${MAX_EVENTS_PER_MINUTE})`);
    }
    
    return fare;
  } catch (error) {
    console.error('Error in fare calculation:', error);
    
    // Use fallback calculation if an error occurs
    const fallbackFare = 4000 + (distance * 10);
    console.log(`Using fallback fare calculation: ₹${fallbackFare}`);
    
    return fallbackFare;
  }
};
