import axios from 'axios';
import { getApiUrl, defaultHeaders } from '@/config/api';
import { TourInfo, TourFares } from '@/types/cab';

const baseURL = getApiUrl();

export interface TourFareResponse {
  tourId: string;
  tourName: string;
  distance?: number;
  days?: number;
  description?: string;
  imageUrl?: string;
  pricing: { [vehicleId: string]: number };
  timeDuration?: string;
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
        distance: tour.distance ?? 120, // Default distance if not provided by API
        days: tour.days ?? 1,      // Default duration if not provided by API
        image: tour.imageUrl || `/tours/${tour.tourId}.jpg`,
        timeDuration: tour.timeDuration ?? '',
        description: tour.description ?? '',
        pricing: tour.pricing ?? {},
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
        headers: { ...defaultHeaders },
        params: {
          // Add a cache-busting parameter to ensure fresh data is always fetched
          t: new Date().getTime()
        }
      });
      
      // The public endpoint returns a direct array of tour data.
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      
      // Handle cases where the API might return an object with an error message
      if (response.data && response.data.error) {
        throw new Error(`API Error: ${response.data.error}`);
      }

      // If the response is not a valid array, throw an error.
      throw new Error('Invalid tour fare data received');
    } catch (error) {
      console.error('Error fetching tour fares:', error);
      // Re-throw the error to be handled by the calling component
      throw error;
    }
  }
};
