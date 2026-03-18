/**
 * Tour API - same endpoint as web app
 */
import axios from 'axios';
import { API_BASE_URL } from '../config';

import { Platform } from 'react-native';

// On web use relative /api for proxy; native uses full URL
const BASE =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? ''
    : (API_BASE_URL || 'https://www.vizagtaxihub.com');

export interface TourInfo {
  id: string;
  name: string;
  distance?: number;
  days?: number;
  image?: string;
  timeDuration?: string;
  description?: string;
  pricing?: Record<string, number>;
}

export interface TourGalleryImage {
  id: string;
  url: string;
  alt: string;
  caption?: string;
}

export interface TourItineraryDay {
  day: number;
  title: string;
  description: string;
  activities: string[];
}

export interface TourDetail {
  tourId: string;
  tourName: string;
  description: string;
  distance: number;
  days: number;
  duration?: string;
  imageUrl?: string;
  timeDuration?: string;
  category?: string;
  difficulty?: string;
  pricing: Record<string, number>;
  gallery?: TourGalleryImage[];
  itinerary?: TourItineraryDay[];
  inclusions?: string[];
  exclusions?: string[];
  highlights?: { icon: string; title: string; description: string }[];
}

export const tourAPI = {
  getAvailableTours: async (): Promise<TourInfo[]> => {
    const response = await axios.get(`${BASE}/api/fares/tours.php`, {
      headers: { 'Content-Type': 'application/json' },
      params: { t: Date.now() },
      timeout: 8000,
      validateStatus: () => true,
    });
    const data = response.data;
    if (!data || response.status !== 200 || !Array.isArray(data)) return [];
    return data.map((tour: any) => ({
      id: tour.tourId || tour.id,
      name: tour.tourName || tour.name,
      distance: tour.distance ?? 120,
      days: tour.days ?? 1,
      image: tour.imageUrl || tour.image,
      timeDuration: tour.timeDuration ?? '',
      description: tour.description ?? '',
      pricing: tour.pricing ?? {},
    }));
  },

  getTourDetail: async (tourId: string): Promise<TourDetail | null> => {
    try {
      const response = await axios.get(`${BASE}/api/tours.php/${tourId}`, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 8000,
        validateStatus: () => true,
      });
      const data = response.data;
      if (!data || response.status !== 200) return null;
      return {
        tourId: data.tourId || data.id || tourId,
        tourName: data.tourName || data.name || '',
        description: data.description ?? '',
        distance: data.distance ?? 120,
        days: data.days ?? 1,
        duration: data.duration,
        difficulty: data.difficulty,
        category: data.category,
        timeDuration: data.timeDuration,
        imageUrl: data.imageUrl || data.image,
        gallery: Array.isArray(data.gallery) ? data.gallery : undefined,
        highlights: Array.isArray(data.highlights) ? data.highlights : undefined,
        itinerary: Array.isArray(data.itinerary) ? data.itinerary : undefined,
        inclusions: Array.isArray(data.inclusions) ? data.inclusions : undefined,
        exclusions: Array.isArray(data.exclusions) ? data.exclusions : undefined,
        pricing: data.pricing ?? {},
      };
    } catch {
      return null;
    }
  },
};
