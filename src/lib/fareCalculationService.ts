
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
    console.log(`Using cached fare for ${cabType.name}: ₹${fareCache[cacheKey].result}`);
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
  
  console.log(`Calculating fare for ${cabType.name}, distance: ${distance}km, tripType: ${tripType}, tripMode: ${tripMode}`);
  
  // Calculate the fare based on the trip type
  let fare = 0;
  
  try {
    if (tripType === 'local' && hourlyPackage) {
      // Local package pricing - use fixed prices
      if (hourlyPackage === '8hr_80km') {
        fare = cabType.hr8km80Price || 1200; // Default if not set
      } else if (hourlyPackage === '10hr_100km') {
        fare = cabType.hr10km100Price || 1500; // Default if not set
      }
      
      console.log(`Local ${hourlyPackage} package fare: ₹${fare}`);
    } else if (tripType === 'airport') {
      // Airport transfer pricing
      fare = cabType.basePrice || cabType.price || 800; // Default value if not set
      
      // Ensure we have a per-km rate
      const perKmRate = cabType.pricePerKm || (cabType.name.toLowerCase().includes('sedan') ? 12 : 
                        cabType.name.toLowerCase().includes('suv') ? 16 : 14);
      
      if (distance > 0) {
        fare += perKmRate * distance;
      }
      
      // Add airport fee if applicable
      if (cabType.airportFee) {
        fare += cabType.airportFee;
      }
      
      console.log(`Airport transfer fare: ₹${fare} (base: ₹${cabType.basePrice}, per km: ₹${perKmRate}, distance: ${distance}km)`);
    } else {
      // Outstation pricing
      fare = cabType.basePrice || cabType.price || 1000; // Default value if not set
      
      // Ensure we have a per-km rate
      const perKmRate = cabType.pricePerKm || (cabType.name.toLowerCase().includes('sedan') ? 12 : 
                        cabType.name.toLowerCase().includes('suv') ? 16 : 14);
      
      if (distance > 0) {
        fare += perKmRate * distance;
      }
      
      // Add night halt charges for round trips with multiple days
      if (tripMode === 'round-trip' && pickupDate && returnDate) {
        const nights = Math.max(0, differenceInDays(returnDate, pickupDate));
        const nightHaltCharge = cabType.nightHaltCharge || 300;
        
        if (nights > 0) {
          fare += nights * nightHaltCharge;
          console.log(`Added night halt charges for ${nights} nights: ₹${nights * nightHaltCharge}`);
        }
        
        // Add driver allowance for multiple days
        const driverAllowance = cabType.driverAllowance || 300;
        if (nights > 0) {
          fare += (nights + 1) * driverAllowance; // +1 for the first day
          console.log(`Added driver allowance for ${nights + 1} days: ₹${(nights + 1) * driverAllowance}`);
        }
      }
      
      console.log(`Outstation fare for ${tripMode}: ₹${fare}`);
    }
    
    // Ensure we have a sensible minimum fare
    const minimumFare = tripType === 'local' ? 800 : 
                       tripType === 'airport' ? 1000 : 1200;
    
    if (fare < minimumFare) {
      console.log(`Fare below minimum (₹${minimumFare}), adjusting`);
      fare = minimumFare;
    }
    
    // Cache the result
    fareCache[cacheKey] = {
      result: Math.round(fare),
      timestamp: now
    };
    
    console.log(`Final calculated fare for ${cabType.name}: ₹${Math.round(fare)}`);
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
  console.log("Fare cache cleared");
};
