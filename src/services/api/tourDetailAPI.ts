import axios from 'axios';
import { getApiUrl, defaultHeaders } from '@/config/api';
import { TourDetail, TourListItem } from '@/types/tour';

const baseURL = getApiUrl();

export const tourDetailAPI = {
  // Get all tours for listing
  getTours: async (): Promise<TourListItem[]> => {
    try {
      const response = await axios.get(`${baseURL}/api/tours.php`, {
        headers: { ...defaultHeaders }
      });
      
      if (!response.data || !Array.isArray(response.data)) {
        return [];
      }
      
      return response.data.map((tour: any) => ({
        tourId: tour.tourId,
        tourName: tour.tourName,
        description: tour.description || '',
        distance: tour.distance || 120,
        days: tour.days || 1,
        imageUrl: tour.imageUrl || `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=300&fit=crop`,
        pricing: tour.pricing || {},
        minPrice: tour.minPrice || 0,
        timeDuration: tour.timeDuration || ''
      }));
    } catch (error) {
      console.error('Error fetching tours:', error);
      return [];
    }
  },

  // Get individual tour detail
  getTourDetail: async (tourId: string): Promise<TourDetail | null> => {
    try {
      const response = await axios.get(`${baseURL}/api/tours.php/${tourId}`, {
        headers: { ...defaultHeaders }
      });
      
      if (!response.data) {
        return null;
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching tour detail:', error);
      return null;
    }
  }
};
