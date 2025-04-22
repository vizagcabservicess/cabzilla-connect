import { normalizeVehicleId } from './safeStringUtils';

// Vehicle classification for pricing tiers
export interface VehiclePricingTier {
  basePrice: number;
  pricePerKm: number;
  driverAllowance: number;
  category: string;
  displayName: string;
}

/**
 * Get pricing tier information for a specific vehicle
 * @param vehicleId The ID of the vehicle
 * @returns Pricing tier information including base rates and category
 */
export const getVehiclePricingTier = (vehicleId: string): VehiclePricingTier => {
  const normalized = normalizeVehicleId(vehicleId);
  console.log(`Getting pricing tier for vehicle: ${normalized}`);
  
  // Map of known vehicle types and their default pricing information
  const vehicleTiers: Record<string, VehiclePricingTier> = {
    // Premium MPVs
    'innova_hycross': {
      basePrice: 5730,
      pricePerKm: 22,
      driverAllowance: 300,
      category: 'premium_mpv',
      displayName: 'Innova Hycross'
    },
    
    // Regular MPVs
    'innova_crysta': {
      basePrice: 5500,
      pricePerKm: 20,
      driverAllowance: 300,
      category: 'mpv',
      displayName: 'Innova Crysta'
    },
    'innova': {
      basePrice: 5500, 
      pricePerKm: 20, 
      driverAllowance: 300,
      category: 'mpv',
      displayName: 'Innova'
    },
    
    // SUVs
    'ertiga': {
      basePrice: 5400,
      pricePerKm: 18,
      driverAllowance: 250,
      category: 'suv',
      displayName: 'Ertiga'
    },
    'xuv': {
      basePrice: 5400,
      pricePerKm: 18,
      driverAllowance: 250,
      category: 'suv',
      displayName: 'XUV'
    },
    
    // Sedans
    'sedan': {
      basePrice: 3900,
      pricePerKm: 13,
      driverAllowance: 250,
      category: 'sedan',
      displayName: 'Sedan'
    },
    'dzire': {
      basePrice: 3900,
      pricePerKm: 13,
      driverAllowance: 250,
      category: 'sedan',
      displayName: 'Dzire'
    },
    
    // Large group vehicles
    'tempo': {
      basePrice: 9000,
      pricePerKm: 22,
      driverAllowance: 300,
      category: 'tempo',
      displayName: 'Tempo Traveller'
    },
    'traveller': {
      basePrice: 9000,
      pricePerKm: 22,
      driverAllowance: 300,
      category: 'tempo',
      displayName: 'Tempo Traveller'
    },
    
    // Luxury vehicles
    'luxury': {
      basePrice: 5000,
      pricePerKm: 16,
      driverAllowance: 300,
      category: 'luxury',
      displayName: 'Luxury Sedan'
    }
  };
  
  // Find an exact match first
  for (const [key, tier] of Object.entries(vehicleTiers)) {
    if (normalized === key) {
      console.log(`Found exact match for ${normalized}:`, tier);
      return tier;
    }
  }
  
  // If no exact match, try to find by partial name
  for (const [key, tier] of Object.entries(vehicleTiers)) {
    if (normalized.includes(key)) {
      console.log(`Found partial match for ${normalized} with ${key}:`, tier);
      return tier;
    }
  }
  
  console.log(`No match found for ${normalized}, using default sedan pricing`);
  return {
    basePrice: 3900,
    pricePerKm: 13,
    driverAllowance: 250,
    category: 'sedan',
    displayName: 'Standard Vehicle'
  };
};

/**
 * Determine minimum and maximum valid fare amounts for a vehicle type and trip
 * @param vehicleId The ID of the vehicle
 * @param tripType The type of trip (local, outstation, airport, etc.)
 * @returns Object containing minimum and maximum valid fare amounts
 */
export const getValidFareRange = (vehicleId: string, tripType: string): { minFare: number, maxFare: number } => {
  const pricingTier = getVehiclePricingTier(vehicleId);
  const category = pricingTier.category;
  
  // Set min/max fare based on vehicle category and trip type
  let minFare = 500;
  let maxFare = 20000;
  
  if (category === 'sedan') {
    minFare = tripType === 'local' ? 1000 : 2000;
    maxFare = 8000;
  } else if (category === 'suv') {
    minFare = tripType === 'local' ? 1500 : 2500;
    maxFare = 12000;
  } else if (category === 'mpv' || category === 'premium_mpv') {
    minFare = tripType === 'local' ? 2000 : 3000;
    maxFare = 15000;
  } else if (category === 'luxury') {
    minFare = tripType === 'local' ? 3000 : 4000;
    maxFare = 20000;
  } else if (category === 'tempo') {
    minFare = tripType === 'local' ? 4000 : 5000;
    maxFare = 25000;
  }
  
  return { minFare, maxFare };
};

/**
 * Validate if a fare amount is within reasonable range for a vehicle and trip type
 * @param fare The fare amount to validate
 * @param vehicleId The ID of the vehicle
 * @param tripType The type of trip
 * @returns Boolean indicating if the fare is valid
 */
export const validateFareAmount = (fare: number, vehicleId: string, tripType: string): boolean => {
  if (isNaN(fare) || fare <= 0) return false;
  
  const { minFare, maxFare } = getValidFareRange(vehicleId, tripType);
  
  if (fare < minFare) {
    console.warn(`Fare value too low: ${fare} for ${vehicleId} (${tripType}). Minimum expected: ${minFare}`);
    return false;
  }
  
  if (fare > maxFare) {
    console.warn(`Fare value too high: ${fare} for ${vehicleId} (${tripType}). Maximum expected: ${maxFare}`);
    return false;
  }
  
  return true;
};

/**
 * Validate and emit a fare update event
 * @param fare The fare amount
 * @param vehicleId The vehicle ID
 * @param source The source of the fare (e.g., 'api', 'database', 'default')
 */
export const emitFareUpdate = (fare: number, vehicleId: string, tripType: string, source: string = 'default') => {
  try {
    window.dispatchEvent(new CustomEvent('fare-update', {
      detail: {
        vehicleId,
        fare,
        tripType,
        source,
        timestamp: Date.now()
      }
    }));
    console.log(`Emitted fare update for ${vehicleId}: ₹${fare} (${source})`);
    
    // Also store in localStorage for persistence
    const key = `fare_${tripType}_${normalizeVehicleId(vehicleId)}`;
    localStorage.setItem(key, JSON.stringify({
      fare,
      source,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Error emitting fare update:', error);
  }
};

/**
 * Get default pricing information for a vehicle by its type
 * @param cabType The type/name of the vehicle (sedan, ertiga, etc.)
 * @returns Default pricing information
 */
export const getDefaultVehiclePricing = (cabType: string = 'sedan') => {
  const tier = getVehiclePricingTier(cabType);
  
  return {
    basePrice: tier.basePrice,
    pricePerKm: tier.pricePerKm,
    nightHaltCharge: tier.category === 'sedan' ? 700 : 1000,
    driverAllowance: tier.driverAllowance
  };
};
