
import axios from 'axios';
import { API_BASE_URL } from '@/config';
import { Booking, BookingStatus, BookingRequest } from '@/types/api';
import { toast } from 'sonner';

// Helper function to generate cache busting parameters
const generateCacheBuster = () => {
  return `_t=${Date.now()}&_cb=${Math.random().toString(36).substring(2, 15)}`;
};

export const bookingAPI = {
  /**
   * Fetch all bookings for admin dashboard
   */
  getAllBookings: async () => {
    try {
      console.log('Fetching all bookings via API...');
      
      // Try multiple endpoints to increase reliability
      const endpoints = [
        `${API_BASE_URL}/api/admin/direct-booking-data.php?${generateCacheBuster()}`,
        `${API_BASE_URL}/api/admin/bookings.php?${generateCacheBuster()}`,
        `${API_BASE_URL}/api/bookings-data.php?${generateCacheBuster()}`
      ];
      
      // Try each endpoint in sequence
      for (const endpoint of endpoints) {
        try {
          console.log(`Attempting to fetch bookings from: ${endpoint}`);
          
          const response = await axios.get(endpoint, {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'X-Force-Refresh': 'true'
            },
            timeout: 8000 // 8 second timeout
          });
          
          if (response.status === 200) {
            console.log(`Successfully fetched from ${endpoint}`);
            
            // Check response format
            if (response.data && Array.isArray(response.data)) {
              return response.data;
            }
            
            if (response.data && response.data.bookings && Array.isArray(response.data.bookings)) {
              return response.data.bookings;
            }
            
            if (response.data && response.data.data && Array.isArray(response.data.data)) {
              return response.data.data;
            }
            
            console.warn(`Unexpected response format from ${endpoint}:`, response.data);
          }
        } catch (error) {
          console.warn(`Failed to fetch from ${endpoint}:`, error);
          // Continue to the next endpoint
        }
      }
      
      // If all API attempts fail, try a direct fetch with fetch API as backup method
      console.log('All axios attempts failed, trying direct fetch API...');
      
      const directEndpoint = `${API_BASE_URL}/api/admin/direct-booking-data.php?${generateCacheBuster()}`;
      const response = await fetch(directEndpoint, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (Array.isArray(data)) {
          console.log('Successfully fetched bookings via direct fetch API');
          return data;
        }
        
        if (data && data.bookings && Array.isArray(data.bookings)) {
          console.log('Successfully fetched bookings via direct fetch API (bookings property)');
          return data.bookings;
        }
        
        if (data && data.data && Array.isArray(data.data)) {
          console.log('Successfully fetched bookings via direct fetch API (data property)');
          return data.data;
        }
      }
      
      // If we still haven't returned, throw an error to trigger the fallback
      throw new Error('Failed to fetch bookings from all endpoints');
      
    } catch (error) {
      console.error('Error in getAllBookings:', error);
      throw error;
    }
  },
  
  /**
   * Get booking by ID
   * @param id Booking ID
   */
  getBookingById: async (id: number | string) => {
    try {
      console.log(`Fetching booking ${id}...`);
      
      // Try to fetch from multiple endpoints for reliability
      const endpoints = [
        `${API_BASE_URL}/api/admin/booking/${id}?${generateCacheBuster()}`,
        `${API_BASE_URL}/api/admin/booking.php?id=${id}&${generateCacheBuster()}`,
        `${API_BASE_URL}/api/booking-details.php?id=${id}&${generateCacheBuster()}`
      ];
      
      // Try each endpoint in sequence
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'X-Force-Refresh': 'true'
            },
            timeout: 8000
          });
          
          if (response.status === 200) {
            if (response.data && response.data.booking) {
              return response.data.booking;
            }
            
            if (response.data && response.data.data) {
              return response.data.data;
            }
            
            if (response.data && !Array.isArray(response.data)) {
              return response.data;
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch from ${endpoint}:`, error);
          // Continue to the next endpoint
        }
      }
      
      throw new Error(`Booking not found: ${id}`);
    } catch (error) {
      console.error(`Error in getBookingById(${id}):`, error);
      throw error;
    }
  },
  
  /**
   * Update booking status
   * @param bookingId Booking ID
   * @param status New status
   */
  updateBookingStatus: async (bookingId: number | string, status: BookingStatus) => {
    try {
      console.log(`Updating booking ${bookingId} to status: ${status}`);
      
      const response = await axios.post(`${API_BASE_URL}/api/admin/update-booking.php`, {
        bookingId,
        status
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Force-Refresh': 'true',
          'X-Admin-Mode': 'true'
        }
      });
      
      if (response.status === 200) {
        return response.data;
      }
      
      throw new Error(`Failed to update booking status: ${response.statusText}`);
    } catch (error) {
      console.error('Error in updateBookingStatus:', error);
      throw error;
    }
  },
  
  /**
   * Update booking details
   * @param bookingId Booking ID
   * @param data Updated booking data
   */
  updateBooking: async (bookingId: number | string, data: Partial<Booking>) => {
    try {
      console.log(`Updating booking ${bookingId} with data:`, data);
      
      const response = await axios.post(`${API_BASE_URL}/api/admin/update-booking.php`, {
        bookingId,
        ...data
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Force-Refresh': 'true',
          'X-Admin-Mode': 'true'
        }
      });
      
      if (response.status === 200) {
        return response.data;
      }
      
      throw new Error(`Failed to update booking: ${response.statusText}`);
    } catch (error) {
      console.error('Error in updateBooking:', error);
      throw error;
    }
  },
  
  /**
   * Cancel booking
   * @param bookingId Booking ID
   */
  cancelBooking: async (bookingId: number | string) => {
    try {
      return await bookingAPI.updateBookingStatus(bookingId, 'cancelled');
    } catch (error) {
      console.error('Error in cancelBooking:', error);
      throw error;
    }
  },
  
  /**
   * Create a new booking
   * @param bookingData Booking data
   */
  createBooking: async (bookingData: BookingRequest) => {
    try {
      console.log('Creating new booking with data:', bookingData);
      
      const response = await axios.post(`${API_BASE_URL}/api/booking/create.php`, bookingData, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.status === 200 || response.status === 201) {
        return response.data;
      }
      
      throw new Error(`Failed to create booking: ${response.statusText}`);
    } catch (error) {
      console.error('Error in createBooking:', error);
      throw error;
    }
  },
  
  /**
   * Delete a booking
   * @param bookingId Booking ID
   */
  deleteBooking: async (bookingId: number | string) => {
    try {
      console.log(`Deleting booking ${bookingId}`);
      
      const response = await axios.post(`${API_BASE_URL}/api/admin/delete-booking.php`, {
        bookingId
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Force-Refresh': 'true',
          'X-Admin-Mode': 'true'
        }
      });
      
      if (response.status === 200) {
        return response.data;
      }
      
      throw new Error(`Failed to delete booking: ${response.statusText}`);
    } catch (error) {
      console.error('Error in deleteBooking:', error);
      throw error;
    }
  },
  
  /**
   * Get user bookings
   * @param userId User ID
   */
  getUserBookings: async (userId?: number) => {
    try {
      console.log(`Fetching bookings for user ${userId || 'current user'}...`);
      
      const endpoint = userId 
        ? `${API_BASE_URL}/api/user/bookings.php?userId=${userId}&${generateCacheBuster()}`
        : `${API_BASE_URL}/api/user/my-bookings.php?${generateCacheBuster()}`;
      
      const response = await axios.get(endpoint, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        }
      });
      
      if (response.status === 200) {
        if (response.data && Array.isArray(response.data)) {
          return response.data;
        }
        
        if (response.data && response.data.bookings && Array.isArray(response.data.bookings)) {
          return response.data.bookings;
        }
        
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }
        
        return [];
      }
      
      throw new Error(`Failed to fetch user bookings: ${response.statusText}`);
    } catch (error) {
      console.error('Error in getUserBookings:', error);
      throw error;
    }
  },
  
  /**
   * Get admin dashboard metrics
   * @param period Time period for metrics
   */
  getAdminDashboardMetrics: async (period: string, options?: { startDate?: string; endDate?: string }) => {
    try {
      console.log(`Fetching admin dashboard metrics for period: ${period}...`);
      
      let queryParams = `period=${period}&${generateCacheBuster()}`;
      
      if (options?.startDate) {
        queryParams += `&startDate=${options.startDate}`;
      }
      
      if (options?.endDate) {
        queryParams += `&endDate=${options.endDate}`;
      }
      
      const response = await axios.get(`${API_BASE_URL}/api/admin/dashboard-metrics.php?${queryParams}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        }
      });
      
      if (response.status === 200) {
        return response.data.data || response.data;
      }
      
      throw new Error(`Failed to fetch dashboard metrics: ${response.statusText}`);
    } catch (error) {
      console.error('Error in getAdminDashboardMetrics:', error);
      throw error;
    }
  },
  
  /**
   * Assign driver to booking
   * @param bookingId Booking ID
   * @param driverData Driver assignment data
   */
  assignDriver: async (bookingId: number | string, driverData: { 
    driverName: string; 
    driverPhone: string; 
    vehicleNumber: string;
  }) => {
    try {
      console.log(`Assigning driver to booking ${bookingId} with data:`, driverData);
      
      const response = await axios.post(`${API_BASE_URL}/api/admin/update-booking.php`, {
        bookingId,
        ...driverData,
        status: 'assigned'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Force-Refresh': 'true',
          'X-Admin-Mode': 'true'
        }
      });
      
      if (response.status === 200) {
        return response.data;
      }
      
      throw new Error(`Failed to assign driver: ${response.statusText}`);
    } catch (error) {
      console.error('Error in assignDriver:', error);
      throw error;
    }
  }
};
