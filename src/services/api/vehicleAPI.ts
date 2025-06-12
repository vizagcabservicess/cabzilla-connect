
import axios from 'axios';
import { getApiUrl, defaultHeaders } from '@/config/api';
import { Vehicle } from '@/types/vehicle';

const baseURL = getApiUrl();

export const vehicleAPI = {
  getVehicles: async (): Promise<{ vehicles: Vehicle[] }> => {
    try {
      const response = await axios.get(`${baseURL}/api/admin/tours-management.php?action=vehicles`, {
        headers: { ...defaultHeaders }
      });
      
      if (response.data && response.data.status === 'success') {
        const vehicles = response.data.data.map((vehicle: any) => ({
          id: vehicle.id,
          vehicle_id: vehicle.id,
          name: vehicle.name,
          type: 'car',
          capacity: 4,
          features: [],
          isActive: true
        }));
        
        return { vehicles };
      }
      
      return { vehicles: [] };
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      return { vehicles: [] };
    }
  }
};
