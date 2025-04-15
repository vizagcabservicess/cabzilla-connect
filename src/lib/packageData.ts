
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
export const hourlyPackageOptions = [
  { value: '4hrs-40km', label: '4 Hours / 40 KM' },
  { value: '8hrs-80km', label: '8 Hours / 80 KM' },
  { value: '10hrs-100km', label: '10 Hours / 100 KM' }
];

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
    '4hrs-40km': 1500,
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

// Cache for local package prices
let localPackagePriceCache: Record<string, any> = {};

// Function to get price for a local package - alias for backwards compatibility
export const getLocalPackagePriceFromApi = getLocalPackagePrice;

// Function to get price for a local package
export async function getLocalPackagePrice(packageId: string, vehicleType: string): Promise<number> {
  const cacheKey = `${vehicleType}_${packageId}`;
  
  // Try to get from cache first
  if (localPackagePriceCache[cacheKey] && localPackagePriceCache[cacheKey].price) {
    console.log(`Using cached price for ${cacheKey}: ${localPackagePriceCache[cacheKey].price}`);
    return localPackagePriceCache[cacheKey].price || 0;
  }
  
  // Try to get from localStorage
  const localStorageKey = `fare_local_${vehicleType.toLowerCase().replace(/\s+/g, '')}`;
  const storedPrice = localStorage.getItem(localStorageKey);
  if (storedPrice) {
    const price = parseInt(storedPrice, 10);
    if (price > 0) {
      console.log(`Using stored local package price for ${vehicleType}: ${price}`);
      // Update cache
      localPackagePriceCache[cacheKey] = { price, timestamp: Date.now() };
      return price;
    }
  }
  
  // Normalize vehicle type for lookup
  const normalizedVehicleType = vehicleType.toLowerCase().replace(/\s+/g, '_');
  
  // Map variant names to base vehicle types
  let mappedVehicleType = normalizedVehicleType;
  if (normalizedVehicleType.includes('innova')) {
    mappedVehicleType = 'innova_crysta';
  } else if (normalizedVehicleType.includes('dzire')) {
    mappedVehicleType = 'sedan';
  } else if (normalizedVehicleType.includes('etios')) {
    mappedVehicleType = 'sedan';
  } else if (normalizedVehicleType.includes('tempo') || normalizedVehicleType.includes('traveller')) {
    mappedVehicleType = 'tempo';
  } else if (normalizedVehicleType === 'hycross') {
    mappedVehicleType = 'innova_crysta';
  }
  
  try {
    // First try local-package-fares.php as the primary endpoint
    let price = 0;
    let apiResponse = null;
    
    try {
      console.log(`Fetching local fares for vehicle ${mappedVehicleType} with timestamp: ${Date.now()}`);
      const response = await axios.get(`/api/local-package-fares.php?vehicle_id=${mappedVehicleType}`);
      
      if (response.data && response.data.status === 'success' && response.data.fares) {
        const fareData = response.data.fares[mappedVehicleType];
        
        if (fareData) {
          console.log(`Local fares for vehicle ${mappedVehicleType}:`, fareData);
          
          if (packageId === '4hrs-40km') {
            price = fareData.price4hrs40km || fareData.price_4hr_40km || 0;
          } else if (packageId === '8hrs-80km') {
            price = fareData.price8hrs80km || fareData.price_8hr_80km || 0;
          } else if (packageId === '10hrs-100km') {
            price = fareData.price10hrs100km || fareData.price_10hr_100km || 0;
          }
          
          // If we have a valid price, store it and return
          if (price > 0) {
            apiResponse = {
              source: 'primary-api',
              price: price,
              fareData: fareData
            };
          }
        }
      }
    } catch (primaryApiError) {
      console.warn('Could not fetch from primary API, trying direct API:', primaryApiError);
    }
    
    // If no price yet, try the direct-local-fares.php endpoint
    if (!apiResponse) {
      try {
        const directApiUrl = `/api/direct-local-fares.php?vehicle_id=${mappedVehicleType}&package_id=${packageId}`;
        const directResponse = await axios.get(directApiUrl);
        
        if (directResponse.data && directResponse.data.status === 'success') {
          price = directResponse.data.price || 0;
          
          if (price > 0) {
            apiResponse = {
              source: 'direct-api',
              price: price,
              response: directResponse.data
            };
          }
        }
      } catch (directApiError) {
        console.warn('Could not fetch from direct API, trying alternative endpoints:', directApiError);
      }
    }
    
    // If still no price, try direct-booking-data.php
    if (!apiResponse) {
      try {
        const altApiUrl = `/api/user/direct-booking-data.php?check_sync=1&vehicle_id=${mappedVehicleType}&package_id=${packageId}`;
        const altResponse = await axios.get(altApiUrl);
        
        if (altResponse.data && altResponse.data.status === 'success') {
          price = altResponse.data.price || altResponse.data.baseFare || 0;
          
          if (price > 0) {
            apiResponse = {
              source: 'alternative-api',
              price: price,
              response: altResponse.data
            };
            console.log(`Alternative API returned price for ${packageId} (${mappedVehicleType}): ${price}`);
          }
        }
      } catch (altApiError) {
        console.warn('Could not fetch from alternative API:', altApiError);
      }
    }
    
    // If we now have a valid price from any API, use it
    if (apiResponse && apiResponse.price > 0) {
      price = apiResponse.price;
      console.log(`Retrieved package price from API (${apiResponse.source}): ${price}`);
      
      // Store the price in cache and localStorage for future use
      localPackagePriceCache[cacheKey] = { price, timestamp: Date.now(), source: apiResponse.source };
      localStorage.setItem(localStorageKey, price.toString());
      
      return price;
    }
    
    // If still no valid price, use default prices
    if (!price || price <= 0) {
      // Use default values based on vehicle type if API call fails
      const defaultVehicleData = defaultLocalPackagePrices[mappedVehicleType] || defaultLocalPackagePrices['sedan'];
      price = defaultVehicleData[packageId as keyof typeof defaultVehicleData] || 0;
      
      console.log(`Using default price for ${packageId} (${mappedVehicleType}): ${price}`);
      
      // Store the default price in cache and localStorage
      localPackagePriceCache[cacheKey] = { price, timestamp: Date.now(), source: 'default' };
      localStorage.setItem(localStorageKey, price.toString());
    }
    
    return price;
  } catch (error) {
    console.error('Error fetching local package price:', error);
    
    // Use default values based on vehicle type if API call fails
    let fallbackPrice = 0;
    
    if (mappedVehicleType in defaultLocalPackagePrices) {
      fallbackPrice = defaultLocalPackagePrices[mappedVehicleType][packageId as keyof typeof defaultLocalPackagePrices[typeof mappedVehicleType]];
    } else {
      // Default sedan prices if vehicle type not found
      fallbackPrice = defaultLocalPackagePrices['sedan'][packageId as keyof typeof defaultLocalPackagePrices['sedan']];
    }
    
    console.log(`Using fallback price for ${packageId} (${mappedVehicleType}): ${fallbackPrice}`);
    
    // Store the fallback price in cache and localStorage
    localPackagePriceCache[cacheKey] = { price: fallbackPrice, timestamp: Date.now(), source: 'fallback' };
    localStorage.setItem(localStorageKey, fallbackPrice.toString());
    
    return fallbackPrice;
  }
}

// Function to clear the local package price cache
export function clearLocalPackagePriceCache() {
  localPackagePriceCache = {};
  console.log('Local package price cache cleared');
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

// Function to fetch and cache local fares
export async function fetchAndCacheLocalFares() {
  try {
    const response = await axios.get('/api/local-package-fares.php');
    if (response.data && response.data.status === 'success' && response.data.fares) {
      return response.data.fares;
    }
    return null;
  } catch (error) {
    console.error('Error fetching local fares:', error);
    return null;
  }
}
