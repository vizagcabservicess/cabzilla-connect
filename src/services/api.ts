
// Import necessary types
import { TourFare } from '@/types/api';
import axios from 'axios';

// Create an axios instance with defaults
const apiClient = axios.create({
  baseURL: '/',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tour fare API methods
export const fareAPI = {
  // Get all tour fares
  getTourFares: async (): Promise<TourFare[]> => {
    try {
      // Use the correct endpoint from fares/tours.php
      const response = await apiClient.get('/api/fares/tours.php');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching tour fares:', error);
      throw error;
    }
  },

  // Update a tour fare
  updateTourFares: async (fareData: any): Promise<any> => {
    try {
      // FIX: Use the correct endpoint for tour fare updates (fares-update.php)
      // with POST method (not PUT to specific tour ID)
      const response = await apiClient.post('/api/admin/fares-update.php', fareData);
      return response.data;
    } catch (error) {
      console.error('Error updating tour fare:', error);
      throw error;
    }
  },

  // Add a new tour fare
  addTourFare: async (fareData: any): Promise<any> => {
    try {
      // FIX: Use the correct endpoint for adding tour fares with PUT method
      const response = await apiClient.put('/api/admin/fares-update.php', fareData);
      return response.data;
    } catch (error) {
      console.error('Error adding tour fare:', error);
      throw error;
    }
  },

  // Delete a tour fare
  deleteTourFare: async (tourId: string): Promise<any> => {
    try {
      // FIX: Use the correct endpoint with query parameter
      const response = await apiClient.delete(`/api/admin/fares-update.php?tourId=${tourId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting tour fare:', error);
      throw error;
    }
  },
};

// Export the API client for direct use
export default apiClient;
