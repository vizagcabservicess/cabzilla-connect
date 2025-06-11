
import axios from 'axios';
import { getApiUrl, defaultHeaders } from '@/config/api';

const baseURL = getApiUrl();

export interface TourData {
  id?: number;
  tourId: string;
  tourName: string;
  sedan: number;
  ertiga: number;
  innova: number;
  tempo: number;
  luxury: number;
  distance: number;
  days: number;
  description: string;
  imageUrl?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TourManagementResponse {
  status: string;
  message?: string;
  data?: TourData | TourData[];
}

export const tourManagementAPI = {
  // Get all tours for admin management
  getAllTours: async (): Promise<TourData[]> => {
    try {
      const response = await axios.get(`${baseURL}/api/admin/tours-management.php`, {
        headers: { 
          ...defaultHeaders,
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.data.status === 'success') {
        return response.data.data || [];
      }
      throw new Error(response.data.message || 'Failed to fetch tours');
    } catch (error) {
      console.error('Error fetching tours:', error);
      throw error;
    }
  },

  // Add new tour
  addTour: async (tourData: Omit<TourData, 'id'>): Promise<TourData> => {
    try {
      const response = await axios.post(`${baseURL}/api/admin/tours-management.php`, tourData, {
        headers: { 
          ...defaultHeaders,
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.data.status === 'success') {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to add tour');
    } catch (error) {
      console.error('Error adding tour:', error);
      throw error;
    }
  },

  // Update existing tour
  updateTour: async (tourData: Partial<TourData> & { tourId: string }): Promise<TourData> => {
    try {
      const response = await axios.put(`${baseURL}/api/admin/tours-management.php`, tourData, {
        headers: { 
          ...defaultHeaders,
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.data.status === 'success') {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to update tour');
    } catch (error) {
      console.error('Error updating tour:', error);
      throw error;
    }
  },

  // Delete tour
  deleteTour: async (tourId: string): Promise<void> => {
    try {
      const response = await axios.delete(`${baseURL}/api/admin/tours-management.php?tourId=${tourId}`, {
        headers: { 
          ...defaultHeaders,
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.data.status !== 'success') {
        throw new Error(response.data.message || 'Failed to delete tour');
      }
    } catch (error) {
      console.error('Error deleting tour:', error);
      throw error;
    }
  }
};
