
import { differenceInCalendarDays } from 'date-fns';

export type TripType = 'outstation' | 'local' | 'airport' | 'tour';
export type TripMode = 'one-way' | 'round-trip';

export interface CabType {
  id: string;
  name: string;
  capacity: number;
  luggageCapacity: number;
  price: number;
  pricePerKm: number;
  image: string;
  amenities: string[];
  description: string;
}

export const cabTypes: CabType[] = [
  {
    id: 'sedan',
    name: 'Sedan',
    capacity: 4,
    luggageCapacity: 2,
    price: 4200,
    pricePerKm: 14,
    image: '/cars/sedan.png',
    amenities: ['AC', 'Bottle Water', 'Music System'],
    description: 'Comfortable sedan suitable for 4 passengers.'
  },
  {
    id: 'ertiga',
    name: 'Ertiga',
    capacity: 6,
    luggageCapacity: 3,
    price: 5400,
    pricePerKm: 18,
    image: '/cars/ertiga.png',
    amenities: ['AC', 'Bottle Water', 'Music System', 'Extra Legroom'],
    description: 'Spacious SUV suitable for 6 passengers.'
  },
  {
    id: 'innova_crysta',
    name: 'Innova Crysta',
    capacity: 7,
    luggageCapacity: 4,
    price: 6000,
    pricePerKm: 20,
    image: '/cars/innova.png',
    amenities: ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point'],
    description: 'Premium SUV with ample space for 7 passengers.'
  }
];

export const hourlyPackages = [
  {
    id: '8hrs-80km',
    name: '8 Hours / 80 KM',
    hours: 8,
    kilometers: 80,
    basePrice: 2500
  },
  {
    id: '10hrs-100km',
    name: '10 Hours / 100 KM',
    hours: 10,
    kilometers: 100,
    basePrice: 3000
  }
];

/**
 * Get local package price based on package ID and cab type
 */
export function getLocalPackagePrice(packageId: string, cabType: string): number {
  console.log(`Getting local package price for: package=${packageId}, cab=${cabType}`);
  
  const lowerCabType = cabType.toLowerCase();
  
  // Base prices for each cab type by package
  const priceMatrix: Record<string, Record<string, number>> = {
    '8hrs-80km': {
      'sedan': 2500,
      'ertiga': 3000,
      'innova crysta': 3800
    },
    '10hrs-100km': {
      'sedan': 3000,
      'ertiga': 3600,
      'innova crysta': 4500
    }
  };
  
  // Return the price from the matrix or a fallback
  if (priceMatrix[packageId] && priceMatrix[packageId][lowerCabType]) {
    return priceMatrix[packageId][lowerCabType];
  }
  
  // Fallback - calculate based on base package and apply multiplier for cab types
  const basePackage = hourlyPackages.find(pkg => pkg.id === packageId);
  if (!basePackage) return 2500; // Default fallback
  
  let multiplier = 1;
  if (lowerCabType.includes('ertiga')) multiplier = 1.2;
  if (lowerCabType.includes('innova')) multiplier = 1.5;
  
  return Math.ceil(basePackage.basePrice * multiplier);
}

/**
 * Calculate fare based on cab type, distance, trip type, and other factors
 */
export function calculateFare(
  cabType: CabType,
  distance: number,
  tripType: TripType,
  tripMode: TripMode,
  hourlyPackage?: string,
  pickupDate?: Date,
  returnDate?: Date,
): number {
  if (tripType === 'local') {
    // For local trips, use the hourly package price without distance calculations
    return getLocalPackagePrice(hourlyPackage || '8hrs-80km', cabType.name);
  }
  
  if (tripType === 'airport') {
    // Airport transfers use a fixed price based on distance tiers
    return calculateAirportFare(cabType.name, distance);
  }
  
  // For outstation trips
  if (tripType === 'outstation') {
    let basePrice = cabType.price;
    let perKmRate = cabType.pricePerKm;
    let driverAllowance = 250;
    let nightHaltCharge = cabType.name.toLowerCase() === 'sedan' ? 700 : 1000;
    
    if (tripMode === 'one-way') {
      const days = 1;
      const totalMinKm = days * 300;
      const effectiveDistance = distance;
      const extraKm = Math.max(effectiveDistance - totalMinKm, 0);
      const totalBaseFare = basePrice;
      const totalDistanceFare = extraKm * perKmRate;
      const totalDriverAllowance = driverAllowance;
      
      return Math.ceil((totalBaseFare + totalDistanceFare + totalDriverAllowance) / 10) * 10;
    } else {
      // For round-trip, calculate based on number of days
      if (!pickupDate || !returnDate) return basePrice; // Fallback if dates not provided
      
      const days = Math.max(1, differenceInCalendarDays(returnDate, pickupDate) + 1);
      const totalMinKm = days * 300;
      const effectiveDistance = distance * 2; // Double the distance for round trip
      const extraKm = Math.max(effectiveDistance - totalMinKm, 0);
      const totalBaseFare = days * basePrice;
      const totalDistanceFare = extraKm * perKmRate;
      const totalDriverAllowance = days * driverAllowance;
      const totalNightHalt = (days - 1) * nightHaltCharge;
      
      return Math.ceil((totalBaseFare + totalDistanceFare + totalDriverAllowance + totalNightHalt) / 10) * 10;
    }
  }
  
  // Default fallback fare calculation
  return Math.ceil(distance * cabType.pricePerKm);
}

/**
 * Calculate airport transfer fare based on distance and cab type
 */
export function calculateAirportFare(cabType: string, distance: number): number {
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
