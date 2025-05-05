
import { getFleetVehicles, clearVehicleCache } from '@/utils/fleetDataUtils';

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
