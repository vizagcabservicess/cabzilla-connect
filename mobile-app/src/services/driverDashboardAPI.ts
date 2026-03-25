import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';
import { API_BASE_URL, WEB_APP_BASE_URL } from '../config';
import { authAPI } from './authAPI';
import type { DriverDashboardData, DriverDashboardFilters } from '../types/driverDashboard';

const CACHE_KEY = 'driver_dashboard_cache_v1';

const getBase = () => {
  if (API_BASE_URL) return API_BASE_URL;
  if (Platform.OS === 'web') return '';
  return WEB_APP_BASE_URL || 'https://www.vizagtaxihub.com';
};

function buildQuery(filters?: DriverDashboardFilters): string {
  const searchParams = new URLSearchParams();
  if (filters?.fromDate) searchParams.set('from_date', filters.fromDate);
  if (filters?.toDate) searchParams.set('to_date', filters.toDate);
  if (filters?.status) searchParams.set('status', filters.status);
  if (filters?.paymentType) searchParams.set('payment_type', filters.paymentType);
  if (filters?.search) searchParams.set('search', filters.search);
  if (typeof filters?.driverId === 'number' && filters.driverId > 0) {
    searchParams.set('driver_id', String(filters.driverId));
  }
  if (typeof filters?.tripLimit === 'number') searchParams.set('trip_limit', String(filters.tripLimit));
  if (typeof filters?.tripOffset === 'number') searchParams.set('trip_offset', String(filters.tripOffset));
  if (typeof filters?.fuelLimit === 'number') searchParams.set('fuel_limit', String(filters.fuelLimit));
  if (typeof filters?.fuelOffset === 'number') searchParams.set('fuel_offset', String(filters.fuelOffset));
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export const driverDashboardAPI = {
  getDashboard: async (filters?: DriverDashboardFilters): Promise<DriverDashboardData> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();

    try {
      const response = await axios.get(`${base}/api/driver/dashboard.php${buildQuery(filters)}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20000,
      });
      const data = response.data;
      if (data?.status !== 'success' || !data?.data) {
        throw new Error(data?.message || 'Failed to load dashboard');
      }
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data.data));
      return data.data as DriverDashboardData;
    } catch (error) {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as DriverDashboardData;
      }
      throw error;
    }
  },
};
