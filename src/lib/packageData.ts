
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

// Default pricing by vehicle type and package
const defaultLocalPackagePrices = {
  'sedan': {
    '4hrs-40km': 1400,
    '8hrs-80km': 2400,
    '10hrs-100km': 3000,
    extraKmRate: 14,
    extraHourRate: 300,
  },
  'ertiga': {
    '4hrs-40km': 1800,
    '8hrs-80km': 3000,
    '10hrs-100km': 3600,
    extraKmRate: 18,
    extraHourRate: 350,
  },
  'innova_crysta': {
    '4hrs-40km': 2200,
    '8hrs-80km': 3600,
    '10hrs-100km': 4500,
    extraKmRate: 22,
    extraHourRate: 400,
  },
  'tempo': {
    '4hrs-40km': 3000,
    '8hrs-80km': 4500,
    '10hrs-100km': 5600,
    extraKmRate: 30,
    extraHourRate: 500,
  },
  'etios': {
    '4hrs-40km': 1400,
    '8hrs-80km': 2400,
    '10hrs-100km': 3000,
    extraKmRate: 14,
    extraHourRate: 300,
  },
  'dzire_cng': {
    '4hrs-40km': 1400,
    '8hrs-80km': 2400,
    '10hrs-100km': 3000,
    extraKmRate: 14,
    extraHourRate: 300,
  },
  'innova_hycross': {
    '4hrs-40km': 2500,
    '8hrs-80km': 4000,
    '10hrs-100km': 5000,
    extraKmRate: 25,
    extraHourRate: 450,
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
    if (normalizedVehicleType.includes('innova') && normalizedVehicleType.includes('hycross')) {
      mappedVehicleType = 'innova_hycross';
    } else if (normalizedVehicleType.includes('innova') || normalizedVehicleType === 'hycross') {
      mappedVehicleType = 'innova_crysta';
    } else if (normalizedVehicleType.includes('dzire') || normalizedVehicleType.includes('etios') || 
               normalizedVehicleType.includes('swift') || normalizedVehicleType.includes('amaze')) {
      mappedVehicleType = 'sedan';
    } else if (normalizedVehicleType.includes('tempo') || normalizedVehicleType.includes('traveller')) {
      mappedVehicleType = 'tempo';
    } else if (normalizedVehicleType.includes('ertiga') || normalizedVehicleType.includes('xl6')) {
      mappedVehicleType = 'ertiga';
    }
    
    // Determine the default price based on mappedVehicleType and package
    const defaultVehicleData = defaultLocalPackagePrices[mappedVehicleType as keyof typeof defaultLocalPackagePrices] || 
                               defaultLocalPackagePrices['sedan'];
    
    let price = 0;
    
    // Get the price from the default data
    if (normalizedPackageId === '4hrs-40km') {
      price = defaultVehicleData['4hrs-40km'];
    } else if (normalizedPackageId === '8hrs-80km') {
      price = defaultVehicleData['8hrs-80km'];
    } else if (normalizedPackageId === '10hrs-100km') {
      price = defaultVehicleData['10hrs-100km'];
    } else {
      price = defaultVehicleData['8hrs-80km']; // Default to 8hrs if package is unknown
    }
    
    // Log the mapping and price
    console.log(`Local package price for ${vehicleType} (mapped to ${mappedVehicleType}) - ${normalizedPackageId}: ${price}`);
    
    // Store price in cache and localStorage for consistency
    localPackagePriceCache[cacheKey] = { price, timestamp: Date.now(), source: 'default' };
    localStorage.setItem(localStorageKey, price.toString());
    
    // Dispatch event for consistency
    try {
      window.dispatchEvent(new CustomEvent('local-fare-updated', {
        detail: { vehicleType: normalizedVehicleType, packageId: normalizedPackageId, price, source: 'default' }
      }));
    } catch (e) {
      console.error('Error dispatching fare update event:', e);
    }
    
    return price;
  } catch (error) {
    console.error('Error fetching local package price:', error);
    
    // Fallback to default pricing
    const normalizedVehicleType = vehicleType.toLowerCase().replace(/\s+/g, '_');
    const normalizedPackageId = packageId.replace('0', '').replace('hr-', 'hrs-');
    let mappedVehicleType = normalizedVehicleType;
    
    if (normalizedVehicleType.includes('innova') && normalizedVehicleType.includes('hycross')) {
      mappedVehicleType = 'innova_hycross';
    } else if (normalizedVehicleType.includes('innova') || normalizedVehicleType === 'hycross') {
      mappedVehicleType = 'innova_crysta';
    } else if (normalizedVehicleType.includes('dzire') || normalizedVehicleType.includes('etios') || 
               normalizedVehicleType.includes('swift') || normalizedVehicleType.includes('amaze')) {
      mappedVehicleType = 'sedan';
    } else if (normalizedVehicleType.includes('tempo') || normalizedVehicleType.includes('traveller')) {
      mappedVehicleType = 'tempo';
    } else if (normalizedVehicleType.includes('ertiga') || normalizedVehicleType.includes('xl6')) {
      mappedVehicleType = 'ertiga';
    }
    
    const defaultVehicleData = defaultLocalPackagePrices[mappedVehicleType as keyof typeof defaultLocalPackagePrices] || 
                               defaultLocalPackagePrices['sedan'];
    
    let price = 0;
    
    // Get the price from the default data
    if (normalizedPackageId === '4hrs-40km') {
      price = defaultVehicleData['4hrs-40km'];
    } else if (normalizedPackageId === '8hrs-80km') {
      price = defaultVehicleData['8hrs-80km'];
    } else if (normalizedPackageId === '10hrs-100km') {
      price = defaultVehicleData['10hrs-100km'];
    } else {
      price = defaultVehicleData['8hrs-80km']; // Default to 8hrs if package is unknown
    }
    
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
  const normalizedVehicleType = vehicleType.toLowerCase().replace(/\s+/g, '_');
  const fareKey = `fare_local_${normalizedVehicleType}`;
  const storedPrice = localStorage.getItem(fareKey);
  
  if (storedPrice) {
    return parseInt(storedPrice, 10);
  }
  
  // If no stored price is found, use default values
  let mappedVehicleType = normalizedVehicleType;
  
  if (normalizedVehicleType.includes('innova') && normalizedVehicleType.includes('hycross')) {
    mappedVehicleType = 'innova_hycross';
  } else if (normalizedVehicleType.includes('innova')) {
    mappedVehicleType = 'innova_crysta';
  } else if (normalizedVehicleType.includes('dzire') || normalizedVehicleType.includes('etios') || 
             normalizedVehicleType.includes('swift') || normalizedVehicleType.includes('amaze')) {
    mappedVehicleType = 'sedan';
  } else if (normalizedVehicleType.includes('tempo')) {
    mappedVehicleType = 'tempo';
  } else if (normalizedVehicleType.includes('ertiga')) {
    mappedVehicleType = 'ertiga';
  }
  
  // Get the default price from our mapping
  const defaultData = defaultLocalPackagePrices[mappedVehicleType as keyof typeof defaultLocalPackagePrices] || 
                      defaultLocalPackagePrices['sedan'];
  
  const normalizedPackageId = packageId.replace('0', '').replace('hr-', 'hrs-');
  
  if (normalizedPackageId === '4hrs-40km') {
    return defaultData['4hrs-40km'];
  } else if (normalizedPackageId === '8hrs-80km') {
    return defaultData['8hrs-80km'];
  } else if (normalizedPackageId === '10hrs-100km') {
    return defaultData['10hrs-100km'];
  }
  
  return defaultData['8hrs-80km']; // Default to 8hrs if package is unknown
}

// Simulated function to match the API call pattern but use default values directly
export async function fetchAndCacheLocalFares(forceRefresh: boolean = false): Promise<Record<string, any>> {
  // Create default fares object from our default pricing
  const defaultFares: Record<string, any> = {};
  
  for (const vehicleType in defaultLocalPackagePrices) {
    const data = defaultLocalPackagePrices[vehicleType as keyof typeof defaultLocalPackagePrices];
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
