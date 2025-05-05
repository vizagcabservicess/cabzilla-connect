
import axios from 'axios';
import { API_BASE_URL } from '@/config';
import { TourFare, VehiclePricing, FareUpdateRequest, VehiclePricingUpdateRequest } from '@/types/api';

// Generate cache busting parameters
const generateCacheBuster = () => {
  return `_t=${Date.now()}&_cb=${Math.random().toString(36).substring(2, 15)}`;
};

export const fareAPI = {
  /**
   * Get all vehicle pricing
   */
  getVehiclePricing: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/vehicle-pricing.php?${generateCacheBuster()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        }
      });
      
      if (response.status === 200) {
        return response.data.data || response.data;
      }
      
      throw new Error(`Failed to fetch vehicle pricing: ${response.statusText}`);
    } catch (error) {
      console.error('Error in getVehiclePricing:', error);
      throw error;
    }
  },
  
  /**
   * Update vehicle pricing
   */
  updateVehiclePricing: async (id: number | string, data: VehiclePricingUpdateRequest) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/admin/update-vehicle-pricing.php`, {
        id,
        ...data
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Force-Refresh': 'true'
        }
      });
      
      if (response.status === 200) {
        return response.data;
      }
      
      throw new Error(`Failed to update vehicle pricing: ${response.statusText}`);
    } catch (error) {
      console.error('Error in updateVehiclePricing:', error);
      throw error;
    }
  },
  
  /**
   * Get all tour fares
   */
  getTourFares: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/tour-fares.php?${generateCacheBuster()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        }
      });
      
      if (response.status === 200) {
        return response.data.data || response.data;
      }
      
      throw new Error(`Failed to fetch tour fares: ${response.statusText}`);
    } catch (error) {
      console.error('Error in getTourFares:', error);
      throw error;
    }
  },
  
  /**
   * Update tour fare
   */
  updateTourFare: async (id: number | string, data: FareUpdateRequest) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/admin/update-tour-fare.php`, {
        id,
        ...data
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Force-Refresh': 'true'
        }
      });
      
      if (response.status === 200) {
        return response.data;
      }
      
      throw new Error(`Failed to update tour fare: ${response.statusText}`);
    } catch (error) {
      console.error('Error in updateTourFare:', error);
      throw error;
    }
  }
};
