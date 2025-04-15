
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
  
  // Map vehicle types to standard types for API lookup
  let mappedVehicleType = normalizedVehicleType;
  if (normalizedVehicleType.includes('innova') || normalizedVehicleType === 'hycross') {
    mappedVehicleType = 'innova_crysta';
  } else if (normalizedVehicleType.includes('dzire') || normalizedVehicleType.includes('etios')) {
    mappedVehicleType = 'sedan';
  } else if (normalizedVehicleType.includes('tempo') || normalizedVehicleType.includes('traveller')) {
    mappedVehicleType = 'tempo';
  }
  
  try {
    // First, try to get prices from local-package-fares.php (primary API)
    const allFares = await fetchAndCacheLocalFares(forceRefresh);
    
    if (allFares && Object.keys(allFares).length > 0) {
      // Find our vehicle in the fares data
      const vehicleFares = allFares[mappedVehicleType] || allFares[normalizedVehicleType];
      
      if (vehicleFares) {
        console.log(`Local fares found for vehicle ${mappedVehicleType}:`, vehicleFares);
        
        let price = 0;
        
        // Get the right price based on package ID
        if (normalizedPackageId === '4hrs-40km') {
          price = vehicleFares.price4hrs40km || vehicleFares.price_4hr_40km || 0;
        } else if (normalizedPackageId === '8hrs-80km') {
          price = vehicleFares.price8hrs80km || vehicleFares.price_8hr_80km || 0;
        } else if (normalizedPackageId === '10hrs-100km') {
          price = vehicleFares.price10hrs100km || vehicleFares.price_10hr_100km || 0;
        }
        
        if (price > 0) {
          console.log(`Found package price from primary API: ${price} for ${cacheKey}`);
          
          // Update cache and localStorage
          localPackagePriceCache[cacheKey] = { price, timestamp: Date.now(), source: 'primary-api' };
          localStorage.setItem(localStorageKey, price.toString());
          
          // Dispatch event to notify other components about updated price
          window.dispatchEvent(new CustomEvent('local-fare-updated', {
            detail: { vehicleType: normalizedVehicleType, packageId: normalizedPackageId, price, source: 'primary-api' }
          }));
          
          return price;
        }
      }
    }
    
    // If primary API failed, try direct API
    try {
      const directApiUrl = `/api/direct-local-fares.php?vehicle_id=${mappedVehicleType}&package_id=${normalizedPackageId}`;
      console.log(`Trying direct API for ${cacheKey}: ${directApiUrl}`);
      const directResponse = await axios.get(directApiUrl);
      
      if (directResponse.data && directResponse.data.status === 'success') {
        const price = directResponse.data.price || directResponse.data.baseFare || 0;
        
        if (price > 0) {
          console.log(`Found package price from direct API: ${price} for ${cacheKey}`);
          
          // Update cache and localStorage
          localPackagePriceCache[cacheKey] = { price, timestamp: Date.now(), source: 'direct-api' };
          localStorage.setItem(localStorageKey, price.toString());
          
          // Dispatch event
          window.dispatchEvent(new CustomEvent('local-fare-updated', {
            detail: { vehicleType: normalizedVehicleType, packageId: normalizedPackageId, price, source: 'direct-api' }
          }));
          
          return price;
        }
      }
    } catch (directApiError) {
      console.warn('Could not fetch from direct API:', directApiError);
    }
    
    // If we get here, use default prices
    const defaultVehicleData = defaultLocalPackagePrices[mappedVehicleType] || defaultLocalPackagePrices['sedan'];
    const price = defaultVehicleData[normalizedPackageId as keyof typeof defaultVehicleData] || 0;
    
    console.log(`Using default price for ${cacheKey}: ${price}`);
    
    // Store the price in cache and localStorage
    localPackagePriceCache[cacheKey] = { price, timestamp: Date.now(), source: 'default' };
    localStorage.setItem(localStorageKey, price.toString());
    
    // Dispatch event for consistency
    window.dispatchEvent(new CustomEvent('local-fare-updated', {
      detail: { vehicleType: normalizedVehicleType, packageId: normalizedPackageId, price, source: 'default' }
    }));
    
    return price;
    
  } catch (error) {
    console.error('Error fetching local package price:', error);
    
    // Fallback to default pricing
    const defaultVehicleData = defaultLocalPackagePrices[mappedVehicleType] || defaultLocalPackagePrices['sedan'];
    const price = defaultVehicleData[normalizedPackageId as keyof typeof defaultVehicleData] || 0;
    
    // Store the price in cache and localStorage
    localPackagePriceCache[cacheKey] = { price, timestamp: Date.now(), source: 'fallback' };
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

// Function to fetch and cache ALL local fares for different vehicles
export async function fetchAndCacheLocalFares(forceRefresh: boolean = false): Promise<Record<string, any>> {
  // Check if we have cached fares and they're not expired
  const faresKey = 'cached_local_package_fares';
  const cachedFares = localStorage.getItem(faresKey);
  
  if (!forceRefresh && cachedFares) {
    try {
      const parsedFares = JSON.parse(cachedFares);
      const now = Date.now();
      
      // Use cache if it's less than 1 hour old
      if (parsedFares.timestamp && (now - parsedFares.timestamp < 3600000)) {
        console.log('Using cached local fares data');
        return parsedFares.data;
      }
    } catch (e) {
      console.error('Error parsing cached fares:', e);
    }
  }
  
  console.log(`${forceRefresh ? 'Force refreshing' : 'Fetching'} local fares from API`);
  
  try {
    // Try the primary API first
    const response = await axios.get('/api/local-package-fares.php', {
      headers: forceRefresh ? { 'X-Force-Refresh': 'true' } : undefined
    });
    
    if (response.data && response.data.status === 'success' && response.data.fares) {
      // Cache the API response
      localStorage.setItem(faresKey, JSON.stringify({
        timestamp: Date.now(),
        data: response.data.fares
      }));
      
      // Dispatch event to notify components about updated fares
      window.dispatchEvent(new CustomEvent('local-fares-updated', {
        detail: { timestamp: Date.now(), source: 'api-refresh' }
      }));
      
      return response.data.fares;
    }
    
    // If primary API failed, try fallback approaches
    throw new Error('Primary API did not return valid fare data');
    
  } catch (error) {
    console.error('Error fetching local fares from primary API:', error);
    
    try {
      // Try direct API as fallback
      const vehicleTypes = ['sedan', 'ertiga', 'innova_crysta', 'tempo'];
      const fares: Record<string, any> = {};
      
      await Promise.all(vehicleTypes.map(async (vehicleType) => {
        try {
          const directResponse = await axios.get(`/api/direct-local-fares.php?vehicle_id=${vehicleType}`);
          
          if (directResponse.data && directResponse.data.status === 'success') {
            const vehicleFares = directResponse.data.fares?.[0] || {};
            
            fares[vehicleType] = {
              price4hrs40km: vehicleFares.price4hrs40km || 0,
              price8hrs80km: vehicleFares.price8hrs80km || 0,
              price10hrs100km: vehicleFares.price10hrs100km || 0,
              priceExtraKm: vehicleFares.priceExtraKm || 0,
              priceExtraHour: vehicleFares.priceExtraHour || 0
            };
          }
        } catch (e) {
          console.warn(`Could not fetch fares for ${vehicleType}:`, e);
        }
      }));
      
      if (Object.keys(fares).length > 0) {
        // Cache the fallback fares
        localStorage.setItem(faresKey, JSON.stringify({
          timestamp: Date.now(),
          data: fares,
          source: 'fallback'
        }));
        
        return fares;
      }
    } catch (fallbackError) {
      console.error('Error fetching fares from fallback API:', fallbackError);
    }
    
    // If all APIs failed, use default values
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
    
    // Cache the default fares
    localStorage.setItem(faresKey, JSON.stringify({
      timestamp: Date.now(),
      data: defaultFares,
      source: 'default'
    }));
    
    return defaultFares;
  }
}
