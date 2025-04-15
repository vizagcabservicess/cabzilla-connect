
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

// Function to get price for a local package (main function used throughout the app)
export async function getLocalPackagePrice(packageId: string, vehicleType: string, forceRefresh: boolean = false): Promise<number> {
  try {
    console.log(`Getting local package price for ${vehicleType}, package: ${packageId}`);
    
    // Normalize parameters
    const normalizedVehicleType = vehicleType.toLowerCase().replace(/\s+/g, '_');
    const normalizedPackageId = packageId.replace('0', '').replace('hr-', 'hrs-');
    
    // Create unique cache key
    const cacheKey = `${normalizedVehicleType}_${normalizedPackageId}`;
    
    // Only check cache if force refresh not requested
    if (!forceRefresh && window.localPackagePriceCache[cacheKey] && window.localPackagePriceCache[cacheKey].price > 0) {
      console.log(`Using cached price for ${cacheKey}: ${window.localPackagePriceCache[cacheKey].price}`);
      return window.localPackagePriceCache[cacheKey].price;
    }
    
    // Make direct API call to get the latest price
    const apiUrl = `${getApiUrl()}/api/user/direct-booking-data.php?check_sync=true&vehicle_id=${normalizedVehicleType}&package_id=${normalizedPackageId}`;
    console.log(`Fetching price from API: ${apiUrl}`);
    
    const response = await axios.get(apiUrl, {
      headers: {
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (response.data && response.data.status === 'success') {
      const price = response.data.price || response.data.baseFare || 0;
      
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
    
    // If API call failed or returned 0, throw error
    throw new Error(`Failed to get valid price from API for ${vehicleType}, ${packageId}`);
    
  } catch (error) {
    console.error(`Error getting local package price for ${vehicleType}, ${packageId}:`, error);
    // DO NOT RETURN ANY FALLBACK PRICE
    // Instead throw the error to be handled by the component
    throw new Error(`Could not get price for ${vehicleType} ${packageId}`);
  }
}

// Alias for backward compatibility
export const getLocalPackagePriceFromApi = getLocalPackagePrice;

// Function to clear the local package price cache
export function clearLocalPackagePriceCache() {
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
        // Make API call to get prices for this vehicle
        const apiUrl = `${getApiUrl()}/api/user/direct-booking-data.php?check_sync=true&vehicle_id=${vehicleId}`;
        console.log(`Fetching all fares for ${vehicleId} from API: ${apiUrl}`);
        
        const response = await axios.get(apiUrl, {
          headers: {
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.data && response.data.status === 'success' && response.data.data) {
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
          }
        }
      } catch (vehicleError) {
        console.error(`Error fetching fares for ${vehicleId}:`, vehicleError);
        // Don't set fallback prices, just continue to next vehicle
      }
    }
    
    // Dispatch event to notify components about updated fares
    window.dispatchEvent(new CustomEvent('local-fares-updated', {
      detail: { timestamp: Date.now(), source: 'api-refresh' }
    }));
    
    return fares;
  } catch (error) {
    console.error('Error fetching all local fares:', error);
    throw error; // Propagate error to caller
  }
}
