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
  mpv: 1.6,
  dzire_cng: 1.0,
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
  
  // Check for MPV specifically (should have the same pricing as Innova Hycross)
  const vehicleKey = normalizedVehicleType === 'mpv' ? 'innova_hycross' : normalizedVehicleType;
  
  // Determine the multiplier based on vehicle type (default to 1.0 if not found)
  const multiplier = vehicleMultipliers[vehicleKey] || 
                    (vehicleKey.includes('hycross') ? vehicleMultipliers.innova_hycross : 1.6);
  
  // Base prices for different packages
  const baseValues = {
    '4hrs-40km': 1200,
    '8hrs-80km': 2000,
    '10hrs-100km': 2500
  };
  
  // Normalize package ID to match base values
  let normalizedPackageId = packageId;
  
  try {
    normalizedPackageId = normalizePackageId(packageId);
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

  // Convert to lowercase first
  const lowerPackageId = packageId.toLowerCase();
  
  // Handle common variations more comprehensively
  let normalized = lowerPackageId
    .replace(/_/g, '-')                // Replace all underscores with hyphens
    .replace(/(\d+)hr(?!s)/, '$1hrs')  // Change "hr" to "hrs" if it follows a number and isn't already "hrs"
    .replace(/(\d+)hour/, '$1hrs')     // Change "hour" to "hrs"
    .replace(/(\d+)h-/, '$1hrs-')      // Change "h-" to "hrs-"
    .replace(/(\d+)h_/, '$1hrs-');     // Change "h_" to "hrs-"
  
  // Map specific common package IDs
  const packageMap: Record<string, string> = {
    '4hrs': '4hrs-40km',
    '4hour': '4hrs-40km',
    '4hr': '4hrs-40km',
    '4hr-40': '4hrs-40km',
    '4hrs-40': '4hrs-40km',
    '4hours': '4hrs-40km',
    '8hrs': '8hrs-80km',
    '8hour': '8hrs-80km',
    '8hr': '8hrs-80km',
    '8hr-80': '8hrs-80km',
    '8hrs-80': '8hrs-80km',
    '8hours': '8hrs-80km',
    '10hrs': '10hrs-100km',
    '10hour': '10hrs-100km',
    '10hr': '10hrs-100km',
    '10hr-100': '10hrs-100km',
    '10hrs-100': '10hrs-100km',
    '10hours': '10hrs-100km'
  };
  
  // Check if this is a known package ID format
  if (packageMap[normalized]) {
    return packageMap[normalized];
  }
  
  // If it already contains the standard format, return it
  if (normalized.match(/^\d+hrs-\d+km$/)) {
    return normalized;
  }
  
  // For cases that only have the hour part
  if (normalized === '4hrs' || normalized.startsWith('4hrs-')) {
    return '4hrs-40km';
  } else if (normalized === '8hrs' || normalized.startsWith('8hrs-')) {
    return '8hrs-80km';
  } else if (normalized === '10hrs' || normalized.startsWith('10hrs-')) {
    return '10hrs-100km';
  }
  
  // If all else fails, return the normalized version or default to 8hrs
  return normalized || '8hrs-80km';
};

// Normalize vehicle ID for consistency
export const normalizeVehicleId = (vehicleId: string): string => {
  if (!vehicleId) return 'sedan';
  
  // Convert to lowercase and replace spaces with underscores
  let normalized = vehicleId.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  
  // Map common vehicle types
  const vehicleMap: Record<string, string> = {
    'hycross': 'innova_hycross',
    'innovahycross': 'innova_hycross',
    'innovahicross': 'innova_hycross',
    'crysta': 'innova_crysta',
    'innovacrysta': 'innova_crysta',
    'tempo': 'tempo_traveller',
    'traveller': 'tempo_traveller',
    'traveler': 'tempo_traveller',
    'swift': 'sedan',
    'dzireczng': 'dzire_cng',
    'cng': 'dzire_cng'
  };
  
  // Check for specific mappings
  if (vehicleMap[normalized]) {
    return vehicleMap[normalized];
  }
  
  // MPV should be treated as a separate category, but similar to Innova Hycross
  if (normalized === 'mpv') {
    return 'mpv';
  }
  
  // Special handling for Innova variants
  if (normalized.includes('innova')) {
    if (normalized.includes('hycross') || normalized.includes('hicross')) {
      return 'innova_hycross';
    } else if (normalized.includes('crysta') || normalized.includes('crysta')) {
      return 'innova_crysta';
    } else {
      // Default Innova is treated as Crysta
      return 'innova_crysta';
    }
  }
  
  return normalized;
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
    const apiUrl = getApiUrl('');
    
    // Safety check for API URL
    if (!apiUrl) {
      console.warn('API URL is undefined, using direct calculation');
      const dynamicPrice = calculateDynamicPrice(normalizedVehicleType, normalizedPackageId);
      
      // Save to cache
      // @ts-ignore - adding property to window
      if (window.localPackagePriceCache) {
        // @ts-ignore - adding property to window
        window.localPackagePriceCache[cacheKey] = { price: dynamicPrice, timestamp: Date.now() };
      }
      
      return dynamicPrice;
    }

    // Array of API endpoints to try - validate them first
    const apiEndpoints = [
      // IMPORTANT: Use local-package-fares.php as the primary source
      `${apiUrl}/api/local-package-fares.php?vehicle_id=${normalizedVehicleType}&package_id=${normalizedPackageId}`,
      // Then try the admin direct endpoints
      `${apiUrl}/api/admin/direct-local-fares.php?vehicle_id=${normalizedVehicleType}`,
      `${apiUrl}/api/user/direct-booking-data.php?check_sync=true&vehicle_id=${normalizedVehicleType}&package_id=${normalizedPackageId}`,
      `/api/local-package-fares.php?vehicle_id=${normalizedVehicleType}&package_id=${normalizedPackageId}`,
      `/api/admin/direct-local-fares.php?vehicle_id=${normalizedVehicleType}`,
      `/api/user/direct-booking-data.php?check_sync=true&vehicle_id=${normalizedVehicleType}&package_id=${normalizedPackageId}`
    ].filter(url => validateApiUrl(url));
    
    console.log(`Attempting to fetch pricing data from ${apiEndpoints.length} endpoints`);
    
    // Try the improved multi-endpoint request utility
    const response = await tryMultipleEndpoints(apiEndpoints, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-Force-Refresh': forceRefresh ? 'true' : 'false'
      },
      timeout: 8000
    });

    let price = 0;
    
    if (response) {
      console.log(`API response received:`, response);
      
      // Check if we got a fares array from direct-local-fares.php
      if (response.fares && Array.isArray(response.fares) && response.fares.length > 0) {
        const fareData = response.fares[0];
        
        // Extract the right price for the selected package
        if (normalizedPackageId.includes('4hrs-40km')) {
          price = Number(fareData.price4hrs40km || 0);
        } else if (normalizedPackageId.includes('8hrs-80km')) {
          price = Number(fareData.price8hrs80km || 0);
        } else if (normalizedPackageId.includes('10hrs-100km')) {
          price = Number(fareData.price10hrs100km || 0);
        }
      }
      // Check if the API returned a direct price
      else if (response.price) {
        price = Number(response.price);
      }
      // Check other possible response formats
      else if (response.data && response.data.price) {
        price = Number(response.data.price);
      }
    }

    // Use fallback calculation if API call failed or returned invalid price
    if (price <= 0) {
      console.log(`No valid price received from API, using fallback calculation`);
      price = calculateDynamicPrice(normalizedVehicleType, normalizedPackageId);
    }
    
    console.log(`Final price for ${normalizedVehicleType}, ${normalizedPackageId}: ${price}`);
    
    // Cache the price
    // @ts-ignore - adding property to window
    if (window.localPackagePriceCache) {
      // @ts-ignore - adding property to window
      window.localPackagePriceCache[cacheKey] = { price, timestamp: Date.now() };
    }
    
    // Store in localStorage for better cross-component consistency
    const fareKey = `fare_local_${normalizedVehicleType}`;
    localStorage.setItem(fareKey, price.toString());
    
    // Also store with full package ID for better precision
    const preciseFareKey = `fare_local_${normalizedVehicleType}_${normalizedPackageId}`;
    localStorage.setItem(preciseFareKey, price.toString());
    console.log(`Stored fare in localStorage: ${preciseFareKey} = ${price}`);
    
    // Dispatch an event to notify other components about the updated price
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('local-fare-updated', {
        detail: {
          packageId: normalizedPackageId,
          vehicleType: normalizedVehicleType,
          price: price,
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
          fare: price,
          packageId: normalizedPackageId,
          timestamp: Date.now()
        }
      }));
    }
    
    return price;
    
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
