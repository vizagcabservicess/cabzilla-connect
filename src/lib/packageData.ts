
import axios from 'axios';
import { LocalPackageFare, LocalPackageFaresResponse } from '@/types/api';
import { HourlyPackage } from '@/types/cab';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
    const standardizedPackageId = packageId
      .replace('hrs-', 'hrs_')
      .replace('hr-', 'hr_');
    
    // Direct API call for this specific vehicle and package
    const response = await axios.get(`${API_BASE_URL}/api/user/direct-booking-data.php`, {
      params: {
        check_sync: true,
        vehicle_id: vehicleId,
        package_id: standardizedPackageId
      },
      headers: {
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (response.data && response.data.status === 'success' && response.data.data) {
      // Extract the price based on package ID
      let price = 0;
      
      if (packageId.includes('4hrs-40km') || packageId.includes('4hr_40km')) {
        price = response.data.data.price4hrs40km || response.data.data.price_4hr_40km || 0;
      } else if (packageId.includes('8hrs-80km') || packageId.includes('8hr_80km')) {
        price = response.data.data.price8hrs80km || response.data.data.price_8hr_80km || 0;
      } else if (packageId.includes('10hrs-100km') || packageId.includes('10hr_100km')) {
        price = response.data.data.price10hrs100km || response.data.data.price_10hr_100km || 0;
      }
      
      if (price <= 0) {
        console.error(`No valid price found for ${packageId} on vehicle ${vehicleId}`);
        throw new Error(`Price not available for ${packageId}`);
      }
      
      console.log(`Price for ${packageId} package on ${vehicleId}: ${price}`);
      return price;
    }
    
    console.error('Invalid response format from API:', response.data);
    throw new Error('Invalid response from API');
  } catch (error) {
    console.error(`Error fetching package price for ${packageId} on ${vehicleId}:`, error);
    throw error;
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
export const hourlyPackages: HourlyPackage[] = [
  {
    id: '4hrs-40km',
    name: '4 Hours Package',
    hours: 4,
    kilometers: 40,
    description: 'Up to 4 hours and 40 kilometers',
    basePrice: 0
  },
  {
    id: '8hrs-80km',
    name: '8 Hours Package',
    hours: 8,
    kilometers: 80,
    description: 'Up to 8 hours and 80 kilometers',
    basePrice: 0
  },
  {
    id: '10hrs-100km',
    name: '10 Hours Package',
    hours: 10,
    kilometers: 100,
    description: 'Up to 10 hours and 100 kilometers',
    basePrice: 0
  }
];
