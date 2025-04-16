import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { normalizeVehicleId, normalizePackageId } from '@/lib/packageData';
import { safeApiRequest, tryMultipleEndpoints } from '@/utils/safeApiUtils';

interface LocalFareResponse {
  status: string;
  message: string;
  price?: number;
  fares?: Array<{
    vehicleId: string;
    price4hrs40km: number;
    price8hrs80km: number;
    price10hrs100km: number;
    priceExtraKm: number;
    priceExtraHour: number;
  }>;
  timestamp: number;
  data?: {
    price?: number;
    package_id?: string;
    vehicle_id?: string;
  };
  vehicle_id?: string;
  package_id?: string;
  original_vehicle_id?: string;
  original_package_id?: string;
  currency?: string;
  source?: string;
  debug?: any;
}

// Vehicle-specific pricing table for fallback with adjusted prices
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
  },
  'bus': {
    '4hrs-40km': 4000, 
    '8hrs-80km': 7000,
    '10hrs-100km': 8500
  },
  'mpv': { // Explicit pricing for MPV that matches Innova Hycross
    '4hrs-40km': 2600,
    '8hrs-80km': 4200,
    '10hrs-100km': 5000
  },
  'amaze': {
    '4hrs-40km': 1400,
    '8hrs-80km': 2400,
    '10hrs-100km': 3000
  }
};

// Cache for local package prices to avoid excessive API calls
interface CacheEntry {
  price: number;
  timestamp: number;
  source: string;
}

let localPackagePriceCache: Record<string, CacheEntry> = {};

/**
 * Fetches the fare for a local package from the API
 * @param packageId The package ID (e.g., '8hrs-80km')
 * @param vehicleId The vehicle ID (e.g., 'sedan')
 * @param forceRefresh Whether to bypass the cache and force a refresh from the API
 * @returns The fare price
 */
export const getLocalPackagePrice = async (packageId: string, vehicleId: string, forceRefresh: boolean = false): Promise<number> => {
  if (!packageId || !vehicleId) {
    console.error('Invalid package or vehicle ID');
    return 0;
  }
  
  // Normalize the IDs for consistency
  const normalizedPackageId = normalizePackageId(packageId);
  const normalizedVehicleId = normalizeVehicleId(vehicleId);
  
  console.log(`Getting local package price for ${normalizedVehicleId}, package: ${normalizedPackageId}, forceRefresh: ${forceRefresh} (original: ${vehicleId})`);
  
  // Create a cache key that includes both vehicle ID and package ID
  const cacheKey = `${normalizedVehicleId}_${normalizedPackageId}`;
  
  console.log(`Using cache key: ${cacheKey} for local package price`);
  
  // Check localStorage first for previously set fares
  const specificFareKey = `fare_local_${normalizedVehicleId}_${normalizedPackageId}`;
  const storedFare = localStorage.getItem(specificFareKey) || localStorage.getItem(`selected_fare_${normalizedVehicleId}_${normalizedPackageId}`);
  
  if (storedFare && !forceRefresh) {
    const parsedFare = parseFloat(storedFare);
    if (!isNaN(parsedFare) && parsedFare > 0) {
      console.log(`Using stored fare from localStorage: ${parsedFare}`);
      
      // Verify this fare with the cache entry
      if (localPackagePriceCache[cacheKey] && localPackagePriceCache[cacheKey].price === parsedFare) {
        return parsedFare;
      }
      
      // Store in cache for future use
      localPackagePriceCache[cacheKey] = {
        price: parsedFare,
        timestamp: Date.now(),
        source: 'localStorage'
      };
      
      return parsedFare;
    }
  }
  
  // Check if we have a cached result that's not expired (5 minutes)
  const now = Date.now();
  const cachedResult = localPackagePriceCache[cacheKey];
  
  if (cachedResult && !forceRefresh && now - cachedResult.timestamp < 300000) {
    console.log(`Using cached price: ${cachedResult.price} from ${cachedResult.source}`);
    
    // Store in localStorage for consistency
    localStorage.setItem(specificFareKey, cachedResult.price.toString());
    
    return cachedResult.price;
  }
  
  try {
    // Define endpoints to try, prioritizing the PHP template path for Lovable environment
    const endpoints = [
      // First try with direct path to local mock API
      `/backend/php-templates/api/local-package-fares.php?vehicle_id=${normalizedVehicleId}&package_id=${normalizedPackageId}`,
      
      // Then try direct API path (without backend prefix)
      `/api/local-package-fares.php?vehicle_id=${normalizedVehicleId}&package_id=${normalizedPackageId}`,
      
      // Then try alternatives
      `/api/admin/direct-local-fares.php?vehicle_id=${normalizedVehicleId}`,
      `/api/user/direct-booking-data.php?check_sync=true&vehicle_id=${normalizedVehicleId}&package_id=${normalizedPackageId}`
    ];
    
    console.log(`Attempting API requests with endpoints:`, endpoints);
    
    // Use the improved tryMultipleEndpoints utility
    const response = await tryMultipleEndpoints<LocalFareResponse>(endpoints, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-Force-Refresh': forceRefresh ? 'true' : 'false'
      },
      timeout: 8000 // Reasonable timeout
    });
    
    if (response) {
      let price = 0;
      
      // Process response based on endpoint format
      if (response.price !== undefined && response.price !== null) {
        // Direct price field from local-package-fares.php
        price = Number(response.price);
        console.log(`Retrieved direct price from API: ₹${price}`);
      } else if (response.fares && Array.isArray(response.fares) && response.fares.length > 0) {
        // Format from direct-local-fares.php
        const fareData = response.fares[0];
        
        if (normalizedPackageId.includes('4hrs-40km')) {
          price = Number(fareData.price4hrs40km);
        } else if (normalizedPackageId.includes('8hrs-80km')) {
          price = Number(fareData.price8hrs80km);
        } else if (normalizedPackageId.includes('10hrs-100km')) {
          price = Number(fareData.price10hrs100km);
        }
        
        console.log(`Retrieved fare from fares array: ₹${price}`);
      } else if (response.data && response.data.price !== undefined) {
        // Format from booking-data.php
        price = Number(response.data.price);
        console.log(`Retrieved fare from data.price: ₹${price}`);
      }
      
      // If we got a valid price, store it and return
      if (price > 0) {
        // Store in cache
        localPackagePriceCache[cacheKey] = {
          price,
          timestamp: now,
          source: 'api'
        };
        
        // Store in localStorage for persistence
        localStorage.setItem(specificFareKey, price.toString());
        localStorage.setItem(`selected_fare_${normalizedVehicleId}_${normalizedPackageId}`, price.toString());
        
        // Dispatch fare update event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('fare-calculated', {
            detail: {
              cabId: normalizedVehicleId,
              tripType: 'local',
              hourlyPackage: normalizedPackageId,
              calculated: true,
              fare: price,
              timestamp: Date.now(),
              source: 'api'
            }
          }));
        }
        
        return price;
      }
    }
    
    // If API fails or returns invalid price, use fallback pricing
    return getFallbackPrice(normalizedVehicleId, normalizedPackageId);
  } catch (error) {
    console.error('Error fetching local package price:', error);
    
    // Try direct fetch before falling back to static prices
    try {
      const directEndpoint = `/backend/php-templates/api/local-package-fares.php?vehicle_id=${normalizedVehicleId}&package_id=${normalizedPackageId}`;
      console.log(`Attempting direct fetch to: ${directEndpoint}`);
      
      const response = await fetch(directEndpoint, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Force-Refresh': forceRefresh ? 'true' : 'false'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.price && typeof data.price === 'number' && data.price > 0) {
          console.log(`Direct fetch successful, price: ${data.price}`);
          
          // Store in cache
          localPackagePriceCache[cacheKey] = {
            price: data.price,
            timestamp: Date.now(),
            source: 'direct-fetch'
          };
          
          // Store in localStorage
          localStorage.setItem(specificFareKey, data.price.toString());
          localStorage.setItem(`selected_fare_${normalizedVehicleId}_${normalizedPackageId}`, data.price.toString());
          
          return data.price;
        }
      }
    } catch (directError) {
      console.error('Direct fetch also failed:', directError);
    }
    
    // Use fallback pricing when all API calls fail
    return getFallbackPrice(normalizedVehicleId, normalizedPackageId);
  }
};

/**
 * Gets fallback pricing when API calls fail
 */
export const getFallbackPrice = (vehicleId: string, packageId: string): number => {
  // Check if we already have a cached fare first
  const cacheKey = `${vehicleId}_${packageId}`;
  const cachedEntry = localPackagePriceCache[cacheKey];
  
  if (cachedEntry && cachedEntry.price > 0) {
    console.log(`Using cached fare from fallback mechanism: ₹${cachedEntry.price}`);
    return cachedEntry.price;
  }
  
  // Check localStorage
  const specificFareKey = `fare_local_${vehicleId}_${packageId}`;
  const cachedFare = localStorage.getItem(specificFareKey) || localStorage.getItem(`selected_fare_${vehicleId}_${packageId}`);
  
  if (cachedFare) {
    const parsedFare = parseFloat(cachedFare);
    if (!isNaN(parsedFare) && parsedFare > 0) {
      console.log(`Using cached fare from localStorage fallback: ₹${parsedFare}`);
      
      // Store in cache
      localPackagePriceCache[cacheKey] = {
        price: parsedFare,
        timestamp: Date.now(),
        source: 'localStorage-fallback'
      };
      
      return parsedFare;
    }
  }
  
  // Normalize the cab ID to match our fallback keys
  let normalizedCabId = vehicleId.toLowerCase().replace(/\s+/g, '_');
  
  // Custom mappings for specific vehicle types
  if (normalizedCabId === 'mpv') {
    normalizedCabId = 'innova_hycross';
  } else if (normalizedCabId.includes('hycross')) {
    normalizedCabId = 'innova_hycross';
  } else if (normalizedCabId.includes('crysta')) {
    normalizedCabId = 'innova_crysta';
  } else if (normalizedCabId.includes('tempo')) {
    normalizedCabId = 'tempo_traveller';
  } else if (normalizedCabId.includes('dzire') && normalizedCabId.includes('cng')) {
    normalizedCabId = 'dzire_cng';
  } else if (normalizedCabId.includes('urbania')) {
    normalizedCabId = 'bus';
  }
  
  // Special handling for Hycross when identified as MPV
  if ((vehicleId === 'mpv' || normalizedCabId === 'mpv') && fallbackPrices['mpv']) {
    console.log('Using explicit MPV fallback pricing for Innova Hycross');
    normalizedCabId = 'mpv';
  }
  
  // Find the closest matching vehicle type in our fallback prices
  let matchingVehicleType = 'sedan'; // Default fallback
  
  for (const vehicleType of Object.keys(fallbackPrices)) {
    if (normalizedCabId.includes(vehicleType)) {
      if (!matchingVehicleType || vehicleType.length > matchingVehicleType.length) {
        matchingVehicleType = vehicleType;
      }
    }
  }
  
  // Normalize package ID
  const normalizedPackageId = normalizePackageId(packageId);
  
  // Get pricing for the matching vehicle type
  const vehiclePricing = fallbackPrices[matchingVehicleType];
  
  // Get the fare for the selected package
  let fallbackFare = vehiclePricing[normalizedPackageId] || vehiclePricing['8hrs-80km'] || 3000;
  
  console.log(`Using fallback pricing for ${vehicleId}: ₹${fallbackFare} (matched to ${matchingVehicleType})`);
  
  // Store this fallback price in localStorage
  localStorage.setItem(specificFareKey, fallbackFare.toString());
  localStorage.setItem(`selected_fare_${vehicleId}_${packageId}`, fallbackFare.toString());
  
  // Also cache it
  localPackagePriceCache[cacheKey] = {
    price: fallbackFare,
    timestamp: Date.now(),
    source: 'fallback-pricing'
  };
  
  // Dispatch fare update event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fare-calculated', {
      detail: {
        cabId: vehicleId,
        tripType: 'local',
        hourlyPackage: packageId,
        calculated: true,
        fare: fallbackFare,
        timestamp: Date.now(),
        source: 'fallback'
      }
    }));
  }
  
  return fallbackFare;
};

/**
 * Fetches and caches all local package fares for all popular vehicles
 * @param silent Whether to suppress console logging
 */
export const fetchAndCacheLocalFares = async (silent: boolean = false): Promise<void> => {
  const packages = ['4hrs-40km', '8hrs-80km', '10hrs-100km'];
  const vehicles = ['sedan', 'ertiga', 'innova_crysta', 'innova_hycross', 'tempo_traveller', 'dzire_cng', 'etios', 'mpv', 'bus'];
  
  const fetchPromises = [];
  
  for (const vehicleId of vehicles) {
    for (const packageId of packages) {
      // Add a slight delay to prevent overwhelming the server
      const promise = new Promise<void>((resolve) => {
        setTimeout(async () => {
          try {
            const price = await getLocalPackagePrice(packageId, vehicleId, true);
            if (!silent) {
              console.log(`Pre-fetched ${vehicleId} ${packageId}: ₹${price}`);
            }
          } catch (error) {
            console.error(`Error pre-fetching ${vehicleId} ${packageId}:`, error);
          } finally {
            resolve();
          }
        }, Math.random() * 500); // Random delay between 0-500ms
      });
      
      fetchPromises.push(promise);
    }
  }
  
  await Promise.all(fetchPromises);
  console.log('Finished pre-fetching all local package fares');
  
  // Dispatch an event to notify other components that fares have been updated
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('local-fares-updated', {
      detail: {
        timestamp: Date.now(),
        source: 'fetchAndCacheLocalFares'
      }
    }));
  }
};

// Export the cache for external use
export const clearLocalPackagePriceCache = () => {
  localPackagePriceCache = {};
  console.log('Cleared local package price cache');
  
  // Also dispatch an event to notify components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('local-fares-cache-cleared', {
      detail: {
        timestamp: Date.now()
      }
    }));
  }
};

// Initialize by pre-fetching fares in the background on module load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      fetchAndCacheLocalFares(true).catch(console.error);
    }, 500);
  });
}
