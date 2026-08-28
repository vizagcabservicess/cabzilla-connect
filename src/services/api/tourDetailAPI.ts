import axios from 'axios';
import { getApiUrl, defaultHeaders } from '@/config/api';
import { TourDetail, TourListItem } from '@/types/tour';

function toursRequestBase(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return '';
    }
  }
  return getApiUrl();
}

async function fetchToursPayload(url: string): Promise<unknown> {
  const response = await axios.get(url, {
    headers: { ...defaultHeaders },
    timeout: 12000,
    validateStatus: () => true,
  });
  if (response.status < 200 || response.status >= 300) return null;
  return response.data;
}

function mapTourList(data: unknown): TourListItem[] {
  if (!data || !Array.isArray(data)) return [];
  return data.map((tour: Record<string, unknown>) => ({
    tourId: String(tour.tourId ?? ''),
    tourName: String(tour.tourName ?? ''),
    description: String(tour.description || ''),
    distance: Number(tour.distance) || 120,
    days: Number(tour.days) || 1,
    imageUrl:
      String(tour.imageUrl || '') ||
      `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=300&fit=crop`,
    pricing: (tour.pricing as TourListItem['pricing']) || {},
    minPrice: Number(tour.minPrice) || 0,
    timeDuration: String(tour.timeDuration || ''),
  }));
}

export const tourDetailAPI = {
  getTours: async (): Promise<TourListItem[]> => {
    try {
      const local = await fetchToursPayload(`${toursRequestBase()}/api/tours.php`);
      const mapped = mapTourList(local);
      if (mapped.length) return mapped;
      if (toursRequestBase()) return [];
      const live = await fetchToursPayload('https://www.vizagtaxihub.com/api/tours.php');
      return mapTourList(live);
    } catch (error) {
      console.error('Error fetching tours:', error);
      return [];
    }
  },

  getTourDetail: async (tourId: string): Promise<TourDetail | null> => {
    try {
      const local = await fetchToursPayload(`${toursRequestBase()}/api/tours.php/${tourId}`);
      if (local && typeof local === 'object') return local as TourDetail;
      if (toursRequestBase()) return null;
      const live = await fetchToursPayload(`https://www.vizagtaxihub.com/api/tours.php/${tourId}`);
      if (live && typeof live === 'object') return live as TourDetail;
      return null;
    } catch (error) {
      console.error('Error fetching tour detail:', error);
      return null;
    }
  },
};
