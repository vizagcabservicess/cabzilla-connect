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
  mpv: 1.4
};

// Calculate a dynamic price for a given vehicle and package
const calculateDynamicPrice = (vehicleType: string, packageId: string): number => {
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
};

// Function to get a cached price from localStorage (new function to fix Hero.tsx import)
export function getLocalPackagePriceFromStorage(packageId: string, vehicleType: string): number {
  try {
    // Normalize parameters
    const normalizedVehicleType = vehicleType.toLowerCase().replace(/\s+/g, '_');
    
    // Fix: Make sure we format "8hr-80km" as "8hrs-80km"
    let normalizedPackageId = packageId;
    if (packageId.includes('hr-')) {
      normalizedPackageId = packageId.replace('hr-', 'hrs-');
    }
    
    // Create unique cache key
    const cacheKey = `${normalizedVehicleType}_${normalizedPackageId}`;
    
    // Try to get price from window cache first
    if (typeof window !== 'undefined' && window.localPackagePriceCache && window.localPackagePriceCache[cacheKey]) {
      return window.localPackagePriceCache[cacheKey].price;
    }
    
    // Then try localStorage
    const fareKey = `fare_local_${normalizedVehicleType}`;
    const storedPrice = localStorage.getItem(fareKey);
    
    if (storedPrice) {
      const price = Number(storedPrice);
      if (price > 0) {
        return price;
      }
    }
    
    // Return 0 if no price found
    return 0;
  } catch (error) {
    console.error('Error getting local package price from storage:', error);
    return 0;
  }
}

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

// Function to fetch local package prices from all possible API endpoints
export async function getLocalPackagePrice(packageId: string, vehicleType: string, forceRefresh: boolean = false): Promise<number> {
  try {
    console.log(`Getting local package price for ${vehicleType}, package: ${packageId}, forceRefresh: ${forceRefresh}`);
    
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
    if (!forceRefresh && window.localPackagePriceCache && 
        window.localPackagePriceCache[cacheKey] && 
        window.localPackagePriceCache[cacheKey].price > 0) {
      console.log(`Using cached price for ${cacheKey}: ${window.localPackagePriceCache[cacheKey].price}`);
      return window.localPackagePriceCache[cacheKey].price;
    }
    
    // Array of API endpoints to try - validate them first
    const apiUrl = getApiUrl() || '';
    const apiEndpoints = [
      `${apiUrl}/user/direct-booking-data.php?check_sync=true&vehicle_id=${normalizedVehicleType}&package_id=${normalizedPackageId}`,
      `${apiUrl}/admin/direct-local-fares.php?vehicle_id=${normalizedVehicleType}`,
      `/api/user/direct-booking-data.php?check_sync=true&vehicle_id=${normalizedVehicleType}&package_id=${normalizedPackageId}`,
      `/api/admin/direct-local-fares.php?vehicle_id=${normalizedVehicleType}`
    ].filter(url => validateApiUrl(url));
    
    if (apiEndpoints.length === 0) {
      console.warn('No valid API endpoints available. Using dynamic pricing.');
      // Proceed with fallback calculation if no valid endpoints
      const dynamicPrice = calculateDynamicPrice(normalizedVehicleType, normalizedPackageId);
      window.localPackagePriceCache[cacheKey] = { price: dynamicPrice, timestamp: Date.now() };
      return dynamicPrice;
    }
    
    // Try each endpoint until one succeeds
    let lastError: Error | null = null;
    let allEndpointsFailed = true;
    
    for (const endpoint of apiEndpoints) {
      try {
        console.log(`Fetching price from API: ${endpoint}`);
        const response = await axios.get(endpoint, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'X-Force-Refresh': 'true'
          },
          // Add timeout to prevent long-hanging requests
          timeout: 5000
        });
        
        if (response.data) {
          // Check if the API returned a pricing object with the specific package
          if (response.data.data && response.data.data.price) {
            const price = Number(response.data.data.price);
            if (price > 0) {
              console.log(`Retrieved specific package price from API: ₹${price}`);
              // Cache the price
              window.localPackagePriceCache[cacheKey] = { price, timestamp: Date.now() };
              
              // Dispatch an event to notify other components about the updated price
              window.dispatchEvent(new CustomEvent('local-fare-updated', {
                detail: {
                  packageId: normalizedPackageId,
                  vehicleType: normalizedVehicleType,
                  price: price,
                  timestamp: Date.now()
                }
              }));
              
              allEndpointsFailed = false;
              return price;
            }
          }
          
          // Extract price from the general fare object for the specific package
          if (response.data.data || response.data.fares) {
            const data = response.data.data || (Array.isArray(response.data.fares) ? response.data.fares[0] : response.data.fares);
            
            if (data) {
              let price = 0;
              
              // Check different price formats based on package
              if (normalizedPackageId.includes('4hrs-40km')) {
                price = Number(data.price4hrs40km || data.price_4hr_40km || data.price4hr40km || 0);
              } else if (normalizedPackageId.includes('8hrs-80km')) {
                price = Number(data.price8hrs80km || data.price_8hr_80km || data.price8hr80km || 0);
              } else if (normalizedPackageId.includes('10hrs-100km')) {
                price = Number(data.price10hrs100km || data.price_10hr_100km || data.price10hr100km || 0);
              }
              
              if (price > 0) {
                console.log(`Retrieved generic package price from API: ₹${price}`);
                // Cache the price
                window.localPackagePriceCache[cacheKey] = { price, timestamp: Date.now() };
                
                // Dispatch an event to notify other components about the updated price
                window.dispatchEvent(new CustomEvent('local-fare-updated', {
                  detail: {
                    packageId: normalizedPackageId,
                    vehicleType: normalizedVehicleType,
                    price: price,
                    timestamp: Date.now()
                  }
                }));
                
                allEndpointsFailed = false;
                return price;
              }
            }
          }
          
          // If still no valid price, check if we can generate one
          if (response.data.dynamicallyGenerated || response.data.source === 'dynamic') {
            console.log(`API returned dynamically generated values, using those as reference`);
          }
        }
      } catch (error) {
        console.log(`API endpoint ${endpoint} failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    
    if (allEndpointsFailed) {
      console.error(`All API endpoints failed for ${vehicleType}, ${packageId}. Last error:`, lastError);
      
      // All API endpoints failed, use dynamic calculation
      const dynamicPrice = calculateDynamicPrice(normalizedVehicleType, normalizedPackageId);
      console.log(`Using dynamically calculated price for ${normalizedVehicleType}, ${normalizedPackageId}: ${dynamicPrice}`);
      
      // Cache the dynamically calculated price
      window.localPackagePriceCache[cacheKey] = { price: dynamicPrice, timestamp: Date.now() };
      
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
      
      return dynamicPrice;
    }
    
    // This should never happen, but just in case
    const fallbackPrice = calculateDynamicPrice(normalizedVehicleType, normalizedPackageId);
    return fallbackPrice;
  } catch (error) {
    console.error(`Error getting local package price for ${vehicleType}, ${packageId}:`, error);
    
    // Last resort: calculate a dynamic price
    const dynamicPrice = calculateDynamicPrice(vehicleType, packageId);
    console.log(`Using dynamically calculated fallback price for ${vehicleType}, ${packageId}: ${dynamicPrice}`);
    
    return dynamicPrice;
  }
}

// Function to fetch and cache all local fares in the background
export async function fetchAndCacheLocalFares(forceRefresh: boolean = false): Promise<void> {
  try {
    // Common vehicle types to pre-cache
    const vehicleTypes = ['sedan', 'ertiga', 'innova_crysta', 'tempo_traveller'];
    
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
