import axios from 'axios';
import { API_BASE_URL } from '@/config';

export interface ScopedVehicle {
  id: number;
  vehicleNumber: string;
  vehicleType: string;
  model: string;
  make: string;
  year: number;
  seatingCapacity: number;
  fuelType: string;
  acType: string;
  status: string;
  ownerAdminId: number;
  ownerName: string;
  operatorName?: string;
  bookingCount: number;
  avgFare: number;
  imageUrl?: string;
  features: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateScopedVehicleRequest {
  vehicleNumber: string;
  vehicleType: string;
  model: string;
  make: string;
  year: number;
  seatingCapacity: number;
  fuelType: string;
  acType: string;
  status?: string;
  ownerAdminId?: number; // For super admin only
  imageUrl?: string;
  features?: string[];
}

export interface UpdateScopedVehicleRequest extends CreateScopedVehicleRequest {
  id: number;
}

export const scopedVehicleAPI = {
  /**
   * Get vehicles for current admin or all vehicles for super admin
   */
  getMyVehicles: async (): Promise<ScopedVehicle[]> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/scoped-vehicles.php`);
      return response.data.success ? response.data.data : [];
    } catch (error) {
      console.error('Error fetching my vehicles:', error);
      throw error;
    }
  },

  /**
   * Get vehicles for specific operator (super admin only or self)
   */
  getOperatorVehicles: async (operatorId: number): Promise<ScopedVehicle[]> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/scoped-vehicles.php?operator_id=${operatorId}`);
      return response.data.success ? response.data.data : [];
    } catch (error) {
      console.error('Error fetching operator vehicles:', error);
      throw error;
    }
  },

  /**
   * Create new vehicle
   */
  createVehicle: async (vehicleData: CreateScopedVehicleRequest): Promise<{ id: number }> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/scoped-vehicles.php`,
        vehicleData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create vehicle');
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Error creating vehicle:', error);
      throw error;
    }
  },

  /**
   * Update vehicle
   */
  updateVehicle: async (vehicleData: UpdateScopedVehicleRequest): Promise<void> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/admin/scoped-vehicles.php`,
        vehicleData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update vehicle');
      }
    } catch (error) {
      console.error('Error updating vehicle:', error);
      throw error;
    }
  },

  /**
   * Delete vehicle
   */
  deleteVehicle: async (vehicleId: number): Promise<void> => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/api/admin/scoped-vehicles.php?id=${vehicleId}`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete vehicle');
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      throw error;
    }
  }
};

export default scopedVehicleAPI;