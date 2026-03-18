/**
 * Driver Hire API - submit driver hire requests (matches web driverHireAPI)
 */
import axios from 'axios';
import { API_BASE_URL } from '../config';

const BASE = API_BASE_URL || 'https://www.vizagtaxihub.com';

export interface DriverHireRequest {
  name: string;
  phone: string;
  email?: string;
  pickupLocation?: string;
  pickupDateTime?: Date;
  serviceType: string;
  duration: string;
  requirements?: string;
}

export interface DriverHireResponse {
  status: 'success' | 'error';
  message: string;
  requestId?: number;
  request?: unknown;
  errors?: string[];
}

export const driverHireAPI = {
  submitRequest: async (requestData: DriverHireRequest): Promise<DriverHireResponse> => {
    try {
      const pickupDateStr = requestData.pickupDateTime
        ? (typeof requestData.pickupDateTime === 'string'
            ? requestData.pickupDateTime
            : (requestData.pickupDateTime as Date).toISOString())
        : '';
      const payload = {
        name: requestData.name,
        phone: requestData.phone,
        email: requestData.email || '',
        pickupLocation: requestData.pickupLocation || '',
        pickupDateTime: pickupDateStr,
        pickup_location: requestData.pickupLocation || '',
        pickup_date_time: pickupDateStr,
        serviceType: requestData.serviceType,
        duration: requestData.duration,
        requirements: requestData.requirements || '',
      };
      const response = await axios.post(`${BASE}/api/driver-hire-request.php`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.data) {
        return error.response.data as DriverHireResponse;
      }
      return {
        status: 'error',
        message: 'Network error. Please check your connection and try again.',
      };
    }
  },
};
