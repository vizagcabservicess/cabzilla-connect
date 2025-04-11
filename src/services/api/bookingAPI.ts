
import axios from 'axios';
import { getApiUrl, getAuthorizationHeader } from '@/config/api';

// BookingAPI interface
export const bookingAPI = {
  // Get a booking by ID
  getBooking: async (bookingId: number) => {
    try {
      const response = await axios.get(getApiUrl(`/api/bookings/${bookingId}`), {
        headers: {
          ...getAuthorizationHeader()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting booking:', error);
      throw error;
    }
  },

  // Create a new booking
  createBooking: async (bookingData: any) => {
    try {
      const response = await axios.post(getApiUrl('/api/bookings'), bookingData, {
        headers: {
          ...getAuthorizationHeader()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  },

  // Update an existing booking
  updateBooking: async (bookingId: number, updateData: any) => {
    try {
      const response = await axios.put(getApiUrl(`/api/bookings/${bookingId}`), updateData, {
        headers: {
          ...getAuthorizationHeader()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating booking:', error);
      throw error;
    }
  },

  // Delete a booking
  deleteBooking: async (bookingId: number) => {
    try {
      const response = await axios.delete(getApiUrl(`/api/bookings/${bookingId}`), {
        headers: {
          ...getAuthorizationHeader()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting booking:', error);
      throw error;
    }
  },

  // Get all bookings (with optional filters)
  getBookings: async (filters?: any) => {
    try {
      const response = await axios.get(getApiUrl('/api/bookings'), {
        params: filters,
        headers: {
          ...getAuthorizationHeader()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting bookings:', error);
      throw error;
    }
  },

  // Additional methods needed by other components
  getBookingById: async (bookingId: number) => {
    return bookingAPI.getBooking(bookingId);
  },

  updateBookingStatus: async (bookingId: number, status: string) => {
    return bookingAPI.updateBooking(bookingId, { status });
  },

  getUserBookings: async () => {
    return bookingAPI.getBookings({ userId: 'current' });
  },

  getAllBookings: async () => {
    return bookingAPI.getBookings();
  },

  getAdminDashboardMetrics: async (period?: string) => {
    try {
      const url = period 
        ? getApiUrl(`/api/admin/dashboard-metrics.php?period=${period}`)
        : getApiUrl('/api/admin/dashboard-metrics.php');
        
      const response = await axios.get(url, {
        headers: {
          ...getAuthorizationHeader()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting admin dashboard metrics:', error);
      throw error;
    }
  }
};

export default bookingAPI;
