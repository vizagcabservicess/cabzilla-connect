import { safeApiRequest, tryMultipleEndpoints } from '@/utils/safeApiUtils';
import { getApiUrl } from '@/config/api';

export interface HourlyPackage {
  id: string;
  name: string;
  hours: number;
  kilometers: number;
  description?: string;
  basePrice?: number;
}

export const hourlyPackages: HourlyPackage[] = [
  { id: "4hrs-40km", name: "4 Hours / 40 KM", hours: 4, kilometers: 40 },
  { id: "8hrs-80km", name: "8 Hours / 80 KM", hours: 8, kilometers: 80 },
  { id: "10hrs-100km", name: "10 Hours / 100 KM", hours: 10, kilometers: 100 }
];

/**
 * Normalize a vehicle ID for consistent API calls and data lookup
 * @param vehicleId The raw vehicle ID (could be with spaces, different capitalization, etc.)
 * @returns Normalized vehicle ID
 */
export function normalizeVehicleId(vehicleId: string): string {
  if (!vehicleId) return 'sedan';
  
  // Convert to lowercase and replace spaces with underscores
  const normalized = vehicleId.toLowerCase().trim().replace(/\s+/g, '_');
  
  // Handle common variations
  const mappings: Record<string, string> = {
    'innova_hycross': 'innova_hycross',
    'innovahycross': 'innova_hycross',
    'innova_hicross': 'innova_hycross',
    'innovahicross': 'innova_hycross',
    'mpv': 'innova_hycross',
    'innova_crysta': 'innova_crysta',
    'innovacrystal': 'innova_crysta',
    'innovacrista': 'innova_crysta',
    'innova_crista': 'innova_crysta',
    'hycross': 'innova_hycross',
    'crysta': 'innova_crysta',
    'tempotraveller': 'tempo_traveller',
    'tempo_traveler': 'tempo_traveller',
    'tempo': 'tempo_traveller'
  };
  
  // Check if we have a direct mapping
  if (mappings[normalized]) {
    return mappings[normalized];
  }
  
  // Check for partial matches
  if (normalized.includes('hycross')) {
    return 'innova_hycross';
  }
  
  if (normalized.includes('crysta')) {
    return 'innova_crysta';
  }
  
  if (normalized.includes('tempo')) {
    return 'tempo_traveller';
  }
  
  return normalized;
}

/**
 * Normalize a package ID for consistent API calls and data lookup
 * @param packageId The raw package ID (could be with spaces, different formatting, etc.)
 * @returns Normalized package ID
 */
export function normalizePackageId(packageId: string): string {
  if (!packageId) return '8hrs-80km';
  
  // Convert to lowercase and trim
  const lower = packageId.toLowerCase().trim();
  
  // Handle common variations
  if (lower.includes('4') && (lower.includes('40') || lower.includes('hr'))) {
    return '4hrs-40km';
  } else if (lower.includes('8') && (lower.includes('80') || lower.includes('hr'))) {
    return '8hrs-80km';
  } else if (lower.includes('10') && (lower.includes('100') || lower.includes('hr'))) {
    return '10hrs-100km';
  }
  
  // Default to 8hrs-80km if no match
  return '8hrs-80km';
}

/**
 * Fetches the price for a local package from various endpoints
 * @param packageId The local package ID (e.g., '8hrs-80km')
 * @param vehicleId The vehicle ID (e.g., 'sedan')
 * @param forceRefresh Whether to bypass cache and force a refresh
 * @returns The price for the selected local package
 */
export async function getLocalPackagePrice(packageId: string, vehicleId: string, forceRefresh: boolean = false): Promise<number> {
  if (!packageId || !vehicleId) return 0;
  
  const normalizedPackageId = normalizePackageId(packageId);
  const normalizedVehicleId = normalizeVehicleId(vehicleId);
  
  console.log(`Getting local package price for ${normalizedVehicleId}, package: ${normalizedPackageId}, forceRefresh: ${forceRefresh}`);
  
  // Create a cache key
  const cacheKey = `${normalizedVehicleId}_${normalizedPackageId}`;
  console.log(`Using cache key: ${cacheKey} for local package price`);
  
  // Initialize window.localPackagePriceCache if it doesn't exist
  if (typeof window !== 'undefined' && !window.localPackagePriceCache) {
    window.localPackagePriceCache = {};
  }
  
  // Check in-memory cache first
  if (!forceRefresh && 
      window.localPackagePriceCache && 
      window.localPackagePriceCache[cacheKey] && 
      window.localPackagePriceCache[cacheKey].timestamp > Date.now() - 60000) {
    console.log(`Using in-memory cache for ${cacheKey}: ${window.localPackagePriceCache[cacheKey].price}`);
    return window.localPackagePriceCache[cacheKey].price;
  }
  
  // Check localStorage next for previously set fares
  const specificFareKey = `fare_local_${normalizedVehicleId}_${normalizedPackageId}`;
  const storedFare = localStorage.getItem(specificFareKey);
  
  if (storedFare && !forceRefresh) {
    const parsedFare = parseFloat(storedFare);
    if (!isNaN(parsedFare) && parsedFare > 0) {
      console.log(`Using stored fare from localStorage: ${parsedFare}`);
      
      // Update in-memory cache for faster subsequent access
      if (window.localPackagePriceCache) {
        window.localPackagePriceCache[cacheKey] = {
          price: parsedFare,
          timestamp: Date.now()
        };
      }
      
      return parsedFare;
    }
  }
  
  try {
    // Define multiple endpoints to try for resilience
    const endpoints = [
      `/api/local-package-fares.php?vehicle_id=${normalizedVehicleId}&package_id=${normalizedPackageId}`,
      `/api/admin/direct-local-fares.php?vehicle_id=${normalizedVehicleId}`,
      `/api/user/direct-booking-data.php?check_sync=true&vehicle_id=${normalizedVehicleId}&package_id=${normalizedPackageId}`,
      `${getApiUrl('api/local-package-fares.php')}?vehicle_id=${normalizedVehicleId}&package_id=${normalizedPackageId}`,
      `/local-package-fares.php?vehicle_id=${normalizedVehicleId}&package_id=${normalizedPackageId}`,
      `/local-package-fares?vehicle_id=${normalizedVehicleId}&package_id=${normalizedPackageId}`
    ];
    
    // Try all the endpoints
    const response = await tryMultipleEndpoints(endpoints, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-Force-Refresh': forceRefresh ? 'true' : 'false'
      }
    });
    
    if (response && response.price && typeof response.price === 'number') {
      console.log(`Retrieved price from API: ${response.price}`);
      
      // Store in localStorage for future use
      localStorage.setItem(specificFareKey, response.price.toString());
      
      // Update in-memory cache
      if (window.localPackagePriceCache) {
        window.localPackagePriceCache[cacheKey] = {
          price: response.price,
          timestamp: Date.now()
        };
      }
      
      // Dispatch event to notify components that a fare was retrieved
      window.dispatchEvent(new CustomEvent('fare-retrieved', {
        detail: {
          vehicleId: normalizedVehicleId,
          packageId: normalizedPackageId,
          price: response.price,
          source: 'api',
          timestamp: Date.now()
        }
      }));
      
      return response.price;
    }
    
    // If we didn't get a valid response, use fallback pricing
    console.log(`No valid price received from API, using fallback calculation`);
    const fallbackPrice = calculateFallbackPrice(normalizedVehicleId, normalizedPackageId);
    
    // Update in-memory cache with fallback price
    if (window.localPackagePriceCache) {
      window.localPackagePriceCache[cacheKey] = {
        price: fallbackPrice,
        timestamp: Date.now(),
        isFallback: true
      };
    }
    
    return fallbackPrice;
  } catch (error) {
    console.error(`Error fetching local package price: ${error}`);
    const fallbackPrice = calculateFallbackPrice(normalizedVehicleId, normalizedPackageId);
    
    // Update in-memory cache with fallback price
    if (window.localPackagePriceCache) {
      window.localPackagePriceCache[cacheKey] = {
        price: fallbackPrice,
        timestamp: Date.now(),
        isFallback: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    return fallbackPrice;
  }
}

/**
 * Calculates fallback price when API fails
 * @param vehicleId Normalized vehicle ID
 * @param packageId Normalized package ID
 * @returns Calculated price
 */
function calculateFallbackPrice(vehicleId: string, packageId: string): number {
  // Standard pricing table
  const fallbackPrices: Record<string, Record<string, number>> = {
    'sedan': {
      '4hrs-40km': 1400,
      '8hrs-80km': 2400,
      '10hrs-100km': 3000
    },
    'ertiga': {
      '4hrs-40km': 1800,
      '8hrs-80km': 3000,
      '10hrs-100km': 3600
    },
    'innova_crysta': {
      '4hrs-40km': 2400,
      '8hrs-80km': 4000,
      '10hrs-100km': 4800
    },
    'innova_hycross': {
      '4hrs-40km': 2600,
      '8hrs-80km': 4200,
      '10hrs-100km': 5000
    },
    'tempo_traveller': {
      '4hrs-40km': 3000,
      '8hrs-80km': 5000,
      '10hrs-100km': 6000
    },
    'luxury': {
      '4hrs-40km': 2800,
      '8hrs-80km': 4500,
      '10hrs-100km': 5500
    },
    'dzire_cng': {
      '4hrs-40km': 1400,
      '8hrs-80km': 2400,
      '10hrs-100km': 3000
    },
    'etios': {
      '4hrs-40km': 1400,
      '8hrs-80km': 2400,
      '10hrs-100km': 3000
    }
  };
  
  // Check if we have pricing for this exact vehicle
  if (fallbackPrices[vehicleId] && fallbackPrices[vehicleId][packageId]) {
    const price = fallbackPrices[vehicleId][packageId];
    console.log(`Final price for ${vehicleId}, ${packageId}: ${price}`);
    
    // Save to localStorage for future use
    const specificFareKey = `fare_local_${vehicleId}_${packageId}`;
    localStorage.setItem(specificFareKey, price.toString());
    console.log(`Stored fare in localStorage: ${specificFareKey} = ${price}`);
    
    return price;
  }
  
  // Try to match to a known vehicle type
  let matchedVehicle = 'sedan';
  for (const vehicle of Object.keys(fallbackPrices)) {
    if (vehicleId.includes(vehicle)) {
      matchedVehicle = vehicle;
      break;
    }
  }
  
  // Special case handling
  if (vehicleId === 'mpv') {
    matchedVehicle = 'innova_hycross';
  }
  
  const price = fallbackPrices[matchedVehicle][packageId] || 3000;
  console.log(`Final price for ${vehicleId}, ${packageId}: ${price}`);
  
  // Save to localStorage for future use
  const specificFareKey = `fare_local_${vehicleId}_${packageId}`;
  localStorage.setItem(specificFareKey, price.toString());
  console.log(`Stored fare in localStorage: ${specificFareKey} = ${price}`);
  
  return price;
}

/**
 * Syncs local package fares with the database
 * @param silent Whether to display notifications about the sync
 * @returns Whether the sync was successful
 */
export async function syncLocalFaresWithDatabase(silent: boolean = false): Promise<boolean> {
  try {
    const apiUrl = getApiUrl('api/admin/sync-local-fares.php');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Force-Refresh': 'true'
      },
      body: JSON.stringify({ force: true })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Local fares sync result:', result);
      
      // Clear any cached data
      if (typeof window !== 'undefined') {
        window.localPackagePriceCache = {};
      }
      
      // Dispatch an event to notify components about the update
      window.dispatchEvent(new CustomEvent('local-fares-updated', {
        detail: { timestamp: Date.now() }
      }));
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error syncing local fares with database:', error);
    return false;
  }
}

/**
 * Fetches and caches all local package fares
 * @param silent Whether to display notifications about the fetch
 * @returns Whether the fetch was successful
 */
export async function fetchAndCacheLocalFares(silent: boolean = false): Promise<boolean> {
  try {
    const apiUrl = getApiUrl('api/user/local-fares.php');
    const response = await fetch(apiUrl, {
      headers: {
        'Cache-Control': 'no-cache',
        'X-Force-Refresh': 'true'
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      if (data.fares && Array.isArray(data.fares)) {
        // Clear existing in-memory cache
        if (typeof window !== 'undefined') {
          window.localPackagePriceCache = window.localPackagePriceCache || {};
        }
        
        // Cache the fares in localStorage and in-memory
        data.fares.forEach((fare: any) => {
          if (fare.vehicleId && fare.packageId && fare.price) {
            const normalizedVehicleId = normalizeVehicleId(fare.vehicleId);
            const normalizedPackageId = normalizePackageId(fare.packageId);
            const cacheKey = `${normalizedVehicleId}_${normalizedPackageId}`;
            
            // Store in in-memory cache
            if (window.localPackagePriceCache) {
              window.localPackagePriceCache[cacheKey] = {
                price: parseFloat(fare.price),
                timestamp: Date.now(),
                source: 'api'
              };
            }
            
            // Store in localStorage
            const specificFareKey = `fare_local_${normalizedVehicleId}_${normalizedPackageId}`;
            localStorage.setItem(specificFareKey, fare.price.toString());
          }
        });
        
        // Dispatch an event to notify components about the update
        window.dispatchEvent(new CustomEvent('local-fares-cached', {
          detail: { 
            count: data.fares.length,
            timestamp: Date.now() 
          }
        }));
        
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error fetching and caching local fares:', error);
    return false;
  }
}

// IMPORTANT: Remove the duplicate global declaration that was causing errors
// The declaration is now only in the window.d.ts file
