
import { getFleetVehicles, clearVehicleCache } from '@/utils/fleetDataUtils';
import { FleetVehicle } from '@/types/cab';

/**
 * Get vehicle data
 * @param withCache Use cache if available
 * @param includeInactive Include inactive vehicles
 * @returns Array of vehicle data
 */
export const getVehicleData = async (withCache = true, includeInactive = false) => {
  return getFleetVehicles(!withCache, includeInactive);
};

/**
 * Clear vehicle data cache
 */
export const clearVehicleDataCache = () => {
  clearVehicleCache();
};

/**
 * Get unique vehicle types
 * @returns Promise with array of vehicle type strings
 */
export const getVehicleTypes = async (): Promise<string[]> => {
  try {
    const vehicles = await getVehicleData(true, true);
    
    // Extract unique vehicle types
    const types = new Set<string>();
    vehicles.forEach(vehicle => {
      if (vehicle.vehicleType) {
        types.add(vehicle.vehicleType);
      }
      if (vehicle.cabTypeId) {
        types.add(vehicle.cabTypeId);
      }
    });
    
    return Array.from(types);
  } catch (error) {
    console.error('Error fetching vehicle types:', error);
    return ['sedan', 'suv', 'ertiga', 'innova_crysta']; // Fallback types
  }
};
