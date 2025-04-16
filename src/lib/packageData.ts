
import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { toast } from 'sonner';

// Define package type
export interface HourlyPackage {
  id: string;
  name: string;
  hours: number;
  kilometers: number;
  basePrice: number;
}

// Standard hourly packages
export const hourlyPackages: HourlyPackage[] = [
  {
    id: '4hrs-40km',
    name: '4 Hours Package',
    hours: 4,
    kilometers: 40,
    basePrice: 0
  },
  {
    id: '8hrs-80km',
    name: '8 Hours Package',
    hours: 8,
    kilometers: 80,
    basePrice: 0
  },
  {
    id: '10hrs-100km',
    name: '10 Hours Package',
    hours: 10,
    kilometers: 100,
    basePrice: 0
  }
];

// Local package price cache
if (typeof window !== 'undefined' && !window.localPackagePriceCache) {
  window.localPackagePriceCache = {};
}

// Price matrix for local packages
let localPackagePriceMatrix: Record<string, Record<string, number>> = {};

/**
 * Get price for a local package, first from cache, then from API with fallback mechanism
 */
export const getLocalPackagePrice = async (
  packageId: string,
  vehicleId: string = 'sedan',
  forceRefresh: boolean = false
): Promise<number> => {
  // Normalize package ID and vehicle ID
  packageId = packageId.toLowerCase().replace(/\s+/g, '-');
  vehicleId = vehicleId.toLowerCase().replace(/\s+/g, '_');
  
  // Create cache key
  const cacheKey = `${vehicleId}_${packageId}`;
  
  // Check cache first unless forced refresh
  if (!forceRefresh && window.localPackagePriceCache && window.localPackagePriceCache[cacheKey]) {
    console.log(`Retrieved cached price for ${cacheKey}: ${window.localPackagePriceCache[cacheKey]}`);
    return window.localPackagePriceCache[cacheKey];
  }
  
  // Next check if we have a price in the matrix (works offline)
  if (localPackagePriceMatrix[vehicleId] && localPackagePriceMatrix[vehicleId][packageId]) {
    const price = localPackagePriceMatrix[vehicleId][packageId];
    if (price > 0) {
      console.log(`Retrieved price from matrix for ${cacheKey}: ${price}`);
      
      // Still cache it for future use
      if (window.localPackagePriceCache) {
        window.localPackagePriceCache[cacheKey] = price;
      }
      
      return price;
    }
  }
  
  // Default prices by package type in case API fails
  const defaultPrices: Record<string, Record<string, number>> = {
    'sedan': {
      '4hrs-40km': 1800,
      '8hrs-80km': 2500,
      '10hrs-100km': 3500
    },
    'dzire_cng': {
      '4hrs-40km': 1800,
      '8hrs-80km': 2500,
      '10hrs-100km': 3500
    },
    'ertiga': {
      '4hrs-40km': 2100,
      '8hrs-80km': 3200,
      '10hrs-100km': 4000
    },
    'innova_crysta': {
      '4hrs-40km': 2500,
      '8hrs-80km': 3800,
      '10hrs-100km': 4500
    },
    'innova_hycross': {
      '4hrs-40km': 3000,
      '8hrs-80km': 4500,
      '10hrs-100km': 5500
    },
    'luxury': {
      '4hrs-40km': 3000,
      '8hrs-80km': 4500,
      '10hrs-100km': 5500
    },
    'tempo_traveller': {
      '4hrs-40km': 3000,
      '8hrs-80km': 5500,
      '10hrs-100km': 6500
    }
  };
  
  try {
    const apiUrl = getApiUrl();
    console.log(`Fetching price from API: ${apiUrl}/api/admin/direct-local-fares.php?vehicle_id=${vehicleId}`);
    
    // Set a lower timeout value to handle API failures quicker
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    
    const response = await axios.get(`${apiUrl}/api/admin/direct-local-fares.php?vehicle_id=${vehicleId}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-Force-Refresh': forceRefresh ? 'true' : 'false'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.data && response.data.fares && Array.isArray(response.data.fares)) {
      // Update the price matrix for this vehicle
      if (!localPackagePriceMatrix[vehicleId]) {
        localPackagePriceMatrix[vehicleId] = {};
      }
      
      // Process the response to extract prices for different packages
      const prices = {};
      let foundPrice = 0;
      
      // Map API response to prices
      response.data.fares.forEach((fare: any) => {
        // Process the response data and extract prices for the packages
        if (fare.price4hrs40km) localPackagePriceMatrix[vehicleId]['4hrs-40km'] = parseFloat(fare.price4hrs40km);
        if (fare.price8hrs80km) localPackagePriceMatrix[vehicleId]['8hrs-80km'] = parseFloat(fare.price8hrs80km);
        if (fare.price10hrs100km) localPackagePriceMatrix[vehicleId]['10hrs-100km'] = parseFloat(fare.price10hrs100km);
        
        // Store in cache
        if (window.localPackagePriceCache) {
          if (fare.price4hrs40km) window.localPackagePriceCache[`${vehicleId}_4hrs-40km`] = parseFloat(fare.price4hrs40km);
          if (fare.price8hrs80km) window.localPackagePriceCache[`${vehicleId}_8hrs-80km`] = parseFloat(fare.price8hrs80km);
          if (fare.price10hrs100km) window.localPackagePriceCache[`${vehicleId}_10hrs-100km`] = parseFloat(fare.price10hrs100km);
        }
        
        // Get the price for the requested package
        if (packageId === '4hrs-40km' && fare.price4hrs40km) foundPrice = parseFloat(fare.price4hrs40km);
        else if (packageId === '8hrs-80km' && fare.price8hrs80km) foundPrice = parseFloat(fare.price8hrs80km);
        else if (packageId === '10hrs-100km' && fare.price10hrs100km) foundPrice = parseFloat(fare.price10hrs100km);
      });
      
      // If we found a price for the requested package, use it
      if (foundPrice > 0) {
        console.log(`API returned price for ${cacheKey}: ${foundPrice}`);
        return foundPrice;
      }
    }
    
    // If we didn't get a valid price from the API, use default price
    const defaultPrice = getDefaultPrice(vehicleId, packageId, defaultPrices);
    console.log(`Using default price for ${cacheKey}: ${defaultPrice}`);
    
    // Cache the default price
    if (window.localPackagePriceCache) {
      window.localPackagePriceCache[cacheKey] = defaultPrice;
    }
    
    return defaultPrice;
  } catch (error: any) {
    console.error(`API call failed for ${cacheKey}:`, error.message || 'Unknown error');
    
    // Fallback to default price
    const defaultPrice = getDefaultPrice(vehicleId, packageId, defaultPrices);
    console.log(`Using fallback price for ${cacheKey} after error: ${defaultPrice}`);
    
    // Cache the default price
    if (window.localPackagePriceCache) {
      window.localPackagePriceCache[cacheKey] = defaultPrice;
    }
    
    return defaultPrice;
  }
};

/**
 * Helper function to get the default price for a package
 */
function getDefaultPrice(
  vehicleId: string,
  packageId: string,
  defaultPrices: Record<string, Record<string, number>>
): number {
  // Try to get the exact vehicle specific price first
  if (defaultPrices[vehicleId] && defaultPrices[vehicleId][packageId]) {
    return defaultPrices[vehicleId][packageId];
  }
  
  // Fallback to a similar vehicle
  let similarVehicle = 'sedan';
  if (vehicleId.includes('innova')) similarVehicle = 'innova_crysta';
  else if (vehicleId.includes('ertiga')) similarVehicle = 'ertiga';
  else if (vehicleId.includes('tempo')) similarVehicle = 'tempo_traveller';
  else if (vehicleId.includes('luxury')) similarVehicle = 'luxury';
  
  // Return the price for the similar vehicle and package, or default to sedan 8hrs-80km price
  if (defaultPrices[similarVehicle] && defaultPrices[similarVehicle][packageId]) {
    return defaultPrices[similarVehicle][packageId];
  }
  
  // Last resort - use sedan 8hrs-80km price
  return 2500;
}

/**
 * Sync local fares with database to ensure data consistency
 */
export const syncLocalFaresWithDatabase = async (): Promise<boolean> => {
  try {
    console.log('Syncing local package fares with database...');
    const apiUrl = getApiUrl();
    
    const response = await axios.get(`${apiUrl}/api/admin/sync-local-fares.php`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-Force-Refresh': 'true',
        'X-Admin-Mode': 'true'
      },
      timeout: 10000 // 10 second timeout
    });
    
    if (response.data && response.data.status === 'success') {
      console.log('Local fares synced successfully');
      return true;
    } else {
      console.error('Sync failed:', response.data);
      return false;
    }
  } catch (error) {
    console.error('Error syncing local fares:', error);
    return false;
  }
};

/**
 * Fetch and cache all local fares for better performance
 */
export const fetchAndCacheLocalFares = async (forceRefresh = false): Promise<boolean> => {
  try {
    console.log('Fetching and caching all local package fares...');
    const vehicleTypes = ['sedan', 'ertiga', 'innova_crysta', 'luxury', 'tempo_traveller'];
    const packageTypes = ['4hrs-40km', '8hrs-80km', '10hrs-100km'];
    
    // Prepare an array of fetch promises
    const fetchPromises = vehicleTypes.map(async (vehicleId) => {
      try {
        // Get prices for this vehicle
        return await Promise.all(packageTypes.map(async (packageId) => {
          try {
            const price = await getLocalPackagePrice(packageId, vehicleId, forceRefresh);
            console.log(`Cached price for ${vehicleId} ${packageId}: ${price}`);
            return { vehicleId, packageId, price, success: true };
          } catch (e) {
            console.error(`Failed to fetch price for ${vehicleId} ${packageId}:`, e);
            return { vehicleId, packageId, price: 0, success: false };
          }
        }));
      } catch (e) {
        console.error(`Failed to fetch prices for vehicle ${vehicleId}:`, e);
        return packageTypes.map(packageId => ({ vehicleId, packageId, price: 0, success: false }));
      }
    });
    
    // Execute all fetch operations with a maximum timeout
    const timeoutPromise = new Promise<any[]>((resolve) => {
      setTimeout(() => {
        resolve([{ timedOut: true }]);
      }, 15000); // 15 second overall timeout
    });
    
    const results = await Promise.race([
      Promise.all(fetchPromises),
      timeoutPromise
    ]);
    
    if (results[0]?.timedOut) {
      console.log('Fetching all prices timed out');
      return false;
    }
    
    // Flatten results and count successes
    const flatResults = results.flat(2);
    const successCount = flatResults.filter(r => r.success).length;
    
    console.log(`Cached ${successCount}/${vehicleTypes.length * packageTypes.length} local package prices`);
    
    // Store timestamp of last full cache update
    localStorage.setItem('localPackagePriceMatrixUpdated', Date.now().toString());
    
    // Dispatch an event to notify components about the updated prices
    window.dispatchEvent(new CustomEvent('local-fares-cached', {
      detail: {
        success: true,
        count: successCount,
        timestamp: Date.now()
      }
    }));
    
    return successCount > 0;
  } catch (error) {
    console.error('Error fetching and caching local fares:', error);
    return false;
  }
};
