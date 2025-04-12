
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

// Calculate airport fare
export const calculateAirportFare = async (cabType: CabType, distance: number): Promise<number> => {
  const cacheKey = `airport_${cabType.id}_${Math.round(distance)}`;
  
  // Check if we have an airport fare in localStorage
  const localStorageKey = `airport_fare_${cabType.id.toLowerCase()}`;
  const storedFare = localStorage.getItem(localStorageKey);
  
  if (storedFare) {
    const fareValue = parseInt(storedFare, 10);
    if (!isNaN(fareValue) && fareValue > 0) {
      console.log(`Using stored airport fare for ${cabType.id}: ${fareValue}`);
      fareCache.fares[cacheKey] = fareValue;
      return fareValue;
    }
  }
  
  // If we have a cached result, return it
  if (fareCache.fares[cacheKey]) {
    return fareCache.fares[cacheKey];
  }
  
  try {
    // Try to get the fare from the API
    const airportFare = await fareService.getAirportFaresForVehicle(cabType.id);
    
    if (airportFare && airportFare.basePrice) {
      // Save the base fare to localStorage for future use
      localStorage.setItem(localStorageKey, airportFare.basePrice.toString());
      
      // Cache and return the base fare
      fareCache.fares[cacheKey] = airportFare.basePrice;
      return airportFare.basePrice;
    }
    
    // Fallback calculation if API doesn't return a valid fare
    console.log(`No valid airport fare found for ${cabType.id}, using fallback calculation`);
    const baseFare = cabType.id.includes('luxury') ? 2000 : 
                   cabType.id.includes('innova') ? 1500 : 
                   cabType.id.includes('ertiga') ? 1200 : 800;
    
    // Cache the result
    fareCache.fares[cacheKey] = baseFare;
    return baseFare;
    
  } catch (error) {
    console.error('Error calculating airport fare:', error);
    
    // Fallback calculation if API fails
    const baseFare = cabType.id.includes('luxury') ? 2000 : 
                   cabType.id.includes('innova') ? 1500 : 
                   cabType.id.includes('ertiga') ? 1200 : 800;
    
    // Cache the result
    fareCache.fares[cacheKey] = baseFare;
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
