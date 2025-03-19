
import { differenceInHours, differenceInDays, differenceInMinutes, addDays, subDays, isAfter } from 'date-fns';
import { CabType, FareCalculationParams } from '@/types/cab';
import { TripType, TripMode } from './tripTypes';
import { getLocalPackagePrice } from './packageData';
import { tourFares } from './tourData';

// Global cache for storing fare calculations to reduce recalculations
const fareCache = new Map<string, { expire: number, price: number }>();

// Clear the fare cache (used when refreshing data)
export const clearFareCache = () => {
  fareCache.clear();
  console.log('Fare calculation cache cleared');
};

// Generate a cache key based on fare calculation parameters
const generateCacheKey = (params: FareCalculationParams): string => {
  if (!params || !params.cabType) {
    console.warn('Invalid params for generating cache key:', params);
    return 'invalid-params';
  }
  
  const { cabType, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate } = params;
  const cabId = cabType && cabType.id ? cabType.id : 'unknown-cab';
  
  return `${cabId}_${distance}_${tripType}_${tripMode}_${hourlyPackage || ''}_${pickupDate?.getTime() || 0}_${returnDate?.getTime() || 0}`;
};

// Helper function to safely convert values to lowercase
const safeToLowerCase = (value: any): string => {
  if (typeof value === 'string') {
    return value.toLowerCase();
  }
  return String(value).toLowerCase();
};

// Get default cab pricing based on type
const getDefaultCabPricing = (cabName: string = 'sedan') => {
  const cabNameLower = safeToLowerCase(cabName);
  
  // Default pricing for sedan
  let pricing = {
    basePrice: 4200,
    pricePerKm: 14,
    nightHaltCharge: 700,
    driverAllowance: 250
  };
  
  // Adjust pricing based on cab type
  if (cabNameLower.includes('sedan')) {
    // Use default sedan pricing
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

// Calculate airport transfer fares
export const calculateAirportFare = (cabName: string, distance: number): number => {
  // Create a cache key for airport fares
  const cacheKey = `airport_${cabName}_${distance}`;
  
  // Check if we have a valid cached result
  const cachedFare = fareCache.get(cacheKey);
  if (cachedFare && cachedFare.expire > Date.now()) {
    console.log(`Using cached airport fare for ${cabName}: ₹${cachedFare.price}`);
    return cachedFare.price;
  }
  
  // Default pricing for airport transfers if specific cab not found
  const defaultFare = {
    basePrice: 1000,
    pricePerKm: 14,
    airportFee: 150
  };
  
  // Determine base price and per km rates based on cab type
  let basePrice = defaultFare.basePrice;
  let pricePerKm = defaultFare.pricePerKm;
  
  // Safely convert cabName to lowercase string to avoid TypeError
  const cabNameLower = safeToLowerCase(cabName);
  
  // Adjust pricing based on cab type
  if (cabNameLower.includes('sedan')) {
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
  }
  
  // Calculate fare
  let fare = Math.round(basePrice * 0.7); // 70% of base fare
  fare += Math.round(distance * pricePerKm);
  
  // Add airport fee
  fare += defaultFare.airportFee;
  
  // Add GST (5%)
  fare = Math.round(fare * 1.05);
  
  // Store in cache (valid for 15 minutes)
  fareCache.set(cacheKey, {
    expire: Date.now() + 15 * 60 * 1000,
    price: fare
  });
  
  console.log(`Calculated airport fare for ${cabName}: ₹${fare}`);
  return fare;
};

// Calculate fare based on cab type, distance, and trip details
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

  // Generate a cache key based on the parameters
  const cacheKey = generateCacheKey(params);
  
  // Check if we have a valid cached result
  const cachedFare = fareCache.get(cacheKey);
  if (cachedFare && cachedFare.expire > Date.now()) {
    console.log(`Using cached fare calculation for ${cabType.name}: ₹${cachedFare.price}`);
    return cachedFare.price;
  }
  
  console.log(`Calculating fare for ${tripType} trip with ${cabType.name}, distance: ${distance}km`);
  
  let fare = 0;
  
  try {
    // Use default pricing if cab pricing properties are missing
    const isValidPricing = cabType.price > 0 || cabType.pricePerKm > 0;
    if (!isValidPricing) {
      console.warn('Cab has invalid pricing, using defaults:', cabType);
      const defaultPricing = getDefaultCabPricing(cabType.name);
      cabType.price = cabType.price || defaultPricing.basePrice;
      cabType.pricePerKm = cabType.pricePerKm || defaultPricing.pricePerKm;
      cabType.nightHaltCharge = cabType.nightHaltCharge || defaultPricing.nightHaltCharge;
      cabType.driverAllowance = cabType.driverAllowance || defaultPricing.driverAllowance;
    }
    
    if (tripType === 'local') {
      // For local trips, use the hourly package pricing
      if (hourlyPackage) {
        // Safely handle string or non-string cab IDs 
        const cabId = cabType.id ? safeToLowerCase(cabType.id) : '';
        fare = getLocalPackagePrice(hourlyPackage, cabId);
        
        // For distance beyond package limit, add per km charge
        const packageKm = hourlyPackage === '8hrs-80km' ? 80 : 100;
        if (distance > packageKm) {
          const extraKm = distance - packageKm;
          fare += extraKm * cabType.pricePerKm;
          console.log(`Added ${extraKm}km extra at ${cabType.pricePerKm}/km = ${extraKm * cabType.pricePerKm}`);
        }
        
        // Add GST (5%)
        fare = Math.round(fare * 1.05);
      } else {
        console.warn('Hourly package not specified for local trip');
        fare = cabType.price; // Fallback to base price
      }
    } else if (tripType === 'tour') {
      // For tours, use the predefined tour fares
      const tourId = hourlyPackage; // In this case, hourlyPackage is used to store the tourId
      
      if (tourId && tourFares[tourId]) {
        // Safely handle cab ID conversion
        const cabId = cabType.id ? safeToLowerCase(cabType.id) : '';
        if (tourFares[tourId][cabId]) {
          fare = tourFares[tourId][cabId];
        } else {
          // Fallback calculation if the specific tour fare is not found
          fare = Math.round(distance * cabType.pricePerKm * 1.2); // 20% premium for tour packages
        }
      } else {
        // Fallback calculation if the specific tour fare is not found
        fare = Math.round(distance * cabType.pricePerKm * 1.2); // 20% premium for tour packages
      }
      
      // Add GST (5%)
      fare = Math.round(fare * 1.05);
    } else if (tripType === 'outstation') {
      if (tripMode === 'one-way') {
        // One-way outstation trip calculation
        fare = cabType.price; // Base fare
        
        const includedKm = 300; // Base kilometers included in fare
        const extraKm = Math.max(0, distance - includedKm);
        
        if (extraKm > 0) {
          fare += extraKm * cabType.pricePerKm;
        }
        
        // Add driver allowance
        fare += cabType.driverAllowance;
        
        // Check for night driving charges (10% extra)
        if (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) {
          fare += Math.round(fare * 0.1);
        }
      } else {
        // Round-trip calculation
        const days = returnDate && pickupDate ? 
          Math.max(1, differenceInDays(returnDate, pickupDate) + 1) : 1;
        
        fare = cabType.price; // Base fare for day 1
        
        // Add extra days charges (80% of base fare per extra day)
        if (days > 1) {
          fare += Math.round((days - 1) * cabType.price * 0.8);
        }
        
        // Add per km charges
        fare += Math.round(distance * cabType.pricePerKm);
        
        // Add driver allowance for each day
        fare += days * cabType.driverAllowance;
        
        // Add night halt charges if applicable
        if (days > 1) {
          fare += (days - 1) * cabType.nightHaltCharge;
        }
      }
      
      // Add GST (5%)
      fare = Math.round(fare * 1.05);
    } else if (tripType === 'airport') {
      // Use the dedicated airport fare calculation function
      return calculateAirportFare(cabType.name, distance);
    }
    
    // Store in cache (valid for 15 minutes)
    fareCache.set(cacheKey, {
      expire: Date.now() + 15 * 60 * 1000,
      price: fare
    });
    
    console.log(`Calculated fare: ₹${fare} for ${tripType} trip with ${cabType.name}`);
    return fare;
  } catch (error) {
    console.error('Error in fare calculation:', error);
    
    // Return a reasonable default fare rather than 0 to avoid showing "Price unavailable"
    const fallbackFare = 4000 + (distance * 10); // Simple fallback formula
    console.log(`Using fallback fare calculation: ₹${fallbackFare}`);
    
    return fallbackFare;
  }
};
