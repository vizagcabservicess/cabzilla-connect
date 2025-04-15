
import axios from 'axios';
import { cabTypes } from './cabData';

export const hourlyPackages = [
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
let localPackagePriceCache: Record<string, Record<string, number>> = {};

// Function to get price for a local package
export async function getLocalPackagePrice(packageId: string, vehicleType: string): Promise<number> {
  const cacheKey = `${vehicleType}_${packageId}`;
  
  // Try to get from cache first
  if (localPackagePriceCache[cacheKey]) {
    console.log(`Using cached price for ${cacheKey}: ${localPackagePriceCache[cacheKey]}`);
    return localPackagePriceCache[cacheKey].price || 0;
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
    // First try to fetch from the direct local package fare API endpoint
    const apiUrl = `/api/direct-local-fares.php?vehicle_id=${mappedVehicleType}&package_id=${packageId}`;
    console.log(`Fetching price for ${packageId} package for vehicle ${mappedVehicleType}`);
    
    let price = 0;
    
    try {
      const response = await axios.get(apiUrl);
      if (response.data && response.data.status === 'success') {
        price = response.data.price || 0;
        console.log(`API returned price for ${packageId} (${mappedVehicleType}): ${price}`);
      }
    } catch (apiError) {
      console.warn('Could not fetch from direct API, trying fallback:', apiError);
    }
    
    // If price is still 0, try the alternative API endpoint
    if (price === 0) {
      try {
        const altApiUrl = `/api/user/direct-booking-data.php?check_sync=1&vehicle_id=${mappedVehicleType}&package_id=${packageId}`;
        const altResponse = await axios.get(altApiUrl);
        
        if (altResponse.data && altResponse.data.status === 'success') {
          price = altResponse.data.price || altResponse.data.baseFare || 0;
          console.log(`Alternative API returned price for ${packageId} (${mappedVehicleType}): ${price}`);
        }
      } catch (altApiError) {
        console.warn('Could not fetch from alternative API, trying local-package-fares.php:', altApiError);
      }
    }
    
    // If price is still 0, try the local-package-fares.php endpoint
    if (price === 0) {
      try {
        const packageFaresUrl = `/api/local-package-fares.php?vehicle_id=${mappedVehicleType}`;
        const packageFaresResponse = await axios.get(packageFaresUrl);
        
        if (packageFaresResponse.data && packageFaresResponse.data.status === 'success') {
          const fares = packageFaresResponse.data.fares && packageFaresResponse.data.fares[mappedVehicleType];
          
          if (fares) {
            if (packageId === '4hrs-40km') {
              price = fares.price4hrs40km || fares.price_4hr_40km || 0;
            } else if (packageId === '8hrs-80km') {
              price = fares.price8hrs80km || fares.price_8hr_80km || 0;
            } else if (packageId === '10hrs-100km') {
              price = fares.price10hrs100km || fares.price_10hr_100km || 0;
            }
            console.log(`Package fares API returned price for ${packageId} (${mappedVehicleType}): ${price}`);
          }
        }
      } catch (packageFaresError) {
        console.warn('Could not fetch from package fares API, using fallback prices:', packageFaresError);
      }
    }
    
    // If we still don't have a price, use default values
    if (price === 0) {
      const defaultVehicleData = defaultLocalPackagePrices[mappedVehicleType] || defaultLocalPackagePrices['sedan'];
      price = defaultVehicleData[packageId] || 0;
      console.log(`Using default price for ${packageId} (${mappedVehicleType}): ${price}`);
    }
    
    // Store the price in cache and localStorage for future use
    localPackagePriceCache[cacheKey] = { price, timestamp: Date.now() };
    
    // Store in localStorage for persistence
    const fareKey = `fare_local_${normalizedVehicleType.replace('_', '')}`;
    localStorage.setItem(fareKey, price.toString());
    
    console.log(`Retrieved package price from mock server API: ${price}`);
    return price;
  } catch (error) {
    console.error('Error fetching local package price:', error);
    
    // Use default values based on vehicle type if API call fails
    let fallbackPrice = 0;
    
    if (mappedVehicleType in defaultLocalPackagePrices) {
      fallbackPrice = defaultLocalPackagePrices[mappedVehicleType][packageId];
    } else {
      // Default sedan prices if vehicle type not found
      fallbackPrice = defaultLocalPackagePrices['sedan'][packageId];
    }
    
    console.log(`Using fallback price for ${packageId} (${mappedVehicleType}): ${fallbackPrice}`);
    
    // Store the fallback price in cache
    localPackagePriceCache[cacheKey] = { price: fallbackPrice, timestamp: Date.now() };
    
    // Store in localStorage for persistence
    const fareKey = `fare_local_${normalizedVehicleType.replace('_', '')}`;
    localStorage.setItem(fareKey, fallbackPrice.toString());
    
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
    return defaultLocalPackagePrices[mappedVehicleType][packageId];
  }
  
  return defaultLocalPackagePrices['sedan'][packageId];
}
