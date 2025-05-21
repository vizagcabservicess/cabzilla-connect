
import axios from 'axios';
import { getApiUrl, getForcedRequestConfig } from '@/config/requestConfig';
import { TourInfo } from '@/types/cab';
import { toast } from 'sonner';

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
      
      if (response.status === 200 && response.data) {
        // Transform the API data to match our app's structure
        const tours: TourInfo[] = Array.isArray(response.data) ? response.data.map(tour => ({
          id: tour.tourId || '',
          name: tour.tourName || '',
          distance: parseFloat(tour.distance) || 50,
          days: parseInt(tour.days) || 1,
          image: tour.image || `/tours/${tour.tourId}.jpg`,
          description: tour.description || '',
          highlights: tour.highlights ? JSON.parse(tour.highlights) : [],
          inclusions: tour.inclusions ? JSON.parse(tour.inclusions) : [],
          exclusions: tour.exclusions ? JSON.parse(tour.exclusions) : []
        })) : [];
        
        return tours;
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
            description: tour.description,
            highlights: tour.highlights ? JSON.parse(tour.highlights) : [],
            inclusions: tour.inclusions ? JSON.parse(tour.inclusions) : [],
            exclusions: tour.exclusions ? JSON.parse(tour.exclusions) : []
          };
        }
      }
      
      console.error(`No tour found with ID: ${tourId}`);
      return null;
    } catch (error) {
      console.error(`Error fetching tour with ID ${tourId}:`, error);
      throw error;
    }
  },
  
  /**
   * Get fares for all tours or a specific tour
   */
  getTourFares: async (tourId?: string) => {
    try {
      const url = tourId 
        ? getApiUrl(`api/fares/tours.php?tourId=${tourId}`)
        : getApiUrl('api/fares/tours.php');
        
      const response = await axios.get(url, getForcedRequestConfig());
      
      if (response.status === 200 && response.data) {
        // Process and return the fare data
        let fares = {};
        const toursData = Array.isArray(response.data) ? response.data : [response.data];
        
        toursData.forEach((tour: any) => {
          if (tour && tour.tourId) {
            fares[tour.tourId] = {
              sedan: parseFloat(tour.sedan) || 0,
              ertiga: parseFloat(tour.ertiga) || 0,
              innova: parseFloat(tour.innova) || 0,
              tempo: parseFloat(tour.tempo) || 0,
              luxury: parseFloat(tour.luxury) || 0
            };
          }
        });
        
        return tourId ? fares[tourId] : fares;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching tour fares:', error);
      toast('Failed to load tour price information');
      return null;
    }
  }
};

// Export the tourAPI from this file
export default tourAPI;
