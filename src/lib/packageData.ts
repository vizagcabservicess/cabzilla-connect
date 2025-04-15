
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
    
    // Make direct API call to get the latest price
    // Fix: Use the correct API URL format
    const apiUrl = `${getApiUrl('api')}/api/user/direct-booking-data.php?check_sync=true&vehicle_id=${normalizedVehicleType}&package_id=${normalizedPackageId}`;
    console.log(`Fetching price from API: ${apiUrl}`);
    
    try {
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
      
      // Try fallback to local-package-fares.php endpoint
      const fallbackUrl = `${getApiUrl('api')}/api/local-package-fares.php?vehicle_id=${normalizedVehicleType}&package_id=${normalizedPackageId}`;
      console.log(`Trying fallback API: ${fallbackUrl}`);
      
      const fallbackResponse = await axios.get(fallbackUrl, {
        headers: {
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (fallbackResponse.data && fallbackResponse.data.status === 'success') {
        const fallbackPrice = fallbackResponse.data.price || fallbackResponse.data.baseFare || 0;
        
        if (fallbackPrice > 0) {
          console.log(`Retrieved price from fallback API for ${normalizedVehicleType}, ${normalizedPackageId}: ${fallbackPrice}`);
          
          // Update cache with fallback API price
          window.localPackagePriceCache[cacheKey] = { 
            price: fallbackPrice, 
            timestamp: Date.now(), 
            source: 'fallback-api' 
          };
          
          // Dispatch event for consistency
          window.dispatchEvent(new CustomEvent('local-fare-updated', {
            detail: { 
              vehicleType: normalizedVehicleType, 
              packageId: normalizedPackageId, 
              price: fallbackPrice, 
              source: 'fallback-api' 
            }
          }));
          
          return fallbackPrice;
        }
      }
      
      // If no API price is available, use hardcoded fallback prices
      const fallbackPrices: Record<string, Record<string, number>> = {
        'sedan': {
          '4hrs-40km': 1200,
          '8hrs-80km': 2000,
          '10hrs-100km': 2500
        },
        'ertiga': {
          '4hrs-40km': 1500,
          '8hrs-80km': 2500,
          '10hrs-100km': 3000
        },
        'innova_crysta': {
          '4hrs-40km': 1800,
          '8hrs-80km': 3000,
          '10hrs-100km': 3500
        },
        'tempo': {
          '4hrs-40km': 2500,
          '8hrs-80km': 4000,
          '10hrs-100km': 5000
        }
      };
      
      // Get fallback price for this vehicle type and package
      const vehicleFallbackPrices = fallbackPrices[normalizedVehicleType] || fallbackPrices['sedan'];
      if (vehicleFallbackPrices && vehicleFallbackPrices[normalizedPackageId]) {
        const hardcodedPrice = vehicleFallbackPrices[normalizedPackageId];
        
        console.log(`Using hardcoded fallback price for ${normalizedVehicleType}, ${normalizedPackageId}: ${hardcodedPrice}`);
        
        // Update cache with hardcoded price
        window.localPackagePriceCache[cacheKey] = { 
          price: hardcodedPrice, 
          timestamp: Date.now(), 
          source: 'hardcoded-fallback' 
        };
        
        // Dispatch event for consistency
        window.dispatchEvent(new CustomEvent('local-fare-updated', {
          detail: { 
            vehicleType: normalizedVehicleType, 
            packageId: normalizedPackageId, 
            price: hardcodedPrice, 
            source: 'hardcoded-fallback' 
          }
        }));
        
        return hardcodedPrice;
      }
      
      // If API call failed or returned 0, throw error
      throw new Error(`Failed to get valid price from API for ${vehicleType}, ${packageId}`);
    } catch (apiError) {
      console.error(`API call error for ${vehicleType}, ${packageId}:`, apiError);
      
      // Try to use hardcoded fallback prices
      const fallbackPrices: Record<string, Record<string, number>> = {
        'sedan': {
          '4hrs-40km': 1200,
          '8hrs-80km': 2000,
          '10hrs-100km': 2500
        },
        'ertiga': {
          '4hrs-40km': 1500,
          '8hrs-80km': 2500,
          '10hrs-100km': 3000
        },
        'innova_crysta': {
          '4hrs-40km': 1800,
          '8hrs-80km': 3000,
          '10hrs-100km': 3500
        },
        'tempo': {
          '4hrs-40km': 2500,
          '8hrs-80km': 4000,
          '10hrs-100km': 5000
        }
      };
      
      // Get fallback price for this vehicle type and package
      const vehicleFallbackPrices = fallbackPrices[normalizedVehicleType] || fallbackPrices['sedan'];
      if (vehicleFallbackPrices && vehicleFallbackPrices[normalizedPackageId]) {
        const hardcodedPrice = vehicleFallbackPrices[normalizedPackageId];
        
        console.log(`Using hardcoded fallback price for ${normalizedVehicleType}, ${normalizedPackageId}: ${hardcodedPrice}`);
        
        // Update cache with hardcoded price
        window.localPackagePriceCache[cacheKey] = { 
          price: hardcodedPrice, 
          timestamp: Date.now(), 
          source: 'hardcoded-fallback' 
        };
        
        // Dispatch event for consistency
        window.dispatchEvent(new CustomEvent('local-fare-updated', {
          detail: { 
            vehicleType: normalizedVehicleType, 
            packageId: normalizedPackageId, 
            price: hardcodedPrice, 
            source: 'hardcoded-fallback' 
          }
        }));
        
        return hardcodedPrice;
      }
      
      throw new Error(`Could not get price for ${vehicleType} ${packageId}`);
    }
    
  } catch (error) {
    console.error(`Error getting local package price for ${vehicleType}, ${packageId}:`, error);
    
    // Try to use hardcoded fallback prices
    const fallbackPrices: Record<string, Record<string, number>> = {
      'sedan': {
        '4hrs-40km': 1200,
        '8hrs-80km': 2000,
        '10hrs-100km': 2500
      },
      'ertiga': {
        '4hrs-40km': 1500,
        '8hrs-80km': 2500,
        '10hrs-100km': 3000
      },
      'innova_crysta': {
        '4hrs-40km': 1800,
        '8hrs-80km': 3000,
        '10hrs-100km': 3500
      },
      'tempo': {
        '4hrs-40km': 2500,
        '8hrs-80km': 4000,
        '10hrs-100km': 5000
      }
    };
    
    // Normalize parameters
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
    
    // Create unique cache key
    const cacheKey = `${normalizedVehicleType}_${normalizedPackageId}`;
    
    // Get fallback price for this vehicle type and package
    const vehicleFallbackPrices = fallbackPrices[normalizedVehicleType] || fallbackPrices['sedan'];
    if (vehicleFallbackPrices && vehicleFallbackPrices[normalizedPackageId]) {
      const hardcodedPrice = vehicleFallbackPrices[normalizedPackageId];
      
      console.log(`Using hardcoded fallback price for ${normalizedVehicleType}, ${normalizedPackageId}: ${hardcodedPrice}`);
      
      // Update cache with hardcoded price
      window.localPackagePriceCache[cacheKey] = { 
        price: hardcodedPrice, 
        timestamp: Date.now(), 
        source: 'hardcoded-fallback' 
      };
      
      window.dispatchEvent(new CustomEvent('local-fare-updated', {
        detail: { 
          vehicleType: normalizedVehicleType, 
          packageId: normalizedPackageId, 
          price: hardcodedPrice, 
          source: 'hardcoded-fallback' 
        }
      }));
      
      return hardcodedPrice;
    }
    
    throw new Error(`Could not get price for ${vehicleType} ${packageId}`);
  }
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
        // Make API call to get prices for this vehicle
        // Fix: Use the correct API URL format with the 'api' parameter
        const apiUrl = `${getApiUrl('api')}/api/user/direct-booking-data.php?check_sync=true&vehicle_id=${vehicleId}`;
        console.log(`Fetching all fares for ${vehicleId} from API: ${apiUrl}`);
        
        try {
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
          } else {
            throw new Error(`Invalid response from API for ${vehicleId}`);
          }
        } catch (apiError) {
          console.error(`API error for ${vehicleId}:`, apiError);
          
          // Try the alternative API endpoint
          const fallbackUrl = `${getApiUrl('api')}/api/local-package-fares.php?vehicle_id=${vehicleId}`;
          console.log(`Trying fallback API: ${fallbackUrl}`);
          
          try {
            const fallbackResponse = await axios.get(fallbackUrl, {
              headers: {
                'X-Force-Refresh': 'true',
                'Cache-Control': 'no-cache'
              }
            });
            
            if (fallbackResponse.data && fallbackResponse.data.status === 'success') {
              if (fallbackResponse.data.fares && fallbackResponse.data.fares[vehicleId]) {
                const vFares = fallbackResponse.data.fares[vehicleId];
                fares[vehicleId] = {
                  price4hrs40km: vFares.price4hrs40km || 0,
                  price8hrs80km: vFares.price8hrs80km || 0,
                  price10hrs100km: vFares.price10hrs100km || 0,
                  priceExtraKm: vFares.priceExtraKm || 0,
                  priceExtraHour: vFares.priceExtraHour || 0
                };
                console.log(`Successfully fetched fares for ${vehicleId} from fallback API`);
              }
            } else {
              throw new Error(`Invalid response from fallback API for ${vehicleId}`);
            }
          } catch (fallbackError) {
            console.error(`Fallback API error for ${vehicleId}:`, fallbackError);
            
            // Use hardcoded fallback prices
            const fallbackPrices: Record<string, any> = {
              'sedan': {
                price4hrs40km: 1200,
                price8hrs80km: 2000,
                price10hrs100km: 2500,
                priceExtraKm: 12,
                priceExtraHour: 100
              },
              'ertiga': {
                price4hrs40km: 1500,
                price8hrs80km: 2500,
                price10hrs100km: 3000,
                priceExtraKm: 15,
                priceExtraHour: 120
              },
              'innova_crysta': {
                price4hrs40km: 1800,
                price8hrs80km: 3000,
                price10hrs100km: 3500,
                priceExtraKm: 18,
                priceExtraHour: 150
              },
              'innova_hycross': {
                price4hrs40km: 2000,
                price8hrs80km: 3200,
                price10hrs100km: 3800,
                priceExtraKm: 20,
                priceExtraHour: 160
              },
              'tempo': {
                price4hrs40km: 2500,
                price8hrs80km: 4000,
                price10hrs100km: 5000,
                priceExtraKm: 25,
                priceExtraHour: 200
              }
            };
            
            // Use fallback price for this vehicle
            fares[vehicleId] = fallbackPrices[vehicleId] || fallbackPrices['sedan'];
            console.log(`Using hardcoded fallback prices for ${vehicleId}`);
          }
        }
      } catch (vehicleError) {
        console.error(`Error fetching fares for ${vehicleId}:`, vehicleError);
        
        // Use hardcoded fallback prices
        const fallbackPrices: Record<string, any> = {
          'sedan': {
            price4hrs40km: 1200,
            price8hrs80km: 2000,
            price10hrs100km: 2500,
            priceExtraKm: 12,
            priceExtraHour: 100
          },
          'ertiga': {
            price4hrs40km: 1500,
            price8hrs80km: 2500,
            price10hrs100km: 3000,
            priceExtraKm: 15,
            priceExtraHour: 120
          },
          'innova_crysta': {
            price4hrs40km: 1800,
            price8hrs80km: 3000,
            price10hrs100km: 3500,
            priceExtraKm: 18,
            priceExtraHour: 150
          },
          'innova_hycross': {
            price4hrs40km: 2000,
            price8hrs80km: 3200,
            price10hrs100km: 3800,
            priceExtraKm: 20,
            priceExtraHour: 160
          },
          'tempo': {
            price4hrs40km: 2500,
            price8hrs80km: 4000,
            price10hrs100km: 5000,
            priceExtraKm: 25,
            priceExtraHour: 200
          }
        };
        
        // Use fallback price for this vehicle
        fares[vehicleId] = fallbackPrices[vehicleId] || fallbackPrices['sedan'];
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
    
    // Use hardcoded fallback prices for all vehicles
    const fallbackFares: Record<string, any> = {
      'sedan': {
        price4hrs40km: 1200,
        price8hrs80km: 2000,
        price10hrs100km: 2500,
        priceExtraKm: 12,
        priceExtraHour: 100
      },
      'ertiga': {
        price4hrs40km: 1500,
        price8hrs80km: 2500,
        price10hrs100km: 3000,
        priceExtraKm: 15,
        priceExtraHour: 120
      },
      'innova_crysta': {
        price4hrs40km: 1800,
        price8hrs80km: 3000,
        price10hrs100km: 3500,
        priceExtraKm: 18,
        priceExtraHour: 150
      },
      'innova_hycross': {
        price4hrs40km: 2000,
        price8hrs80km: 3200,
        price10hrs100km: 3800,
        priceExtraKm: 20,
        priceExtraHour: 160
      },
      'tempo': {
        price4hrs40km: 2500,
        price8hrs80km: 4000,
        price10hrs100km: 5000,
        priceExtraKm: 25,
        priceExtraHour: 200
      }
    };
    
    // Dispatch event to notify components about fallback fares
    window.dispatchEvent(new CustomEvent('local-fares-updated', {
      detail: { timestamp: Date.now(), source: 'hardcoded-fallback' }
    }));
    
    return fallbackFares;
  }
}
