/**
 * Admin Tour API - update tour fares (requires admin auth)
 * Uses tours-management.php with Bearer token
 */
import axios from 'axios';
import { Platform } from 'react-native';
import { API_BASE_URL, WEB_APP_BASE_URL } from '../config';
import { authAPI } from './authAPI';

const getBase = () => {
  if (API_BASE_URL) return API_BASE_URL;
  if (Platform.OS === 'web') return '';
  return WEB_APP_BASE_URL || 'https://www.vizagtaxihub.com';
};

export interface TourUpdateRequest {
  tourId: string;
  tourName?: string;
  distance?: number;
  days?: number;
  description?: string;
  imageUrl?: string;
  timeDuration?: string;
  isActive?: boolean;
  pricing?: Record<string, number>;
  gallery?: Array<{ url: string; alt?: string; caption?: string }>;
  inclusions?: string[];
  exclusions?: string[];
  itinerary?: Array<{ day: number; title: string; description: string; activities: string[] }>;
}

export const adminTourAPI = {
  getTourById: async (tourId: string): Promise<{
    tourId: string;
    tourName: string;
    distance?: number;
    days?: number;
    description?: string;
    imageUrl?: string;
    timeDuration?: string;
    pricing: Record<string, number>;
  } | null> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Admin login required');
    const base = getBase();
    const url = `${base}/api/admin/tours-management.php?tourId=${encodeURIComponent(tourId)}`;
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 10000,
    });
    const data = res.data;
    if (data?.status !== 'success' || !data?.data) return null;
    const t = data.data;
    return {
      tourId: t.tourId || t.tour_id || tourId,
      tourName: t.tourName || t.tour_name || t.name,
      distance: t.distance,
      days: t.days,
      description: t.description,
      imageUrl: t.imageUrl || t.image_url,
      timeDuration: t.timeDuration || t.time_duration,
      pricing: t.pricing ?? {},
    };
  },

  updateTour: async (payload: TourUpdateRequest): Promise<{ success: boolean; message?: string }> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Admin login required');
    const base = getBase();
    const url = `${base}/api/admin/tours-management.php`;
    const res = await axios.put(url, payload, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 10000,
    });
    const data = res.data;
    if (data?.status === 'success') return { success: true };
    return { success: false, message: data?.message || 'Update failed' };
  },

  getVehicles: async (): Promise<Array<{ id: string; name: string }>> => {
    const base = getBase();
    const url = `${base}/api/admin/tours-management.php?action=vehicles`;
    const res = await axios.get(url, { timeout: 8000 });
    const data = res.data;
    if (data?.status !== 'success' || !Array.isArray(data?.data)) return [];
    return data.data.map((v: any) => ({ id: v.id || v.vehicle_id, name: v.name || v.id }));
  },
};
