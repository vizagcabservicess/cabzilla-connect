
import axios from 'axios';
import { cabTypes } from './cabData';

export interface HourlyPackage {
  id: string;
  name: string;
  hours: number;
  kilometers: number;
  basePrice: number;
}

export const hourlyPackages: HourlyPackage[] = [
  { 
    id: '4hrs-40km', 
    name: '4 Hours Package', 
    hours: 4, 
    kilometers: 40, 
    basePrice: 1500 
  },
  { 
    id: '8hrs-80km', 
    name: '8 Hours Package', 
    hours: 8, 
    kilometers: 80, 
    basePrice: 2000 
  },
  { 
    id: '10hrs-100km', 
    name: '10 Hours Package', 
    hours: 10, 
    kilometers: 100, 
    basePrice: 2500 
  }
];

// Legacy format hourly packages (for backward compatibility)
export const hourlyPackageOptions = hourlyPackages.map(pkg => ({
  value: pkg.id,
  label: `${pkg.hours} Hours / ${pkg.kilometers} KM`
}));

interface LocalPackagePrices {
  [key: string]: {
    '4hrs-40km': number;
    '8hrs-80km': number;
    '10hrs-100km': number;
    extraKmRate: number;
    extraHourRate: number;
  };
}

// Default pricing if API fails
const defaultLocalPackagePrices: LocalPackagePrices = {
  'sedan': {
    '4hrs-40km': 1200,
    '8hrs-80km': 2000,
    '10hrs-100km': 2500,
    extraKmRate: 12,
    extraHourRate: 100,
  },
  'ertiga': {
    '4hrs-40km': 1500,
    '8hrs-80km': 2500,
    '10hrs-100km': 3000,
    extraKmRate: 15,
    extraHourRate: 120,
  },
  'innova_crysta': {
    '4hrs-40km': 1800,
    '8hrs-80km': 3000,
    '10hrs-100km': 3500,
    extraKmRate: 18,
    extraHourRate: 150,
  },
  'tempo': {
    '4hrs-40km': 2500,
    '8hrs-80km': 4000,
    '10hrs-100km': 5000,
    extraKmRate: 25,
    extraHourRate: 200,
  }
};

// Global cache for local package prices to ensure consistency
const localPackagePriceCache: Record<string, any> = {};

// Function to get price for a local package (main function used throughout the app)
export async function getLocalPackagePrice(packageId: string, vehicleType: string, forceRefresh: boolean = false): Promise<number> {
  try {
    // Normalize parameters
    const normalizedVehicleType = vehicleType.toLowerCase().replace(/\s+/g, '_');
    const normalizedPackageId = packageId.replace('0', '').replace('hr-', 'hrs-');
    
    // Create unique cache key
    const cacheKey = `${normalizedVehicleType}_${normalizedPackageId}`;
    
    // Check cache first unless force refresh requested
    if (!forceRefresh && localPackagePriceCache[cacheKey] && localPackagePriceCache[cacheKey].price > 0) {
      console.log(`Using cached price for ${cacheKey}: ${localPackagePriceCache[cacheKey].price}`);
      return localPackagePriceCache[cacheKey].price;
    }
    
    // Check localStorage for previously saved price
    const localStorageKey = `fare_local_${normalizedVehicleType}`;
    const storedPrice = localStorage.getItem(localStorageKey);
    if (!forceRefresh && storedPrice) {
      const price = parseInt(storedPrice, 10);
      if (price > 0) {
        console.log(`Using stored local package price for ${normalizedVehicleType}: ${price}`);
        // Update cache with stored price
        localPackagePriceCache[cacheKey] = { price, timestamp: Date.now(), source: 'localStorage' };
        return price;
      }
    }
    
    // Map vehicle types to standard types for default pricing
    let mappedVehicleType = normalizedVehicleType;
    if (normalizedVehicleType.includes('innova') || normalizedVehicleType === 'hycross') {
      mappedVehicleType = 'innova_crysta';
    } else if (normalizedVehicleType.includes('dzire') || normalizedVehicleType.includes('etios')) {
      mappedVehicleType = 'sedan';
    } else if (normalizedVehicleType.includes('tempo') || normalizedVehicleType.includes('traveller')) {
      mappedVehicleType = 'tempo';
    }
    
    // Use default pricing - direct access to default values to prevent API call failures
    const defaultVehicleData = defaultLocalPackagePrices[mappedVehicleType] || defaultLocalPackagePrices['sedan'];
    const defaultPrice = defaultVehicleData[normalizedPackageId as keyof typeof defaultVehicleData] || 0;
    
    // Store default price in cache and localStorage for consistency
    const price = defaultPrice;
    localPackagePriceCache[cacheKey] = { price, timestamp: Date.now(), source: 'default' };
    localStorage.setItem(localStorageKey, price.toString());
    
    // Dispatch event for consistency
    window.dispatchEvent(new CustomEvent('local-fare-updated', {
      detail: { vehicleType: normalizedVehicleType, packageId: normalizedPackageId, price, source: 'default' }
    }));
    
    console.log(`Using default price for ${cacheKey}: ${price}`);
    return price;
  } catch (error) {
    console.error('Error fetching local package price:', error);
    
    // Fallback to default pricing
    const normalizedVehicleType = vehicleType.toLowerCase().replace(/\s+/g, '_');
    const normalizedPackageId = packageId.replace('0', '').replace('hr-', 'hrs-');
    let mappedVehicleType = normalizedVehicleType;
    
    if (normalizedVehicleType.includes('innova') || normalizedVehicleType === 'hycross') {
      mappedVehicleType = 'innova_crysta';
    } else if (normalizedVehicleType.includes('dzire') || normalizedVehicleType.includes('etios')) {
      mappedVehicleType = 'sedan';
    } else if (normalizedVehicleType.includes('tempo') || normalizedVehicleType.includes('traveller')) {
      mappedVehicleType = 'tempo';
    }
    
    const defaultVehicleData = defaultLocalPackagePrices[mappedVehicleType] || defaultLocalPackagePrices['sedan'];
    const price = defaultVehicleData[normalizedPackageId as keyof typeof defaultVehicleData] || 0;
    
    // Store the price in cache and localStorage
    const cacheKey = `${normalizedVehicleType}_${normalizedPackageId}`;
    localPackagePriceCache[cacheKey] = { price, timestamp: Date.now(), source: 'fallback' };
    
    const localStorageKey = `fare_local_${normalizedVehicleType}`;
    localStorage.setItem(localStorageKey, price.toString());
    
    return price;
  }
}

// Alias for backward compatibility
export const getLocalPackagePriceFromApi = getLocalPackagePrice;

// Function to clear the local package price cache
export function clearLocalPackagePriceCache() {
  for (const key in localPackagePriceCache) {
    delete localPackagePriceCache[key];
  }
  console.log('Local package price cache cleared');
  
  // Trigger refresh event
  window.dispatchEvent(new CustomEvent('local-fares-cache-cleared', {
    detail: { timestamp: Date.now() }
  }));
}

// Function to get the price for a specific package and vehicle from localStorage
export function getLocalPackagePriceFromStorage(packageId: string, vehicleType: string): number {
  const normalizedVehicleType = vehicleType.toLowerCase().replace(/\s+/g, '');
  const fareKey = `fare_local_${normalizedVehicleType}`;
  const storedPrice = localStorage.getItem(fareKey);
  
  if (storedPrice) {
    return parseInt(storedPrice, 10);
  }
  
  // If no stored price is found, use default values
  const mappedVehicleType = normalizedVehicleType.includes('innova') ? 'innova_crysta' : 
                           normalizedVehicleType.includes('dzire') ? 'sedan' :
                           normalizedVehicleType.includes('tempo') ? 'tempo' : 
                           normalizedVehicleType;
  
  if (mappedVehicleType in defaultLocalPackagePrices) {
    return defaultLocalPackagePrices[mappedVehicleType][packageId as keyof typeof defaultLocalPackagePrices[typeof mappedVehicleType]];
  }
  
  return defaultLocalPackagePrices['sedan'][packageId as keyof typeof defaultLocalPackagePrices['sedan']];
}

// Simulated function to match the API call pattern but use default values directly
export async function fetchAndCacheLocalFares(forceRefresh: boolean = false): Promise<Record<string, any>> {
  // Create default fares object from our default pricing
  const defaultFares: Record<string, any> = {};
  
  for (const vehicleType in defaultLocalPackagePrices) {
    const data = defaultLocalPackagePrices[vehicleType];
    defaultFares[vehicleType] = {
      price4hrs40km: data['4hrs-40km'],
      price8hrs80km: data['8hrs-80km'],
      price10hrs100km: data['10hrs-100km'],
      priceExtraKm: data.extraKmRate,
      priceExtraHour: data.extraHourRate
    };
  }
  
  // Cache the default fares in localStorage
  const faresKey = 'cached_local_package_fares';
  localStorage.setItem(faresKey, JSON.stringify({
    timestamp: Date.now(),
    data: defaultFares,
    source: 'default'
  }));
  
  // Dispatch event to notify components about updated fares
  window.dispatchEvent(new CustomEvent('local-fares-updated', {
    detail: { timestamp: Date.now(), source: 'default-refresh' }
  }));
  
  return defaultFares;
}
