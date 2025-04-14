import { 
  CabType, 
  HourlyPackage, 
  OutstationFare, 
  LocalFare, 
  AirportFare,
  FareCalculationParams
} from '@/types/cab';
import { getLocalPackagePrice } from '@/services/fareManagementService';
import { LocalFareData } from '@/services/localFareService';

// Define a cache to store fare data
const fareCache = new Map<string, { timestamp: number; fares: any }>();
const CACHE_EXPIRY = 60 * 1000; // 1 minute

// Function to clear the fare cache
export const clearFareCache = () => {
  fareCache.clear();
  console.log('Fare cache cleared.');
};

// Helper function to format cache key
const getCacheKey = (params: FareCalculationParams): string => {
  const { cabType, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate } = params;
  return `
    cabType:${cabType.id},
    distance:${distance},
    tripType:${tripType},
    tripMode:${tripMode || 'NA'},
    hourlyPackage:${hourlyPackage || 'NA'},
    pickupDate:${pickupDate ? pickupDate.toISOString() : 'NA'},
    returnDate:${returnDate ? returnDate.toISOString() : 'NA'}
  `;
};

// Main function to calculate fare
export const calculateFare = async (params: FareCalculationParams): Promise<number> => {
  const { cabType, distance, tripType, tripMode, hourlyPackage, forceRefresh } = params;
  
  // Check if cabType is valid
  if (!cabType || typeof cabType !== 'object') {
    console.error('Invalid cabType provided:', cabType);
    return 0;
  }
  
  // Check if distance is a valid number
  if (typeof distance !== 'number' || isNaN(distance)) {
    console.error('Invalid distance provided:', distance);
    return 0;
  }
  
  // Check if tripType is a valid string
  if (typeof tripType !== 'string' || !['local', 'outstation'].includes(tripType.toLowerCase())) {
    console.error('Invalid tripType provided:', tripType);
    return 0;
  }
  
  // Check if tripMode is valid for outstation trips
  if (tripType === 'outstation' && (typeof tripMode !== 'string' || !['one-way', 'round-trip'].includes(tripMode.toLowerCase()))) {
    console.error('Invalid tripMode provided for outstation trip:', tripMode);
    return 0;
  }
  
  // Check if hourlyPackage is valid for local trips
  if (tripType === 'local' && hourlyPackage && typeof hourlyPackage !== 'string') {
    console.error('Invalid hourlyPackage provided for local trip:', hourlyPackage);
    return 0;
  }
  
  const cacheKey = getCacheKey(params);
  
  if (!forceRefresh && fareCache.has(cacheKey)) {
    const cachedData = fareCache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_EXPIRY) {
      console.log(`Returning cached fare for ${cacheKey}`);
      return cachedData.fares.totalFare;
    } else {
      console.log(`Cache expired for ${cacheKey}, recalculating.`);
      fareCache.delete(cacheKey); // Remove expired cache entry
    }
  }
  
  let totalFare = 0;
  
  try {
    if (tripType === 'local') {
      totalFare = await calculateLocalFare(cabType, distance, hourlyPackage);
    } else if (tripType === 'outstation') {
      totalFare = calculateOutstationFare(cabType, distance, tripMode === 'round-trip');
    } else {
      console.error('Unsupported trip type:', tripType);
      return 0;
    }
    
    // Store the calculated fare in the cache
    fareCache.set(cacheKey, {
      timestamp: Date.now(),
      fares: { totalFare }
    });
    
    console.log(`Calculated fare for ${cacheKey}:`, totalFare);
    return totalFare;
  } catch (error) {
    console.error('Error calculating fare:', error);
    return 0;
  }
};

// Function to calculate airport fare
export const calculateAirportFare = (cabType: CabType, distance: number): number => {
  if (!cabType || !cabType.airportFares) {
    console.error('Cab type or airport fares not available');
    return 0;
  }
  
  const { basePrice, pricePerKm, tier1Price, tier2Price, tier3Price, tier4Price, extraKmCharge } = cabType.airportFares;
  
  let fare = basePrice;
  
  if (distance <= 10) {
    fare += tier1Price;
  } else if (distance <= 20) {
    fare += tier2Price;
  } else if (distance <= 30) {
    fare += tier3Price;
  } else {
    fare += tier4Price;
    fare += (distance - 30) * extraKmCharge;
  }
  
  fare += distance * pricePerKm;
  
  return fare;
};

// Function to calculate local fare
const calculateLocalFare = async (cabType: CabType, distance: number, hourlyPackage?: string): Promise<number> => {
  if (!cabType) {
    console.error('Cab type not provided');
    return 0;
  }
  
  if (!cabType.localPackageFares) {
    console.error('Local package fares not available for cab type:', cabType.name);
    return 0;
  }
  
  if (hourlyPackage) {
    const packagePrice = await getLocalPackagePrice(cabType.id, hourlyPackage);
    if (packagePrice > 0) {
      return packagePrice;
    } else {
      console.warn(`No price found for package ${hourlyPackage}, falling back to per KM pricing.`);
    }
  }
  
  return calculatePerKMFare(cabType, distance);
};

// Function to calculate per KM fare
const calculatePerKMFare = (cabType: CabType, distance: number): number => {
  if (!cabType.pricePerKm) {
    console.error('Price per KM not available for cab type:', cabType.name);
    return 0;
  }
  
  return distance * cabType.pricePerKm;
};

// Function to calculate outstation fare
const calculateOutstationFare = (cabType: CabType, distance: number, isRoundTrip: boolean): number => {
  if (!cabType || !cabType.outstationFares) {
    console.error('Cab type or outstation fares not available');
    return 0;
  }
  
  const { basePrice, pricePerKm, roundTripBasePrice, roundTripPricePerKm } = cabType.outstationFares;
  
  if (isRoundTrip) {
    return roundTripBasePrice + (distance * roundTripPricePerKm);
  } else {
    return basePrice + (distance * pricePerKm);
  }
};

interface FareDataFormat {
  vehicleId: string;
  vehicle_id?: string;
  price4hrs40km?: number;
  price8hrs80km?: number;
  price10hrs100km?: number;
  priceExtraKm?: number;
  priceExtraHour?: number;
  package4hr40km?: number;
  package8hr80km?: number;
  package10hr100km?: number;
  extraKmRate?: number;
  extraHourRate?: number;
}

const getPackagePrice = (hourlyPackage: string, fareData: any): number => {
  const localFareData: LocalFareData = {
    vehicleId: fareData.vehicleId || fareData.vehicle_id || 'unknown',
    price4hrs40km: parseFloat(fareData.price4hrs40km || fareData.package4hr40km || 0),
    price8hrs80km: parseFloat(fareData.price8hrs80km || fareData.package8hr80km || 0),
    price10hrs100km: parseFloat(fareData.price10hrs100km || fareData.package10hr100km || 0),
    priceExtraKm: parseFloat(fareData.priceExtraKm || fareData.extraKmRate || 0),
    priceExtraHour: parseFloat(fareData.priceExtraHour || fareData.extraHourRate || 0)
  };
  
  if (!localFareData) {
    console.error('Local fare data not available');
    return 0;
  }
  
  const normalizedPackage = hourlyPackage ? hourlyPackage.toLowerCase().replace(/\s+/g, '') : '';
  
  switch (normalizedPackage) {
    case '4hr40km':
    case '4hrs40km':
      return localFareData.price4hrs40km || 0;
    case '8hr80km':
    case '8hrs80km':
      return localFareData.price8hrs80km || 0;
    case '10hr100km':
    case '10hrs100km':
      return localFareData.price10hrs100km || 0;
    default:
      console.warn(`Unsupported hourly package: ${hourlyPackage}`);
      return 0;
  }
};
