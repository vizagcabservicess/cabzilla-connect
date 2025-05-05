
import axios from 'axios';
import { API_BASE_URL } from '@/config';
import { BookingRequest, BookingStatus, Booking } from '@/types/api';

export const bookingAPI = {
  /**
   * Get all bookings
   */
  getAllBookings: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/bookings.php`, {
        headers: {
          'Cache-Control': 'no-cache',
          'X-Force-Refresh': 'true'
        },
        timeout: 15000 // Extended timeout to allow for slower DB connections
      });
      
      // Check if the response has bookings array
      if (response.data && Array.isArray(response.data.bookings)) {
        return response.data.bookings;
      } else if (Array.isArray(response.data)) {
        return response.data;
      } else {
        console.error('Unexpected bookings response format:', response.data);
        throw new Error('Invalid response format from API');
      }
    } catch (error) {
      console.error('Error fetching all bookings:', error);
      throw error; // Let the calling code handle the error
    }
  },
  
  /**
   * Get user bookings
   */
  getUserBookings: async (userId: number) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/user/bookings.php?user_id=${userId}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'X-Force-Refresh': 'true'
        },
        timeout: 15000 // Extended timeout
      });
      
      // Check if the response has bookings array
      if (response.data && Array.isArray(response.data.bookings)) {
        return response.data.bookings;
      } else if (Array.isArray(response.data)) {
        return response.data;
      } else {
        console.error('Unexpected user bookings response format:', response.data);
        throw new Error('Invalid response format from API');
      }
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      throw error; // Let the calling code handle the error
    }
  },

  /**
   * Get booking by ID
   */
  getBookingById: async (id: number | string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/booking-details.php?id=${id}`, {
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching booking with id ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Create a new booking
   */
  createBooking: async (bookingData: BookingRequest) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/bookings.php`, bookingData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  },
  
  /**
   * Update booking status
   */
  updateBookingStatus: async (bookingId: number | string, status: BookingStatus) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/update-booking-status.php`,
        { booking_id: bookingId, status },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  },
  
  /**
   * Update booking
   */
  updateBooking: async (bookingId: number | string, data: Partial<Booking>) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/update-booking.php`,
        { booking_id: bookingId, ...data },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating booking:', error);
      throw error;
    }
  },
  
  /**
   * Cancel booking
   */
  cancelBooking: async (bookingId: number | string) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/cancel-booking.php`,
        { booking_id: bookingId },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  },

  /**
   * Delete booking
   */
  deleteBooking: async (bookingId: number | string) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/delete-booking.php`,
        { booking_id: bookingId },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting booking:', error);
      throw error;
    }
  },

  /**
   * Get admin dashboard metrics
   */
  getAdminDashboardMetrics: async (period: string, options = {}) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/dashboard-metrics.php?period=${period}`, {
        params: options
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching admin dashboard metrics:', error);
      throw error;
    }
  },

  /**
   * Assign driver to booking
   */
  assignDriver: async (bookingId: number | string, driverDetails: { 
    driverName: string; 
    driverPhone: string; 
    vehicleNumber: string;
  }) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/assign-driver.php`,
        { 
          booking_id: bookingId, 
          ...driverDetails
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error assigning driver to booking:', error);
      throw error;
    }
  },
  
  /**
   * Get pending bookings that need assignment
   */
  getPendingBookings: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/pending-bookings.php`, {
        headers: {
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache'
        },
        timeout: 15000 // Extended timeout
      });
      
      // Check if the response has bookings array
      if (response.data && Array.isArray(response.data.bookings)) {
        return response.data.bookings;
      } else if (Array.isArray(response.data)) {
        return response.data;
      } else {
        console.error('Unexpected pending bookings response format:', response.data);
        throw new Error('Invalid response format from API');
      }
    } catch (error) {
      console.error('Error fetching pending bookings:', error);
      throw error; // Let the calling code handle the error
    }
  }
};
