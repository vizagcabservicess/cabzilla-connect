
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
  return vehicleId.toLowerCase().trim().replace(/\s+/g, '_');
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

// Helper to ensure we have a valid fare
const validateFare = (fare: number, cabId: string, tripType: string): number => {
  if (fare <= 0) {
    console.warn(`Zero or invalid fare calculated for ${cabId} with trip type ${tripType}`);
    
    // Provide better fallback values based on trip type and vehicle category
    let fallbackFare = 1500; // Increased default fallback
    
    if (tripType === 'airport') {
      fallbackFare = 1800; // Higher fallback for airport transfers
    } else if (tripType === 'local') {
      fallbackFare = 1600; // Higher fallback for local trips
    } else if (tripType === 'outstation') {
      fallbackFare = 2500; // Higher fallback for outstation trips
    }
    
    // Adjust based on vehicle category
    const normalizedCabId = normalizeVehicleId(cabId);
    if (normalizedCabId.includes('sedan') || normalizedCabId.includes('dzire') || normalizedCabId.includes('amaze')) {
      // Sedan category - use base fallback
    } else if (normalizedCabId.includes('ertiga') || normalizedCabId.includes('suv')) {
      fallbackFare = Math.round(fallbackFare * 1.3); // 30% higher for SUVs
    } else if (normalizedCabId.includes('innova') || normalizedCabId.includes('crysta') || normalizedCabId.includes('hycross') || normalizedCabId.includes('mpv')) {
      fallbackFare = Math.round(fallbackFare * 1.6); // 60% higher for premium vehicles
    } else if (normalizedCabId.includes('tempo') || normalizedCabId.includes('traveller')) {
      fallbackFare = Math.round(fallbackFare * 2.0); // 100% higher for large vehicles
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
        totalFare = validateFare(totalFare, cabType.id, tripType);
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
      totalFare = validateFare(totalFare, cabType.id, tripType);
    } else if (tripType === 'airport') {
      totalFare = await fareStateManager.calculateAirportFare({
        vehicleId: normalizedVehicleId,
        distance
      });
      
      // Validate and use fallback if needed
      totalFare = validateFare(totalFare, cabType.id, tripType);
    } else if (tripType === 'tour') {
      // For tour type, use outstation calculation as base
      totalFare = await fareStateManager.calculateOutstationFare({
        vehicleId: normalizedVehicleId,
        distance,
        tripMode: 'one-way',
        pickupDate: params.pickupDate
      });
      
      // Validate and use fallback if needed
      totalFare = validateFare(totalFare, cabType.id, 'tour');
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
      
      console.log(`Calculated fare for ${cacheKey}:`, totalFare);
      return totalFare;
    } else {
      throw new Error(`Zero or invalid fare calculated for ${cabType.id} with trip type ${tripType}`);
    }
  } catch (error) {
    console.error('Error calculating fare:', error);
    
    // Use fallbacks based on trip type and vehicle category
    const normalizedCabId = normalizeVehicleId(cabType.id);
    let fallbackFare = 1500; // Increased default fallback
    
    if (tripType === 'airport') {
      fallbackFare = 1800; // Higher fallback for airport transfers
    } else if (tripType === 'local') {
      fallbackFare = 1600; // Higher fallback for local trips
    } else if (tripType === 'outstation' || tripType === 'tour') {
      fallbackFare = 2500; // Higher fallback for outstation/tour trips
    }
    
    // Adjust based on vehicle category
    if (normalizedCabId.includes('sedan') || normalizedCabId.includes('dzire') || normalizedCabId.includes('amaze')) {
      // Sedan category - use base fallback
    } else if (normalizedCabId.includes('ertiga') || normalizedCabId.includes('suv')) {
      fallbackFare = Math.round(fallbackFare * 1.3); // 30% higher for SUVs
    } else if (normalizedCabId.includes('innova') || normalizedCabId.includes('crysta') || normalizedCabId.includes('hycross') || normalizedCabId.includes('mpv')) {
      fallbackFare = Math.round(fallbackFare * 1.6); // 60% higher for premium vehicles
    } else if (normalizedCabId.includes('tempo') || normalizedCabId.includes('traveller')) {
      fallbackFare = Math.round(fallbackFare * 2.0); // 100% higher for large vehicles
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
