
import { CabType, FareCalculationParams } from '@/types/cab';
import { getLocalPackagePrice } from './packageData';
import { fareService } from '@/services/fareService';

// Cache for calculated fares to avoid redundant calculations
const fareCache: Record<string, { value: number; timestamp: number }> = {};

// Clear the fare cache
export function clearFareCache() {
  Object.keys(fareCache).forEach(key => {
    delete fareCache[key];
  });
  console.log('Fare calculation cache cleared');
}

// Main function to calculate fare based on parameters
export async function calculateFare(params: FareCalculationParams): Promise<number> {
  const { tripType, distance, cabType, tripMode = 'one-way', 
          packageId, hourlyPackage, pickupDate, returnDate, forceRefresh } = params;
  
  // For cab types that might be passed as strings (compatibility with older components)
  const cabTypeId = typeof cabType === 'object' && cabType !== null ? cabType.id : cabType;
  
  // Generate cache key
  const cacheKey = `${tripType}_${cabTypeId}_${distance}_${tripMode}_${packageId || ''}_${hourlyPackage || ''}`;
  
  // Check cache first (unless force refresh is enabled)
  if (!forceRefresh && fareCache[cacheKey] && Date.now() - fareCache[cacheKey].timestamp < 300000) {
    console.log(`Using cached fare for ${cacheKey}: ${fareCache[cacheKey].value}`);
    return fareCache[cacheKey].value;
  }
  
  let fare = 0;
  
  try {
    // Calculate fare based on trip type
    switch (tripType) {
      case 'local':
        fare = await calculateLocalFare({
          tripType, 
          distance, 
          cabType: cabTypeId, 
          packageId: hourlyPackage || packageId
        });
        break;
        
      case 'outstation':
        fare = await calculateOutstationFare({
          tripType, 
          distance, 
          cabType: cabTypeId, 
          tripMode
        });
        break;
        
      case 'airport':
        fare = await calculateAirportFare({
          tripType, 
          distance, 
          cabType: cabTypeId
        });
        break;
        
      case 'tour':
        // Directly load tour fares from the tour API
        fare = await calculateTourFare({
          tripType, 
          distance, 
          cabType: cabTypeId, 
          packageId
        });
        break;
        
      default:
        console.warn(`Unknown trip type: ${tripType}, defaulting to distance-based calculation`);
        // Default to a simple distance-based calculation
        const baseFare = 500; // Base fare
        const ratePerKm = 15; // Rate per km
        fare = baseFare + (distance * ratePerKm);
    }
    
    // Cache the calculated fare
    fareCache[cacheKey] = { value: fare, timestamp: Date.now() };
    console.log(`Calculated fare for ${cacheKey}: ${fare}`);
    
    return fare;
  } catch (error) {
    console.error(`Error calculating fare for ${tripType} trip:`, error);
    throw error;
  }
}

// Function to calculate local package fare
async function calculateLocalFare(params: FareCalculationParams): Promise<number> {
  const { cabType, packageId } = params;
  
  if (!packageId) {
    throw new Error('Package ID is required for local fare calculation');
  }
  
  try {
    // Using the getLocalPackagePrice function from packageData.ts
    const cabTypeId = typeof cabType === 'object' && cabType !== null ? cabType.id : cabType;
    const fare = await getLocalPackagePrice(packageId, cabTypeId);
    
    if (fare <= 0) {
      throw new Error(`No valid fare found for package ${packageId} and cab ${cabTypeId}`);
    }
    
    return fare;
  } catch (error) {
    console.error('Error calculating local fare:', error);
    throw error;
  }
}

// Function to calculate outstation fare
async function calculateOutstationFare(params: FareCalculationParams): Promise<number> {
  const { cabType, distance, tripMode = 'one-way' } = params;
  const cabTypeId = typeof cabType === 'object' && cabType !== null ? cabType.id : cabType;
  
  try {
    // Get outstation fare data from the service
    const fareData = await fareService.getOutstationFaresForVehicle(cabTypeId);
    
    if (!fareData) {
      throw new Error(`No outstation fare data available for ${cabTypeId}`);
    }
    
    let baseFare: number;
    let ratePerKm: number;
    
    if (tripMode === 'round-trip') {
      baseFare = fareData.roundTripBasePrice || fareData.basePrice || 0;
      ratePerKm = fareData.roundTripPricePerKm || fareData.pricePerKm || 0;
    } else {
      baseFare = fareData.basePrice || 0;
      ratePerKm = fareData.pricePerKm || 0;
    }
    
    // Calculate total fare
    let totalFare = baseFare + (distance * ratePerKm);
    
    // Add driver allowance for long trips
    if (distance > 200) {
      totalFare += fareData.driverAllowance || 0;
    }
    
    return totalFare;
  } catch (error) {
    console.error('Error calculating outstation fare:', error);
    throw error;
  }
}

// Function to calculate airport transfer fare
export async function calculateAirportFare(params: FareCalculationParams): Promise<number> {
  const { cabType, distance } = params;
  const cabTypeId = typeof cabType === 'object' && cabType !== null ? cabType.id : cabType;
  
  try {
    // Get airport fare data from the service
    const fareData = await fareService.getAirportFaresForVehicle(cabTypeId);
    
    if (!fareData) {
      throw new Error(`No airport fare data available for ${cabTypeId}`);
    }
    
    // Determine fare tier based on distance
    let fare: number;
    
    if (distance <= 5) {
      fare = fareData.tier1Price || fareData.basePrice || 0;
    } else if (distance <= 10) {
      fare = fareData.tier2Price || fareData.basePrice || 0;
    } else if (distance <= 15) {
      fare = fareData.tier3Price || fareData.basePrice || 0;
    } else {
      fare = fareData.tier4Price || fareData.basePrice || 0;
    }
    
    // Add extra km charge for distances beyond the highest tier
    if (distance > 20) {
      const extraDistance = distance - 20;
      fare += extraDistance * (fareData.extraKmCharge || 0);
    }
    
    return fare;
  } catch (error) {
    console.error('Error calculating airport fare:', error);
    throw error;
  }
}

// Function to calculate tour package fare
async function calculateTourFare(params: FareCalculationParams): Promise<number> {
  const { cabType, packageId } = params;
  
  if (!packageId) {
    throw new Error('Tour ID is required for tour fare calculation');
  }
  
  const cabTypeId = typeof cabType === 'object' && cabType !== null ? cabType.id : cabType;
  
  try {
    // Use direct API to get tour fare
    const response = await fetch(`/api/tour-fares.php?tourId=${packageId}&cabType=${cabTypeId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch tour fare: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'success' && data.fare && data.fare > 0) {
      return Number(data.fare);
    }
    
    // Fallback to static data in tourData.ts if API fails
    // This would need to be imported from tourData.ts
    return 0; // Return 0 for now as a placeholder
  } catch (error) {
    console.error('Error calculating tour fare:', error);
    // Return a default fallback fare based on cab type
    const defaultFares: Record<string, number> = {
      'sedan': 2000,
      'ertiga': 3000,
      'innova': 4000,
      'tempo_traveller': 6000
    };
    
    return defaultFares[cabTypeId] || 2500;
  }
}
