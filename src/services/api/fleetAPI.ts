
import { FleetVehicle, MaintenanceRecord, FuelRecord, VehicleDocument } from '@/types/cab';
import axios from 'axios';
import { API_BASE_URL } from '@/config';

const API_URL = `${API_BASE_URL}/api/admin/fleet`;

export const fleetAPI = {
  /**
   * Get all fleet vehicles
   * @param includeInactive Whether to include inactive vehicles
   */
  getVehicles: async (includeInactive = false): Promise<{vehicles: FleetVehicle[]}> => {
    try {
      const response = await axios.get(`${API_URL}/vehicles`, {
        params: { includeInactive }
      });
      return response.data;
    } catch (error) {
      console.error("Error in fleetAPI.getVehicles:", error);
      throw error;
    }
  },

  /**
   * Get vehicle by ID
   * @param vehicleId Vehicle ID
   */
  getVehicleById: async (vehicleId: string): Promise<FleetVehicle> => {
    try {
      const response = await axios.get(`${API_URL}/vehicles/${vehicleId}`);
      return response.data.vehicle;
    } catch (error) {
      console.error(`Error in fleetAPI.getVehicleById(${vehicleId}):`, error);
      throw error;
    }
  },

  /**
   * Add new vehicle
   * @param vehicle Vehicle data
   */
  addVehicle: async (vehicle: Partial<FleetVehicle>): Promise<FleetVehicle> => {
    try {
      console.log("Adding fleet vehicle:", vehicle);
      
      // Try the main fleet API endpoint first
      try {
        const response = await axios.post(`${API_URL}/vehicles`, vehicle);
        return response.data.vehicle;
      } catch (mainError) {
        console.error("Error with primary fleet API endpoint:", mainError);
        
        // Fall back to direct vehicle API as a backup
        const fallbackUrl = `${API_BASE_URL}/api/admin/vehicle-create.php`;
        console.log("Trying fallback API endpoint:", fallbackUrl);
        
        const fallbackResponse = await axios.post(fallbackUrl, vehicle, {
          headers: {
            'X-Fleet-Vehicle': 'true',
            'Content-Type': 'application/json'
          }
        });
        
        return fallbackResponse.data.vehicle;
      }
    } catch (error) {
      console.error("Error in fleetAPI.addVehicle:", error);
      throw error;
    }
  },

  /**
   * Update vehicle
   * @param vehicleId Vehicle ID
   * @param vehicle Vehicle data
   */
  updateVehicle: async (vehicleId: string, vehicle: Partial<FleetVehicle>): Promise<FleetVehicle> => {
    try {
      const response = await axios.put(`${API_URL}/vehicles/${vehicleId}`, vehicle);
      return response.data.vehicle;
    } catch (error) {
      console.error(`Error in fleetAPI.updateVehicle(${vehicleId}):`, error);
      throw error;
    }
  },

  /**
   * Delete vehicle
   * @param vehicleId Vehicle ID
   */
  deleteVehicle: async (vehicleId: string): Promise<boolean> => {
    try {
      await axios.delete(`${API_URL}/vehicles/${vehicleId}`);
      return true;
    } catch (error) {
      console.error(`Error in fleetAPI.deleteVehicle(${vehicleId}):`, error);
      throw error;
    }
  },

  /**
   * Get maintenance records for a vehicle
   * @param vehicleId Vehicle ID
   */
  getMaintenanceRecords: async (vehicleId: string): Promise<MaintenanceRecord[]> => {
    try {
      const response = await axios.get(`${API_URL}/maintenance/${vehicleId}`);
      return response.data.records;
    } catch (error) {
      console.error(`Error in fleetAPI.getMaintenanceRecords(${vehicleId}):`, error);
      throw error;
    }
  },

  /**
   * Add maintenance record
   * @param record Maintenance record
   */
  addMaintenanceRecord: async (record: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> => {
    try {
      const response = await axios.post(`${API_URL}/maintenance`, record);
      return response.data.record;
    } catch (error) {
      console.error("Error in fleetAPI.addMaintenanceRecord:", error);
      throw error;
    }
  },

  /**
   * Get fuel records for a vehicle
   * @param vehicleId Vehicle ID
   */
  getFuelRecords: async (vehicleId: string): Promise<FuelRecord[]> => {
    try {
      const response = await axios.get(`${API_URL}/fuel/${vehicleId}`);
      return response.data.records;
    } catch (error) {
      console.error(`Error in fleetAPI.getFuelRecords(${vehicleId}):`, error);
      throw error;
    }
  },

  /**
   * Add fuel record
   * @param record Fuel record
   */
  addFuelRecord: async (record: Partial<FuelRecord>): Promise<FuelRecord> => {
    try {
      const response = await axios.post(`${API_URL}/fuel`, record);
      return response.data.record;
    } catch (error) {
      console.error("Error in fleetAPI.addFuelRecord:", error);
      throw error;
    }
  },

  /**
   * Get vehicle documents
   * @param vehicleId Vehicle ID
   */
  getVehicleDocuments: async (vehicleId: string): Promise<VehicleDocument[]> => {
    try {
      const response = await axios.get(`${API_URL}/documents/${vehicleId}`);
      return response.data.documents;
    } catch (error) {
      console.error(`Error in fleetAPI.getVehicleDocuments(${vehicleId}):`, error);
      throw error;
    }
  },

  /**
   * Assign vehicle to booking
   * @param vehicleId Vehicle ID
   * @param bookingId Booking ID 
   * @param driverId Driver ID (optional)
   */
  assignVehicleToBooking: async (
    vehicleId: string,
    bookingId: string,
    driverId?: string
  ): Promise<boolean> => {
    try {
      const response = await axios.post(`${API_URL}/assign`, {
        vehicleId,
        bookingId,
        driverId
      });
      return response.data.success;
    } catch (error) {
      console.error("Error in fleetAPI.assignVehicleToBooking:", error);
      throw error;
    }
  }
};

export default fleetAPI;
