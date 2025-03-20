
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

// Helper to ensure default values for cab properties
const ensureDefaultValues = (cab: CabType): CabType => {
  if (!cab) {
    console.warn('Null cab provided to fare calculation, using defaults');
    return {
      id: 'default-sedan',
      name: 'Sedan',
      description: 'Comfortable sedan',
      image: '',
      capacity: 4,
      luggageCapacity: 2,
      price: 1000,
      basePrice: 1000,
      pricePerKm: 12,
      hr8km80Price: 1200,
      hr10km100Price: 1500,
      nightHaltCharge: 300,
      driverAllowance: 300,
      airportFee: 0,
      amenities: [],
      ac: true,
      isActive: true
    };
  }
  
  return {
    ...cab,
    basePrice: cab.basePrice || cab.price || 1000,
    pricePerKm: cab.pricePerKm || (
      cab.name?.toLowerCase().includes('sedan') ? 12 : 
      cab.name?.toLowerCase().includes('suv') ? 16 : 14
    ),
    hr8km80Price: cab.hr8km80Price || 1200,
    hr10km100Price: cab.hr10km100Price || 1500,
    nightHaltCharge: cab.nightHaltCharge || 300,
    driverAllowance: cab.driverAllowance || 300,
    airportFee: cab.airportFee || 0
  };
};

// Default fares by cab type and trip type - used as fallback
const getDefaultFare = (cabType: string, tripType: TripType): number => {
  if (tripType === 'airport') {
    return cabType.toLowerCase().includes('sedan') ? 800 :
           cabType.toLowerCase().includes('suv') ? 1200 : 1000;
  } else if (tripType === 'local') {
    return cabType.toLowerCase().includes('sedan') ? 1200 :
           cabType.toLowerCase().includes('suv') ? 1800 : 1500;
  } else { // outstation
    return cabType.toLowerCase().includes('sedan') ? 2000 :
           cabType.toLowerCase().includes('suv') ? 3000 : 2500;
  }
};

export const calculateFare = async ({
  cabType,
  distance,
  tripType,
  tripMode,
  hourlyPackage,
  pickupDate,
  returnDate
}: CalculateFareProps): Promise<number> => {
  // Ensure cab is valid
  if (!cabType || !cabType.id) {
    console.error('Invalid cab type:', cabType);
    return getDefaultFare('sedan', tripType);
  }
  
  // Apply default values to ensure calculations don't fail
  const cab = ensureDefaultValues(cabType);
  
  // Generate a cache key
  const cacheKey = `${cab.id}-${tripType}-${tripMode}-${hourlyPackage || 'none'}-${distance}-${pickupDate?.getTime() || 0}-${returnDate?.getTime() || 0}`;
  
  // Check cache
  const now = Date.now();
  if (fareCache[cacheKey] && now - fareCache[cacheKey].timestamp < CACHE_EXPIRY) {
    console.log(`Using cached fare for ${cab.name}: ₹${fareCache[cacheKey].result}`);
    return fareCache[cacheKey].result;
  }
  
  // Use default distances if provided one is invalid
  const validDistance = (!isNaN(distance) && distance > 0) ? distance : 
                      (tripType === 'local' ? 
                        (hourlyPackage?.includes('80') ? 80 : 100) : 
                        100);
  
  console.log(`Calculating fare for ${cab.name}, distance: ${validDistance}km, tripType: ${tripType}, tripMode: ${tripMode}`);
  
  // Calculate the fare based on the trip type
  let fare = 0;
  
  try {
    if (tripType === 'local' && hourlyPackage) {
      // Local package pricing - use fixed prices
      if (hourlyPackage === '8hr_80km' || hourlyPackage === '8hrs-80km') {
        fare = cab.hr8km80Price || 1200; // Default if not set
      } else if (hourlyPackage === '10hr_100km' || hourlyPackage === '10hrs-100km') {
        fare = cab.hr10km100Price || 1500; // Default if not set
      } else {
        // Handle other hourly packages or invalid ones
        fare = cab.basePrice || 1000;
      }
      
      console.log(`Local ${hourlyPackage} package fare: ₹${fare}`);
    } else if (tripType === 'airport') {
      // Airport transfer pricing
      fare = cab.basePrice || cab.price || 800; // Default value if not set
      
      // Ensure we have a per-km rate
      const perKmRate = cab.pricePerKm || (cab.name.toLowerCase().includes('sedan') ? 12 : 
                        cab.name.toLowerCase().includes('suv') ? 16 : 14);
      
      if (validDistance > 0) {
        fare += perKmRate * validDistance;
      }
      
      // Add airport fee if applicable
      if (cab.airportFee) {
        fare += cab.airportFee;
      }
      
      console.log(`Airport transfer fare: ₹${fare} (base: ₹${cab.basePrice}, per km: ₹${perKmRate}, distance: ${validDistance}km)`);
    } else {
      // Outstation pricing
      fare = cab.basePrice || cab.price || 1000; // Default value if not set
      
      // Ensure we have a per-km rate
      const perKmRate = cab.pricePerKm || (cab.name.toLowerCase().includes('sedan') ? 12 : 
                        cab.name.toLowerCase().includes('suv') ? 16 : 14);
      
      if (validDistance > 0) {
        fare += perKmRate * validDistance;
      }
      
      // Add night halt charges for round trips with multiple days
      if (tripMode === 'round-trip' && pickupDate && returnDate) {
        const nights = Math.max(0, differenceInDays(returnDate, pickupDate));
        const nightHaltCharge = cab.nightHaltCharge || 300;
        
        if (nights > 0) {
          fare += nights * nightHaltCharge;
          console.log(`Added night halt charges for ${nights} nights: ₹${nights * nightHaltCharge}`);
        }
        
        // Add driver allowance for multiple days
        const driverAllowance = cab.driverAllowance || 300;
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
    
    console.log(`Final calculated fare for ${cab.name}: ₹${Math.round(fare)}`);
    return Math.round(fare);
  } catch (error) {
    console.error(`Error calculating fare for ${cab.name}:`, error);
    // Return sensible default fare based on cab type
    const defaultFare = getDefaultFare(cabType.name, tripType);
    return defaultFare;
  }
};

// Function to clear the fare cache
export const clearFareCache = (): void => {
  Object.keys(fareCache).forEach(key => {
    delete fareCache[key];
  });
  console.log("Fare cache cleared");
};
