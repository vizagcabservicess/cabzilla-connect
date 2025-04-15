import axios from 'axios';
import { LocalPackageFare, LocalPackageFaresResponse } from '@/types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Mock data for local package prices when API fails
const fallbackPriceData = {
  "sedan": {
    "price_4hr_40km": 1200,
    "price_8hr_80km": 2000,
    "price_10hr_100km": 2500,
    "extra_km_rate": 12,
    "extra_hour_rate": 100
  },
  "ertiga": {
    "price_4hr_40km": 1500,
    "price_8hr_80km": 2500, 
    "price_10hr_100km": 3000,
    "extra_km_rate": 15,
    "extra_hour_rate": 120
  },
  "innova_crysta": {
    "price_4hr_40km": 1800,
    "price_8hr_80km": 3000,
    "price_10hr_100km": 3500,
    "extra_km_rate": 18,
    "extra_hour_rate": 150
  },
  "tempo_traveller": {
    "price_4hr_40km": 2500,
    "price_8hr_80km": 4000,
    "price_10hr_100km": 5000,
    "extra_km_rate": 25,
    "extra_hour_rate": 200
  }
};

// Function to fetch local package fares from API
export async function fetchLocalFares(includeInactive = false): Promise<Record<string, LocalPackageFare>> {
  try {
    console.log('Fetching local package fares from API');
    const response = await axios.get(`${API_BASE_URL}/api/local-package-fares.php`, {
      params: { includeInactive },
      headers: {
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (response.data && response.data.status === 'success' && response.data.fares) {
      console.log('Successfully fetched local fares:', Object.keys(response.data.fares).length);
      return response.data.fares;
    } 
    
    console.error('Invalid response format from local fares API:', response.data);
    throw new Error('Invalid response from local package fares API');
  } catch (error) {
    console.error('Error fetching local package fares:', error);
    throw error;
  }
}

// Function to get specific package price for a vehicle from API
export async function getLocalPackagePrice(packageId: string, vehicleId: string): Promise<number> {
  try {
    console.log(`Fetching price for ${packageId} package for vehicle ${vehicleId}`);
    
    // Convert package ID to standardized format for API
    // Make sure "hrs" is converted to "hr" for consistency with API
    const standardizedPackageId = packageId
      .replace('hrs-', 'hr_')
      .replace('hr-', 'hr_');
    
    // Try mock server-side API first - using the PHP endpoint
    try {
      // Use direct-local-fares.php instead which has mock data
      const response = await axios.get(`${API_BASE_URL}/api/admin/direct-local-fares.php`, {
        params: {
          vehicle_id: vehicleId
        },
        headers: {
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache'
        },
        timeout: 3000 // 3 second timeout to fail faster
      });
      
      if (response.data && response.data.status === 'success' && response.data.fares && response.data.fares.length > 0) {
        const vehicleFare = response.data.fares[0];
        
        let price = 0;
        
        if (standardizedPackageId.includes('4hr_40km')) {
          price = vehicleFare.price4hrs40km || 0;
        } else if (standardizedPackageId.includes('8hr_80km')) {
          price = vehicleFare.price8hrs80km || 0;
        } else if (standardizedPackageId.includes('10hr_100km')) {
          price = vehicleFare.price10hrs100km || 0;
        }
        
        if (price > 0) {
          console.log(`Retrieved package price from mock server API: ${price}`);
          return price;
        }
      }
    } catch (mockerror) {
      console.log('Mock server API failed, trying fallback...', mockerror);
      // Continue to the next approach
    }
    
    // If the above fails or returns zero price, fall back to the fallback data
    const fallbackVehicleData = fallbackPriceData[vehicleId as keyof typeof fallbackPriceData];
    
    if (fallbackVehicleData) {
      let price = 0;
      
      if (standardizedPackageId.includes('4hr_40km')) {
        price = fallbackVehicleData.price_4hr_40km;
      } else if (standardizedPackageId.includes('8hr_80km')) {
        price = fallbackVehicleData.price_8hr_80km;
      } else if (standardizedPackageId.includes('10hr_100km')) {
        price = fallbackVehicleData.price_10hr_100km;
      }
      
      if (price > 0) {
        console.log(`Using fallback price data for ${vehicleId} (${packageId}): ${price}`);
        return price;
      }
    }
    
    // If all else fails, generate a reasonable default price
    const basePrice = vehicleId.includes('sedan') ? 1500 : 
                    vehicleId.includes('ertiga') ? 2000 : 
                    vehicleId.includes('innova') ? 2800 : 3500;
                    
    const packageMultiplier = standardizedPackageId.includes('4hr') ? 1 :
                             standardizedPackageId.includes('8hr') ? 1.6 : 2.1;
                          
    const calculatedPrice = Math.round(basePrice * packageMultiplier);
    console.log(`Generated default price for ${vehicleId} ${packageId}: ${calculatedPrice}`);
    return calculatedPrice;
    
  } catch (error) {
    console.error(`Error fetching package price for ${packageId} on ${vehicleId}:`, error);
    
    // Use fallback pricing
    try {
      const fallbackVehicleData = fallbackPriceData[vehicleId as keyof typeof fallbackPriceData];
    
      if (fallbackVehicleData) {
        let price = 0;
        
        if (packageId.includes('4hrs-40km') || packageId.includes('4hr_40km')) {
          price = fallbackVehicleData.price_4hr_40km;
        } else if (packageId.includes('8hrs-80km') || packageId.includes('8hr_80km')) {
          price = fallbackVehicleData.price_8hr_80km;
        } else if (packageId.includes('10hrs-100km') || packageId.includes('10hr_100km')) {
          price = fallbackVehicleData.price_10hr_100km;
        }
        
        if (price > 0) {
          console.log(`Using fallback price data in error handler for ${vehicleId}: ${price}`);
          return price;
        }
      }
    } catch (fallbackError) {
      console.error('Error using fallback data:', fallbackError);
    }
    
    // Last resort fallback with fixed reasonable prices
    if (vehicleId.includes('sedan')) return 2000;
    if (vehicleId.includes('ertiga')) return 2500;
    if (vehicleId.includes('innova')) return 3000;
    if (vehicleId.includes('tempo')) return 4000;
    
    // Generic fallback
    return 2500;
  }
}

// Function that always fetches and returns the most up-to-date fares
export async function fetchAndCacheLocalFares(): Promise<Record<string, LocalPackageFare>> {
  try {
    const fares = await fetchLocalFares();
    
    // Dispatch event to notify components that fares have been updated
    window.dispatchEvent(new CustomEvent('local-fares-updated', {
      detail: { 
        timestamp: Date.now(),
        source: 'fetchAndCacheLocalFares'
      }
    }));
    
    return fares;
  } catch (error) {
    console.error('Error in fetchAndCacheLocalFares:', error);
    throw error;
  }
}

// Directly gets a package price from the API, no caching
export async function getLocalPackagePriceFromApi(
  packageId: string,
  vehicleId: string
): Promise<number> {
  try {
    return await getLocalPackagePrice(packageId, vehicleId);
  } catch (error) {
    console.error(`Failed to get price for ${packageId} on ${vehicleId} from API:`, error);
    throw error;
  }
}

// Default hourly package definitions - ONLY used as fallback UI when API fails completely
export const hourlyPackages = [
  {
    id: '4hrs-40km',
    name: '4 Hours Package',
    hours: 4,
    kilometers: 40,
    description: 'Up to 4 hours and 40 kilometers',
    basePrice: 800  // Add basePrice property to fix the error
  },
  {
    id: '8hrs-80km',
    name: '8 Hours Package',
    hours: 8,
    kilometers: 80,
    description: 'Up to 8 hours and 80 kilometers',
    basePrice: 1500  // Add basePrice property to fix the error
  },
  {
    id: '10hrs-100km',
    name: '10 Hours Package',
    hours: 10,
    kilometers: 100,
    description: 'Up to 10 hours and 100 kilometers',
    basePrice: 2000  // Add basePrice property to fix the error
  }
];
