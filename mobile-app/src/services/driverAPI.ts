/**
 * Driver API - for users with role=driver
 */
import axios from 'axios';
import { Platform } from 'react-native';
import { authAPI } from './authAPI';
import { API_BASE_URL, WEB_APP_BASE_URL } from '../config';

const getBase = () => {
  if (API_BASE_URL) return API_BASE_URL;
  if (Platform.OS === 'web') return '';
  return WEB_APP_BASE_URL || 'https://www.vizagtaxihub.com';
};

export interface DriverRecord {
  id: number;
  name: string;
  phone: string;
  email: string;
  licenseNo: string | null;
  status: 'available' | 'busy' | 'offline';
  vehicle: string | null;
  vehicleNumber: string | null;
  userId: number | null;
}

export const driverAPI = {
  getMe: async (): Promise<DriverRecord> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const response = await axios.get(`${base}/api/driver/me.php`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
    const data = response.data;
    if (data?.status !== 'success') {
      throw new Error(data?.message || 'Failed to get driver info');
    }
    return data.data as DriverRecord;
  },
};
