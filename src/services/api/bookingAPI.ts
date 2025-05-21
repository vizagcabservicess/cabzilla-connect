import axios from 'axios';
import { API_BASE_URL } from '@/config';
import { BookingRequest, BookingStatus, Booking } from '@/types/api';

// Helper function to create API URLs that work in both development and production
const createApiUrl = (path) => {
  // Try without base URL first (relative path)
  // This helps when the app is deployed at the same domain as the API
  return path.startsWith('/') ? path : `/${path}`;
};

export const bookingAPI = {
  /**
   * Get all bookings
   */
  getAllBookings: async () => {
    console.log('Fetching all bookings...');
    const headers = {
      'Cache-Control': 'no-cache',
      'X-Force-Refresh': 'true',
      'Content-Type': 'application/json'
    };
    
    // First try direct fetch without any domain prefix
    try {
      console.log('Direct fetch attempt...');
      const response = await axios.get(`/api/admin/bookings.php`, {
        headers,
        timeout: 15000 // Extended timeout to allow for slower DB connections
      });
      
      // Check if the response has bookings array
      if (response.data && Array.isArray(response.data.bookings)) {
        console.log('Success with direct fetch (bookings property):', response.data.bookings.length);
        return response.data.bookings;
      } else if (Array.isArray(response.data)) {
        console.log('Success with direct fetch (array):', response.data.length);
        return response.data;
      } else {
        console.error('Unexpected bookings response format:', response.data);
        throw new Error('Invalid response format from API');
      }
    } catch (directError) {
      console.warn('Direct fetch failed:', directError);
      
      // Try with API_BASE_URL
      try {
        console.log('Trying with API_BASE_URL...');
        const response = await axios.get(`${API_BASE_URL}/api/admin/bookings.php`, {
          headers,
          timeout: 15000 // Extended timeout
        });
        
        if (response.data && Array.isArray(response.data.bookings)) {
          console.log('Success with API_BASE_URL (bookings property):', response.data.bookings.length);
          return response.data.bookings;
        } else if (Array.isArray(response.data)) {
          console.log('Success with API_BASE_URL (array):', response.data.length);
          return response.data;
        } else {
          console.error('Unexpected bookings response format with API_BASE_URL:', response.data);
          throw new Error('Invalid response format from API with API_BASE_URL');
        }
      } catch (baseUrlError) {
        console.error('Both fetch attempts failed:', directError, baseUrlError);
        throw directError; // Throw the original error
      }
    }
  },
  
  /**
   * Get user bookings
   */
  getUserBookings: async (userId: number) => {
    try {
      const headers = {
        'Cache-Control': 'no-cache',
        'X-Force-Refresh': 'true',
        'Content-Type': 'application/json'
      };
      
      // First try direct path
      try {
        const response = await axios.get(`/api/user/bookings.php?user_id=${userId}`, {
          headers,
          timeout: 15000
        });
        
        if (response.data && Array.isArray(response.data.bookings)) {
          return response.data.bookings;
        } else if (Array.isArray(response.data)) {
          return response.data;
        } else {
          throw new Error('Invalid response format from API');
        }
      } catch (directError) {
        // Try with API_BASE_URL
        const response = await axios.get(`${API_BASE_URL}/api/user/bookings.php?user_id=${userId}`, {
          headers,
          timeout: 15000
        });
        
        if (response.data && Array.isArray(response.data.bookings)) {
          return response.data.bookings;
        } else if (Array.isArray(response.data)) {
          return response.data;
        } else {
          throw new Error('Invalid response format from API');
        }
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
      const response = await axios.get(`${API_BASE_URL}/api/admin/bookings.php?id=${id}`, {
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      // PATCH: Handle different response formats
      if (response.data && Array.isArray(response.data.bookings) && response.data.bookings.length > 0) {
        return response.data.bookings[0];
      }
      if (response.data && response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        return response.data.data[0];
      }
      if (response.data && response.data.data) {
        return response.data.data;
      }
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
      const response = await axios.post(`${API_BASE_URL}/api/admin/bookings.php`, bookingData, {
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
    id?: string | number;
    driverId?: string | number;
  }) => {
    try {
      const driverId = driverDetails.driverId || driverDetails.id;
      const payload = {
        bookingId,
        driverId,
        driverName: driverDetails.driverName,
        driverPhone: driverDetails.driverPhone,
        vehicleNumber: driverDetails.vehicleNumber
      };
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/assign-driver.php`,
        payload,
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
      const headers = {
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json'
      };
      
      // Try direct path first
      try {
        const response = await axios.get(`/api/admin/pending-bookings.php`, {
          headers,
          timeout: 15000
        });
        
        // Check if the response has bookings array
        if (response.data && Array.isArray(response.data.bookings)) {
          return response.data.bookings;
        } else if (Array.isArray(response.data)) {
          return response.data;
        } else {
          throw new Error('Invalid response format from API');
        }
      } catch (directError) {
        // Try with API_BASE_URL
        const response = await axios.get(`${API_BASE_URL}/api/admin/pending-bookings.php`, {
          headers,
          timeout: 15000
        });
        
        // Check if the response has bookings array
        if (response.data && Array.isArray(response.data.bookings)) {
          return response.data.bookings;
        } else if (Array.isArray(response.data)) {
          return response.data;
        } else {
          throw new Error('Invalid response format from API');
        }
      }
    } catch (error) {
      console.error('Error fetching pending bookings:', error);
      throw error; // Let the calling code handle the error
    }
  }
};
