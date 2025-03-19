
import { differenceInHours, differenceInDays, differenceInMinutes, addDays, subDays, isAfter } from 'date-fns';
import { CabType, FareCalculationParams } from '@/types/cab';
import { TripType, TripMode } from './tripTypes';
import { getLocalPackagePrice } from './packageData';
import { tourFares } from './tourData';

// Cache for storing fare calculations to reduce recalculations
const fareCache = new Map<string, { expire: number, price: number }>();

// Clear the fare cache (used when refreshing data)
export const clearFareCache = () => {
  fareCache.clear();
  console.log('Fare calculation cache cleared');
};

// Calculate airport transfer fares
export const calculateAirportFare = (cabName: string, distance: number): number => {
  // Default pricing for airport transfers if specific cab not found
  const defaultFare = {
    basePrice: 1000,
    pricePerKm: 14,
    airportFee: 150
  };
  
  // Determine base price and per km rates based on cab type
  let basePrice = defaultFare.basePrice;
  let pricePerKm = defaultFare.pricePerKm;
  
  // Adjust pricing based on cab type
  if (cabName.toLowerCase().includes('sedan')) {
    basePrice = 1200;
    pricePerKm = 14;
  } else if (cabName.toLowerCase().includes('ertiga') || cabName.toLowerCase().includes('suv')) {
    basePrice = 1500;
    pricePerKm = 16;
  } else if (cabName.toLowerCase().includes('innova')) {
    basePrice = 1800;
    pricePerKm = 18;
  } else if (cabName.toLowerCase().includes('tempo') || cabName.toLowerCase().includes('traveller')) {
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
  
  return fare;
};

// Calculate fare based on cab type, distance, and trip details
export const calculateFare = async (params: FareCalculationParams): Promise<number> => {
  const { cabType, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate } = params;
  
  if (!cabType || distance <= 0) {
    console.warn('Invalid parameters for fare calculation:', params);
    return 0;
  }

  // Generate a cache key based on the parameters
  const cacheKey = `${cabType.id}_${distance}_${tripType}_${tripMode}_${hourlyPackage || ''}_${pickupDate?.getTime() || 0}_${returnDate?.getTime() || 0}`;
  
  // Check if we have a valid cached result
  const cachedFare = fareCache.get(cacheKey);
  if (cachedFare && cachedFare.expire > Date.now()) {
    console.log('Using cached fare calculation:', cachedFare.price);
    return cachedFare.price;
  }
  
  console.log(`Calculating fare for ${tripType} trip with ${cabType.name}, distance: ${distance}km`);
  
  let fare = 0;
  
  try {
    if (tripType === 'local') {
      // For local trips, use the hourly package pricing
      if (hourlyPackage) {
        fare = getLocalPackagePrice(hourlyPackage, cabType.id);
        
        // Add GST (5%)
        fare = Math.round(fare * 1.05);
      } else {
        console.warn('Hourly package not specified for local trip');
        fare = cabType.price; // Fallback to base price
      }
    } else if (tripType === 'tour') {
      // For tours, use the predefined tour fares
      const tourId = hourlyPackage; // In this case, hourlyPackage is used to store the tourId
      
      if (tourId && tourFares[tourId] && tourFares[tourId][cabType.id.toLowerCase()]) {
        fare = tourFares[tourId][cabType.id.toLowerCase()];
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
      // Airport transfer calculation (simplified)
      fare = Math.round(cabType.price * 0.7); // 70% of base fare
      fare += Math.round(distance * cabType.pricePerKm);
      
      // Airport fee (fixed amount)
      const airportFee = 150;
      fare += airportFee;
      
      // Add GST (5%)
      fare = Math.round(fare * 1.05);
    }
    
    // Store in cache (valid for 5 minutes)
    fareCache.set(cacheKey, {
      expire: Date.now() + 5 * 60 * 1000,
      price: fare
    });
    
    console.log(`Calculated fare: ₹${fare} for ${tripType} trip with ${cabType.name}`);
    return fare;
  } catch (error) {
    console.error('Error in fare calculation:', error);
    return 0;
  }
};
