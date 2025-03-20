
import { CabType } from '@/types/cab';
import { TripType, TripMode } from '@/lib/tripTypes';
import { differenceInDays } from 'date-fns';

// Create cache for fare calculations
const fareCache: Record<string, { result: number, timestamp: number }> = {};
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

interface CalculateFareProps {
  cabType: CabType;
  distance: number;
  tripType: TripType;
  tripMode: TripMode;
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date;
}

export const calculateFare = async ({
  cabType,
  distance,
  tripType,
  tripMode,
  hourlyPackage,
  pickupDate,
  returnDate
}: CalculateFareProps): Promise<number> => {
  // Generate a cache key
  const cacheKey = `${cabType.id}-${tripType}-${tripMode}-${hourlyPackage || 'none'}-${distance}-${pickupDate?.getTime() || 0}-${returnDate?.getTime() || 0}`;
  
  // Check cache
  const now = Date.now();
  if (fareCache[cacheKey] && now - fareCache[cacheKey].timestamp < CACHE_EXPIRY) {
    return fareCache[cacheKey].result;
  }
  
  // Validate inputs
  if (!cabType || !cabType.id) {
    console.error('Invalid cab type:', cabType);
    return 0;
  }
  
  if (isNaN(distance) || distance <= 0) {
    console.error('Invalid distance:', distance);
    return 0;
  }
  
  // Calculate the fare based on the trip type
  let fare = 0;
  
  try {
    if (tripType === 'local' && hourlyPackage) {
      // Local package pricing
      if (hourlyPackage === '8hr_80km') {
        fare = cabType.hr8km80Price || 0;
      } else if (hourlyPackage === '10hr_100km') {
        fare = cabType.hr10km100Price || 0;
      }
    } else if (tripType === 'airport') {
      // Airport transfer pricing
      fare = cabType.price || cabType.basePrice || 0;
      
      if (cabType.pricePerKm && distance > 0) {
        fare += cabType.pricePerKm * distance;
      }
      
      // Add airport fee if applicable
      if (cabType.airportFee) {
        fare += cabType.airportFee;
      }
    } else {
      // Outstation pricing
      fare = cabType.price || cabType.basePrice || 0;
      
      if (cabType.pricePerKm && distance > 0) {
        fare += cabType.pricePerKm * distance;
      }
      
      // Add night halt charges for round trips with multiple days
      if (tripMode === 'round-trip' && pickupDate && returnDate) {
        const nights = Math.max(0, differenceInDays(returnDate, pickupDate));
        if (nights > 0 && cabType.nightHaltCharge) {
          fare += nights * cabType.nightHaltCharge;
        }
        
        // Add driver allowance for multiple days
        if (cabType.driverAllowance) {
          fare += (nights + 1) * cabType.driverAllowance; // +1 for the first day
        }
      }
    }
    
    // Cache the result
    fareCache[cacheKey] = {
      result: Math.round(fare),
      timestamp: now
    };
    
    return Math.round(fare);
  } catch (error) {
    console.error(`Error calculating fare for ${cabType.name}:`, error);
    return 0;
  }
};

// Function to clear the fare cache
export const clearFareCache = (): void => {
  Object.keys(fareCache).forEach(key => {
    delete fareCache[key];
  });
};
