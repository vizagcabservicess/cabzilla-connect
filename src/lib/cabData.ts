import { differenceInCalendarDays } from 'date-fns';
import { fareAPI } from '@/services/api';

export type TripType = 'outstation' | 'local' | 'airport' | 'tour';
export type TripMode = 'one-way' | 'round-trip';
export type LocalTripPurpose = 'business' | 'personal' | 'city-tour';

export interface HourlyPackage {
  id: string;
  name: string;
  hours: number;
  kilometers: number;
  basePrice: number;
  multiplier: number;
}

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
  ac?: boolean;
  nightHaltCharge?: number;
  driverAllowance?: number;
}

// Default cab types (will be replaced with dynamic data)
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
    description: 'Comfortable sedan suitable for 4 passengers.',
    ac: true
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
    description: 'Spacious SUV suitable for 6 passengers.',
    ac: true
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
    description: 'Premium SUV with ample space for 7 passengers.',
    ac: true
  }
];

// Function to load cab types dynamically
export const loadCabTypes = async (): Promise<CabType[]> => {
  try {
    const vehicleData = await fareAPI.getAllVehicleData();
    
    // Map the API data to match the CabType interface
    const dynamicCabTypes: CabType[] = vehicleData.map((vehicle) => ({
      id: vehicle.id,
      name: vehicle.name,
      capacity: vehicle.capacity,
      luggageCapacity: vehicle.luggageCapacity,
      price: vehicle.price,
      pricePerKm: vehicle.pricePerKm,
      image: vehicle.image,
      amenities: vehicle.amenities,
      description: vehicle.description,
      ac: vehicle.ac,
      nightHaltCharge: vehicle.nightHaltCharge,
      driverAllowance: vehicle.driverAllowance
    }));
    
    return dynamicCabTypes.length > 0 ? dynamicCabTypes : cabTypes;
  } catch (error) {
    console.error('Error loading cab types:', error);
    // Fall back to default cab types if API call fails
    return cabTypes;
  }
};

export const hourlyPackages: HourlyPackage[] = [
  {
    id: '8hrs-80km',
    name: '8 Hours / 80 KM',
    hours: 8,
    kilometers: 80,
    basePrice: 2500,
    multiplier: 1
  },
  {
    id: '10hrs-100km',
    name: '10 Hours / 100 KM',
    hours: 10,
    kilometers: 100,
    basePrice: 3000,
    multiplier: 1.2
  }
];

export const extraCharges = {
  sedan: { perHour: 250, perKm: 14 },
  ertiga: { perHour: 300, perKm: 18 },
  innova_crysta: { perHour: 350, perKm: 20 }
};

export const oneWayRates = {
  sedan: 14,
  ertiga: 18,
  innova_crysta: 20
};

export const availableTours = [
  {
    id: 'araku_valley',
    name: 'Araku Valley Tour',
    distance: 120,
    image: '/tours/araku_valley.jpg'
  },
  {
    id: 'yarada_beach',
    name: 'Yarada Beach Tour',
    distance: 40,
    image: '/tours/yarada_beach.jpg'
  },
  {
    id: 'rushikonda',
    name: 'Rushikonda Beach Tour',
    distance: 25,
    image: '/tours/rushikonda.jpg'
  }
];

export const tourFares = {
  araku_valley: {
    sedan: 6000,
    ertiga: 7500,
    innova_crysta: 9000
  },
  yarada_beach: {
    sedan: 2500,
    ertiga: 3500,
    innova_crysta: 4500
  },
  rushikonda: {
    sedan: 2000,
    ertiga: 3000,
    innova_crysta: 4000
  }
};

// Function to load tour fares dynamically
export const loadTourFares = async (): Promise<any> => {
  try {
    console.log("Loading tour fares from API");
    const tourFareData = await fareAPI.getTourFares();
    console.log("Tour fare data:", tourFareData);
    
    // Convert the API data to match the existing structure
    const dynamicTourFares: any = {};
    
    if (Array.isArray(tourFareData) && tourFareData.length > 0) {
      tourFareData.forEach((tour) => {
        if (tour && tour.tourId) {
          dynamicTourFares[tour.tourId] = {
            sedan: tour.sedan || 0,
            ertiga: tour.ertiga || 0,
            innova_crysta: tour.innova || 0
          };
        }
      });
    }
    
    return Object.keys(dynamicTourFares).length > 0 ? dynamicTourFares : tourFares;
  } catch (error) {
    console.error('Error loading tour fares:', error);
    // Fall back to default tour fares if API call fails
    return tourFares;
  }
};

// Helper function to format price
export const formatPrice = (price: number): string => {
  return `₹${price.toLocaleString('en-IN')}`;
};

// Local package price matrix to store pricing data for different cab types
const localPackagePriceMatrix: Record<string, Record<string, number>> = {
  '8hrs-80km': {
    'sedan': 2500,
    'ertiga': 3000,
    'innova crysta': 3800,
    'innova': 3800,
    'tempo': 4500,
    'luxury': 5500
  },
  '10hrs-100km': {
    'sedan': 3000,
    'ertiga': 3600,
    'innova crysta': 4500,
    'innova': 4500,
    'tempo': 5500,
    'luxury': 6500
  }
};

/**
 * Get local package price based on package ID and cab type
 */
export function getLocalPackagePrice(packageId: string, cabType: string): number {
  console.log(`Getting local package price for: package=${packageId}, cab=${cabType}`);
  
  const lowerCabType = cabType.toLowerCase();
  
  // Check if we have a price in the matrix
  if (localPackagePriceMatrix[packageId] && localPackagePriceMatrix[packageId][lowerCabType]) {
    return localPackagePriceMatrix[packageId][lowerCabType];
  }
  
  // If the exact cab type is not found, try to match with similar cab types
  if (lowerCabType.includes('innova') && localPackagePriceMatrix[packageId]['innova']) {
    return localPackagePriceMatrix[packageId]['innova'];
  }
  
  // Fallback - calculate based on base package and apply multiplier for cab types
  const basePackage = hourlyPackages.find(pkg => pkg.id === packageId);
  if (!basePackage) return 2500; // Default fallback
  
  let multiplier = 1;
  if (lowerCabType.includes('ertiga')) multiplier = 1.2;
  if (lowerCabType.includes('innova')) multiplier = 1.5;
  if (lowerCabType.includes('tempo')) multiplier = 1.8;
  if (lowerCabType.includes('luxury')) multiplier = 2.2;
  
  return Math.ceil(basePackage.basePrice * multiplier);
}

// Function to update local package prices
export function updateLocalPackagePrice(packageId: string, cabType: string, price: number): void {
  const lowerCabType = cabType.toLowerCase();
  
  // Ensure the package exists in the matrix
  if (!localPackagePriceMatrix[packageId]) {
    localPackagePriceMatrix[packageId] = {};
  }
  
  // Update the price for the specified cab type
  localPackagePriceMatrix[packageId][lowerCabType] = price;
  console.log(`Updated local package price: package=${packageId}, cab=${cabType}, price=${price}`);
}

// Function to get all local package prices
export function getAllLocalPackagePrices(): Record<string, Record<string, number>> {
  return localPackagePriceMatrix;
}

/**
 * Calculate fare based on cab type, distance, trip type, and other factors
 */
export async function calculateFare(
  cabType: CabType,
  distance: number,
  tripType: TripType,
  tripMode: TripMode,
  hourlyPackage?: string,
  pickupDate?: Date,
  returnDate?: Date,
): Promise<number> {
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
    // Get latest pricing data from the API if available
    let basePrice = cabType.price;
    let perKmRate = cabType.pricePerKm;
    let driverAllowance = cabType.driverAllowance || 250;
    let nightHaltCharge = cabType.nightHaltCharge || (cabType.name.toLowerCase() === 'sedan' ? 700 : 1000);
    
    // Try to get up-to-date pricing info
    try {
      const vehiclePricing = await fareAPI.getVehiclePricing();
      const pricing = vehiclePricing.find(p => p.vehicleType.toLowerCase() === cabType.id.toLowerCase());
      
      if (pricing) {
        basePrice = pricing.basePrice;
        perKmRate = pricing.pricePerKm;
        driverAllowance = pricing.driverAllowance || driverAllowance;
        nightHaltCharge = pricing.nightHaltCharge || nightHaltCharge;
      }
    } catch (error) {
      console.warn('Could not fetch latest pricing data, using default values:', error);
    }
    
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
