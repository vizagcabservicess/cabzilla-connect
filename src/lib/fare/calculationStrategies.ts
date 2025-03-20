
/**
 * Strategies for calculating different trip type fares
 */
import { CabType } from '@/types/cab';
import { differenceInDays } from 'date-fns';

export const calculateLocalFare = (
  cab: CabType,
  hourlyPackage?: string
): number => {
  // Local package pricing - use fixed prices
  if (hourlyPackage === '8hr_80km' || hourlyPackage === '8hrs-80km') {
    return cab.hr8km80Price || 1200; // Default if not set
  } else if (hourlyPackage === '10hr_100km' || hourlyPackage === '10hrs-100km') {
    return cab.hr10km100Price || 1500; // Default if not set
  } else {
    // Handle other hourly packages or invalid ones
    return cab.basePrice || 1000;
  }
};

export const calculateAirportFare = (
  cab: CabType,
  distance: number
): number => {
  // Airport transfer pricing
  let fare = cab.basePrice || cab.price || 800; // Default value if not set
  
  // Ensure we have a per-km rate
  const perKmRate = cab.pricePerKm || (cab.name.toLowerCase().includes('sedan') ? 12 : 
                    cab.name.toLowerCase().includes('suv') ? 16 : 14);
  
  if (distance > 0) {
    fare += perKmRate * distance;
  }
  
  // Add airport fee if applicable
  if (cab.airportFee) {
    fare += cab.airportFee;
  }
  
  return fare;
};

export const calculateOutstationFare = (
  cab: CabType,
  distance: number,
  tripMode: 'one-way' | 'round-trip',
  pickupDate?: Date,
  returnDate?: Date
): number => {
  // Outstation pricing
  let fare = cab.basePrice || cab.price || 1000; // Default value if not set
  
  // Ensure we have a per-km rate
  const perKmRate = cab.pricePerKm || (cab.name.toLowerCase().includes('sedan') ? 12 : 
                    cab.name.toLowerCase().includes('suv') ? 16 : 14);
  
  if (distance > 0) {
    fare += perKmRate * distance;
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
  
  return fare;
};
