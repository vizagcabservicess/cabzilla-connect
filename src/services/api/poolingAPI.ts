
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
import { realPoolingAPI } from './realPoolingAPI';

// Set to false to use real APIs
const USE_MOCK_API = false;

export const poolingAPI = {
  // Search for available rides
  searchRides: async (searchParams: PoolingSearchRequest): Promise<PoolingRide[]> => {
    return realPoolingAPI.searchRides(searchParams);
  },

  // Get ride details
  getRideDetails: async (rideId: number): Promise<PoolingRide> => {
    return realPoolingAPI.getRideDetails(rideId);
  },

  // Create a new ride
  createRide: async (rideData: CreateRideRequest): Promise<PoolingRide> => {
    return realPoolingAPI.createRide(rideData);
  },

  // Book a ride
  bookRide: async (bookingData: Omit<PoolingBooking, 'id' | 'bookingDate'>): Promise<PoolingBooking> => {
    return realPoolingAPI.bookRide(bookingData);
  },

  // Get user's pooling bookings
  getUserBookings: async (userId: number): Promise<PoolingBooking[]> => {
    return realPoolingAPI.getUserBookings(userId);
  },

  // Create payment order
  createPaymentOrder: async (bookingId: number): Promise<any> => {
    return realPoolingAPI.createPaymentOrder(bookingId);
  },

  // Verify payment
  verifyPayment: async (paymentData: any): Promise<void> => {
    return realPoolingAPI.verifyPayment(paymentData);
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
    return realPoolingAPI.cancelBooking(bookingId);
  }
};
