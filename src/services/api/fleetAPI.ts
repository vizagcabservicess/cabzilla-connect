
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
  },

  async addVehicle(vehicleData: Partial<FleetVehicle>): Promise<FleetVehicle> {
    try {
      const response = await fetch('/api/admin/fleet_vehicles.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vehicleData),
      });

      if (!response.ok) {
        throw new Error('Failed to add vehicle');
      }

      const data = await response.json();
      return data.vehicle;
    } catch (error) {
      console.error('Error adding vehicle:', error);
      throw error;
    }
  },

  async assignVehicleToBooking(bookingId: string, vehicleId: string, driverId?: string): Promise<boolean> {
    try {
      const response = await fetch('/api/admin/assign_vehicle.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          vehicleId,
          driverId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign vehicle');
      }

      return true;
    } catch (error) {
      console.error('Error assigning vehicle:', error);
      return false;
    }
  }
};
