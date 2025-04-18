import axios, { AxiosRequestConfig } from 'axios';
import { apiBaseUrl, forceRefreshHeaders, defaultHeaders } from '@/config/api';
import { getForcedRequestConfig } from '@/config/requestConfig';

// Create an Axios instance with default config
const api = axios.create({
  baseURL: apiBaseUrl,
  headers: defaultHeaders,
  timeout: 30000
});

// Fare API endpoints
export const fareAPI = {
  // Local fares
  getLocalFares: async (forceRefresh = false) => {
    const config: AxiosRequestConfig = {
      ...getForcedRequestConfig(),
      headers: {
        ...getForcedRequestConfig().headers,
        ...(forceRefresh ? forceRefreshHeaders : {})
      }
    };
    
    const response = await api.get('/api/direct-local-fares.php', config);
    return response.data;
  },
  
  // Local fares for a specific vehicle
  getLocalFaresForVehicle: async (vehicleId: string, forceRefresh = false) => {
    const config: AxiosRequestConfig = {
      ...getForcedRequestConfig(),
      headers: {
        ...getForcedRequestConfig().headers,
        ...(forceRefresh ? forceRefreshHeaders : {})
      }
    };
    
    const response = await api.get(`/api/direct-local-fares.php?vehicle_id=${vehicleId}`, config);
    return response.data;
  },
  
  // Outstation fares
  getOutstationFares: async (forceRefresh = false) => {
    const config: AxiosRequestConfig = {
      ...getForcedRequestConfig(),
      headers: {
        ...getForcedRequestConfig().headers,
        ...(forceRefresh ? forceRefreshHeaders : {})
      }
    };
    
    const response = await api.get('/api/outstation-fares.php', config);
    return response.data;
  },
  
  // Outstation fares for a specific vehicle
  getOutstationFaresForVehicle: async (vehicleId: string, tripMode = 'one-way', distance = 0, forceRefresh = false) => {
    const config: AxiosRequestConfig = {
      ...getForcedRequestConfig(),
      headers: {
        ...getForcedRequestConfig().headers,
        ...(forceRefresh ? forceRefreshHeaders : {})
      }
    };
    
    const params = new URLSearchParams();
    params.append('vehicle_id', vehicleId);
    params.append('trip_mode', tripMode);
    if (distance > 0) {
      params.append('distance', distance.toString());
    }
    
    const response = await api.get(`/api/outstation-fares.php?${params.toString()}`, config);
    return response.data;
  },
  
  // Airport fares
  getAirportFares: async (forceRefresh = false) => {
    const config: AxiosRequestConfig = {
      ...getForcedRequestConfig(),
      headers: {
        ...getForcedRequestConfig().headers,
        ...(forceRefresh ? forceRefreshHeaders : {})
      }
    };
    
    const response = await api.get('/api/airport-fares.php', config);
    return response.data;
  },
  
  // Airport fares for a specific vehicle
  getAirportFaresForVehicle: async (vehicleId: string, distance = 0, forceRefresh = false) => {
    const config: AxiosRequestConfig = {
      ...getForcedRequestConfig(),
      headers: {
        ...getForcedRequestConfig().headers,
        ...(forceRefresh ? forceRefreshHeaders : {})
      }
    };
    
    const params = new URLSearchParams();
    params.append('vehicle_id', vehicleId);
    if (distance > 0) {
      params.append('distance', distance.toString());
    }
    
    const response = await api.get(`/api/airport-fares.php?${params.toString()}`, config);
    return response.data;
  },
  
  // Tour fares
  getTourFares: async (forceRefresh = false) => {
    const config: AxiosRequestConfig = {
      ...getForcedRequestConfig(),
      headers: {
        ...getForcedRequestConfig().headers,
        ...(forceRefresh ? forceRefreshHeaders : {})
      }
    };
    
    const response = await api.get('/api/tour-fares.php', config);
    return response.data;
  }
};

// Booking API
export const bookingAPI = {
  createBooking: async (bookingData: any) => {
    try {
      const response = await api.post('/api/create-booking.php', bookingData);
      return response.data;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  },
  getBookings: async () => {
    try {
      const response = await api.get('/api/get-bookings.php');
      return response.data;
    } catch (error) {
      console.error('Error getting bookings:', error);
      throw error;
    }
  }
};

export default api;
