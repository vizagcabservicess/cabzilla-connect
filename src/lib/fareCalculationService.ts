
import { differenceInCalendarDays } from 'date-fns';
import { toast } from 'sonner';
import { CabType, FareCache, FareCalculationParams } from '@/types/cab';
import { TripType, TripMode } from './tripTypes';
import { getLocalPackagePrice } from './packageData';
import { fareAPI } from '@/services/api';

// Cache for outstation pricing calculations with longer expiration
const outstationPricingCache: Record<string, FareCache> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Track ongoing vehicle pricing fetch operations
let isFetchingVehiclePricing = false;

/**
 * Clear fare cache - useful when refreshing data
 */
export const clearFareCache = () => {
  Object.keys(outstationPricingCache).forEach(key => {
    delete outstationPricingCache[key];
  });
};

/**
 * Calculate airport transfer fare based on distance and cab type
 */
export function calculateAirportFare(cabType: string, distance: number): number {
  // Handle undefined or null cabType
  if (!cabType) {
    console.warn('cabType is undefined or null for calculateAirportFare, using default sedan');
    cabType = 'sedan';
  }
  
  const lowerCabType = cabType.toLowerCase();
  
  // Pricing tiers based on distance to/from airport
  if (lowerCabType === 'sedan') {
    if (distance <= 15) return 840;
    if (distance <= 20) return 1000;
    if (distance <= 30) return 1200;
    if (distance <= 35) return 1500;
    return 1500 + (distance - 35) * 14; // Additional KM at ₹14/km
  } 
  else if (lowerCabType === 'ertiga') {
    if (distance <= 15) return 1200;
    if (distance <= 20) return 1500;
    if (distance <= 30) return 1800;
    if (distance <= 35) return 2100;
    return 2100 + (distance - 35) * 18; // Additional KM at ₹18/km
  }
  else if (lowerCabType.includes('innova')) {
    if (distance <= 15) return 1500;
    if (distance <= 20) return 1800;
    if (distance <= 30) return 2100;
    if (distance <= 35) return 2500;
    return 2500 + (distance - 35) * 20; // Additional KM at ₹20/km
  }
  
  // Default fallback
  return distance * 20;
}

/**
 * Calculate fare based on cab type, distance, trip type, and other factors
 */
export async function calculateFare({
  cabType,
  distance,
  tripType,
  tripMode,
  hourlyPackage,
  pickupDate,
  returnDate,
}: FareCalculationParams): Promise<number> {
  // Generate cache key for this pricing request
  const cacheKey = `${cabType.id}_${distance}_${tripType}_${tripMode}_${hourlyPackage || ''}_${pickupDate?.getTime() || ''}_${returnDate?.getTime() || ''}`;
  const now = Date.now();
  
  // Check cache first (5 minutes expiration for better performance)
  if (outstationPricingCache[cacheKey] && outstationPricingCache[cacheKey].expire > now) {
    console.log(`Using cached fare calculation for ${cacheKey}`);
    return outstationPricingCache[cacheKey].price;
  }
  
  // For large distances, show toast notification that calculation is in progress
  if (distance > 300 && tripType === 'outstation') {
    toast.info("Calculating fare for long distance trip...", {
      id: "fare-calculation",
      duration: 3000
    });
  }
  
  try {
    if (tripType === 'local') {
      // For local trips, use the hourly package price without distance calculations
      const price = getLocalPackagePrice(hourlyPackage || '8hrs-80km', cabType.name);
      
      // Cache the result
      outstationPricingCache[cacheKey] = {
        expire: now + CACHE_DURATION,
        price: price
      };
      
      return price;
    }
    
    if (tripType === 'airport') {
      // Airport transfers use a fixed price based on distance tiers
      const price = calculateAirportFare(cabType.name, distance);
      
      // Cache the result
      outstationPricingCache[cacheKey] = {
        expire: now + CACHE_DURATION,
        price: price
      };
      
      return price;
    }
    
    // For outstation trips
    if (tripType === 'outstation') {
      // Use the cab's pricing info directly
      let basePrice = cabType.price;
      let perKmRate = cabType.pricePerKm;
      let driverAllowance = cabType.driverAllowance || 250;
      let nightHaltCharge = cabType.nightHaltCharge || (cabType.name.toLowerCase().includes('sedan') ? 700 : 1000);
      
      // Try to get up-to-date pricing info
      try {
        if (!isFetchingVehiclePricing) {
          isFetchingVehiclePricing = true;
          console.log("Fetching latest vehicle pricing from API for", cabType.id);
          // Remove the timestamp parameter as it's not accepted by the API
          const vehiclePricing = await fareAPI.getVehiclePricing();
          console.log("Vehicle pricing data:", vehiclePricing);
          isFetchingVehiclePricing = false;
          
          if (Array.isArray(vehiclePricing) && vehiclePricing.length > 0) {
            const pricing = vehiclePricing.find(p => 
              p.vehicleType?.toLowerCase() === cabType.id?.toLowerCase() || 
              p.vehicleType?.toLowerCase() === cabType.name?.toLowerCase()
            );
            
            if (pricing) {
              console.log("Found pricing for", cabType.name, pricing);
              basePrice = pricing.basePrice || basePrice;
              perKmRate = pricing.pricePerKm || perKmRate;
              driverAllowance = pricing.driverAllowance || driverAllowance;
              nightHaltCharge = pricing.nightHaltCharge || nightHaltCharge;
            } else {
              console.warn("No pricing found for", cabType.name, "in vehicle pricing data");
            }
          }
        } else {
          console.log("Vehicle pricing fetch already in progress, using current values");
        }
      } catch (error) {
        console.warn('Could not fetch latest pricing data, using default values:', error);
        isFetchingVehiclePricing = false;
      }
      
      console.log("Calculating outstation fare with:", {
        cabType: cabType.name,
        basePrice,
        perKmRate,
        driverAllowance,
        nightHaltCharge,
        distance,
        tripMode
      });
      
      if (tripMode === 'one-way') {
        const days = 1;
        const totalMinKm = days * 300;
        const effectiveDistance = distance;
        const extraKm = Math.max(effectiveDistance - totalMinKm, 0);
        const totalBaseFare = basePrice;
        const totalDistanceFare = extraKm * perKmRate;
        const totalDriverAllowance = driverAllowance;
        
        const finalPrice = Math.ceil((totalBaseFare + totalDistanceFare + totalDriverAllowance) / 10) * 10;
        
        // Cache the result
        outstationPricingCache[cacheKey] = {
          expire: now + CACHE_DURATION,
          price: finalPrice
        };
        
        toast.dismiss("fare-calculation");
        return finalPrice;
      } else {
        // For round-trip, calculate based on number of days
        if (!pickupDate || !returnDate) {
          const defaultPrice = basePrice;
          
          // Cache the result
          outstationPricingCache[cacheKey] = {
            expire: now + CACHE_DURATION,
            price: defaultPrice
          };
          
          return defaultPrice;
        }
        
        const days = Math.max(1, differenceInCalendarDays(returnDate, pickupDate) + 1);
        const totalMinKm = days * 300;
        const effectiveDistance = distance * 2; // Double the distance for round trip
        const extraKm = Math.max(effectiveDistance - totalMinKm, 0);
        const totalBaseFare = days * basePrice;
        const totalDistanceFare = extraKm * perKmRate;
        const totalDriverAllowance = days * driverAllowance;
        const totalNightHalt = (days - 1) * nightHaltCharge;
        
        const finalPrice = Math.ceil((totalBaseFare + totalDistanceFare + totalDriverAllowance + totalNightHalt) / 10) * 10;
        
        // Cache the result
        outstationPricingCache[cacheKey] = {
          expire: now + CACHE_DURATION,
          price: finalPrice
        };
        
        toast.dismiss("fare-calculation");
        return finalPrice;
      }
    }
    
    // Default fallback fare calculation
    const defaultPrice = Math.ceil(distance * cabType.pricePerKm);
    
    // Cache the result
    outstationPricingCache[cacheKey] = {
      expire: now + CACHE_DURATION,
      price: defaultPrice
    };
    
    return defaultPrice;
  } catch (error) {
    console.error("Error calculating fare:", error);
    toast.dismiss("fare-calculation");
    // If calculation fails, use a simple fallback calculation
    return Math.ceil(distance * (cabType.pricePerKm || 15));
  }
}
