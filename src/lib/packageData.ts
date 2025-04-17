
import axios from 'axios';
import { getApiUrl } from '@/config/api';

// Define vehicle multipliers for pricing
const vehicleMultipliers: Record<string, number> = {
  'sedan': 1.0,
  'hatchback': 0.9,
  'etios': 0.9,
  'dzire': 1.0,
  'ertiga': 1.5,
  'innova': 1.8,
  'innova_crysta': 1.8,
  'toyota_crysta': 1.8,
  'crysta': 1.8,
  'innova_hycross': 2.0,
  'hycross': 2.0,
  'toyota_hycross': 2.0,
  'luxury': 2.5,
  'tempo_traveller': 2.8
};

/**
 * Calculates a price dynamically based on vehicle type and package selected
 */
function calculateDynamicPrice(
  vehicleType: string = 'sedan', 
  packageId: string = '8hrs-80km'
): number {
  // Normalize vehicle type to match multipliers
  const normalizedVehicleType = vehicleType.toLowerCase()
    .replace(/\s+/g, '_')
    .replace('crysta', 'crysta')
    .replace('hycross', 'hycross');
  
  // Determine the multiplier based on vehicle type (default to 1.0 if not found)
  const multiplier = vehicleMultipliers[normalizedVehicleType] || 1.0;
  
  // Base prices for different packages
  const baseValues = {
    '4hrs-40km': 1200,
    '8hrs-80km': 2000,
    '10hrs-100km': 2500
  };
  
  // Normalize package ID to match base values
  const normalizedPackageId = packageId
    .replace(/\d+hr-/, match => match.replace('hr-', 'hrs-'))
    .replace(/\d+hr_/, match => match.replace('hr_', 'hrs-'))
    .replace('_', '-');
  
  // Get base value for package (default to 2000 if not found)
  const baseValue = baseValues[normalizedPackageId as keyof typeof baseValues] || 2000;
  
  // Calculate and return the dynamic price
  return Math.round(baseValue * multiplier);
}

// Define hourly package interface
export interface HourlyPackage {
  id: string;
  name: string;
  hours: number;
  kilometers: number;
  basePrice: number;
  description?: string;
}

// Define available hourly packages
export const hourlyPackages: HourlyPackage[] = [
  {
    id: '4hrs-40km',
    name: '4 Hours / 40 KM',
    hours: 4,
    kilometers: 40,
    basePrice: 1200,
    description: 'Perfect for short trips within the city'
  },
  {
    id: '8hrs-80km',
    name: '8 Hours / 80 KM',
    hours: 8,
    kilometers: 80,
    basePrice: 2000,
    description: 'Ideal for a full day of city travel'
  },
  {
    id: '10hrs-100km',
    name: '10 Hours / 100 KM',
    hours: 10,
    kilometers: 100,
    basePrice: 2500,
    description: 'Extended day travel with longer distance coverage'
  }
];

// Create a window-level cache for package prices
declare global {
  interface Window {
    localPackagePriceCache?: Record<string, { price: number; timestamp: number; }>;
  }
}

// Initialize the cache if it doesn't exist
if (typeof window !== 'undefined' && !window.localPackagePriceCache) {
  window.localPackagePriceCache = {};
}

/**
 * Gets the price for a specified local package and vehicle type
 * @param packageId The hourly package ID
 * @param vehicleType The type of vehicle
 * @param forceRefresh Whether to bypass cache and request fresh price
 * @returns The price for the package and vehicle combination
 */
export async function getLocalPackagePrice(
  packageId: string,
  vehicleType: string,
  forceRefresh: boolean = false
): Promise<number> {
  try {
    // Normalize vehicle type and package ID for consistency
    const normalizedVehicleType = vehicleType.toLowerCase().replace(/\s+/g, '_');
    const normalizedPackageId = packageId
      .replace(/\d+hr-/, match => match.replace('hr-', 'hrs-'))
      .replace(/\d+hr_/, match => match.replace('hr_', 'hrs-'))
      .replace('_', '-');
    
    // Create a cache key for this specific vehicle/package combination
    const cacheKey = `${normalizedVehicleType}_${normalizedPackageId}`;
    
    // Check if we have a cached value and it's not a forced refresh
    if (!forceRefresh && 
        typeof window !== 'undefined' && 
        window.localPackagePriceCache && 
        window.localPackagePriceCache[cacheKey] &&
        window.localPackagePriceCache[cacheKey].price > 0 &&
        (Date.now() - window.localPackagePriceCache[cacheKey].timestamp) < 5 * 60 * 1000) { // 5 minute cache
      
      console.log(`Using cached price for ${vehicleType} ${packageId}: ${window.localPackagePriceCache[cacheKey].price}`);
      return window.localPackagePriceCache[cacheKey].price;
    }
    
    // Attempt to fetch from direct API if available
    try {
      const apiUrl = getApiUrl();
      const endpoint = `${apiUrl}/api/user/direct-local-fares.php?vehicle_id=${normalizedVehicleType}`;
      
      console.log(`Fetching local package price from ${endpoint}`);
      
      const response = await axios.get(endpoint, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Force-Refresh': 'true'
        },
        timeout: 5000
      });
      
      if (response.data && response.data.fares && response.data.fares.length > 0) {
        const fare = response.data.fares[0];
        let price = 0;
        
        // Extract the correct price based on the package ID
        if (normalizedPackageId === '4hrs-40km' && fare.price4hrs40km) {
          price = Number(fare.price4hrs40km);
        } else if (normalizedPackageId === '8hrs-80km' && fare.price8hrs80km) {
          price = Number(fare.price8hrs80km);
        } else if (normalizedPackageId === '10hrs-100km' && fare.price10hrs100km) {
          price = Number(fare.price10hrs100km);
        }
        
        if (price > 0) {
          console.log(`Got direct price for ${vehicleType} ${packageId}: ${price}`);
          
          // Cache the result
          if (typeof window !== 'undefined' && window.localPackagePriceCache) {
            window.localPackagePriceCache[cacheKey] = {
              price,
              timestamp: Date.now()
            };
          }
          
          return price;
        }
      }
    } catch (error) {
      console.warn(`Could not fetch direct price for ${vehicleType} ${packageId}:`, error);
      // Continue to fallback calculation
    }
    
    // If direct fetch fails, use our calculation function
    const calculatedPrice = calculateDynamicPrice(vehicleType, normalizedPackageId);
    
    // Cache the calculated result
    if (typeof window !== 'undefined' && window.localPackagePriceCache) {
      window.localPackagePriceCache[cacheKey] = {
        price: calculatedPrice,
        timestamp: Date.now()
      };
    }
    
    console.log(`Using calculated price for ${vehicleType} ${packageId}: ${calculatedPrice}`);
    return calculatedPrice;
  } catch (error) {
    console.error(`Error getting price for ${vehicleType} ${packageId}:`, error);
    
    // Return a fallback price based on vehicle type
    return calculateDynamicPrice(vehicleType, packageId);
  }
}

/**
 * Fetches and caches all local fares for common vehicle types
 */
export async function fetchAndCacheLocalFares(forceRefresh: boolean = false): Promise<void> {
  const commonVehicles = ['sedan', 'ertiga', 'innova', 'crysta', 'hycross'];
  const packageIds = ['4hrs-40km', '8hrs-80km', '10hrs-100km'];
  
  try {
    console.log('Prefetching and caching local fares...');
    
    const fetchPromises = commonVehicles.flatMap(vehicle => 
      packageIds.map(packageId => 
        getLocalPackagePrice(packageId, vehicle, forceRefresh)
          .catch(error => {
            console.error(`Failed to fetch price for ${vehicle} ${packageId}:`, error);
            return 0;
          })
      )
    );
    
    await Promise.all(fetchPromises);
    console.log('All local fares prefetched and cached');
  } catch (error) {
    console.error('Error prefetching local fares:', error);
  }
}

/**
 * Synchronizes local fare tables with the database
 */
export async function syncLocalFaresWithDatabase(): Promise<boolean> {
  try {
    const apiUrl = getApiUrl();
    const endpoint = `${apiUrl}/api/admin/sync-local-fares.php`;
    
    console.log('Syncing local fares with database...');
    
    const response = await axios.post(endpoint, {}, {
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Mode': 'true'
      }
    });
    
    if (response.data && response.data.success) {
      console.log('Local fares synced successfully');
      
      // Clear the local cache
      if (typeof window !== 'undefined') {
        window.localPackagePriceCache = {};
      }
      
      // Dispatch event to notify components about the update
      window.dispatchEvent(new CustomEvent('local-fares-updated', {
        detail: { timestamp: Date.now() }
      }));
      
      return true;
    } else {
      console.error('Sync response indicated failure:', response.data);
      return false;
    }
  } catch (error) {
    console.error('Error syncing local fares with database:', error);
    return false;
  }
}

// Export all required functions and types
export {
  calculateDynamicPrice
};
