
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

export const poolingAPI = {
  // Search for available rides
  searchRides: async (searchParams: PoolingSearchRequest): Promise<PoolingRide[]> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/pooling/search`, {
        params: searchParams,
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data.rides || [];
    } catch (error) {
      console.error('Error searching rides:', error);
      throw error;
    }
  },

  // Get ride details
  getRideDetails: async (rideId: number): Promise<PoolingRide> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/pooling/rides/${rideId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching ride details:', error);
      throw error;
    }
  },

  // Create a new ride
  createRide: async (rideData: CreateRideRequest): Promise<PoolingRide> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/pooling/rides`, rideData, {
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating ride:', error);
      throw error;
    }
  },

  // Book a ride
  bookRide: async (bookingData: Omit<PoolingBooking, 'id' | 'bookingDate'>): Promise<PoolingBooking> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/pooling/bookings`, bookingData, {
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data;
    } catch (error) {
      console.error('Error booking ride:', error);
      throw error;
    }
  },

  // Get user's pooling bookings
  getUserBookings: async (userId: number): Promise<PoolingBooking[]> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/pooling/bookings/user/${userId}`);
      return response.data.bookings || [];
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      throw error;
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
      throw error;
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
      throw error;
    }
  },

  // Cancel booking
  cancelBooking: async (bookingId: number): Promise<void> => {
    try {
      await axios.post(`${API_BASE_URL}/api/pooling/bookings/${bookingId}/cancel`);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  }
};
