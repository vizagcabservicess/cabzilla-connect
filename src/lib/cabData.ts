import { differenceInCalendarDays } from 'date-fns';
import { fareAPI } from '@/services/api';
import { toast } from 'sonner';

export type TripType = 'outstation' | 'local' | 'airport' | 'tour';
export type TripMode = 'one-way' | 'round-trip';
export type LocalTripPurpose = 'business' | 'personal' | 'city-tour';

// Track ongoing vehicle pricing fetch operations
let isFetchingVehiclePricing = false;

export interface HourlyPackage {
  id: string;
  name: string;
  hours: number;
  kilometers: number;
  basePrice: number;
  multiplier: number;
}

// Default cab types (used as fallback if API fails)
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
    ac: true,
    nightHaltCharge: 700,
    driverAllowance: 250,
    isActive: true
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
    ac: true,
    nightHaltCharge: 1000,
    driverAllowance: 250,
    isActive: true
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
    ac: true,
    nightHaltCharge: 1000,
    driverAllowance: 250,
    isActive: true
  }
];

// Cache to store loaded cab types with longer expiration time for better performance
let cachedCabTypes: CabType[] | null = null;
let lastCacheTime = 0;
// Increased cache duration to 5 minutes to reduce API calls
const CACHE_DURATION = 5 * 60 * 1000; 
let isCurrentlyFetchingCabs = false; // Flag to prevent concurrent fetch requests

// Function to load cab types dynamically
export const loadCabTypes = async (): Promise<CabType[]> => {
  try {
    const now = Date.now();
    
    // Use cache if available and not expired
    if (cachedCabTypes && now - lastCacheTime < CACHE_DURATION) {
      console.log('Using cached cab types, cache age:', (now - lastCacheTime) / 1000, 'seconds');
      return cachedCabTypes;
    }
    
    // If already fetching, don't start another fetch
    if (isCurrentlyFetchingCabs) {
      console.log('Another fetch operation is in progress, using default cab types');
      return cabTypes;
    }
    
    isCurrentlyFetchingCabs = true;
    console.log('Fetching new cab types from API');
    
    // Remove the timestamp parameter as it's not accepted by the API
    const vehicleData = await fareAPI.getAllVehicleData();
    
    console.log('Retrieved vehicle data:', vehicleData);
    isCurrentlyFetchingCabs = false;
    
    if (Array.isArray(vehicleData) && vehicleData.length > 0) {
      // Convert API data to CabType format if needed
      const dynamicCabTypes: CabType[] = vehicleData
        .filter(vehicle => vehicle.isActive !== false) // Filter out inactive vehicles
        .map((vehicle) => ({
          id: vehicle.id || '',
          name: vehicle.name || '',
          capacity: vehicle.capacity || 4,
          luggageCapacity: vehicle.luggageCapacity || 2,
          price: vehicle.price || 0,
          pricePerKm: vehicle.pricePerKm || 0,
          image: vehicle.image || '/cars/sedan.png',
          amenities: Array.isArray(vehicle.amenities) ? vehicle.amenities : ['AC'],
          description: vehicle.description || '',
          ac: vehicle.ac !== undefined ? vehicle.ac : true,
          nightHaltCharge: vehicle.nightHaltCharge || 0,
          driverAllowance: vehicle.driverAllowance || 0,
          isActive: vehicle.isActive !== undefined ? vehicle.isActive : true
        }));
      
      // Log active vehicle count
      console.log(`Retrieved ${dynamicCabTypes.length} active vehicle types`);
      
      // Update cache
      cachedCabTypes = dynamicCabTypes;
      lastCacheTime = now;
      
      return dynamicCabTypes;
    }
    
    // If API returns empty data, use default and log warning
    console.warn('API returned empty vehicle data, using defaults');
    return cabTypes;
  } catch (error) {
    console.error('Error loading cab types:', error);
    isCurrentlyFetchingCabs = false;
    // Fallback to default cab types if API call fails
    return cabTypes;
  }
};

// Track ongoing reload operations
let isReloadingCabTypes = false;

// Function to reload cab types and clear cache
export const reloadCabTypes = async (): Promise<CabType[]> => {
  if (isReloadingCabTypes) {
    console.log('Reload operation already in progress, skipping redundant request');
    toast.info("Vehicle data refresh already in progress", {
      id: "fare-refresh-in-progress"
    });
    return cabTypes;
  }
  
  isReloadingCabTypes = true;
  console.log('Forcing reload of cab types by clearing cache');
  
  // Clear all caches that might contain vehicle data
  cachedCabTypes = null;
  lastCacheTime = 0;
  
  // Clear any fare calculation caches
  Object.keys(outstationPricingCache).forEach(key => {
    delete outstationPricingCache[key];
  });
  
  // Clear any cached fare data in session/local storage
  sessionStorage.removeItem('cabFares');
  sessionStorage.removeItem('calculatedFares');
  localStorage.removeItem('cabFares');
  
  try {
    // Add a toast notification to show the user that fares are being refreshed
    toast.info("Refreshing cab fare data...", {
      id: "fare-refresh",
      duration: 2000
    });
    
    const reloadedTypes = await loadCabTypes();
    
    // Show success message when fares are reloaded
    toast.success("Cab fare data refreshed", {
      id: "fare-refresh",
      duration: 2000
    });
    
    isReloadingCabTypes = false;
    return reloadedTypes;
  } catch (error) {
    console.error('Error reloading cab types:', error);
    
    // Show error message if refresh failed
    toast.error("Failed to refresh fare data. Using cached values.", {
      id: "fare-refresh",
      duration: 3000
    });
    
    isReloadingCabTypes = false;
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
    innova: 9000
  },
  yarada_beach: {
    sedan: 2500,
    ertiga: 3500,
    innova: 4500
  },
  rushikonda: {
    sedan: 2000,
    ertiga: 3000,
    innova: 4000
  }
};

// Track ongoing tour fare fetch operations
let isFetchingTourFares = false;

// Function to load tour fares dynamically
export const loadTourFares = async (): Promise<any> => {
  if (isFetchingTourFares) {
    console.log('Tour fare fetch already in progress, returning cached data');
    return tourFares;
  }
  
  try {
    isFetchingTourFares = true;
    console.log("Loading tour fares from API");
    // Remove the timestamp parameter as it's not accepted by the API
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
            innova: tour.innova || 0
          };
        }
      });
    }
    
    isFetchingTourFares = false;
    return Object.keys(dynamicTourFares).length > 0 ? dynamicTourFares : tourFares;
  } catch (error) {
    console.error('Error loading tour fares:', error);
    isFetchingTourFares = false;
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
  
  // Handle undefined or null cabType
  if (!cabType) {
    console.warn('cabType is undefined or null, using default sedan');
    cabType = 'sedan';
  }
  
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
  // Handle undefined or null cabType
  if (!cabType) {
    console.warn('cabType is undefined or null for updateLocalPackagePrice, using default sedan');
    cabType = 'sedan';
  }
  
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
  // Generate cache key for this pricing request
  const cacheKey = `${cabType.id}_${distance}_${tripType}_${tripMode}_${hourlyPackage || ''}_${pickupDate?.getTime() || ''}_${returnDate?.getTime() || ''}`;
  const now = Date.now();
  
  // Check cache first (5 minutes expiration for better performance)
  if (outstationPricingCache[cacheKey] && outstationPricingCache[cacheKey].expire > now) {
    console.log(`Using cached fare calculation for ${cacheKey}`);
    return outstationPricingCache[cacheKey].price;
  }
  
  // For large distances, show toast notification that calculation is in progress
  if (distance > 300 && tripType === 'outstation') {
    toast.info("Calculating fare for long distance trip...", {
      id: "fare-calculation",
      duration: 3000
    });
  }
  
  try {
    if (tripType === 'local') {
      // For local trips, use the hourly package price without distance calculations
      const price = getLocalPackagePrice(hourlyPackage || '8hrs-80km', cabType.name);
      
      // Cache the result
      outstationPricingCache[cacheKey] = {
        expire: now + CACHE_DURATION,
        price: price
      };
      
      return price;
    }
    
    if (tripType === 'airport') {
      // Airport transfers use a fixed price based on distance tiers
      const price = calculateAirportFare(cabType.name, distance);
      
      // Cache the result
      outstationPricingCache[cacheKey] = {
        expire: now + CACHE_DURATION,
        price: price
      };
      
      return price;
    }
    
    // For outstation trips
    if (tripType === 'outstation') {
      // Use the cab's pricing info directly
      let basePrice = cabType.price;
      let perKmRate = cabType.pricePerKm;
      let driverAllowance = cabType.driverAllowance || 250;
      let nightHaltCharge = cabType.nightHaltCharge || (cabType.name.toLowerCase().includes('sedan') ? 700 : 1000);
      
      // Try to get up-to-date pricing info
      try {
        if (!isFetchingVehiclePricing) {
          isFetchingVehiclePricing = true;
          console.log("Fetching latest vehicle pricing from API for", cabType.id);
          // Remove the timestamp parameter as it's not accepted by the API
          const vehiclePricing = await fareAPI.getVehiclePricing();
          console.log("Vehicle pricing data:", vehiclePricing);
          isFetchingVehiclePricing = false;
          
          if (Array.isArray(vehiclePricing) && vehiclePricing.length > 0) {
            const pricing = vehiclePricing.find(p => 
              p.vehicleType?.toLowerCase() === cabType.id?.toLowerCase() || 
              p.vehicleType?.toLowerCase() === cabType.name?.toLowerCase()
            );
            
            if (pricing) {
              console.log("Found pricing for", cabType.name, pricing);
              basePrice = pricing.basePrice || basePrice;
              perKmRate = pricing.pricePerKm || perKmRate;
              driverAllowance = pricing.driverAllowance || driverAllowance;
              nightHaltCharge = pricing.nightHaltCharge || nightHaltCharge;
            } else {
              console.warn("No pricing found for", cabType.name, "in vehicle pricing data");
            }
          }
        } else {
          console.log("Vehicle pricing fetch already in progress, using current values");
        }
      } catch (error) {
        console.warn('Could not fetch latest pricing data, using default values:', error);
        isFetchingVehiclePricing = false;
      }
      
      console.log("Calculating outstation fare with:", {
        cabType: cabType.name,
        basePrice,
        perKmRate,
        driverAllowance,
        nightHaltCharge,
        distance,
        tripMode
      });
      
      if (tripMode === 'one-way') {
        const days = 1;
        const totalMinKm = days * 300;
        const effectiveDistance = distance;
        const extraKm = Math.max(effectiveDistance - totalMinKm, 0);
        const totalBaseFare = basePrice;
        const totalDistanceFare = extraKm * perKmRate;
        const totalDriverAllowance = driverAllowance;
        
        const finalPrice = Math.ceil((totalBaseFare + totalDistanceFare + totalDriverAllowance) / 10) * 10;
        
        // Cache the result
        outstationPricingCache[cacheKey] = {
          expire: now + CACHE_DURATION,
          price: finalPrice
        };
        
        toast.dismiss("fare-calculation");
        return finalPrice;
      } else {
        // For round-trip, calculate based on number of days
        if (!pickupDate || !returnDate) {
          const defaultPrice = basePrice;
          
          // Cache the result
          outstationPricingCache[cacheKey] = {
            expire: now + CACHE_DURATION,
            price: defaultPrice
          };
          
          return defaultPrice;
        }
        
        const days = Math.max(1, differenceInCalendarDays(returnDate, pickupDate) + 1);
        const totalMinKm = days * 300;
        const effectiveDistance = distance * 2; // Double the distance for round trip
        const extraKm = Math.max(effectiveDistance - totalMinKm, 0);
        const totalBaseFare = days * basePrice;
        const totalDistanceFare = extraKm * perKmRate;
        const totalDriverAllowance = days * driverAllowance;
        const totalNightHalt = (days - 1) * nightHaltCharge;
        
        const finalPrice = Math.ceil((totalBaseFare + totalDistanceFare + totalDriverAllowance + totalNightHalt) / 10) * 10;
        
        // Cache the result
        outstationPricingCache[cacheKey] = {
          expire: now + CACHE_DURATION,
          price: finalPrice
        };
        
        toast.dismiss("fare-calculation");
        return finalPrice;
      }
    }
    
    // Default fallback fare calculation
    const defaultPrice = Math.ceil(distance * cabType.pricePerKm);
    
    // Cache the result
    outstationPricingCache[cacheKey] = {
      expire: now + CACHE_DURATION,
      price: defaultPrice
    };
    
    return defaultPrice;
  } catch (error) {
    console.error("Error calculating fare:", error);
    toast.dismiss("fare-calculation");
    // If calculation fails, use a simple fallback calculation
    return Math.ceil(distance * (cabType.pricePerKm || 15));
  }
}

/**
 * Calculate airport transfer fare based on distance and cab type
 */
export function calculateAirportFare(cabType: string, distance: number): number {
  // Handle undefined or null cabType
  if (!cabType) {
    console.warn('cabType is undefined or null for calculateAirportFare, using default sedan');
    cabType = 'sedan';
  }
  
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

// Cache for outstation pricing calculations with longer expiration
const outstationPricingCache: Record<string, {
  expire: number;
  price: number;
}> = {};
