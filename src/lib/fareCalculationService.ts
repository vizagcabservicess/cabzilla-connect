
// Import the required types
import { 
  CabType, 
  FareCalculationParams
} from '@/types/cab';
import fareStateManager from '@/services/FareStateManager';

// Define a cache to store fare data
const fareCache = new Map<string, { timestamp: number; fares: any }>();
const CACHE_EXPIRY = 60 * 1000; // 1 minute

/**
 * Normalize a vehicle ID to ensure consistent lookup
 */
const normalizeVehicleId = (vehicleId: string): string => {
  if (!vehicleId) return '';
  
  // Handle special cases of common vehicle IDs for better matching
  const id = vehicleId.toLowerCase().trim().replace(/\s+/g, '_');
  
  // Map common variants to standardized IDs
  const idMappings: Record<string, string> = {
    'sedan': 'sedan',
    'dzire': 'sedan',
    'swift_dzire': 'sedan',
    'etios': 'sedan',
    'amaze': 'sedan',
    'ertiga': 'ertiga',
    'marazzo': 'ertiga',
    'suv': 'ertiga',
    'innova': 'innova_crysta',
    'innova_crysta': 'innova_crysta',
    'crysta': 'innova_crysta',
    'hycross': 'innova_crysta',
    'mpv': 'innova_crysta',
    'tempo': 'tempo_traveller',
    'tempo_traveller': 'tempo_traveller',
    'traveller': 'tempo_traveller'
  };
  
  return idMappings[id] || id;
};

// Function to clear the fare cache
export const clearFareCache = () => {
  fareCache.clear();
  console.log('Fare cache cleared.');
  
  // Clear FareStateManager cache as well
  fareStateManager.clearCache();
  
  // Notify components that cache has been cleared
  window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
    detail: { timestamp: Date.now() }
  }));
};

// Helper function to format cache key
const getCacheKey = (params: FareCalculationParams): string => {
  const { cabType, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate } = params;
  
  // Use normalized vehicle ID in cache key
  const vehicleId = typeof cabType === 'object' ? 
    normalizeVehicleId(cabType.id) : 
    normalizeVehicleId(cabType);
    
  return `
    cabType:${vehicleId},
    distance:${distance},
    tripType:${tripType},
    tripMode:${tripMode || 'NA'},
    hourlyPackage:${hourlyPackage || 'NA'},
    pickupDate:${pickupDate ? pickupDate.toISOString() : 'NA'},
    returnDate:${returnDate ? returnDate.toISOString() : 'NA'}
  `;
};

// Helper to ensure we have a valid fare based on vehicle and trip type
const validateFare = (fare: number, cabId: string, tripType: string): number => {
  if (fare <= 0) {
    console.warn(`Zero or invalid fare calculated for ${cabId} with trip type ${tripType}`);
    
    // Normalize vehicle ID for consistent lookup
    const normalizedCabId = normalizeVehicleId(cabId);
    
    // Provide better fallback values based on trip type and vehicle category
    let fallbackFare = 0;
    
    if (tripType === 'airport') {
      if (normalizedCabId === 'sedan') {
        fallbackFare = 1500;
      } else if (normalizedCabId === 'ertiga') {
        fallbackFare = 1800;
      } else if (normalizedCabId === 'innova_crysta') {
        fallbackFare = 2200;
      } else if (normalizedCabId === 'tempo_traveller') {
        fallbackFare = 3500;
      } else {
        fallbackFare = 1800; // Default airport fallback
      }
    } else if (tripType === 'local') {
      if (normalizedCabId === 'sedan') {
        fallbackFare = 1600;
      } else if (normalizedCabId === 'ertiga') {
        fallbackFare = 1900;
      } else if (normalizedCabId === 'innova_crysta') {
        fallbackFare = 2300;
      } else if (normalizedCabId === 'tempo_traveller') {
        fallbackFare = 3800;
      } else {
        fallbackFare = 1600; // Default local fallback
      }
    } else if (tripType === 'outstation') {
      if (normalizedCabId === 'sedan') {
        fallbackFare = 2500;
      } else if (normalizedCabId === 'ertiga') {
        fallbackFare = 3000;
      } else if (normalizedCabId === 'innova_crysta') {
        fallbackFare = 3600;
      } else if (normalizedCabId === 'tempo_traveller') {
        fallbackFare = 4500;
      } else {
        fallbackFare = 2500; // Default outstation fallback
      }
    } else { // tour or other types
      if (normalizedCabId === 'sedan') {
        fallbackFare = 2500;
      } else if (normalizedCabId === 'ertiga') {
        fallbackFare = 3000;
      } else if (normalizedCabId === 'innova_crysta') {
        fallbackFare = 3600;
      } else if (normalizedCabId === 'tempo_traveller') {
        fallbackFare = 4500;
      } else {
        fallbackFare = 2500; // Default fallback for other trip types
      }
    }
    
    console.log(`Using fallback fare of ₹${fallbackFare} for ${cabId} (${tripType})`);
    return fallbackFare;
  }
  
  return fare;
};

// Main function to calculate fare
export const calculateFare = async (params: FareCalculationParams): Promise<number> => {
  const { cabType, distance, tripType, tripMode, hourlyPackage, forceRefresh } = params;
  
  // Check if cabType is valid
  if (!cabType || typeof cabType !== 'object') {
    console.error('Invalid cabType provided:', cabType);
    throw new Error(`Invalid cabType provided: ${JSON.stringify(cabType)}`);
  }
  
  // Check if distance is a valid number
  if (typeof distance !== 'number' || isNaN(distance)) {
    console.error('Invalid distance provided:', distance);
    throw new Error(`Invalid distance provided: ${distance}`);
  }
  
  // Check if tripType is a valid string
  if (typeof tripType !== 'string' || !['local', 'outstation', 'airport', 'tour'].includes(tripType.toLowerCase())) {
    console.error('Invalid tripType provided:', tripType);
    throw new Error(`Invalid tripType provided: ${tripType}`);
  }
  
  // Check if tripMode is valid for outstation trips
  if (tripType === 'outstation' && (typeof tripMode !== 'string' || !['one-way', 'round-trip'].includes(tripMode.toLowerCase()))) {
    console.error('Invalid tripMode provided for outstation trip:', tripMode);
    throw new Error(`Invalid tripMode provided for outstation trip: ${tripMode}`);
  }
  
  // Check if hourlyPackage is valid for local trips
  if (tripType === 'local' && hourlyPackage && typeof hourlyPackage !== 'string') {
    console.error('Invalid hourlyPackage provided for local trip:', hourlyPackage);
    throw new Error(`Invalid hourlyPackage provided for local trip: ${hourlyPackage}`);
  }
  
  // Normalize vehicle ID for consistent lookup
  const normalizedVehicleId = normalizeVehicleId(cabType.id);
  
  // Store original vehicle ID for logging and debugging
  const originalVehicleId = cabType.id;
  
  console.log(`Calculating fare for ${originalVehicleId} (normalized to ${normalizedVehicleId})`);
  
  // Generate cache key for lookup
  const cacheKey = getCacheKey(params);
  
  // Check if we have a cached result that's still valid
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
    // Make sure FareStateManager is synced
    if (forceRefresh) {
      await fareStateManager.syncFareData();
    }
    
    if (tripType === 'local') {
      if (hourlyPackage) {
        totalFare = await fareStateManager.calculateLocalFare({
          vehicleId: normalizedVehicleId,
          hourlyPackage
        });
        
        // Validate and use fallback if needed
        totalFare = validateFare(totalFare, originalVehicleId, tripType);
      } else {
        throw new Error('Hourly package is required for local trips');
      }
    } else if (tripType === 'outstation') {
      totalFare = await fareStateManager.calculateOutstationFare({
        vehicleId: normalizedVehicleId,
        distance,
        tripMode: tripMode as 'one-way' | 'round-trip',
        pickupDate: params.pickupDate
      });
      
      // Validate and use fallback if needed
      totalFare = validateFare(totalFare, originalVehicleId, tripType);
    } else if (tripType === 'airport') {
      totalFare = await fareStateManager.calculateAirportFare({
        vehicleId: normalizedVehicleId,
        distance
      });
      
      // Validate and use fallback if needed
      totalFare = validateFare(totalFare, originalVehicleId, tripType);
    } else if (tripType === 'tour') {
      // For tour type, use outstation calculation as base
      totalFare = await fareStateManager.calculateOutstationFare({
        vehicleId: normalizedVehicleId,
        distance,
        tripMode: 'one-way',
        pickupDate: params.pickupDate
      });
      
      // Validate and use fallback if needed
      totalFare = validateFare(totalFare, originalVehicleId, 'tour');
    } else {
      throw new Error(`Unsupported trip type: ${tripType}`);
    }
    
    // Only store valid fares in the cache
    if (totalFare > 0) {
      // Store the calculated fare in the cache
      fareCache.set(cacheKey, {
        timestamp: Date.now(),
        fares: { totalFare }
      });
      
      // Dispatch event for hooks that listen for fare calculations
      window.dispatchEvent(new CustomEvent('fare-calculated', {
        detail: {
          source: 'calculation',
          cabId: cabType.id,
          fare: totalFare,
          tripType: tripType,
          timestamp: Date.now()
        }
      }));
      
      console.log(`Calculated fare for ${cabType.id} (${tripType}):`, totalFare);
      return totalFare;
    } else {
      throw new Error(`Zero or invalid fare calculated for ${cabType.id} with trip type ${tripType}`);
    }
  } catch (error) {
    console.error('Error calculating fare:', error);
    
    // Use normalized vehicle ID for consistent fallback calculation
    const normalizedCabId = normalizeVehicleId(cabType.id);
    let fallbackFare = 0;
    
    // Set appropriate fallbacks based on vehicle type and trip type
    if (tripType === 'airport') {
      if (normalizedCabId === 'sedan') {
        fallbackFare = 1500;
      } else if (normalizedCabId === 'ertiga') {
        fallbackFare = 1800;
      } else if (normalizedCabId === 'innova_crysta') {
        fallbackFare = 2200;
      } else if (normalizedCabId === 'tempo_traveller') {
        fallbackFare = 3500;
      } else {
        fallbackFare = 1800; // Default airport fallback
      }
    } else if (tripType === 'local') {
      if (normalizedCabId === 'sedan') {
        fallbackFare = 1600;
      } else if (normalizedCabId === 'ertiga') {
        fallbackFare = 1900;
      } else if (normalizedCabId === 'innova_crysta') {
        fallbackFare = 2300;
      } else if (normalizedCabId === 'tempo_traveller') {
        fallbackFare = 3800;
      } else {
        fallbackFare = 1600; // Default local fallback
      }
    } else if (tripType === 'outstation' || tripType === 'tour') {
      if (normalizedCabId === 'sedan') {
        fallbackFare = 2500;
      } else if (normalizedCabId === 'ertiga') {
        fallbackFare = 3000;
      } else if (normalizedCabId === 'innova_crysta') {
        fallbackFare = 3600;
      } else if (normalizedCabId === 'tempo_traveller') {
        fallbackFare = 4500;
      } else {
        fallbackFare = 2500; // Default outstation fallback
      }
    }
    
    console.log(`Using fallback fare due to error: ₹${fallbackFare} for ${cabType.id} (${tripType})`);
    
    // Store fallback in cache to avoid repeated failures
    fareCache.set(cacheKey, {
      timestamp: Date.now(),
      fares: { totalFare: fallbackFare }
    });
    
    // Dispatch event for hooks that listen for fare calculations
    window.dispatchEvent(new CustomEvent('fare-calculated', {
      detail: {
        source: 'fallback',
        cabId: cabType.id,
        fare: fallbackFare,
        tripType: tripType,
        timestamp: Date.now()
      }
    }));
    
    return fallbackFare;
  }
};
