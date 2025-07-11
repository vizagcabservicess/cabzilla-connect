import axios from 'axios';
import { getApiUrl, defaultHeaders } from '@/config/api';
import { TourData, TourManagementRequest } from '@/types/api';

const baseURL = getApiUrl();

export const tourManagementAPI = {
  getTours: async (): Promise<TourData[]> => {
    try {
      const response = await axios.get(`${baseURL}/api/admin/tours-management.php`, {
        headers: { ...defaultHeaders, 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      
      if (response.data && response.data.status === 'success') {
        return response.data.data || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching tours:', error);
      throw error;
    }
  },

  createTour: async (tourData: TourManagementRequest) => {
    try {
      const response = await axios.post(`${baseURL}/api/admin/tours-management.php`, tourData, {
        headers: { 
          ...defaultHeaders, 
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating tour:', error);
      throw error;
    }
  },

  updateTour: async (tourData: TourManagementRequest) => {
    try {
      const response = await axios.put(`${baseURL}/api/admin/tours-management.php`, tourData, {
        headers: { 
          ...defaultHeaders, 
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating tour:', error);
      throw error;
    }
  },

  deleteTour: async (tourId: string) => {
    try {
      const response = await axios.delete(`${baseURL}/api/admin/tours-management.php?tourId=${tourId}`, {
        headers: { 
          ...defaultHeaders, 
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting tour:', error);
      throw error;
    }
  },

  getVehicles: async () => {
    try {
      const response = await axios.get(`${baseURL}/api/admin/tours-management.php?action=vehicles`, {
        headers: { ...defaultHeaders }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      throw error;
    }
  },

  getTourById: async (tourId: string): Promise<TourData | null> => {
    try {
      const response = await axios.get(`${baseURL}/api/admin/tours-management.php?tourId=${tourId}`, {
        headers: { ...defaultHeaders, 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (response.data && response.data.status === 'success') {
        return response.data.data || null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching tour by ID:', error);
      throw error;
    }
  }
};

export type { TourData };
