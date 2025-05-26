
import { FleetVehicle } from '@/types/cab';

export const fleetAPI = {
  async getVehicles(): Promise<FleetVehicle[]> {
    try {
      const response = await fetch('/api/admin/fleet_vehicles.php');
      const data = await response.json();
      return data.vehicles || [];
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      return [];
    }
  },

  async getDrivers(): Promise<{ id: string | number, name: string }[]> {
    try {
      const response = await fetch('/api/admin/drivers.php');
      const data = await response.json();
      return data.drivers || [];
    } catch (error) {
      console.error('Error fetching drivers:', error);
      return [];
    }
  }
};
