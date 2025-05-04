
import { CabType } from '@/types/cab';
import { getVehicles } from '@/services/directVehicleService';

export const vehicleAPI = {
  /**
   * Get all vehicles
   * @param includeInactive Whether to include inactive vehicles
   */
  getVehicles: async (includeInactive = false): Promise<{vehicles: CabType[]}> => {
    try {
      const vehicles = await getVehicles(includeInactive);
      return { vehicles };
    } catch (error) {
      console.error("Error in vehicleAPI.getVehicles:", error);
      throw error;
    }
  },
};

export default vehicleAPI;
