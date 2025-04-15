
import axios from 'axios';
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
if (typeof window !== 'undefined' && !window.localPackagePriceCache) {
  window.localPackagePriceCache = {};
}

// IMPORTANT: These are the master fallback prices that will be used when API calls fail
// Make sure these values are CONSISTENT across the entire application
const MASTER_FALLBACK_PRICES = {
  'sedan': {
    '4hrs-40km': 1200,
    '8hrs-80km': 2000,
    '10hrs-100km': 2500,
    'priceExtraKm': 12,
    'priceExtraHour': 100
  },
  'ertiga': {
    '4hrs-40km': 1500,
    '8hrs-80km': 2500,
    '10hrs-100km': 3000,
    'priceExtraKm': 15,
    'priceExtraHour': 120
  },
  'innova_crysta': {
    '4hrs-40km': 1800,
    '8hrs-80km': 3000,
    '10hrs-100km': 3500,
    'priceExtraKm': 18,
    'priceExtraHour': 150
  },
  'innova_hycross': {
    '4hrs-40km': 2000,
    '8hrs-80km': 3200,
    '10hrs-100km': 3800,
    'priceExtraKm': 20,
    'priceExtraHour': 160
  },
  'tempo': {
    '4hrs-40km': 2500,
    '8hrs-80km': 4000,
    '10hrs-100km': 5000,
    'priceExtraKm': 25,
    'priceExtraHour': 200
  }
};

// Function to get price for a local package (main function used throughout the app)
export async function getLocalPackagePrice(packageId: string, vehicleType: string, forceRefresh: boolean = false): Promise<number> {
  try {
    console.log(`Getting local package price for ${vehicleType}, package: ${packageId}`);
    
    // Normalize parameters
    const normalizedVehicleType = vehicleType.toLowerCase().replace(/\s+/g, '_');
    
    // Fix: Make sure we format "8hr-80km" as "8hrs-80km"
    let normalizedPackageId = packageId;
    if (packageId.includes('hr-')) {
      normalizedPackageId = packageId.replace('hr-', 'hrs-');
    }
    
    // Make sure we're using the correct format "8hrs-80km" not "8hrs-8km"
    if (normalizedPackageId === '8hrs-8km') {
      normalizedPackageId = '8hrs-80km';
    } else if (normalizedPackageId === '10hrs-10km') {
      normalizedPackageId = '10hrs-100km';
    } else if (normalizedPackageId === '4hrs-4km') {
      normalizedPackageId = '4hrs-40km';
    }
    
    // Create unique cache key
    const cacheKey = `${normalizedVehicleType}_${normalizedPackageId}`;
    
    // Only check cache if force refresh not requested
    if (!forceRefresh && window.localPackagePriceCache[cacheKey] && window.localPackagePriceCache[cacheKey].price > 0) {
      console.log(`Using cached price for ${cacheKey}: ${window.localPackagePriceCache[cacheKey].price}`);
      return window.localPackagePriceCache[cacheKey].price;
    }
    
    // Try all available API endpoints in sequence until one works
    // IMPORTANT FIX: Use proper URL construction without /api duplication
    const apiEndpoints = [
      `${getApiUrl('')}/user/direct-booking-data.php?check_sync=true&vehicle_id=${normalizedVehicleType}&package_id=${normalizedPackageId}`,
      `${getApiUrl('')}/local-package-fares.php?vehicle_id=${normalizedVehicleType}&package_id=${normalizedPackageId}`,
      `${getApiUrl('')}/admin/local-fares.php?vehicle_id=${normalizedVehicleType}&package_id=${normalizedPackageId}`
    ];
    
    // Also try absolute URLs with vizagup.com domain as fallbacks
    if (process.env.NODE_ENV === 'production') {
      apiEndpoints.push(
        `https://vizagup.com/api/user/direct-booking-data.php?check_sync=true&vehicle_id=${normalizedVehicleType}&package_id=${normalizedPackageId}`,
        `https://vizagup.com/api/local-package-fares.php?vehicle_id=${normalizedVehicleType}&package_id=${normalizedPackageId}`
      );
    }
    
    let lastError: Error | null = null;
    
    // Try each endpoint until one works
    for (const apiUrl of apiEndpoints) {
      try {
        console.log(`Fetching price from API: ${apiUrl}`);
        
        const response = await axios.get(apiUrl, {
          headers: {
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-cache',
            'Accept': 'application/json'
          },
          timeout: 5000 // 5 second timeout
        });
        
        if (response.data && response.data.status === 'success') {
          // Handle different response formats from different APIs
          let price = 0;
          
          if (response.data.price) {
            price = response.data.price;
          } else if (response.data.baseFare) {
            price = response.data.baseFare;
          } else if (response.data.data) {
            // Try to extract price from nested data object
            const data = response.data.data;
            if (normalizedPackageId.includes('4hrs')) {
              price = data.price4hrs40km || 0;
            } else if (normalizedPackageId.includes('8hrs')) {
              price = data.price8hrs80km || 0;
            } else if (normalizedPackageId.includes('10hrs')) {
              price = data.price10hrs100km || 0;
            }
          }
          
          if (price > 0) {
            console.log(`Retrieved price from API for ${normalizedVehicleType}, ${normalizedPackageId}: ${price}`);
            
            // Update cache with API price
            window.localPackagePriceCache[cacheKey] = { 
              price, 
              timestamp: Date.now(), 
              source: 'api' 
            };
            
            // Dispatch event for consistency
            window.dispatchEvent(new CustomEvent('local-fare-updated', {
              detail: { 
                vehicleType: normalizedVehicleType, 
                packageId: normalizedPackageId, 
                price, 
                source: 'api' 
              }
            }));
            
            return price;
          }
        }
      } catch (error) {
        console.log(`API endpoint ${apiUrl} failed:`, error);
        lastError = error as Error;
        // Continue to next endpoint
      }
    }
    
    // If all API calls failed, throw the last error
    if (lastError) {
      throw lastError;
    }
    
    // If no API price is available, use CONSISTENT master fallback prices
    const fallbackPrice = getFallbackPrice(normalizedVehicleType, normalizedPackageId);
    
    console.log(`Using fallback price for ${normalizedVehicleType}, ${normalizedPackageId}: ${fallbackPrice}`);
    
    // Update cache with hardcoded price
    window.localPackagePriceCache[cacheKey] = { 
      price: fallbackPrice, 
      timestamp: Date.now(), 
      source: 'hardcoded-fallback' 
    };
    
    // Dispatch event for consistency
    window.dispatchEvent(new CustomEvent('local-fare-updated', {
      detail: { 
        vehicleType: normalizedVehicleType, 
        packageId: normalizedPackageId, 
        price: fallbackPrice, 
        source: 'hardcoded-fallback' 
      }
    }));
    
    return fallbackPrice;
  } catch (error) {
    console.error(`Error getting local package price for ${vehicleType}, ${packageId}:`, error);
    
    // Use CONSISTENT master fallback prices
    const normalizedVehicleType = vehicleType.toLowerCase().replace(/\s+/g, '_');
    let normalizedPackageId = packageId;
    if (packageId.includes('hr-')) {
      normalizedPackageId = packageId.replace('hr-', 'hrs-');
    }
    
    // Fix: Make sure we're using the correct format
    if (normalizedPackageId === '8hrs-8km') {
      normalizedPackageId = '8hrs-80km';
    } else if (normalizedPackageId === '10hrs-10km') {
      normalizedPackageId = '10hrs-100km';
    } else if (normalizedPackageId === '4hrs-4km') {
      normalizedPackageId = '4hrs-40km';
    }
    
    // Get fallback price
    const fallbackPrice = getFallbackPrice(normalizedVehicleType, normalizedPackageId);
    
    // Create unique cache key
    const cacheKey = `${normalizedVehicleType}_${normalizedPackageId}`;
    
    console.log(`Using fallback price for ${normalizedVehicleType}, ${normalizedPackageId}: ${fallbackPrice}`);
    
    // Update cache with hardcoded price
    window.localPackagePriceCache[cacheKey] = { 
      price: fallbackPrice, 
      timestamp: Date.now(), 
      source: 'hardcoded-fallback' 
    };
    
    window.dispatchEvent(new CustomEvent('local-fare-updated', {
      detail: { 
        vehicleType: normalizedVehicleType, 
        packageId: normalizedPackageId, 
        price: fallbackPrice, 
        source: 'hardcoded-fallback' 
      }
    }));
    
    return fallbackPrice;
  }
}

// Helper function to get consistent fallback prices
function getFallbackPrice(vehicleType: string, packageId: string): number {
  // First, try to get from master fallback prices
  if (MASTER_FALLBACK_PRICES[vehicleType] && MASTER_FALLBACK_PRICES[vehicleType][packageId]) {
    return MASTER_FALLBACK_PRICES[vehicleType][packageId];
  }
  
  // If vehicle type not found directly, try to match based on name
  let matchedVehicleType = vehicleType;
  if (vehicleType.includes('innova') && vehicleType.includes('hycross')) {
    matchedVehicleType = 'innova_hycross';
  } else if (vehicleType.includes('innova')) {
    matchedVehicleType = 'innova_crysta';
  } else if (vehicleType.includes('tempo') || vehicleType.includes('traveller')) {
    matchedVehicleType = 'tempo';
  } else if (vehicleType.includes('ertiga') || vehicleType.includes('suv')) {
    matchedVehicleType = 'ertiga';
  } else {
    matchedVehicleType = 'sedan'; // Default fallback
  }
  
  // Now try with the matched vehicle type
  if (MASTER_FALLBACK_PRICES[matchedVehicleType] && MASTER_FALLBACK_PRICES[matchedVehicleType][packageId]) {
    return MASTER_FALLBACK_PRICES[matchedVehicleType][packageId];
  }
  
  // Last resort: return a default price based on vehicle type
  return matchedVehicleType.includes('innova_hycross') ? 3200 : 
         matchedVehicleType.includes('innova') ? 3000 : 
         matchedVehicleType.includes('ertiga') ? 2500 : 
         matchedVehicleType.includes('tempo') ? 4000 : 2000;
}

// Function to get local package price from localStorage (for backward compatibility)
export function getLocalPackagePriceFromStorage(packageId: string, vehicleType: string): number {
  try {
    // Normalize types
    const normalizedVehicleType = vehicleType.toLowerCase().replace(/\s+/g, '_');
    const normalizedPackageId = packageId.replace('0', '').replace('hr-', 'hrs-');
    
    // Create cache key
    const cacheKey = `${normalizedVehicleType}_${normalizedPackageId}`;
    
    // Check in window cache first
    if (window.localPackagePriceCache && 
        window.localPackagePriceCache[cacheKey] && 
        window.localPackagePriceCache[cacheKey].price > 0) {
      return window.localPackagePriceCache[cacheKey].price;
    }
    
    // No price in cache
    return 0;
  } catch (error) {
    console.error("Error getting price from localStorage:", error);
    return 0;
  }
}

// Alias for backward compatibility
export const getLocalPackagePriceFromApi = getLocalPackagePrice;

// Function to clear the local package price cache
export function clearLocalPackagePriceCache(): void {
  if (typeof window !== 'undefined' && window.localPackagePriceCache) {
    window.localPackagePriceCache = {};
    console.log('Local package price cache cleared');
    
    // Trigger refresh event
    window.dispatchEvent(new CustomEvent('local-fares-cache-cleared', {
      detail: { timestamp: Date.now() }
    }));
  }
}

// Function to fetch and cache all local fares
export async function fetchAndCacheLocalFares(forceRefresh: boolean = false): Promise<Record<string, any>> {
  console.log('Fetching all local package fares from API');
  try {
    const fares: Record<string, any> = {};
    
    // Get a list of vehicles to fetch prices for
    let vehicleIds = ['sedan', 'ertiga', 'innova_crysta', 'innova_hycross', 'tempo'];
    
    // Fetch prices for each vehicle
    for (const vehicleId of vehicleIds) {
      try {
        // Try multiple API endpoints for each vehicle
        // IMPORTANT FIX: Use proper URL construction without /api duplication
        const apiEndpoints = [
          `${getApiUrl('')}/user/direct-booking-data.php?check_sync=true&vehicle_id=${vehicleId}`,
          `${getApiUrl('')}/local-package-fares.php?vehicle_id=${vehicleId}`,
          `${getApiUrl('')}/admin/local-fares.php?vehicle_id=${vehicleId}`
        ];
        
        let success = false;
        
        for (const apiUrl of apiEndpoints) {
          if (success) break; // Skip remaining endpoints if we already got data
          
          try {
            console.log(`Trying API endpoint for ${vehicleId}: ${apiUrl}`);
            const response = await axios.get(apiUrl, {
              headers: {
                'X-Force-Refresh': 'true',
                'Cache-Control': 'no-cache',
                'Accept': 'application/json'
              },
              timeout: 5000 // 5 second timeout
            });
            
            if (response.data && response.data.status === 'success') {
              if (response.data.data) {
                const vehicleFares = response.data.data;
                
                if (vehicleFares) {
                  fares[vehicleId] = {
                    price4hrs40km: vehicleFares.price4hrs40km || 0,
                    price8hrs80km: vehicleFares.price8hrs80km || 0,
                    price10hrs100km: vehicleFares.price10hrs100km || 0,
                    priceExtraKm: vehicleFares.priceExtraKm || 0,
                    priceExtraHour: vehicleFares.priceExtraHour || 0
                  };
                  
                  console.log(`Successfully fetched fares for ${vehicleId} from API`);
                  success = true;
                }
              } else if (response.data.fares && response.data.fares[vehicleId]) {
                const vFares = response.data.fares[vehicleId];
                fares[vehicleId] = {
                  price4hrs40km: vFares.price4hrs40km || 0,
                  price8hrs80km: vFares.price8hrs80km || 0,
                  price10hrs100km: vFares.price10hrs100km || 0,
                  priceExtraKm: vFares.priceExtraKm || 0,
                  priceExtraHour: vFares.priceExtraHour || 0
                };
                console.log(`Successfully fetched fares for ${vehicleId} from API`);
                success = true;
              }
            }
          } catch (apiError) {
            console.error(`API call to ${apiUrl} failed for ${vehicleId}:`, apiError);
            // Continue to next endpoint
          }
        }
        
        // If none of the API endpoints worked, use MASTER_FALLBACK_PRICES
        if (!success) {
          // Use hardcoded fallback prices - ENSURE CONSISTENCY with MASTER_FALLBACK_PRICES
          fares[vehicleId] = {
            price4hrs40km: MASTER_FALLBACK_PRICES[vehicleId]?.['4hrs-40km'] || 0,
            price8hrs80km: MASTER_FALLBACK_PRICES[vehicleId]?.['8hrs-80km'] || 0, 
            price10hrs100km: MASTER_FALLBACK_PRICES[vehicleId]?.['10hrs-100km'] || 0,
            priceExtraKm: MASTER_FALLBACK_PRICES[vehicleId]?.['priceExtraKm'] || 0,
            priceExtraHour: MASTER_FALLBACK_PRICES[vehicleId]?.['priceExtraHour'] || 0
          };
          
          console.log(`Using hardcoded fallback prices for ${vehicleId}`);
        }
      } catch (vehicleError) {
        console.error(`Error fetching fares for ${vehicleId}:`, vehicleError);
        
        // Use hardcoded fallback prices - ENSURE CONSISTENCY with MASTER_FALLBACK_PRICES
        fares[vehicleId] = {
          price4hrs40km: MASTER_FALLBACK_PRICES[vehicleId]?.['4hrs-40km'] || 0,
          price8hrs80km: MASTER_FALLBACK_PRICES[vehicleId]?.['8hrs-80km'] || 0, 
          price10hrs100km: MASTER_FALLBACK_PRICES[vehicleId]?.['10hrs-100km'] || 0,
          priceExtraKm: MASTER_FALLBACK_PRICES[vehicleId]?.['priceExtraKm'] || 0,
          priceExtraHour: MASTER_FALLBACK_PRICES[vehicleId]?.['priceExtraHour'] || 0
        };
        
        console.log(`Using hardcoded fallback prices for ${vehicleId}`);
      }
    }
    
    // Dispatch event to notify components about updated fares
    window.dispatchEvent(new CustomEvent('local-fares-updated', {
      detail: { timestamp: Date.now(), source: 'api-refresh' }
    }));
    
    return fares;
  } catch (error) {
    console.error('Error fetching all local fares:', error);
    
    // Create fallback fares from MASTER_FALLBACK_PRICES for consistency
    const fallbackFares: Record<string, any> = {};
    
    for (const vehicleId in MASTER_FALLBACK_PRICES) {
      fallbackFares[vehicleId] = {
        price4hrs40km: MASTER_FALLBACK_PRICES[vehicleId]['4hrs-40km'],
        price8hrs80km: MASTER_FALLBACK_PRICES[vehicleId]['8hrs-80km'],
        price10hrs100km: MASTER_FALLBACK_PRICES[vehicleId]['10hrs-100km'],
        priceExtraKm: MASTER_FALLBACK_PRICES[vehicleId]['priceExtraKm'],
        priceExtraHour: MASTER_FALLBACK_PRICES[vehicleId]['priceExtraHour']
      };
    }
    
    // Dispatch event to notify components about fallback fares
    window.dispatchEvent(new CustomEvent('local-fares-updated', {
      detail: { timestamp: Date.now(), source: 'hardcoded-fallback' }
    }));
    
    return fallbackFares;
  }
}
