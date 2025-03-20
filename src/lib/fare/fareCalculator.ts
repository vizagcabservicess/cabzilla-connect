
/**
 * Main fare calculation logic
 */
import { CabType } from '@/types/cab';
import { TripType, TripMode } from '@/lib/tripTypes';
import { ensureDefaultValues, getDefaultFare } from './cabDefaults';
import { getCachedFare, setCachedFare, generateFareCacheKey } from './fareCache';
import { calculateLocalFare, calculateAirportFare, calculateOutstationFare } from './calculationStrategies';
import { validateCabType, validateDistance, validateMinimumFare } from './validateInput';

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
  // Ensure cab is valid
  if (!validateCabType(cabType)) {
    return getDefaultFare('sedan', tripType);
  }
  
  // Apply default values to ensure calculations don't fail
  const cab = ensureDefaultValues(cabType);
  
  // Generate a cache key
  const cacheKey = generateFareCacheKey(
    cab.id, 
    tripType, 
    tripMode, 
    hourlyPackage, 
    distance, 
    pickupDate, 
    returnDate
  );
  
  // Check cache
  const cachedFare = getCachedFare(cacheKey);
  if (cachedFare !== null) {
    return cachedFare;
  }
  
  // Validate and normalize distance
  const validDistance = validateDistance(distance, tripType, hourlyPackage);
  
  console.log(`Calculating fare for ${cab.name}, distance: ${validDistance}km, tripType: ${tripType}, tripMode: ${tripMode}`);
  
  // Calculate the fare based on the trip type
  let fare = 0;
  
  try {
    if (tripType === 'local' && hourlyPackage) {
      fare = calculateLocalFare(cab, hourlyPackage);
      console.log(`Local ${hourlyPackage} package fare: ₹${fare}`);
    } else if (tripType === 'airport') {
      fare = calculateAirportFare(cab, validDistance);
      console.log(`Airport transfer fare: ₹${fare} (base: ₹${cab.basePrice}, per km: ₹${cab.pricePerKm}, distance: ${validDistance}km)`);
    } else {
      // Outstation pricing
      fare = calculateOutstationFare(cab, validDistance, tripMode, pickupDate, returnDate);
      console.log(`Outstation fare for ${tripMode}: ₹${fare}`);
    }
    
    // Ensure minimum fare
    fare = validateMinimumFare(fare, tripType);
    
    // Cache the result
    setCachedFare(cacheKey, fare);
    
    console.log(`Final calculated fare for ${cab.name}: ₹${Math.round(fare)}`);
    return Math.round(fare);
  } catch (error) {
    console.error(`Error calculating fare for ${cab.name}:`, error);
    // Return sensible default fare based on cab type
    const defaultFare = getDefaultFare(cabType.name, tripType);
    return defaultFare;
  }
};
