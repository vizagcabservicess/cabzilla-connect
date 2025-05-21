
import axios from 'axios';
import { getApiUrl, getForcedRequestConfig } from '@/config/requestConfig';
import { TourInfo } from '@/types/cab';

export const tourAPI = {
  /**
   * Get all available tours and their details
   */
  getTours: async (): Promise<TourInfo[]> => {
    try {
      const response = await axios.get(
        getApiUrl('api/fares/tours.php'),
        getForcedRequestConfig()
      );
      
      if (response.status === 200) {
        return response.data || [];
      }
      
      console.error('Failed to fetch tours:', response.statusText);
      return [];
    } catch (error) {
      console.error('Error in getTours:', error);
      throw error;
    }
  },
  
  /**
   * Get details for a specific tour by ID
   */
  getTourById: async (tourId: string): Promise<TourInfo | null> => {
    try {
      const response = await axios.get(
        getApiUrl(`api/fares/tours.php?tourId=${tourId}`),
        getForcedRequestConfig()
      );
      
      if (response.status === 200 && response.data) {
        const tours = Array.isArray(response.data) ? response.data : [response.data];
        const tour = tours.find((t: any) => t.tourId === tourId);
        
        if (tour) {
          return {
            id: tour.tourId,
            name: tour.tourName,
            distance: parseFloat(tour.distance) || 50,
            days: parseInt(tour.days) || 1,
            image: tour.image || `/tours/${tour.tourId}.jpg`,
            description: tour.description
          };
        }
      }
      
      console.error(`No tour found with ID: ${tourId}`);
      return null;
    } catch (error) {
      console.error(`Error fetching tour with ID ${tourId}:`, error);
      throw error;
    }
  }
};

// Export the tourAPI from this file
export default tourAPI;
