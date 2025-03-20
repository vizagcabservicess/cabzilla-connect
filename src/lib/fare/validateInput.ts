
/**
 * Input validation for fare calculation
 */
import { CabType } from '@/types/cab';
import { TripType } from '@/lib/tripTypes';
import { getDefaultFare } from './cabDefaults';

export const validateCabType = (cabType: CabType | null | undefined): boolean => {
  if (!cabType || !cabType.id) {
    console.error('Invalid cab type:', cabType);
    return false;
  }
  return true;
};

export const validateDistance = (distance: number, tripType: TripType, hourlyPackage?: string): number => {
  // Use default distances if provided one is invalid
  if (isNaN(distance) || distance <= 0) {
    if (tripType === 'local') {
      return hourlyPackage?.includes('80') ? 80 : 100;
    } else {
      return 100; // Default for other trip types
    }
  }
  return distance;
};

export const validateMinimumFare = (fare: number, tripType: TripType): number => {
  // Ensure we have a sensible minimum fare
  const minimumFare = tripType === 'local' ? 800 : 
                     tripType === 'airport' ? 1000 : 1200;
  
  if (fare < minimumFare) {
    console.log(`Fare below minimum (₹${minimumFare}), adjusting`);
    return minimumFare;
  }
  
  return fare;
};
