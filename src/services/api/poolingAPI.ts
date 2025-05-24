
import axios from 'axios';
import { API_BASE_URL } from '@/config';
import { 
  PoolingRide, 
  BusRoute, 
  PoolingBooking, 
  PoolingSearchRequest, 
  CreateRideRequest,
  BusSchedule 
} from '@/types/pooling';
import { mockPoolingAPI } from './mockPoolingAPI';

const USE_MOCK_API = true; // Set to false when real API is available

export const poolingAPI = {
  // Search for available rides
  searchRides: async (searchParams: PoolingSearchRequest): Promise<PoolingRide[]> => {
    if (USE_MOCK_API) {
      return mockPoolingAPI.searchRides(searchParams);
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/pooling/search`, {
        params: searchParams,
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data.rides || [];
    } catch (error) {
      console.error('Error searching rides:', error);
      // Fallback to mock API
      return mockPoolingAPI.searchRides(searchParams);
    }
  },

  // Get ride details
  getRideDetails: async (rideId: number): Promise<PoolingRide> => {
    if (USE_MOCK_API) {
      return mockPoolingAPI.getRideDetails(rideId);
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/pooling/rides/${rideId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching ride details:', error);
      // Fallback to mock API
      return mockPoolingAPI.getRideDetails(rideId);
    }
  },

  // Create a new ride
  createRide: async (rideData: CreateRideRequest): Promise<PoolingRide> => {
    if (USE_MOCK_API) {
      return mockPoolingAPI.createRide(rideData);
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/pooling/rides`, rideData, {
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating ride:', error);
      // Fallback to mock API
      return mockPoolingAPI.createRide(rideData);
    }
  },

  // Book a ride
  bookRide: async (bookingData: Omit<PoolingBooking, 'id' | 'bookingDate'>): Promise<PoolingBooking> => {
    if (USE_MOCK_API) {
      return mockPoolingAPI.bookRide(bookingData);
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/pooling/bookings`, bookingData, {
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data;
    } catch (error) {
      console.error('Error booking ride:', error);
      // Fallback to mock API
      return mockPoolingAPI.bookRide(bookingData);
    }
  },

  // Get user's pooling bookings
  getUserBookings: async (userId: number): Promise<PoolingBooking[]> => {
    if (USE_MOCK_API) {
      return mockPoolingAPI.getUserBookings(userId);
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/pooling/bookings/user/${userId}`);
      return response.data.bookings || [];
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      return [];
    }
  },

  // Get bus routes
  getBusRoutes: async (from?: string, to?: string): Promise<BusRoute[]> => {
    try {
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      
      const response = await axios.get(`${API_BASE_URL}/api/pooling/bus-routes?${params}`);
      return response.data.routes || [];
    } catch (error) {
      console.error('Error fetching bus routes:', error);
      return [];
    }
  },

  // Get bus schedules for a route
  getBusSchedules: async (routeId: number, date: string): Promise<BusSchedule[]> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/pooling/bus-routes/${routeId}/schedules`, {
        params: { date }
      });
      return response.data.schedules || [];
    } catch (error) {
      console.error('Error fetching bus schedules:', error);
      return [];
    }
  },

  // Cancel booking
  cancelBooking: async (bookingId: number): Promise<void> => {
    if (USE_MOCK_API) {
      return mockPoolingAPI.cancelBooking(bookingId);
    }

    try {
      await axios.post(`${API_BASE_URL}/api/pooling/bookings/${bookingId}/cancel`);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  }
};
