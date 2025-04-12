
import { CabType, HourlyPackage, FareCache, FareCalculationParams } from '@/types/cab';
import { TripType, TripMode } from './tripTypes';
import { hourlyPackages } from './packageData';
import { fareService } from '@/services/fareService';

// Initialize the cache for fare calculations to prevent recalculating the same fare
const fareCache: FareCache = {
  timestamp: Date.now(),
  fares: {}
};

// Clear cache for fare calculations
export const clearFareCache = () => {
  // Reset the cache with new timestamp and empty fares object
  fareCache.timestamp = Date.now();
  fareCache.fares = {};
  
  console.log('Fare cache cleared');
  
  // Dispatch an event to notify components about the cleared cache
  window.dispatchEvent(new CustomEvent('fare-cache-cleared'));
};

// Helper function to normalize vehicle IDs for consistent lookup
const normalizeVehicleId = (vehicleId: string): string => {
  // Convert to lowercase and remove spaces
  let normalized = vehicleId.toLowerCase().replace(/[\s-]+/g, '_');
  
  // Map common vehicle types to standard IDs
  if (normalized.includes('innova') && normalized.includes('crysta')) {
    return 'innova_crysta';
  } else if (normalized.includes('innova') && normalized.includes('hycross')) {
    return 'innova_crysta'; // Map Hycross to Crysta for fare lookup
  } else if (normalized.includes('innova')) {
    return 'innova_crysta';
  } else if (normalized.includes('ertiga')) {
    return 'ertiga';
  } else if (normalized.includes('sedan') || normalized.includes('dzire')) {
    return 'sedan';
  } else if (normalized.includes('luxury')) {
    return 'luxury';
  } else if (normalized.includes('tempo')) {
    return 'tempo';
  } else if (normalized.includes('mpv')) {
    return 'innova_crysta'; // Map MPV to Innova Crysta as fallback
  }
  
  return normalized;
};

// Calculate airport fare
export const calculateAirportFare = async (cabType: CabType, distance: number): Promise<number> => {
  // First, normalize the vehicle ID for consistent lookup
  const normalizedVehicleId = normalizeVehicleId(cabType.id);
  
  // Get a list of possible cache keys to check
  const possibleCacheKeys = [
    `airport_${cabType.id}_${Math.round(distance)}`,
    `airport_${normalizedVehicleId}_${Math.round(distance)}`
  ];
  
  // Check if we have a cached result for any of the possible keys
  for (const cacheKey of possibleCacheKeys) {
    if (fareCache.fares[cacheKey]) {
      console.log(`Using cached airport fare for ${cabType.id}: ${fareCache.fares[cacheKey]}`);
      return fareCache.fares[cacheKey];
    }
  }
  
  // List of possible localStorage keys to check
  const possibleLocalStorageKeys = [
    `airport_fare_${cabType.id.toLowerCase()}`,
    `airport_fare_${normalizedVehicleId}`
  ];
  
  // Check if we have an airport fare in localStorage
  for (const localStorageKey of possibleLocalStorageKeys) {
    const storedFare = localStorage.getItem(localStorageKey);
    if (storedFare) {
      const fareValue = parseInt(storedFare, 10);
      if (!isNaN(fareValue) && fareValue > 0) {
        console.log(`Using stored airport fare for ${cabType.id}: ${fareValue}`);
        fareCache.fares[possibleCacheKeys[0]] = fareValue;
        return fareValue;
      }
    }
  }
  
  try {
    // Try to get the fare from the API using the original ID
    console.log(`Fetching airport fares for vehicle ${cabType.id} (normalized: ${normalizedVehicleId}) with timestamp: ${Date.now()}`);
    let airportFare = await fareService.getAirportFaresForVehicle(cabType.id);
    
    // If no results with original ID, try with normalized ID
    if (!airportFare || !airportFare.basePrice) {
      console.log(`No results with original ID, trying normalized ID: ${normalizedVehicleId}`);
      airportFare = await fareService.getAirportFaresForVehicle(normalizedVehicleId);
    }
    
    // If we got a valid fare from API, use it
    if (airportFare && airportFare.basePrice) {
      console.log(`Got valid airport fare from API for ${cabType.id}: ${airportFare.basePrice}`);
      
      // Save to localStorage for future use
      localStorage.setItem(possibleLocalStorageKeys[0], airportFare.basePrice.toString());
      
      // Cache and return the base fare
      fareCache.fares[possibleCacheKeys[0]] = airportFare.basePrice;
      return airportFare.basePrice;
    }
    
    // If API didn't return valid fare, try fetching all airport fares
    console.log(`No specific airport fare found for vehicle ${cabType.id}, fetching all fares`);
    const airportFaresResponse = await fareService.getAirportFares();
    
    // Type guard to check if the response is an object with a status field
    interface ApiResponse {
      status: string;
      data?: {
        fares?: any[];
        [key: string]: any;
      };
      [key: string]: any;
    }
    
    // Check if response contains fares array and has status success
    if (airportFaresResponse && 
        typeof airportFaresResponse === 'object' &&
        'status' in airportFaresResponse &&
        (airportFaresResponse as ApiResponse).status === "success" && 
        'data' in airportFaresResponse &&
        airportFaresResponse.data && 
        'fares' in airportFaresResponse.data &&
        Array.isArray(airportFaresResponse.data.fares) && 
        airportFaresResponse.data.fares.length > 0) {
      
      console.log("Successfully received airport fares data:", airportFaresResponse.data);
      
      // Try to find an exact match first
      const matchingFare = airportFaresResponse.data.fares.find((fare: any) => 
        fare.vehicle_id === cabType.id || 
        fare.vehicleId === cabType.id ||
        fare.vehicle_id === normalizedVehicleId || 
        fare.vehicleId === normalizedVehicleId
      );
      
      if (matchingFare && matchingFare.basePrice) {
        console.log(`Found matching fare in all fares for ${cabType.id}: ${matchingFare.basePrice}`);
        
        // Save to localStorage for future use
        localStorage.setItem(possibleLocalStorageKeys[0], matchingFare.basePrice.toString());
        
        // Cache and return the base fare
        fareCache.fares[possibleCacheKeys[0]] = matchingFare.basePrice;
        return matchingFare.basePrice;
      }
      
      // If no exact vehicle match but we have fares, use the first one as fallback
      if (airportFaresResponse.data.fares.length > 0 && 
          airportFaresResponse.data.fares[0].basePrice) {
        const firstFare = airportFaresResponse.data.fares[0].basePrice;
        console.log(`No exact match found, using first available fare: ${firstFare}`);
        
        // Save to localStorage for future use
        localStorage.setItem(possibleLocalStorageKeys[0], firstFare.toString());
        
        // Cache and return the first fare
        fareCache.fares[possibleCacheKeys[0]] = firstFare;
        return firstFare;
      }
    } else if (airportFaresResponse && 
              typeof airportFaresResponse === 'object' &&
              'status' in airportFaresResponse &&
              (airportFaresResponse as ApiResponse).status === "success") {
      console.log("API returned success but no valid fare data structure:", airportFaresResponse);
    }
    
    // Fallback calculation if API doesn't return a valid fare
    console.log(`No valid airport fare found for ${cabType.id}, using fallback calculation`);
    
    // Use our database values as fallbacks based on screenshots
    let baseFare: number;
    
    if (normalizedVehicleId.includes('sedan')) {
      baseFare = 3900;
    } else if (normalizedVehicleId.includes('ertiga')) {
      baseFare = 3200;
    } else if (normalizedVehicleId.includes('innova')) {
      baseFare = 4000;
    } else if (normalizedVehicleId.includes('luxury')) {
      baseFare = 7000;
    } else if (normalizedVehicleId.includes('tempo')) {
      baseFare = 6000;
    } else if (normalizedVehicleId.includes('mpv')) {
      baseFare = 4000; // MPV maps to Innova fare
    } else {
      baseFare = 3900; // Default to sedan
    }
    
    // Cache the result
    fareCache.fares[possibleCacheKeys[0]] = baseFare;
    
    // Store in localStorage for future reference
    localStorage.setItem(possibleLocalStorageKeys[0], baseFare.toString());
    
    return baseFare;
    
  } catch (error) {
    console.error('Error calculating airport fare:', error);
    
    // Fallback calculation if API fails
    // Use our database values as fallbacks based on screenshots
    let baseFare: number;
    
    if (normalizedVehicleId.includes('sedan')) {
      baseFare = 3900;
    } else if (normalizedVehicleId.includes('ertiga')) {
      baseFare = 3200;
    } else if (normalizedVehicleId.includes('innova')) {
      baseFare = 4000;
    } else if (normalizedVehicleId.includes('luxury')) {
      baseFare = 7000;
    } else if (normalizedVehicleId.includes('tempo')) {
      baseFare = 6000;
    } else if (normalizedVehicleId.includes('mpv')) {
      baseFare = 4000; // MPV maps to Innova fare
    } else {
      baseFare = 3900; // Default to sedan
    }
    
    // Cache the result
    fareCache.fares[possibleCacheKeys[0]] = baseFare;
    return baseFare;
  }
};

// Calculate fare for a trip
export const calculateFare = async (params: FareCalculationParams): Promise<number> => {
  const { cabType, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate } = params;
  
  // Get current datetime
  const now = new Date().getTime();
  
  // Generate a cache key based on parameters
  const cacheKey = `${cabType.id}_${tripType}_${tripMode}_${Math.round(distance)}_${hourlyPackage || 'none'}_${pickupDate?.getTime() || now}_${returnDate?.getTime() || 'none'}`;
  
  // Check if we have a cached result
  if (fareCache[cacheKey]) {
    return fareCache[cacheKey];
  }
  
  // Calculate base fare
  let fare = 0;
  
  try {
    // If trip type is airport, calculate airport fare
    if (tripType === 'airport') {
      fare = await calculateAirportFare(cabType, distance);
      console.log(`Airport fare for ${cabType.id}: ${fare}`);
    }
    // If trip type is local, calculate local package fare
    else if (tripType === 'local' && hourlyPackage) {
      // Find the selected package
      const selectedPackage = hourlyPackages.find(p => p.id === hourlyPackage);
      
      if (selectedPackage) {
        // Try to get the fare from localStorage for this package and cab type
        const localStorageKey = `local_package_${hourlyPackage}_${cabType.id.toLowerCase()}`;
        const storedFare = localStorage.getItem(localStorageKey);
        
        if (storedFare) {
          const parsedFare = parseInt(storedFare, 10);
          if (!isNaN(parsedFare) && parsedFare > 0) {
            console.log(`Using stored local package fare for ${cabType.id} (${hourlyPackage}): ${parsedFare}`);
            fare = parsedFare;
          }
        }
        
        // If no valid fare found, calculate based on package
        if (fare <= 0) {
          // Calculate based on hourly package - this is a fallback
          const packageMultiplier = {
            'sedan': 1,
            'ertiga': 1.25,
            'innova_crysta': 1.5,
            'luxury': 2,
            'tempo': 2.5
          };
          
          const basePackageFare = selectedPackage.basePrice;
          const multiplier = packageMultiplier[cabType.id] || 1;
          
          fare = Math.round(basePackageFare * multiplier);
          console.log(`Calculated local package fare for ${cabType.id} (${hourlyPackage}): ${fare}`);
        }
      } else {
        // Fallback if package not found
        fare = cabType.price || 2500;
        console.log(`No package found for ${hourlyPackage}, using fallback fare: ${fare}`);
      }
    }
    // If trip type is outstation, calculate outstation fare
    else { // outstation
      // Calculate base fare per km
      const farePerKm = cabType.pricePerKm || (
        cabType.id.includes('luxury') ? 20 :
        cabType.id.includes('innova') ? 17 :
        cabType.id.includes('ertiga') ? 14 : 12
      );
      
      // Base distance fare
      fare = distance * farePerKm;
      
      // For round trips, add driver allowance
      if (tripMode === 'round-trip') {
        const driverAllowance = cabType.driverAllowance || 250;
        fare += driverAllowance;
        
        // If return date is more than a day apart, add night halt charge
        if (pickupDate && returnDate) {
          const pickupDay = new Date(pickupDate).setHours(0, 0, 0, 0);
          const returnDay = new Date(returnDate).setHours(0, 0, 0, 0);
          const daysDifference = Math.floor((returnDay - pickupDay) / (24 * 60 * 60 * 1000));
          
          if (daysDifference >= 1) {
            const nightHaltCharge = cabType.nightHaltCharge || 1000;
            fare += nightHaltCharge * daysDifference;
          }
        }
      }
      
      console.log(`Outstation fare for ${cabType.id} (${tripMode}): ${fare}`);
    }
    
    // Ensure minimum fare
    const minimumFare = 800;
    fare = Math.max(fare, minimumFare);
    
    // Round to nearest 50
    fare = Math.ceil(fare / 50) * 50;
    
    // Cache the result
    fareCache[cacheKey] = fare;
    
    return fare;
  } catch (error) {
    console.error('Error calculating fare:', error);
    
    // Fallback to basic calculation
    const basicFare = cabType.price || 2500;
    
    // Cache the result
    fareCache[cacheKey] = basicFare;
    
    return basicFare;
  }
};
