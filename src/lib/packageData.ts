import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { safeApiRequest, tryMultipleEndpoints } from '@/utils/safeApiUtils';

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
    basePrice: 0  // Will be populated from API
  },
  { 
    id: '8hrs-80km', 
    name: '8 Hours Package', 
    hours: 8, 
    kilometers: 80, 
    basePrice: 0  // Will be populated from API
  },
  { 
    id: '10hrs-100km', 
    name: '10 Hours Package', 
    hours: 10, 
    kilometers: 100, 
    basePrice: 0  // Will be populated from API
  }
];

// Legacy format hourly packages (for backward compatibility)
export const hourlyPackageOptions = hourlyPackages.map(pkg => ({
  value: pkg.id,
  label: `${pkg.hours} Hours / ${pkg.kilometers} KM`
}));

// Initialize the global cache if it doesn't exist
if (typeof window !== 'undefined') {
  // @ts-ignore - adding property to window
  window.localPackagePriceCache = window.localPackagePriceCache || {};
}

// Define price multipliers based on vehicle type for fallback calculations
const vehicleMultipliers: Record<string, number> = {
  sedan: 1.0,
  ertiga: 1.25,
  innova: 1.5,
  innova_crysta: 1.5,
  innova_hycross: 1.6,
  tempo_traveller: 2.0,
  tempo: 2.0,
  luxury: 1.7,
  suv: 1.25,
  mpv: 1.4,
  dzire_cng: 1.0, // Same as sedan
  dzire: 1.0,
  cng: 1.0
};

// Calculate a dynamic price for a given vehicle and package
const calculateDynamicPrice = (vehicleType: string, packageId: string): number => {
  // Safety check for input parameters
  if (!vehicleType || typeof vehicleType !== 'string' || !packageId || typeof packageId !== 'string') {
    console.error('Invalid input parameters for calculateDynamicPrice:', { vehicleType, packageId });
    return 2000; // Default fallback price
  }

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
  let normalizedPackageId = packageId;
  
  try {
    normalizedPackageId = packageId
      .replace(/\d+hr-/, match => match.replace('hr-', 'hrs-'))
      .replace(/\d+hr_/, match => match.replace('hr_', 'hrs-'))
      .replace('_', '-');
  } catch (e) {
    console.error('Error normalizing packageId', packageId, e);
    normalizedPackageId = '8hrs-80km'; // Default to 8hrs if normalization fails
  }
  
  // Get base value for package (default to 2000 if not found)
  const baseValue = baseValues[normalizedPackageId as keyof typeof baseValues] || 2000;
  
  // Calculate and return the dynamic price
  return Math.round(baseValue * multiplier);
};

// Utility function to normalize and validate API URLs
const validateApiUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  // Basic validation - check if the URL has a valid structure
  try {
    new URL(url);
    return true;
  } catch {
    // If the URL is relative, it's probably valid for our purposes
    return url.startsWith('/') || url.startsWith('./') || url.startsWith('../');
  }
};

// Normalize package ID for consistency
export const normalizePackageId = (packageId: string): string => {
  if (!packageId) return '8hrs-80km';

  // Handle common variations
  const result = packageId
    .toLowerCase()
    .replace(/(\d+)hr[-_]/, '$1hrs-')
    .replace(/\s+/g, '')
    .replace(/_/g, '-');
  
  // Handle special cases with just numbers
  if (result === '4hrs' || result === '4hr') {
    return '4hrs-40km';
  } else if (result === '8hrs' || result === '8hr') {
    return '8hrs-80km';
  } else if (result === '10hrs' || result === '10hr') {
    return '10hrs-100km';
  }
  
  // Handle variations with just hours and km
  if (result.includes('4hrs') && result.includes('40km')) {
    return '4hrs-40km';
  } else if (result.includes('8hrs') && result.includes('80km')) {
    return '8hrs-80km';
  } else if (result.includes('10hrs') && result.includes('100km')) {
    return '10hrs-100km';
  }
  
  // Check for standard ID patterns
  if (result.startsWith('4hrs')) return '4hrs-40km';
  if (result.startsWith('8hrs')) return '8hrs-80km';
  if (result.startsWith('10hrs')) return '10hrs-100km';
  
  // Default to 8hrs package if no match
  return '8hrs-80km';
};

// Normalize vehicle ID for consistency
export const normalizeVehicleId = (vehicleId: string): string => {
  if (!vehicleId) return 'sedan';
  
  // Convert to lowercase and replace spaces with underscores
  const result = vehicleId.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  
  // Handle common variations
  if (result === 'mpv') return 'innova_hycross';
  if (result.includes('hycross')) return 'innova_hycross';
  if (result.includes('crysta')) return 'innova_crysta';
  if (result.includes('tempo')) return 'tempo_traveller';
  if (result.includes('dzire') && result.includes('cng')) return 'dzire_cng';
  if (result === 'cng') return 'dzire_cng';
  if (result === 'dzire') return 'sedan';
  if (result === 'swift') return 'sedan';
  
  return result;
};

/**
 * Fetches the fare for a local package from the API
 * @param packageId The package ID (e.g., '8hrs-80km')
 * @param vehicleId The vehicle ID (e.g., 'sedan')
 * @param forceRefresh Whether to bypass the cache and force a refresh from the API
 * @returns The fare price
 */
export const getLocalPackagePrice = async (packageId: string, vehicleId: string, forceRefresh: boolean = false): Promise<number> => {
  // Safety check for input parameters
  if (!packageId || !vehicleId) {
    console.error('Invalid parameters for getLocalPackagePrice:', { packageId, vehicleId });
    return calculateDynamicPrice('sedan', '8hrs-80km'); // Default fallback
  }
  
  try {
    console.log(`Getting local package price for ${vehicleId}, package: ${packageId}, forceRefresh: ${forceRefresh}`);
    
    // Normalize parameters
    const normalizedVehicleType = normalizeVehicleId(vehicleId);
    const normalizedPackageId = normalizePackageId(packageId);
    
    // Create unique cache key
    const cacheKey = `${normalizedVehicleType}_${normalizedPackageId}`;
    
    // Log the exact cache key we're using to help debugging
    console.log(`Using cache key: ${cacheKey} for local package price`);
    
    // Safety check for window object and cache
    if (typeof window === 'undefined') {
      console.warn('Window object is undefined, using direct calculation');
      return calculateDynamicPrice(normalizedVehicleType, normalizedPackageId);
    }
    
    // Initialize the cache if it doesn't exist
    // @ts-ignore - adding property to window
    window.localPackagePriceCache = window.localPackagePriceCache || {};
    
    // Only check cache if force refresh not requested
    if (!forceRefresh && 
        // @ts-ignore - accessing property on window
        window.localPackagePriceCache[cacheKey] && 
        // @ts-ignore - accessing property on window
        window.localPackagePriceCache[cacheKey].price > 0 &&
        // @ts-ignore - accessing property on window
        Date.now() - window.localPackagePriceCache[cacheKey].timestamp < 60000) { // Only use cache if less than 1 minute old
      // @ts-ignore - accessing property on window
      console.log(`Using cached price for ${cacheKey}: ${window.localPackagePriceCache[cacheKey].price}`);
      
      // Always broadcast the price for consistency even when using cache
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('local-fare-updated', {
          detail: {
            packageId: normalizedPackageId,
            vehicleType: normalizedVehicleType,
            // @ts-ignore - accessing property on window
            price: window.localPackagePriceCache[cacheKey].price,
            source: 'cache',
            timestamp: Date.now()
          }
        }));
      }
      
      // @ts-ignore - accessing property on window
      return window.localPackagePriceCache[cacheKey].price;
    }
    
    // Get API URL safely
    const apiUrl = '';
    
    // First try the PHP endpoint directly
    const phpEndpoint = `/backend/php-templates/api/local-package-fares.php?vehicle_id=${normalizedVehicleType}&package_id=${normalizedPackageId}`;
    
    try {
      console.log(`Attempting direct fetch from PHP template: ${phpEndpoint}`);
      const response = await fetch(phpEndpoint, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Force-Refresh': forceRefresh ? 'true' : 'false'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.price && typeof data.price === 'number' && data.price > 0) {
          console.log(`Direct PHP fetch successful, price: ${data.price}`);
          
          // Cache the price
          // @ts-ignore - adding property to window
          if (window.localPackagePriceCache) {
            // @ts-ignore - adding property to window
            window.localPackagePriceCache[cacheKey] = { price: data.price, timestamp: Date.now() };
          }
          
          // Store in localStorage for better cross-component consistency
          const fareKey = `fare_local_${normalizedVehicleType}`;
          localStorage.setItem(fareKey, data.price.toString());
          
          // Also store with full package ID for better precision
          const preciseFareKey = `fare_local_${normalizedVehicleType}_${normalizedPackageId}`;
          localStorage.setItem(preciseFareKey, data.price.toString());
          console.log(`Stored fare in localStorage: ${preciseFareKey} = ${data.price}`);
          
          // Dispatch an event to notify other components about the updated price
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('local-fare-updated', {
              detail: {
                packageId: normalizedPackageId,
                vehicleType: normalizedVehicleType,
                price: data.price,
                source: 'php',
                timestamp: Date.now()
              }
            }));
            
            // Dispatch a more general fare-calculated event for broader component updates
            window.dispatchEvent(new CustomEvent('fare-calculated', {
              detail: {
                cabId: normalizedVehicleType,
                tripType: 'local',
                calculated: true,
                fare: data.price,
                packageId: normalizedPackageId,
                timestamp: Date.now()
              }
            }));
          }
          
          return data.price;
        }
      }
    } catch (phpError) {
      console.warn('PHP template endpoint failed:', phpError);
    }
    
    // If direct PHP fetch fails, try the API endpoint
    const apiEndpoint = `/api/local-package-fares.php?vehicle_id=${normalizedVehicleType}&package_id=${normalizedPackageId}`;
    
    try {
      console.log(`Attempting fetch from API: ${apiEndpoint}`);
      const response = await fetch(apiEndpoint, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Force-Refresh': forceRefresh ? 'true' : 'false'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.price && typeof data.price === 'number' && data.price > 0) {
          console.log(`API fetch successful, price: ${data.price}`);
          
          // Cache the price
          // @ts-ignore - adding property to window
          if (window.localPackagePriceCache) {
            // @ts-ignore - adding property to window
            window.localPackagePriceCache[cacheKey] = { price: data.price, timestamp: Date.now() };
          }
          
          // Store in localStorage for better cross-component consistency
          const fareKey = `fare_local_${normalizedVehicleType}`;
          localStorage.setItem(fareKey, data.price.toString());
          
          // Also store with full package ID for better precision
          const preciseFareKey = `fare_local_${normalizedVehicleType}_${normalizedPackageId}`;
          localStorage.setItem(preciseFareKey, data.price.toString());
          console.log(`Stored fare in localStorage: ${preciseFareKey} = ${data.price}`);
          
          // Dispatch an event to notify other components about the updated price
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('local-fare-updated', {
              detail: {
                packageId: normalizedPackageId,
                vehicleType: normalizedVehicleType,
                price: data.price,
                source: 'api',
                timestamp: Date.now()
              }
            }));
            
            // Dispatch a more general fare-calculated event for broader component updates
            window.dispatchEvent(new CustomEvent('fare-calculated', {
              detail: {
                cabId: normalizedVehicleType,
                tripType: 'local',
                calculated: true,
                fare: data.price,
                packageId: normalizedPackageId,
                timestamp: Date.now()
              }
            }));
          }
          
          return data.price;
        }
      }
    } catch (apiError) {
      console.warn('API endpoint failed:', apiError);
    }
    
    // If all API attempts fail, use fallback calculation
    console.log(`All API attempts failed, using fallback calculation`);
    const dynamicPrice = calculateDynamicPrice(normalizedVehicleType, normalizedPackageId);
    
    // Cache the price
    // @ts-ignore - adding property to window
    if (window.localPackagePriceCache) {
      // @ts-ignore - adding property to window
      window.localPackagePriceCache[cacheKey] = { price: dynamicPrice, timestamp: Date.now() };
    }
    
    // Store in localStorage for better cross-component consistency
    const fareKey = `fare_local_${normalizedVehicleType}`;
    localStorage.setItem(fareKey, dynamicPrice.toString());
    
    // Also store with full package ID
    const preciseFareKey = `fare_local_${normalizedVehicleType}_${normalizedPackageId}`;
    localStorage.setItem(preciseFareKey, dynamicPrice.toString());
    
    return dynamicPrice;
    
  } catch (error) {
    console.error(`Error getting local package price for ${vehicleId}, ${packageId}:`, error);
    
    // Last resort: calculate a dynamic price
    const dynamicPrice = calculateDynamicPrice(vehicleId, packageId);
    console.log(`Using dynamically calculated fallback price for ${vehicleId}, ${packageId}: ${dynamicPrice}`);
    
    // Store in localStorage for better cross-component consistency
    const normalizedVehicleType = normalizeVehicleId(vehicleId);
    const normalizedPackageId = normalizePackageId(packageId);
    const fareKey = `fare_local_${normalizedVehicleType}`;
    localStorage.setItem(fareKey, dynamicPrice.toString());
    
    // Also store with full package ID
    const preciseFareKey = `fare_local_${normalizedVehicleType}_${normalizedPackageId}`;
    localStorage.setItem(preciseFareKey, dynamicPrice.toString());
    
    return dynamicPrice;
  }
}

// Function to fetch and cache all local fares in the background
export async function fetchAndCacheLocalFares(forceRefresh: boolean = false): Promise<void> {
  try {
    // Common vehicle types to pre-cache
    const vehicleTypes = ['sedan', 'ertiga', 'innova_crysta', 'dzire_cng', 'tempo_traveller', 'innova_hycross'];
    
    // Loop through all combinations of vehicles and packages
    for (const vehicleType of vehicleTypes) {
      for (const pkg of hourlyPackages) {
        try {
          // Explicitly pass forceRefresh parameter
          await getLocalPackagePrice(pkg.id, vehicleType, forceRefresh);
        } catch (error) {
          console.warn(`Error caching price for ${vehicleType}, ${pkg.id}:`, error);
        }
      }
    }
    
    console.log('Background caching of local fares completed');

    // Dispatch an event to notify components that all fares have been cached
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('local-fares-cached', {
        detail: {
          timestamp: Date.now(),
          vehicles: vehicleTypes,
          packages: hourlyPackages.map(p => p.id)
        }
      }));
    }
  } catch (error) {
    console.error('Error in fetchAndCacheLocalFares:', error);
  }
}

// Force sync with database via admin API
export async function syncLocalFaresWithDatabase(forceRefresh: boolean = false): Promise<boolean> {
  try {
    console.log('Forcing sync of local package fares with database...');
    
    const apiUrl = getApiUrl('') || '';
    const syncEndpoint = `${apiUrl}/api/admin/sync-local-fares.php`;
    
    const response = await safeApiRequest(syncEndpoint, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-Force-Refresh': 'true',
        'X-Admin-Mode': 'true'
      },
      timeout: 10000 // 10 second timeout for sync operation
    });
    
    if (response && response.status === 'success') {
      console.log('Local fares successfully synced with database:', response);
      
      // After successful sync, clear all cached prices
      if (typeof window !== 'undefined') {
        // @ts-ignore - adding property to window
        window.localPackagePriceCache = {};
      }
      
      // Dispatch event to notify components about updated fares
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('local-fares-updated', {
          detail: {
            timestamp: Date.now(),
            vehicles: response.vehicles || [],
            source: 'database-sync'
          }
        }));
      }
      
      // Refresh all fares in the background
      fetchAndCacheLocalFares(true);
      
      return true;
    } else {
      console.error('Local fares sync failed:', response);
      return false;
    }
  } catch (error) {
    console.error('Error syncing local fares with database:', error);
    return false;
  }
}

// Initialize by pre-fetching fares in the background
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      fetchAndCacheLocalFares(false).catch(console.error);
    }, 1000);
  });
}
