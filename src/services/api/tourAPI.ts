
import axios from 'axios';
import { getApiUrl, defaultHeaders } from '@/config/api';
import { TourInfo, TourFares } from '@/types/cab';

const baseURL = getApiUrl();

export interface TourFareResponse {
  tourId: string;
  tourName: string;
  sedan: number;
  ertiga: number;
  innova: number;
  tempo?: number;
  luxury?: number;
}

export const tourAPI = {
  // Get all available tours
  getAvailableTours: async (): Promise<TourInfo[]> => {
    try {
      const response = await axios.get(`${baseURL}/api/fares/tours.php`, {
        headers: { ...defaultHeaders }
      });
      
      console.log('Tour API response:', response.data);
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid tour data received');
      }
      
      // Transform API response to match TourInfo format
      return response.data.map((tour: TourFareResponse) => ({
        id: tour.tourId,
        name: tour.tourName,
        distance: 120, // Default distance if not provided by API
        days: 1,      // Default duration if not provided by API
        image: `/tours/${tour.tourId}.jpg` // Assuming images follow this naming convention
      }));
    } catch (error) {
      console.error('Error fetching tour data:', error);
      throw error;
    }
  },
  
  // Get tour fares
  getTourFares: async (): Promise<TourFareResponse[]> => {
    try {
      const response = await axios.get(`${baseURL}/api/fares/tours.php`, { 
        headers: { ...defaultHeaders }
      });
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid tour fare data received');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching tour fares:', error);
      throw error;
    }
  }
};
