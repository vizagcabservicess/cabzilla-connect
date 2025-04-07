
import { getSurgeMultiplier } from './surgeCalculator';
import { directApiCall } from '@/utils/directApiHelper';
import { CabType, FareCalculationParams, LocalFare } from '@/types/cab';

/**
 * Constants for fare calculation
 */
const BASE_PRICES = {
  sedan: 1500,
  ertiga: 2000,
  innova_crysta: 2500,
  tempo_traveller: 3500,
};

const PRICE_PER_KM = {
  sedan: 12,
  ertiga: 15,
  innova_crysta: 17,
  tempo_traveller: 20,
};

const MINIMUM_DISTANCES = {
  airport: 10,
  outstation: 100,
  local: 40
};

/**
 * Calculate the fare based on the parameters
 */
export async function calculateFare(params: FareCalculationParams): Promise<number> {
  const { cabType, distance, tripType, tripMode = 'one_way', hourlyPackage } = params;
  
  console.log('Calculating fare with params:', JSON.stringify(params, null, 2));
  
  // For local package trips using hourly package
  if (tripType === 'local' && hourlyPackage) {
    return calculateLocalPackageFare(cabType, hourlyPackage);
  }
  
  let baseFare = 0;
  
  switch (tripType) {
    case 'airport':
      baseFare = await calculateAirportFare(cabType, distance, tripMode);
      break;
    case 'outstation':
      baseFare = calculateOutstationFare(cabType, distance, tripMode);
      break;
    case 'local':
      baseFare = calculateLocalFare(cabType, distance);
      break;
    default:
      throw new Error(`Unknown trip type: ${tripType}`);
  }
  
  // Apply surge pricing if applicable
  const surgeMultiplier = getSurgeMultiplier(params.pickupDate);
  
  if (surgeMultiplier > 1) {
    console.log(`Applying surge multiplier: ${surgeMultiplier}`);
    baseFare = Math.round(baseFare * surgeMultiplier);
  }
  
  return baseFare;
}

/**
 * Calculate airport transfer fare
 */
async function calculateAirportFare(cabType: CabType, distance: number, tripMode: string): Promise<number> {
  // Default minimum distance for airport transfers
  const minDistance = MINIMUM_DISTANCES.airport;
  
  // Use the actual distance or the minimum distance, whichever is greater
  const calculatedDistance = Math.max(distance, minDistance);
  
  // Get the vehicle ID
  const vehicleId = cabType.id || cabType.vehicleId || cabType.vehicle_id;
  
  if (!vehicleId) {
    throw new Error('Vehicle ID is required for airport fare calculation');
  }
  
  try {
    // Try to get the airport fares for this vehicle
    const response = await directApiCall(`/api/direct-airport-fares.php?id=${vehicleId}`);
    
    if (response && response.status === 'success' && (response.fare || response.fares)) {
      const fareData = response.fare || (Array.isArray(response.fares) ? response.fares[0] : response.fares);
      
      if (fareData) {
        console.log('Found airport fare data:', fareData);
        
        // Extract pricing data
        const basePrice = parseFloat(fareData.basePrice || fareData.base_price || 0);
        const pricePerKm = parseFloat(fareData.pricePerKm || fareData.price_per_km || 0);
        const extraKmCharge = parseFloat(fareData.extraKmCharge || fareData.extra_km_charge || 0);
        
        // One-way or round trip
        let totalFare = 0;
        
        if (tripMode === 'round_trip') {
          // For round trip, double the base fare and distance calculation
          totalFare = basePrice * 2 + (calculatedDistance * 2 * pricePerKm);
        } else {
          // For one-way, calculate normally
          totalFare = basePrice + (calculatedDistance * pricePerKm);
          
          // Add extra km charge if distance is above minimum
          if (distance > minDistance && extraKmCharge > 0) {
            const extraKm = distance - minDistance;
            if (extraKm > 0) {
              totalFare += extraKm * extraKmCharge;
            }
          }
        }
        
        console.log(`Calculated airport fare: ${totalFare} for ${calculatedDistance}km`);
        return Math.round(totalFare);
      }
    }
    
    // Fall back to default calculation if no fare data is available
    console.warn('No specific fare data found, using default calculation');
  } catch (error) {
    console.error('Error fetching airport fares:', error);
    // Continue with default calculation on error
  }
  
  // Default calculation if API fails or no specific fares are found
  const basePrice = cabType.basePrice || cabType.base_price || BASE_PRICES[vehicleId as keyof typeof BASE_PRICES] || 2000;
  const pricePerKm = cabType.pricePerKm || PRICE_PER_KM[vehicleId as keyof typeof PRICE_PER_KM] || 15;
  
  let totalFare = basePrice + (calculatedDistance * pricePerKm);
  
  if (tripMode === 'round_trip') {
    totalFare = totalFare * 1.8; // 10% discount on round trip
  }
  
  return Math.round(totalFare);
}

/**
 * Calculate outstation fare
 */
function calculateOutstationFare(cabType: CabType, distance: number, tripMode: string): number {
  // Default minimum distance for outstation trips
  const minDistance = MINIMUM_DISTANCES.outstation;
  
  // Use the actual distance or the minimum distance, whichever is greater
  const calculatedDistance = Math.max(distance, minDistance);
  
  // Get the vehicle ID for fare lookup
  const vehicleId = cabType.id || cabType.vehicleId || cabType.vehicle_id;
  
  // Get pricing from cab type or use defaults
  const basePrice = cabType.basePrice || cabType.base_price || BASE_PRICES[vehicleId as keyof typeof BASE_PRICES] || 2500;
  const pricePerKm = cabType.pricePerKm || PRICE_PER_KM[vehicleId as keyof typeof PRICE_PER_KM] || 15;
  
  // Check if we have outstation fares data
  if (cabType.outstationFares) {
    const fares = cabType.outstationFares;
    
    if (tripMode === 'round_trip' && fares.roundTripBasePrice && fares.roundTripPricePerKm) {
      // Use round trip specific pricing if available
      return Math.round(fares.roundTripBasePrice + (calculatedDistance * fares.roundTripPricePerKm));
    } else {
      // Use one-way pricing
      return Math.round(fares.basePrice + (calculatedDistance * fares.pricePerKm));
    }
  }
  
  // Default calculation if no specific fares are configured
  let totalFare = basePrice + (calculatedDistance * pricePerKm);
  
  if (tripMode === 'round_trip') {
    // Round trips usually have a discount
    totalFare = totalFare * 1.9; // 5% discount on round trip
  }
  
  return Math.round(totalFare);
}

/**
 * Calculate local trip fare
 */
function calculateLocalFare(cabType: CabType, distance: number): number {
  // Default minimum distance for local trips
  const minDistance = MINIMUM_DISTANCES.local;
  
  // Use the actual distance or the minimum distance, whichever is greater
  const calculatedDistance = Math.max(distance, minDistance);
  
  // Get the vehicle ID for fare lookup
  const vehicleId = cabType.id || cabType.vehicleId || cabType.vehicle_id;
  
  // Get pricing from cab type or use defaults
  const basePrice = cabType.basePrice || cabType.base_price || BASE_PRICES[vehicleId as keyof typeof BASE_PRICES] || 1800;
  const pricePerKm = cabType.pricePerKm || PRICE_PER_KM[vehicleId as keyof typeof PRICE_PER_KM] || 14;
  
  // Default calculation
  const totalFare = basePrice + (calculatedDistance * pricePerKm);
  
  return Math.round(totalFare);
}

/**
 * Calculate local package fare based on hourly package
 */
function calculateLocalPackageFare(cabType: CabType, packageId: string): number {
  console.log('Calculating local package fare for:', packageId);
  
  // Extract vehicle ID
  const vehicleId = cabType.id || cabType.vehicleId || cabType.vehicle_id;
  
  // Check if cab has localPackageFares defined
  if (cabType.localPackageFares) {
    const packageFares = cabType.localPackageFares;
    
    switch (packageId) {
      case '4hr40km':
        return packageFares.price4hrs40km || 0;
      case '8hr80km':
        return packageFares.price8hrs80km || 0;
      case '10hr100km':
        return packageFares.price10hrs100km || 0;
      default:
        // If package not found, return 0 or a default price
        return 0;
    }
  }
  
  // Try to find local fare data if available
  const localFares = cabType as unknown as { localFares?: LocalFare };
  if (localFares && localFares.localFares) {
    const fare = localFares.localFares;
    
    switch (packageId) {
      case '4hr40km':
        return fare.price4hrs40km || 0;
      case '8hr80km':
        return fare.price8hrs80km || 0;
      case '10hr100km':
        return fare.price10hrs100km || 0;
      default:
        // If package not found, return 0 or a default price
        return 0;
    }
  }
  
  // Default pricing if no specific package prices are found
  const defaultPrices = {
    '4hr40km': {
      sedan: 1500,
      ertiga: 1800,
      innova_crysta: 2500,
      tempo_traveller: 3500
    },
    '8hr80km': {
      sedan: 2500,
      ertiga: 3000,
      innova_crysta: 3800,
      tempo_traveller: 5000
    },
    '10hr100km': {
      sedan: 3000,
      ertiga: 3500,
      innova_crysta: 4500,
      tempo_traveller: 6000
    }
  };
  
  // Try to find the vehicle in the default prices
  const packagePrices = defaultPrices[packageId as keyof typeof defaultPrices];
  if (packagePrices && packagePrices[vehicleId as keyof typeof packagePrices]) {
    return packagePrices[vehicleId as keyof typeof packagePrices];
  }
  
  // If all else fails, return a reasonable default price
  return 2500;
}
