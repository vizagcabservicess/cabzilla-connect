
import axios from 'axios';
import { getApiUrl, defaultHeaders } from '@/config/api';
import { TourDetail, TourListItem } from '@/types/tour';

const baseURL = getApiUrl();

export const tourDetailAPI = {
  // Get all tours for listing
  getTours: async (): Promise<TourListItem[]> => {
    try {
      const response = await axios.get(`${baseURL}/api/fares/tours.php`, {
        headers: { ...defaultHeaders }
      });
      
      if (!response.data || !Array.isArray(response.data)) {
        return [];
      }
      
      return response.data.map((tour: any) => {
        const prices = tour.pricing ? Object.values(tour.pricing).filter((p: any) => p > 0) : [];
        const minPrice = prices.length > 0 ? Math.min(...prices as number[]) : 0;
        
        return {
          tourId: tour.tourId,
          tourName: tour.tourName,
          description: tour.description || '',
          distance: tour.distance || 120,
          days: tour.days || 1,
          imageUrl: tour.imageUrl || `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=300&fit=crop`,
          pricing: tour.pricing || {},
          minPrice
        };
      });
    } catch (error) {
      console.error('Error fetching tours:', error);
      return [];
    }
  },

  // Get individual tour detail
  getTourDetail: async (tourId: string): Promise<TourDetail | null> => {
    try {
      const response = await axios.get(`${baseURL}/api/tours/${tourId}`, {
        headers: { ...defaultHeaders }
      });
      
      if (!response.data) {
        return null;
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching tour detail:', error);
      // Return mock data for now
      return {
        id: tourId,
        tourId,
        tourName: "Araku Valley Tour",
        description: "Experience the breathtaking beauty of Araku Valley with its coffee plantations, tribal culture, and scenic landscapes.",
        duration: "Full Day",
        distance: 115,
        days: 1,
        difficulty: 'Easy',
        category: 'Nature & Adventure',
        highlights: [
          {
            icon: "mountain",
            title: "Scenic Hill Station",
            description: "Beautiful valley views and coffee plantations"
          },
          {
            icon: "camera",
            title: "Photo Opportunities",
            description: "Stunning landscapes and tribal villages"
          },
          {
            icon: "coffee",
            title: "Coffee Museum",
            description: "Learn about local coffee cultivation"
          }
        ],
        itinerary: [
          {
            day: 1,
            title: "Araku Valley Exploration",
            description: "Full day tour of Araku Valley and surrounding attractions",
            activities: [
              "Departure from Visakhapatnam",
              "Visit Borra Caves",
              "Coffee Museum tour",
              "Tribal Museum visit",
              "Valley viewpoints",
              "Return to Visakhapatnam"
            ]
          }
        ],
        gallery: [
          {
            id: "1",
            url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
            alt: "Araku Valley scenic view"
          },
          {
            id: "2",
            url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop",
            alt: "Coffee plantations"
          },
          {
            id: "3",
            url: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&h=600&fit=crop",
            alt: "Mountain landscapes"
          }
        ],
        inclusions: [
          "Transportation in AC vehicle",
          "Professional driver",
          "Fuel charges",
          "Toll charges",
          "Parking charges"
        ],
        exclusions: [
          "Entry fees to attractions",
          "Meals and refreshments",
          "Personal expenses",
          "Tips and gratuities"
        ],
        pricing: {},
        imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=300&fit=crop",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  }
};
