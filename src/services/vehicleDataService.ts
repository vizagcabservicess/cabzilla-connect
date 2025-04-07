
import { toast } from 'sonner';
import { directVehicleOperation } from '@/utils/apiHelper';

// Cache key for vehicle data in memory
const VEHICLE_DATA_CACHE_KEY = 'vehicle_data_cache';

// In-memory cache to avoid unnecessary API calls
let vehicleDataCache: Record<string, any> = {};

/**
 * Clear the vehicle data cache to force fresh data retrieval
 */
export const clearVehicleDataCache = () => {
  console.log('Clearing vehicle data cache');
  vehicleDataCache = {};
  
  // Also clear local storage cache if it exists
  try {
    localStorage.removeItem(VEHICLE_DATA_CACHE_KEY);
  } catch (e) {
    // Ignore localStorage errors (might be in SSR or private browsing)
  }
  
  toast.info('Vehicle data cache cleared');
};

/**
 * Get vehicle data from API or cache
 * @param forceRefresh Force a refresh from API even if cache exists
 * @returns Promise with vehicle data
 */
export const getVehicleData = async (forceRefresh = false): Promise<any[]> => {
  // If we have cached data and don't need to force refresh, return it
  if (!forceRefresh && Object.keys(vehicleDataCache).length > 0) {
    console.log('Returning cached vehicle data');
    return Object.values(vehicleDataCache);
  }
  
  try {
    console.log('Fetching vehicle data from API');
    
    // Add timestamp parameter to prevent browser caching
    const timestamp = Date.now();
    const result = await directVehicleOperation(
      `api/admin/vehicles-data.php?_t=${timestamp}`,
      'GET',
      {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
    
    console.log('API response for vehicles-data:', result);
    
    if (result && result.status === 'success' && result.vehicles) {
      // Process and cache the vehicle data
      const vehicles = Array.isArray(result.vehicles) ? result.vehicles : Object.values(result.vehicles);
      
      // Update the cache
      vehicleDataCache = {};
      vehicles.forEach((vehicle: any) => {
        if (vehicle && vehicle.id) {
          vehicleDataCache[vehicle.id] = vehicle;
        }
      });
      
      // Store in localStorage for persistence across page reloads
      try {
        localStorage.setItem(VEHICLE_DATA_CACHE_KEY, JSON.stringify(vehicleDataCache));
      } catch (e) {
        // Ignore localStorage errors
      }
      
      return vehicles;
    } else if (result && Array.isArray(result)) {
      // Handle case where API returns direct array
      const vehicles = result;
      
      // Update the cache
      vehicleDataCache = {};
      vehicles.forEach((vehicle: any) => {
        if (vehicle && vehicle.id) {
          vehicleDataCache[vehicle.id] = vehicle;
        }
      });
      
      return vehicles;
    }
    
    // If we get here, something went wrong with the API response
    console.error('Invalid vehicle data format from API:', result);
    return [];
  } catch (error) {
    console.error('Error fetching vehicle data:', error);
    throw error;
  }
};

/**
 * Get a specific vehicle by ID
 * @param vehicleId Vehicle ID to fetch
 * @param forceRefresh Force a refresh from API even if cache exists
 * @returns Promise with vehicle data or null if not found
 */
export const getVehicleById = async (vehicleId: string, forceRefresh = false): Promise<any | null> => {
  if (!vehicleId) return null;
  
  // Check cache first if not forcing refresh
  if (!forceRefresh && vehicleDataCache[vehicleId]) {
    return vehicleDataCache[vehicleId];
  }
  
  try {
    // Add timestamp parameter to prevent browser caching
    const timestamp = Date.now();
    const result = await directVehicleOperation(
      `api/admin/check-vehicle.php?id=${encodeURIComponent(vehicleId)}&_t=${timestamp}`,
      'GET',
      {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
    
    if (result && result.status === 'success' && result.vehicle) {
      // Cache the vehicle data
      vehicleDataCache[vehicleId] = result.vehicle;
      return result.vehicle;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching vehicle with ID ${vehicleId}:`, error);
    return null;
  }
};

/**
 * Update vehicle data in the cache
 * @param vehicle Updated vehicle data
 */
export const updateVehicleCache = (vehicle: any): void => {
  if (!vehicle || !vehicle.id) return;
  
  // Update in-memory cache
  vehicleDataCache[vehicle.id] = vehicle;
  
  // Update localStorage
  try {
    localStorage.setItem(VEHICLE_DATA_CACHE_KEY, JSON.stringify(vehicleDataCache));
  } catch (e) {
    // Ignore localStorage errors
  }
};
