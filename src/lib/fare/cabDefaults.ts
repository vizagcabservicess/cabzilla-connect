
/**
 * Default values and helpers for cab properties
 */
import { CabType } from '@/types/cab';
import { TripType } from '@/lib/tripTypes';

// Helper to ensure default values for cab properties
export const ensureDefaultValues = (cab: CabType): CabType => {
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
export const getDefaultFare = (cabType: string, tripType: TripType): number => {
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
