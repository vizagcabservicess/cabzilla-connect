
import axios from 'axios';
import { cabTypes } from './cabData';
import { getApiUrl } from '@/config/api';

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

// Initialize the global cache if it doesn't exist
if (typeof window !== 'undefined' && !window.localPackagePriceCache) {
  window.localPackagePriceCache = {};
}

// Database prices based on real data
const DB_PRICES: Record<string, Record<string, number>> = {
  'sedan': {
    '4hrs-40km': 1200,
    '8hrs-80km': 2000,
    '10hrs-100km': 2500
  },
  'ertiga': {
    '4hrs-40km': 1500,
    '8hrs-80km': 2000, // Updated price
    '10hrs-100km': 3000
  },
  'innova_crysta': {
    '4hrs-40km': 1800,
    '8hrs-80km': 2000, // Updated price
    '10hrs-100km': 3500
  },
  'innova_hycross': {
    '4hrs-40km': 1800,
    '8hrs-80km': 2000, // Updated price
    '10hrs-100km': 4000
  },
  'tempo': {
    '4hrs-40km': 3000,
    '8hrs-80km': 4000,
    '10hrs-100km': 5500
  },
  'etios': {
    '4hrs-40km': 1200,
    '8hrs-80km': 2000,
    '10hrs-100km': 2500
  },
  'dzire_cng': {
    '4hrs-40km': 1400,
    '8hrs-80km': 2000,
    '10hrs-100km': 3000
  },
  'amaze': {
    '4hrs-40km': 1200,
    '8hrs-80km': 2000,
    '10hrs-100km': 2500
  },
  'luxury': {
    '4hrs-40km': 3500,
    '8hrs-80km': 2000,
    '10hrs-100km': 6500
  }
};

// Function to get price for a local package (main function used throughout the app)
export async function getLocalPackagePrice(packageId: string, vehicleType: string, forceRefresh: boolean = false): Promise<number> {
  try {
    // Normalize parameters
    const normalizedVehicleType = vehicleType.toLowerCase().replace(/\s+/g, '_');
    const normalizedPackageId = packageId.replace('0', '').replace('hr-', 'hrs-');
    
    // Create unique cache key
    const cacheKey = `${normalizedVehicleType}_${normalizedPackageId}`;
    
    // 1. Check cache first unless force refresh requested
    if (!forceRefresh && window.localPackagePriceCache[cacheKey] && window.localPackagePriceCache[cacheKey].price > 0) {
      console.log(`Using cached price for ${cacheKey}: ${window.localPackagePriceCache[cacheKey].price}`);
      return window.localPackagePriceCache[cacheKey].price;
    }
    
    // Map vehicle types to standard types for database pricing
    let mappedVehicleType = normalizedVehicleType;
    
    if (normalizedVehicleType.includes('innova')) {
      if (normalizedVehicleType.includes('hycross')) {
        mappedVehicleType = 'innova_hycross';
      } else {
        mappedVehicleType = 'innova_crysta';
      }
    } else if (normalizedVehicleType.includes('dzire') || normalizedVehicleType.includes('dzire_cng')) {
      mappedVehicleType = 'dzire_cng';
    } else if (normalizedVehicleType.includes('etios') || normalizedVehicleType.includes('toyota')) {
      mappedVehicleType = 'etios';
    } else if (normalizedVehicleType.includes('amaze')) {
      mappedVehicleType = 'amaze';
    } else if (normalizedVehicleType.includes('tempo_traveller') || normalizedVehicleType.includes('traveller')) {
      mappedVehicleType = 'tempo';
    } else if (normalizedVehicleType === 'tempo') {
      mappedVehicleType = 'tempo';
    } else if (normalizedVehicleType.includes('ertiga') || normalizedVehicleType.includes('xl6')) {
      mappedVehicleType = 'ertiga';
    } else if (normalizedVehicleType.includes('mpv')) {
      mappedVehicleType = 'etios';
    }
    
    // 2. PRIORITY 1: Use direct database prices to avoid API calls
    if (DB_PRICES[mappedVehicleType] && DB_PRICES[mappedVehicleType][normalizedPackageId]) {
      const price = DB_PRICES[mappedVehicleType][normalizedPackageId];
      console.log(`Using direct database price for ${normalizedVehicleType} (mapped to ${mappedVehicleType}), ${normalizedPackageId}: ${price}`);
      
      // Update cache with db price
      window.localPackagePriceCache[cacheKey] = { price, timestamp: Date.now(), source: 'database' };
      
      // Store in localStorage for consistency
      const localStorageKey = `fare_local_${normalizedVehicleType}`;
      localStorage.setItem(localStorageKey, price.toString());
      
      // Dispatch event for consistency
      window.dispatchEvent(new CustomEvent('local-fare-updated', {
        detail: { vehicleType: normalizedVehicleType, packageId: normalizedPackageId, price, source: 'database' }
      }));
      
      return price;
    }
    
    // 3. Check localStorage as fallback
    const localStorageKey = `fare_local_${normalizedVehicleType}`;
    const storedPrice = localStorage.getItem(localStorageKey);
    if (storedPrice) {
      const price = parseInt(storedPrice, 10);
      if (price > 0) {
        console.log(`Using stored local package price for ${normalizedVehicleType}: ${price}`);
        // Update cache with stored price
        window.localPackagePriceCache[cacheKey] = { price, timestamp: Date.now(), source: 'localStorage' };
        return price;
      }
    }
    
    // 4. Fallback to default prices if all else fails
    // This ensures we always return a reasonable price
    console.log(`Using fallback price for ${mappedVehicleType}, package: ${normalizedPackageId}`);
    
    // Default values for different vehicle types and packages
    let defaultPrice = 2000; // Default 8hrs-80km price
    
    if (normalizedPackageId === '4hrs-40km') {
      if (mappedVehicleType.includes('innova')) defaultPrice = 1800;
      else if (mappedVehicleType.includes('ertiga')) defaultPrice = 1500;
      else if (mappedVehicleType.includes('tempo')) defaultPrice = 3000;
      else if (mappedVehicleType.includes('luxury')) defaultPrice = 3500;
      else defaultPrice = 1200; // sedan/etios/other sedans
    } 
    else if (normalizedPackageId === '8hrs-80km') {
      if (mappedVehicleType.includes('innova')) defaultPrice = 2000;
      else if (mappedVehicleType.includes('ertiga')) defaultPrice = 2000;
      else if (mappedVehicleType.includes('tempo')) defaultPrice = 4000;
      else if (mappedVehicleType.includes('luxury')) defaultPrice = 2000;
      else defaultPrice = 2000; // sedan/etios/other sedans
    }
    else if (normalizedPackageId === '10hrs-100km') {
      if (mappedVehicleType.includes('innova')) defaultPrice = 3500;
      else if (mappedVehicleType.includes('ertiga')) defaultPrice = 3000;
      else if (mappedVehicleType.includes('tempo')) defaultPrice = 5500;
      else if (mappedVehicleType.includes('luxury')) defaultPrice = 6500;
      else defaultPrice = 2500; // sedan/etios/other sedans
    }
    
    // Cache the default price
    window.localPackagePriceCache[cacheKey] = { price: defaultPrice, timestamp: Date.now(), source: 'default' };
    localStorage.setItem(`fare_local_${normalizedVehicleType}`, defaultPrice.toString());
    
    // Dispatch event for consistency
    window.dispatchEvent(new CustomEvent('local-fare-updated', {
      detail: { vehicleType: normalizedVehicleType, packageId: normalizedPackageId, price: defaultPrice, source: 'default' }
    }));
    
    return defaultPrice;
    
  } catch (error) {
    console.error(`Error getting local package price for ${vehicleType}, ${packageId}:`, error);
    
    // Even if we have an error, still return a reasonable default price
    const defaultPrice = 2000;
    return defaultPrice;
  }
}

// Alias for backward compatibility
export const getLocalPackagePriceFromApi = getLocalPackagePrice;

// Function to clear the local package price cache
export function clearLocalPackagePriceCache() {
  if (typeof window !== 'undefined' && window.localPackagePriceCache) {
    window.localPackagePriceCache = {};
    console.log('Local package price cache cleared');
    
    // Trigger refresh event
    window.dispatchEvent(new CustomEvent('local-fares-cache-cleared', {
      detail: { timestamp: Date.now() }
    }));
  }
}

// Function to get the price for a specific package and vehicle from localStorage
export function getLocalPackagePriceFromStorage(packageId: string, vehicleType: string): number {
  const normalizedVehicleType = vehicleType.toLowerCase().replace(/\s+/g, '_');
  const fareKey = `fare_local_${normalizedVehicleType}`;
  const storedPrice = localStorage.getItem(fareKey);
  
  if (storedPrice) {
    return parseInt(storedPrice, 10);
  }
  
  return 0; // Return 0 to indicate no price found
}

// Function to fetch and cache all local fares
export async function fetchAndCacheLocalFares(forceRefresh: boolean = false): Promise<Record<string, any>> {
  console.log('Fetching all local package fares from DB_PRICES');
  try {
    // Transform the DB_PRICES to our expected format and cache it
    const fares: Record<string, any> = {};
    
    // Extract fare data for each vehicle from our DB_PRICES constant
    Object.entries(DB_PRICES).forEach(([vehicleId, prices]) => {
      fares[vehicleId] = {
        price4hrs40km: prices['4hrs-40km'] || 0,
        price8hrs80km: prices['8hrs-80km'] || 0,
        price10hrs100km: prices['10hrs-100km'] || 0,
        priceExtraKm: 15, // Default extra km rate
        priceExtraHour: 120 // Default extra hour rate
      };
      
      // Store each price in localStorage for quick access
      localStorage.setItem(`fare_local_${vehicleId.toLowerCase()}`, 
        fares[vehicleId].price8hrs80km.toString());
    });
    
    // Cache the fares in localStorage
    const faresKey = 'cached_local_package_fares';
    localStorage.setItem(faresKey, JSON.stringify({
      timestamp: Date.now(),
      data: fares,
      source: 'db-prices'
    }));
    
    // Dispatch event to notify components about updated fares
    window.dispatchEvent(new CustomEvent('local-fares-updated', {
      detail: { timestamp: Date.now(), source: 'db-prices-refresh' }
    }));
    
    return fares;
  } catch (error) {
    console.error('Error handling local fares:', error);
    return {}; // Return empty object if all fails
  }
}
