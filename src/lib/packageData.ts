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

// Enhanced vehicle normalization function
function normalizeVehicleType(vehicleType: string): string {
  // Convert to lowercase and standardize format
  const normalizedType = vehicleType.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
  
  // Special case mappings for common vehicle variants
  if (normalizedType.includes('hycross') || normalizedType.includes('mpv')) {
    return 'innova_hycross';
  }
  
  if (normalizedType.includes('crysta')) {
    return 'innova_crysta';
  }
  
  if (normalizedType.includes('innova') && !normalizedType.includes('hycross') && !normalizedType.includes('crysta')) {
    return 'innova_crysta'; // Default Innova to Crysta if not specified
  }
  
  if (normalizedType.includes('tempo') || normalizedType.includes('traveller')) {
    return 'tempo_traveller';
  }
  
  if (normalizedType.includes('dzire') || normalizedType.includes('cng')) {
    return 'dzire_cng';
  }
  
  if (normalizedType === 'mpv') {
    return 'innova_hycross';
  }
  
  // Return as is if no special mapping applies
  return normalizedType;
}

// Enhanced package ID normalization
function normalizePackageId(packageId: string): string {
  if (!packageId) return '8hrs-80km'; // Default to 8hrs if not specified
  
  const normalized = packageId.toLowerCase();
  
  if (normalized.includes('10hr') || normalized.includes('100km')) {
    return '10hrs-100km';
  }
  
  if (normalized.includes('8hr') || normalized.includes('80km')) {
    return '8hrs-80km';
  }
  
  if (normalized.includes('4hr') || normalized.includes('40km')) {
    return '4hrs-40km';
  }
  
  return '8hrs-80km'; // Default fallback
}

// Calculate a dynamic price for a given vehicle and package
const calculateDynamicPrice = (vehicleType: string, packageId: string): number => {
  // Normalize vehicle type to match multipliers
  const normalizedVehicleType = normalizeVehicleType(vehicleType);
  
  // Determine the multiplier based on vehicle type (default to 1.0 if not found)
  const multiplier = vehicleMultipliers[normalizedVehicleType] || 1.0;
  
  // Base prices for different packages
  const baseValues = {
    '4hrs-40km': 1200,
    '8hrs-80km': 2000,
    '10hrs-100km': 2500
  };
  
  // Normalize package ID
  const normalizedPackageId = normalizePackageId(packageId);
  
  // Get base value for package (default to 2000 if not found)
  const baseValue = baseValues[normalizedPackageId as keyof typeof baseValues] || 2000;
  
  // Calculate and return the dynamic price
  const price = Math.round(baseValue * multiplier);
  console.log(`Calculated dynamic price for ${normalizedVehicleType}, ${normalizedPackageId}: ${price} (multiplier: ${multiplier})`);
  return price;
};

// Utility function to normalize and validate API URLs
const validateApiUrl = (url: string): boolean => {
  // Basic validation - check if the URL has a valid structure
  try {
    new URL(url);
    return true;
  } catch {
    // If the URL is relative, it's probably valid for our purposes
    return url.startsWith('/') || url.startsWith('./') || url.startsWith('../');
  }
};

// Function to fetch local package prices directly from database via API
export async function getLocalPackagePrice(packageId: string, vehicleType: string, forceRefresh: boolean = false): Promise<number> {
  try {
    console.log(`Getting local package price for ${vehicleType}, package: ${packageId}, forceRefresh: ${forceRefresh}`);
    
    // Normalize parameters
    const normalizedVehicleType = normalizeVehicleType(vehicleType);
    const normalizedPackageId = normalizePackageId(packageId);
    
    console.log(`Normalized parameters: Vehicle: ${normalizedVehicleType}, Package: ${normalizedPackageId}`);
    
    // Create unique cache key
    const cacheKey = `${normalizedVehicleType}_${normalizedPackageId}`;
    
    // Only check cache if force refresh not requested
    if (!forceRefresh && window.localPackagePriceCache && 
        window.localPackagePriceCache[cacheKey] && 
        window.localPackagePriceCache[cacheKey].price > 0 &&
        Date.now() - window.localPackagePriceCache[cacheKey].timestamp < 60000) { // Only use cache if less than 1 minute old
      console.log(`Using cached price for ${cacheKey}: ${window.localPackagePriceCache[cacheKey].price}`);
      
      // Always broadcast the price for consistency even when using cache
      window.dispatchEvent(new CustomEvent('local-fare-updated', {
        detail: {
          packageId: normalizedPackageId,
          vehicleType: normalizedVehicleType,
          price: window.localPackagePriceCache[cacheKey].price,
          source: 'cache',
          timestamp: Date.now()
        }
      }));
      
      return window.localPackagePriceCache[cacheKey].price;
    }
    
    // Get API URL safely
    const apiUrl = getApiUrl() || '';
    
    // IMPORTANT: Use direct database API endpoint for local fares as the primary source
    const primaryEndpoint = `${apiUrl}/api/admin/direct-local-fares.php?vehicle_id=${normalizedVehicleType}`;
    
    // Array of API endpoints to try - validate them first
    const apiEndpoints = [
      primaryEndpoint,
      `${apiUrl}/api/user/direct-booking-data.php?check_sync=true&vehicle_id=${normalizedVehicleType}&package_id=${normalizedPackageId}`,
      `/api/admin/direct-local-fares.php?vehicle_id=${normalizedVehicleType}`,
      `/api/user/direct-booking-data.php?check_sync=true&vehicle_id=${normalizedVehicleType}&package_id=${normalizedPackageId}`
    ].filter(url => validateApiUrl(url));
    
    if (apiEndpoints.length === 0) {
      console.warn('No valid API endpoints available. Using dynamic pricing.');
      // Proceed with fallback calculation if no valid endpoints
      const dynamicPrice = calculateDynamicPrice(normalizedVehicleType, normalizedPackageId);
      window.localPackagePriceCache[cacheKey] = { price: dynamicPrice, timestamp: Date.now() };
      
      // Broadcast the dynamic price
      window.dispatchEvent(new CustomEvent('local-fare-updated', {
        detail: {
          packageId: normalizedPackageId,
          vehicleType: normalizedVehicleType,
          price: dynamicPrice,
          source: 'dynamic',
          timestamp: Date.now()
        }
      }));
      
      return dynamicPrice;
    }
    
    // Try each endpoint until one succeeds
    let lastError: Error | null = null;
    let allEndpointsFailed = true;
    
    try {
      console.log(`Fetching price from API: ${primaryEndpoint}`);
      const response = await axios.get(primaryEndpoint, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Force-Refresh': forceRefresh ? 'true' : 'false'
        },
        // Add timeout to prevent long-hanging requests
        timeout: 5000
      });
      
      if (response.data) {
        // Check if we got a fares array from direct-local-fares.php
        if (response.data.fares && Array.isArray(response.data.fares) && response.data.fares.length > 0) {
          const fareData = response.data.fares[0];
          
          // Extract the right price for the selected package
          let price = 0;
          if (normalizedPackageId === '4hrs-40km') {
            price = Number(fareData.price4hrs40km || 0);
          } else if (normalizedPackageId === '8hrs-80km') {
            price = Number(fareData.price8hrs80km || 0);
          } else if (normalizedPackageId === '10hrs-100km') {
            price = Number(fareData.price10hrs100km || 0);
          }
          
          if (price > 0) {
            console.log(`Retrieved fare directly from database API for package ${normalizedPackageId}: ₹${price}`);
            // Cache the price
            window.localPackagePriceCache[cacheKey] = { price, timestamp: Date.now() };
            
            // Store in localStorage for better cross-component consistency
            const fareKey = `fare_local_${normalizedVehicleType}`;
            localStorage.setItem(fareKey, price.toString());
            
            // Also store specific package price in localStorage
            const packageFareKey = `fare_local_${normalizedVehicleType}_${normalizedPackageId}`;
            localStorage.setItem(packageFareKey, price.toString());
            
            console.log(`Stored fare in localStorage: ${packageFareKey} = ${price}`);
            
            // Dispatch an event to notify other components about the updated price
            window.dispatchEvent(new CustomEvent('local-fare-updated', {
              detail: {
                packageId: normalizedPackageId,
                vehicleType: normalizedVehicleType,
                price: price,
                source: 'database',
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
            
            allEndpointsFailed = false;
            return price;
          }
        }
      }
      
      // If direct API fails, try fallback methods
    } catch (error) {
      console.error(`Error fetching from primary endpoint: ${error}`);
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    
    // If API call fails, use fallback calculation
    const calculatedPrice = calculateDynamicPrice(normalizedVehicleType, normalizedPackageId);
    if (calculatedPrice > 0) {
      console.log(`Using fallback calculation for ${normalizedVehicleType}, ${normalizedPackageId}: ₹${calculatedPrice}`);
      
      // Cache the calculated price
      window.localPackagePriceCache[cacheKey] = { price: calculatedPrice, timestamp: Date.now() };
      
      // Store in localStorage for better cross-component consistency
      const fareKey = `fare_local_${normalizedVehicleType}`;
      localStorage.setItem(fareKey, calculatedPrice.toString());
      
      // Also store specific package price in localStorage
      const packageFareKey = `fare_local_${normalizedVehicleType}_${normalizedPackageId}`;
      localStorage.setItem(packageFareKey, calculatedPrice.toString());
      
      console.log(`Stored calculated fare in localStorage: ${packageFareKey} = ${calculatedPrice}`);
      
      // Dispatch events
      window.dispatchEvent(new CustomEvent('local-fare-updated', {
        detail: {
          packageId: normalizedPackageId,
          vehicleType: normalizedVehicleType,
          price: calculatedPrice,
          source: 'dynamic',
          timestamp: Date.now()
        }
      }));
      
      window.dispatchEvent(new CustomEvent('fare-calculated', {
        detail: {
          cabId: normalizedVehicleType,
          tripType: 'local',
          calculated: true,
          fare: calculatedPrice,
          packageId: normalizedPackageId,
          timestamp: Date.now()
        }
      }));
      
      return calculatedPrice;
    }
    
    // All API endpoints failed or returned invalid data, use dynamic calculation
    console.error(`All API endpoints failed for ${vehicleType}, ${packageId}. Last error:`, lastError);
    
    // Use dynamic calculation
    const dynamicPrice = calculateDynamicPrice(normalizedVehicleType, normalizedPackageId);
    console.log(`Using dynamically calculated price for ${normalizedVehicleType}, ${normalizedPackageId}: ${dynamicPrice}`);
    
    // Cache the dynamically calculated price
    window.localPackagePriceCache[cacheKey] = { price: dynamicPrice, timestamp: Date.now() };
    
    // Store in localStorage for better cross-component consistency
    const fareKey = `fare_local_${normalizedVehicleType}`;
    localStorage.setItem(fareKey, dynamicPrice.toString());
    console.log(`Stored fare in localStorage: ${fareKey} = ${dynamicPrice}`);
    
    // Dispatch an event to notify other components about the updated price
    window.dispatchEvent(new CustomEvent('local-fare-updated', {
      detail: {
        packageId: normalizedPackageId,
        vehicleType: normalizedVehicleType,
        price: dynamicPrice,
        source: 'dynamic',
        timestamp: Date.now()
      }
    }));
    
    // Dispatch a more general fare-calculated event for broader component updates
    window.dispatchEvent(new CustomEvent('fare-calculated', {
      detail: {
        cabId: normalizedVehicleType,
        tripType: 'local',
        calculated: true,
        fare: dynamicPrice,
        packageId: normalizedPackageId,
        timestamp: Date.now()
      }
    }));
    
    return dynamicPrice;
  } catch (error) {
    console.error(`Error getting local package price for ${vehicleType}, ${packageId}:`, error);
    
    // Last resort: calculate a dynamic price
    const normalizedVehicleType = normalizeVehicleType(vehicleType);
    const normalizedPackageId = normalizePackageId(packageId);
    const dynamicPrice = calculateDynamicPrice(normalizedVehicleType, normalizedPackageId);
    
    console.log(`Using dynamically calculated fallback price for ${normalizedVehicleType}, ${normalizedPackageId}: ${dynamicPrice}`);
    
    // Store in localStorage for better cross-component consistency
    const fareKey = `fare_local_${normalizedVehicleType}`;
    localStorage.setItem(fareKey, dynamicPrice.toString());
    
    // Also store specific package price in localStorage
    const packageFareKey = `fare_local_${normalizedVehicleType}_${normalizedPackageId}`;
    localStorage.setItem(packageFareKey, dynamicPrice.toString());
    
    console.log(`Stored fallback fare in localStorage: ${packageFareKey} = ${dynamicPrice}`);
    
    return dynamicPrice;
  }
}

// Function to fetch and cache all local fares in the background
export async function fetchAndCacheLocalFares(forceRefresh: boolean = false): Promise<void> {
  try {
    // Common vehicle types to pre-cache
    const vehicleTypes = ['sedan', 'ertiga', 'innova_crysta', 'dzire_cng', 'tempo_traveller'];
    
    // Loop through all combinations of vehicles and packages
    for (const vehicleType of vehicleTypes) {
      for (const pkg of hourlyPackages) {
        try {
          // Fetch and cache each price (don't await - let these happen in parallel)
          getLocalPackagePrice(pkg.id, vehicleType, forceRefresh)
            .catch(err => console.warn(`Failed to cache price for ${vehicleType}, ${pkg.id}:`, err));
        } catch (error) {
          console.warn(`Error caching price for ${vehicleType}, ${pkg.id}:`, error);
        }
      }
    }
    
    console.log('Background caching of local fares initiated');
  } catch (error) {
    console.error('Error in fetchAndCacheLocalFares:', error);
  }
}

// Force sync with database via admin API
export async function syncLocalFaresWithDatabase(): Promise<boolean> {
  try {
    console.log('Forcing sync of local package fares with database...');
    
    const apiUrl = getApiUrl() || '';
    const syncEndpoint = `${apiUrl}/api/admin/sync-local-fares.php`;
    
    const response = await axios.get(syncEndpoint, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-Force-Refresh': 'true',
        'X-Admin-Mode': 'true'
      },
      timeout: 10000 // 10 second timeout for sync operation
    });
    
    if (response.data && response.data.status === 'success') {
      console.log('Local fares successfully synced with database:', response.data);
      
      // After successful sync, clear all cached prices
      window.localPackagePriceCache = {};
      
      // Dispatch event to notify components about updated fares
      window.dispatchEvent(new CustomEvent('local-fares-updated', {
        detail: {
          timestamp: Date.now(),
          vehicles: response.data.vehicles || [],
          source: 'database-sync'
        }
      }));
      
      // Refresh all fares in the background
      fetchAndCacheLocalFares(true);
      
      return true;
    } else {
      console.error('Local fares sync failed:', response.data);
      return false;
    }
  } catch (error) {
    console.error('Error syncing local fares with database:', error);
    return false;
  }
}
