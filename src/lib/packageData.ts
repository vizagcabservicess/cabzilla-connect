
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
export const hourlyPackageOptions = hourlyPackages.map(pkg => ({
  value: pkg.id,
  label: `${pkg.hours} Hours / ${pkg.kilometers} KM`
}));

// Global cache for local package prices to ensure consistency
const localPackagePriceCache: Record<string, any> = {};

// API endpoints for local package fares
const API_ENDPOINTS = {
  LOCAL_PACKAGE: '/api/local-package-fares.php',
  DIRECT_BOOKING_DATA: '/api/user/direct-booking-data.php',
  ADMIN_LOCAL_FARES: '/api/admin/direct-local-fares.php'
};

// Function to get price for a local package (main function used throughout the app)
export async function getLocalPackagePrice(packageId: string, vehicleType: string, forceRefresh: boolean = false): Promise<number> {
  try {
    // Normalize parameters
    const normalizedVehicleType = vehicleType.toLowerCase().replace(/\s+/g, '_');
    const normalizedPackageId = packageId.replace('0', '').replace('hr-', 'hrs-');
    
    // Create unique cache key
    const cacheKey = `${normalizedVehicleType}_${normalizedPackageId}`;
    
    // 1. Check cache first unless force refresh requested
    if (!forceRefresh && localPackagePriceCache[cacheKey] && localPackagePriceCache[cacheKey].price > 0) {
      console.log(`Using cached price for ${cacheKey}: ${localPackagePriceCache[cacheKey].price}`);
      return localPackagePriceCache[cacheKey].price;
    }
    
    // 2. Try to fetch from the main API endpoint first
    try {
      console.log(`Fetching package price from API for ${normalizedVehicleType}, package: ${normalizedPackageId}`);
      const response = await axios.get(`${API_ENDPOINTS.LOCAL_PACKAGE}`, {
        params: {
          vehicle_id: normalizedVehicleType,
          package_id: normalizedPackageId,
          _t: Date.now()
        },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        }
      });
      
      if (response.data && response.data.status === 'success' && response.data.price > 0) {
        const price = Number(response.data.price);
        console.log(`API returned price for ${normalizedVehicleType}, ${normalizedPackageId}: ${price}`);
        
        // Update cache and localStorage
        localPackagePriceCache[cacheKey] = { price, timestamp: Date.now(), source: 'api' };
        localStorage.setItem(`fare_local_${normalizedVehicleType}`, price.toString());
        
        // Dispatch event for consistency
        window.dispatchEvent(new CustomEvent('local-fare-updated', {
          detail: { vehicleType: normalizedVehicleType, packageId: normalizedPackageId, price, source: 'api' }
        }));
        
        return price;
      }
    } catch (apiError) {
      console.warn(`Error fetching from main API: ${apiError}`);
      // Continue to next method if this fails
    }
    
    // 3. Try the backup API endpoint (direct-booking-data.php)
    try {
      console.log(`Trying backup API endpoint for ${normalizedVehicleType}, package: ${normalizedPackageId}`);
      const backupResponse = await axios.get(`${API_ENDPOINTS.DIRECT_BOOKING_DATA}`, {
        params: {
          check_sync: 'true',
          vehicle_id: normalizedVehicleType,
          package_id: normalizedPackageId,
          _t: Date.now()
        },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        }
      });
      
      if (backupResponse.data && backupResponse.data.status === 'success' && backupResponse.data.price > 0) {
        const price = Number(backupResponse.data.price);
        console.log(`Backup API returned price for ${normalizedVehicleType}, ${normalizedPackageId}: ${price}`);
        
        // Update cache and localStorage
        localPackagePriceCache[cacheKey] = { price, timestamp: Date.now(), source: 'backup-api' };
        localStorage.setItem(`fare_local_${normalizedVehicleType}`, price.toString());
        
        // Dispatch event for consistency
        window.dispatchEvent(new CustomEvent('local-fare-updated', {
          detail: { vehicleType: normalizedVehicleType, packageId: normalizedPackageId, price, source: 'backup-api' }
        }));
        
        return price;
      }
    } catch (backupError) {
      console.warn(`Error fetching from backup API: ${backupError}`);
      // Continue to next method if this fails
    }
    
    // 4. Try admin API endpoint as a last resort
    try {
      console.log(`Trying admin API endpoint for ${normalizedVehicleType}`);
      const adminResponse = await axios.get(`${API_ENDPOINTS.ADMIN_LOCAL_FARES}`, {
        params: {
          vehicle_id: normalizedVehicleType,
          _t: Date.now()
        },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        }
      });
      
      if (adminResponse.data && adminResponse.data.status === 'success' && adminResponse.data.fares && adminResponse.data.fares.length > 0) {
        const fareData = adminResponse.data.fares[0];
        let price = 0;
        
        if (normalizedPackageId === '4hrs-40km' && fareData.price4hrs40km) {
          price = Number(fareData.price4hrs40km);
        } else if (normalizedPackageId === '8hrs-80km' && fareData.price8hrs80km) {
          price = Number(fareData.price8hrs80km);
        } else if (normalizedPackageId === '10hrs-100km' && fareData.price10hrs100km) {
          price = Number(fareData.price10hrs100km);
        }
        
        if (price > 0) {
          console.log(`Admin API returned price for ${normalizedVehicleType}, ${normalizedPackageId}: ${price}`);
          
          // Update cache and localStorage
          localPackagePriceCache[cacheKey] = { price, timestamp: Date.now(), source: 'admin-api' };
          localStorage.setItem(`fare_local_${normalizedVehicleType}`, price.toString());
          
          // Dispatch event for consistency
          window.dispatchEvent(new CustomEvent('local-fare-updated', {
            detail: { vehicleType: normalizedVehicleType, packageId: normalizedPackageId, price, source: 'admin-api' }
          }));
          
          return price;
        }
      }
    } catch (adminError) {
      console.warn(`Error fetching from admin API: ${adminError}`);
      // Continue to next method if this fails
    }
    
    // 5. Check localStorage as fallback
    const localStorageKey = `fare_local_${normalizedVehicleType}`;
    const storedPrice = localStorage.getItem(localStorageKey);
    if (storedPrice) {
      const price = parseInt(storedPrice, 10);
      if (price > 0) {
        console.log(`Using stored local package price for ${normalizedVehicleType}: ${price}`);
        // Update cache with stored price
        localPackagePriceCache[cacheKey] = { price, timestamp: Date.now(), source: 'localStorage' };
        return price;
      }
    }
    
    // 6. Get exact price from database dump
    // This is based on the actual database values shown in the screenshot
    const dbPrices: Record<string, Record<string, number>> = {
      'sedan': {
        '4hrs-40km': 1400,
        '8hrs-80km': 2400,
        '10hrs-100km': 3000
      },
      'ertiga': {
        '4hrs-40km': 1500,
        '8hrs-80km': 3000,
        '10hrs-100km': 3500
      },
      'innova_crysta': {
        '4hrs-40km': 1800,
        '8hrs-80km': 3500,
        '10hrs-100km': 4000
      },
      'tempo': {
        '4hrs-40km': 3000,
        '8hrs-80km': 4500,
        '10hrs-100km': 5500
      },
      'luxury': {
        '4hrs-40km': 3500,
        '8hrs-80km': 5500,
        '10hrs-100km': 6500
      },
      'mpv': {
        '4hrs-40km': 2000,
        '8hrs-80km': 4000,
        '10hrs-100km': 4500
      },
      'tempo_traveller': {
        '4hrs-40km': 6500,
        '8hrs-80km': 6500,
        '10hrs-100km': 7500
      }
    };
    
    // Map vehicle types to standard types for database pricing
    let mappedVehicleType = normalizedVehicleType;
    
    if (normalizedVehicleType.includes('innova') || normalizedVehicleType.includes('crysta')) {
      mappedVehicleType = 'innova_crysta';
    } else if (normalizedVehicleType.includes('dzire') || normalizedVehicleType.includes('etios') || 
               normalizedVehicleType.includes('toyota') || normalizedVehicleType.includes('amaze')) {
      mappedVehicleType = 'sedan';
    } else if (normalizedVehicleType.includes('tempo_traveller') || normalizedVehicleType.includes('traveller')) {
      mappedVehicleType = 'tempo_traveller';
    } else if (normalizedVehicleType === 'tempo') {
      mappedVehicleType = 'tempo';
    } else if (normalizedVehicleType.includes('ertiga') || normalizedVehicleType.includes('xl6')) {
      mappedVehicleType = 'ertiga';
    } else if (normalizedVehicleType.includes('mpv')) {
      mappedVehicleType = 'mpv';
    }
    
    // Check if we have a database price for this vehicle and package
    if (dbPrices[mappedVehicleType] && dbPrices[mappedVehicleType][normalizedPackageId]) {
      const price = dbPrices[mappedVehicleType][normalizedPackageId];
      console.log(`Using database price for ${normalizedVehicleType} (mapped to ${mappedVehicleType}), ${normalizedPackageId}: ${price}`);
      
      // Update cache with db price
      localPackagePriceCache[cacheKey] = { price, timestamp: Date.now(), source: 'database' };
      localStorage.setItem(localStorageKey, price.toString());
      
      // Dispatch event for consistency
      window.dispatchEvent(new CustomEvent('local-fare-updated', {
        detail: { vehicleType: normalizedVehicleType, packageId: normalizedPackageId, price, source: 'database' }
      }));
      
      return price;
    }
    
    // 7. Last resort - throw error as we couldn't get a valid price
    throw new Error(`Could not find a valid price for ${normalizedVehicleType}, package: ${normalizedPackageId}`);
    
  } catch (error) {
    console.error(`Error getting local package price for ${vehicleType}, ${packageId}:`, error);
    throw error;
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
  const normalizedVehicleType = vehicleType.toLowerCase().replace(/\s+/g, '_');
  const fareKey = `fare_local_${normalizedVehicleType}`;
  const storedPrice = localStorage.getItem(fareKey);
  
  if (storedPrice) {
    return parseInt(storedPrice, 10);
  }
  
  return 0; // Return 0 to indicate no price found
}

// Function to fetch and cache all local fares
export async function fetchAndCacheLocalFares(forceRefresh: boolean = false): Promise<Record<string, any>> {
  console.log('Fetching all local package fares from API');
  try {
    // First try the main local package fares API
    const response = await axios.get(API_ENDPOINTS.LOCAL_PACKAGE, {
      params: { _t: Date.now() },
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-Force-Refresh': forceRefresh ? 'true' : 'false'
      }
    });
    
    if (response.data && response.data.status === 'success' && response.data.fares) {
      console.log('Successfully fetched local fares from API');
      
      // Transform the API response to our expected format
      const fares: Record<string, any> = {};
      
      // Extract fare data for each vehicle
      Object.entries(response.data.fares).forEach(([vehicleId, data]: [string, any]) => {
        fares[vehicleId] = {
          price4hrs40km: Number(data.price4hrs40km || data.price_4hr_40km || 0),
          price8hrs80km: Number(data.price8hrs80km || data.price_8hr_80km || 0),
          price10hrs100km: Number(data.price10hrs100km || data.price_10hr_100km || 0),
          priceExtraKm: Number(data.priceExtraKm || data.price_extra_km || 0),
          priceExtraHour: Number(data.priceExtraHour || data.price_extra_hour || 0)
        };
        
        // Store each price in localStorage for quick access
        localStorage.setItem(`fare_local_${vehicleId.toLowerCase()}`, 
          fares[vehicleId].price8hrs80km.toString());
      });
      
      // Cache the fares in localStorage
      const faresKey = 'cached_local_package_fares';
      localStorage.setItem(faresKey, JSON.stringify({
        timestamp: Date.now(),
        data: fares,
        source: 'api'
      }));
      
      // Dispatch event to notify components about updated fares
      window.dispatchEvent(new CustomEvent('local-fares-updated', {
        detail: { timestamp: Date.now(), source: 'api-refresh' }
      }));
      
      return fares;
    }
  } catch (apiError) {
    console.error('Error fetching local fares from primary API:', apiError);
    // Continue to fallback if primary API fails
  }
  
  // Try the backup admin API as fallback
  try {
    const backupResponse = await axios.get(API_ENDPOINTS.ADMIN_LOCAL_FARES, {
      params: { _t: Date.now() },
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-Force-Refresh': 'true'
      }
    });
    
    if (backupResponse.data && backupResponse.data.status === 'success' && backupResponse.data.fares) {
      console.log('Using admin API for local fares');
      
      // Transform the admin API response to our expected format
      const fares: Record<string, any> = {};
      
      backupResponse.data.fares.forEach((item: any) => {
        const vehicleId = item.vehicleId || item.vehicle_id;
        
        fares[vehicleId] = {
          price4hrs40km: Number(item.price4hrs40km || 0),
          price8hrs80km: Number(item.price8hrs80km || 0),
          price10hrs100km: Number(item.price10hrs100km || 0),
          priceExtraKm: Number(item.priceExtraKm || 0),
          priceExtraHour: Number(item.priceExtraHour || 0)
        };
        
        // Store each price in localStorage for quick access
        localStorage.setItem(`fare_local_${vehicleId.toLowerCase()}`, 
          fares[vehicleId].price8hrs80km.toString());
      });
      
      // Cache the fares in localStorage
      const faresKey = 'cached_local_package_fares';
      localStorage.setItem(faresKey, JSON.stringify({
        timestamp: Date.now(),
        data: fares,
        source: 'admin-api'
      }));
      
      // Dispatch event to notify components about updated fares
      window.dispatchEvent(new CustomEvent('local-fares-updated', {
        detail: { timestamp: Date.now(), source: 'admin-api-refresh' }
      }));
      
      return fares;
    }
  } catch (backupError) {
    console.error('Error fetching local fares from admin API:', backupError);
  }
  
  // Return empty object if all API calls fail
  console.warn('Failed to fetch local package fares from API, returning empty object');
  return {};
}
