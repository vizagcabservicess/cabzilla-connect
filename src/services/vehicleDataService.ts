
import { CabType } from '@/types/cab';
import { toast } from 'sonner';
import { directApiCall } from '@/utils/directApiHelper';
import { forceRefreshVehicles, isPreviewMode } from '@/utils/apiHelper';

// Cache for vehicle data
let vehicleDataCache: CabType[] | null = null;
let vehicleDataTimestamp = 0;

// Default vehicles to use as fallback
const defaultVehicles: CabType[] = [
  {
    id: 'sedan',
    vehicle_id: 'sedan',
    name: 'Sedan',
    capacity: 4,
    luggageCapacity: 2,
    price: 2500,
    pricePerKm: 14,
    image: '/cars/sedan.png',
    amenities: ['AC', 'Bottle Water', 'Music System'],
    description: 'Comfortable sedan suitable for 4 passengers.',
    ac: true,
    nightHaltCharge: 700,
    driverAllowance: 250,
    isActive: true
  },
  {
    id: 'ertiga',
    vehicle_id: 'ertiga',
    name: 'Ertiga',
    capacity: 6,
    luggageCapacity: 3,
    price: 3200,
    pricePerKm: 18,
    image: '/cars/ertiga.png',
    amenities: ['AC', 'Bottle Water', 'Music System', 'Extra Legroom'],
    description: 'Spacious SUV suitable for 6 passengers.',
    ac: true,
    nightHaltCharge: 1000,
    driverAllowance: 250,
    isActive: true
  },
  {
    id: 'innova_crysta',
    vehicle_id: 'innova_crysta',
    name: 'Innova Crysta',
    capacity: 7,
    luggageCapacity: 4,
    price: 3800,
    pricePerKm: 20,
    image: '/cars/innova.png',
    amenities: ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point'],
    description: 'Premium SUV with ample space for 7 passengers.',
    ac: true,
    nightHaltCharge: 1000,
    driverAllowance: 250,
    isActive: true
  }
];

/**
 * Clear the vehicle data cache
 */
export function clearVehicleDataCache(): void {
  console.log('Clearing vehicle data cache');
  vehicleDataCache = null;
  vehicleDataTimestamp = 0;
}

/**
 * Get vehicle data with optional cache and refresh
 */
export async function getVehicleData(forceRefresh = false, includeInactive = false): Promise<CabType[]> {
  try {
    const now = Date.now();
    const cacheValidTime = 5 * 60 * 1000; // 5 minutes
    
    // Check if we have a valid cache and should use it
    if (!forceRefresh && vehicleDataCache && now - vehicleDataTimestamp < cacheValidTime) {
      console.log('Using cached vehicle data', vehicleDataCache.length);
      
      if (includeInactive) {
        return vehicleDataCache;
      } else {
        return vehicleDataCache.filter(v => v.isActive !== false && v.is_active !== false);
      }
    }
    
    // Try to get fresh data
    try {
      console.log('Fetching fresh vehicle data');
      
      // Explicitly provide error handling fallback for the preview environment
      const endpoints = [
        `/api/vehicles-data.php?includeInactive=${includeInactive}&_t=${Date.now()}`,
        `/api/admin/vehicles.php?includeInactive=${includeInactive}&_t=${Date.now()}`,
        `/api/vehicles.php?includeInactive=${includeInactive}&_t=${Date.now()}`
      ];

      let response = null;
      let errorMessages = [];

      // Try each endpoint until one succeeds
      for (const endpoint of endpoints) {
        try {
          response = await directApiCall(endpoint);
          if (response && response.vehicles) {
            console.log(`Successfully loaded vehicle data from ${endpoint}`);
            break;
          }
        } catch (err: any) {
          errorMessages.push(`${endpoint}: ${err.message}`);
          console.log(`Failed to fetch from ${endpoint}, trying next endpoint`);
        }
      }
      
      // If we don't have a valid response after trying all endpoints
      if (!response || !response.vehicles || !Array.isArray(response.vehicles)) {
        if (isPreviewMode()) {
          console.log('In preview mode, using default vehicles');
          // If in preview mode, just use the default vehicles
          vehicleDataCache = defaultVehicles;
          vehicleDataTimestamp = now;
          
          if (includeInactive) {
            return defaultVehicles;
          } else {
            return defaultVehicles.filter(v => v.isActive !== false);
          }
        }
        
        throw new Error(`Failed to fetch vehicle data from all endpoints: ${errorMessages.join('; ')}`);
      }
      
      // Process the vehicles to ensure they have the required fields
      const processedVehicles = response.vehicles.map((vehicle: any) => ({
        ...vehicle,
        // Ensure all required fields are present
        id: vehicle.id || vehicle.vehicleId || vehicle.vehicle_id || '',
        vehicle_id: vehicle.vehicle_id || vehicle.id || vehicle.vehicleId || '', // Make sure vehicle_id is set
        isActive: vehicle.isActive !== undefined ? vehicle.isActive : vehicle.is_active !== false
      }));
      
      // Update the cache
      vehicleDataCache = processedVehicles;
      vehicleDataTimestamp = now;
      
      // Dispatch an event to notify other components
      window.dispatchEvent(new CustomEvent('vehicle-data-refreshed', { 
        detail: { count: processedVehicles.length, source: 'api' }
      }));
      
      console.log(`Successfully loaded and cached ${processedVehicles.length} vehicles`);
      
      // Return the filtered list if needed
      if (includeInactive) {
        return processedVehicles;
      } else {
        return processedVehicles.filter(v => v.isActive !== false && v.is_active !== false);
      }
    } catch (apiError) {
      console.error('Error fetching vehicle data from API:', apiError);
      
      // Try to force refresh if first attempt failed
      if (forceRefresh) {
        try {
          await forceRefreshVehicles();
        } catch (refreshError) {
          console.error('Error forcing vehicle refresh:', refreshError);
        }
      }
    }
    
    // If we get here, we couldn't get fresh data, so check if we have any cached data
    if (vehicleDataCache) {
      console.log('Using older cached vehicle data');
      
      if (includeInactive) {
        return vehicleDataCache;
      } else {
        return vehicleDataCache.filter(v => v.isActive !== false && v.is_active !== false);
      }
    }
    
    // As a last resort, return the default vehicles
    console.log('Using default vehicle data');
    
    // Store default vehicles in cache
    vehicleDataCache = defaultVehicles;
    vehicleDataTimestamp = now;
    
    if (includeInactive) {
      return defaultVehicles;
    } else {
      return defaultVehicles.filter(v => v.isActive !== false);
    }
  } catch (error) {
    console.error('Error in getVehicleData:', error);
    
    // Always return something usable, even in case of error
    if (isPreviewMode()) {
      console.log('In preview mode, returning default vehicles');
      return defaultVehicles;
    }
    
    if (vehicleDataCache) {
      return vehicleDataCache;
    }
    
    return defaultVehicles;
  }
}

/**
 * Get vehicle types (distinct cab types)
 */
export const getVehicleTypes = async (): Promise<string[]> => {
  try {
    const vehicles = await getVehicleData();
    return [...new Set(vehicles.map(v => v.id))];
  } catch (error) {
    console.error('Error getting vehicle types:', error);
    return [...new Set(defaultVehicles.map(v => v.id))];
  }
};
