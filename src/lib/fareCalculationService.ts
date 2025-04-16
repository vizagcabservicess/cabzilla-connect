
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

// Helper function to normalize package ID
export const normalizePackageId = (packageId?: string): string => {
  if (!packageId) return '8hrs-80km'; // Default
  
  const normalized = packageId.toLowerCase().trim();
  
  // First check for exact matches
  if (normalized === '10hrs-100km' || normalized === '10hrs_100km' || normalized === '10 hours') {
    return '10hrs-100km';
  }
  
  if (normalized === '8hrs-80km' || normalized === '8hrs_80km' || normalized === '8 hours') {
    return '8hrs-80km';
  }
  
  if (normalized === '4hrs-40km' || normalized === '4hrs_40km' || normalized === '4 hours') {
    return '4hrs-40km';
  }
  
  // Then check for substring matches
  if (normalized.includes('10') && (normalized.includes('hr') || normalized.includes('hour') || normalized.includes('100km'))) {
    return '10hrs-100km';
  }
  
  if (normalized.includes('8') && (normalized.includes('hr') || normalized.includes('hour') || normalized.includes('80km'))) {
    return '8hrs-80km';
  }
  
  if (normalized.includes('4') && (normalized.includes('hr') || normalized.includes('hour') || normalized.includes('40km'))) {
    return '4hrs-40km';
  }
  
  console.log(`Warning: Unable to match package ID "${packageId}" to a known package, defaulting to 8hrs-80km`);
  return '8hrs-80km'; // Default fallback
};

// Helper function to normalize vehicle ID
export const normalizeVehicleId = (vehicleId?: string): string => {
  if (!vehicleId) return ''; 
  
  // Convert to lowercase and replace spaces with underscores
  const normalized = vehicleId.toLowerCase().trim().replace(/\s+/g, '_');
  
  // Special case to ensure MPV is always mapped correctly - check this first
  if (normalized === 'mpv' || 
      normalized === 'innova hycross' || 
      normalized === 'innovahycross' ||
      normalized === 'innova_hycross' ||
      normalized.includes('hycross') ||
      normalized.includes('hi_cross') ||
      normalized.includes('hi-cross')) {
    console.log(`Normalized vehicle '${vehicleId}' to 'innova_hycross'`);
    return 'innova_hycross';
  }
  
  // Handle other special cases
  if (normalized.includes('crysta') || 
      (normalized.includes('innova') && !normalized.includes('hycross'))) {
    console.log(`Normalized vehicle '${vehicleId}' to 'innova_crysta'`);
    return 'innova_crysta';
  }
  
  if (normalized.includes('tempo')) {
    console.log(`Normalized vehicle '${vehicleId}' to 'tempo_traveller'`);
    return 'tempo_traveller';
  }
  
  if (normalized.includes('dzire') || 
      normalized === 'cng' || 
      normalized.includes('cng')) {
    console.log(`Normalized vehicle '${vehicleId}' to 'dzire_cng'`);
    return 'dzire_cng';
  }
  
  // For any other cases, just return the normalized ID
  console.log(`Normalized vehicle '${vehicleId}' to '${normalized}'`);
  return normalized;
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
  
  return `${cabId}_${distance}_${tripType}_${tripMode}_${hourlyPackage || ''}_${pickupDate?.getTime() || 0}_${returnDate?.getTime() || 0}_${shouldForceRefresh}_${cacheClearTime}_${priceMatrixTime}_${globalRefreshToken}`;
};

// Calculate airport transfer fares
export const calculateAirportFare = async (cabType: CabType, distance: number): Promise<number> => {
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
    
    if (!fare || fare <= 0) {
      throw new Error(`Invalid airport fare retrieved for ${cabType.id}: ${fare}`);
    }
    
    return fare;
  } catch (error) {
    console.error(`Error calculating airport fare for ${cabType.name}:`, error);
    throw new Error(`Could not calculate airport fare for ${cabType.name}`);
  }
};

// Calculate fare for a trip
export const calculateFare = async (params: FareCalculationParams): Promise<number> => {
  try {
    const { cabType, distance, tripType, tripMode = 'one-way', hourlyPackage, pickupDate, returnDate, forceRefresh } = params;
    
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
      forceRefresh
    });
    
    // Calculate fare based on trip type
    if (tripType === 'airport') {
      // For airport transfers
      const airportFare = await calculateAirportFare(cabType, distance);
      console.log(`Calculated airport fare: ₹${airportFare}`);
      
      // Dispatch fare calculation event to update UI components
      window.dispatchEvent(new CustomEvent('fare-calculated', {
        detail: {
          cabId: cabType.id,
          tripType,
          calculated: true,
          fare: airportFare,
          timestamp: Date.now()
        }
      }));
      
      return airportFare;
    }
    else if (tripType === 'local') {
      try {
        // For local hourly packages - get from API only
        const rawPackageId = hourlyPackage || '8hrs-80km';
        
        // Normalize the package ID to ensure consistency
        const normalizedPackageId = normalizePackageId(rawPackageId);
        
        console.log(`Using normalized package ID for local fare calculation: ${normalizedPackageId} (from original: ${rawPackageId})`);
        
        // Normalize vehicle ID
        const normalizedVehicleId = normalizeVehicleId(cabType.id);
        console.log(`Using normalized vehicle ID for local fare calculation: ${normalizedVehicleId} (from original: ${cabType.id})`);
        
        // Direct API call to get package price
        const packagePrice = await getLocalPackagePrice(normalizedPackageId, normalizedVehicleId, forceRefresh);
        
        if (!packagePrice || packagePrice <= 0) {
          throw new Error(`Invalid package price retrieved for ${normalizedVehicleId}, package ${normalizedPackageId}: ${packagePrice}`);
        }
        
        console.log(`Retrieved local package price from API: ₹${packagePrice}`);
        
        // Dispatch fare calculation event to update UI components
        window.dispatchEvent(new CustomEvent('fare-calculated', {
          detail: {
            cabId: normalizedVehicleId,
            originalCabId: cabType.id,
            tripType,
            tripMode,
            calculated: true,
            fare: packagePrice,
            packageId: normalizedPackageId, // Include the normalized package ID
            originalPackageId: rawPackageId,
            timestamp: Date.now()
          }
        }));
        
        // Also dispatch a more specific event for this package
        window.dispatchEvent(new CustomEvent('local-package-fare-calculated', {
          detail: {
            cabId: normalizedVehicleId,
            originalCabId: cabType.id,
            packageId: normalizedPackageId,
            originalPackageId: rawPackageId,
            fare: packagePrice,
            timestamp: Date.now()
          }
        }));
        
        // Store the selected fare in localStorage for consistency
        try {
          const selectedFareKey = `selected_fare_${normalizedVehicleId}_${normalizedPackageId}`;
          localStorage.setItem(selectedFareKey, packagePrice.toString());
          console.log(`Stored selected fare in localStorage: ${selectedFareKey} = ${packagePrice}`);
          
          // Also store the package ID that was used
          localStorage.setItem(`selected_package_${normalizedVehicleId}`, normalizedPackageId);
        } catch (error) {
          console.error('Error storing fare in localStorage:', error);
        }
        
        return packagePrice;
      } catch (error) {
        console.error(`Error calculating local fare for ${cabType.name}:`, error);
        throw new Error(`Could not calculate local fare for ${cabType.name}`);
      }
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
        let calculatedFare = 0;
        
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
          
          console.log(`One-way outstation fare: Base=${baseFare}, Driver=${driverAllowance}, Total=${calculatedFare}, Rate=${perKmRate}/km`);
        }
        // For round trip
        else {
          perKmRate = outstationFares.roundTripPricePerKm || outstationFares.pricePerKm * 0.85;
          baseFare = outstationFares.roundTripBasePrice || outstationFares.basePrice * 0.9;
          
          // For round trips, the effective distance is doubled
          const effectiveDistance = distance * 2;
          
          if (effectiveDistance < minimumKm) {
            calculatedFare = baseFare + driverAllowance;
          } else {
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
        
        if (!calculatedFare || calculatedFare <= 0) {
          throw new Error(`Invalid outstation fare calculated for ${cabType.id}: ${calculatedFare}`);
        }
        
        // Dispatch fare calculation event to update UI components
        window.dispatchEvent(new CustomEvent('fare-calculated', {
          detail: {
            cabId: cabType.id,
            tripType,
            tripMode,
            calculated: true,
            fare: calculatedFare,
            timestamp: Date.now()
          }
        }));
        
        return calculatedFare;
      } catch (error) {
        console.error(`Error calculating outstation fare for ${cabType.name}:`, error);
        throw new Error(`Could not calculate outstation fare for ${cabType.name}`);
      }
    }
    else if (tripType === 'tour') {
      // For tour packages - check if we have tour fares defined
      try {
        let tourId = 'araku'; // Default tour ID
        
        // Get from tour fares
        if (cabType.id && tourFares[tourId] && tourFares[tourId][cabType.id as keyof typeof tourFares[typeof tourId]]) {
          const tourFare = tourFares[tourId][cabType.id as keyof typeof tourFares[typeof tourId]] as number;
          
          if (!tourFare || tourFare <= 0) {
            throw new Error(`Invalid tour fare for ${cabType.id}, tour ${tourId}: ${tourFare}`);
          }
          
          console.log(`Retrieved tour fare: ₹${tourFare}`);
          
          // Dispatch fare calculation event to update UI components
          window.dispatchEvent(new CustomEvent('fare-calculated', {
            detail: {
              cabId: cabType.id,
              tripType,
              calculated: true,
              fare: tourFare,
              timestamp: Date.now()
            }
          }));
          
          return tourFare;
        } else {
          throw new Error(`Tour fare not found for ${cabType.id}, tour ${tourId}`);
        }
      } catch (error) {
        console.error(`Error calculating tour fare for ${cabType.name}:`, error);
        throw new Error(`Could not calculate tour fare for ${cabType.name}`);
      }
    }
    
    throw new Error(`Unsupported trip type: ${tripType}`);
  } catch (error) {
    console.error('Error calculating fare:', error);
    throw error; // Propagate error to caller
  }
};

export const calculateTotalFare = (
  baseFare: number,
  driverAllowance: number,
  nightHaltCharges: number,
  otherCharges: number,
  tripType: string,
  surcharge?: number
): number => {
  // CRITICAL FIX: For airport transfers, ALWAYS set driver allowance to 0
  // This ensures driver allowance is not factored into the total fare for airport transfers
  if (tripType === 'airport') {
    driverAllowance = 0;
    console.log("Airport transfer detected: Setting driver allowance to 0");
  }
  
  const total = baseFare + driverAllowance + nightHaltCharges + otherCharges;
  
  if (surcharge && surcharge > 0) {
    return total + surcharge;
  }
  
  return total;
};
