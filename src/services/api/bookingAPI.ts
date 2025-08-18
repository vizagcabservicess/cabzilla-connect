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
    
    // Add authorization token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Use only the absolute URL to avoid caching issues
    try {
      console.log('Fetching with API_BASE_URL...');
      const response = await axios.get(`${API_BASE_URL}/api/admin/bookings.php`, {
        headers,
        timeout: 15000 // Extended timeout
      });
      
      // Check if the response has bookings array
      if (response.data && Array.isArray(response.data.bookings)) {
        console.log('Success with API_BASE_URL (bookings property):', response.data.bookings.length);
        return response.data.bookings;
      } else if (Array.isArray(response.data)) {
        console.log('Success with API_BASE_URL (array):', response.data.length);
        return response.data;
      } else {
        console.error('Unexpected bookings response format:', response.data);
        throw new Error('Invalid response format from API');
      }
    } catch (error) {
      console.error('Fetch failed:', error);
      throw error;
    }
  },
  
  /**
   * Get user bookings with authentication
   */
  getUserBookings: async (userId: number) => {
    try {
      const headers = {
        'Cache-Control': 'no-cache',
        'X-Force-Refresh': 'true',
        'Content-Type': 'application/json'
      };
      
      // Add authorization token if available
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
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
      // Use the public endpoint instead of admin endpoint
      const response = await axios.get(`${API_BASE_URL}/api/user/booking.php?id=${id}`, {
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      // Check if the response indicates an error
      if (response.data && response.data.status === 'error') {
        throw new Error(response.data.message || 'Failed to fetch booking');
      }
      
      // Return the booking data from the data property
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching booking with id ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Create a new booking with authentication
   */
  createBooking: async (bookingData: BookingRequest) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // Add authorization token if available for authenticated users
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await axios.post(`${API_BASE_URL}/api/admin/bookings.php`, bookingData, {
        headers,
      });
      
      // Note: Email confirmation is now sent only after successful payment verification
      // This prevents sending confirmation emails for failed payments
      
      return response.data;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  },

  /**
   * Send booking confirmation email with payment details
   */
  sendBookingConfirmationEmail: async (bookingId: number | string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/send-booking-confirmation.php`, {
        booking_id: bookingId
      });
      return response.data;
    } catch (error) {
      console.error('Error sending booking confirmation email:', error);
      throw error;
    }
  },

  /**
   * Verify Razorpay payment and trigger email sending
   */
  verifyPayment: async (paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    booking_id: number | string;
    amount?: number;
  }) => {
    try {
      console.log('Verifying payment with data:', paymentData);
      
      // Try direct path first
      try {
        const response = await axios.post(`/api/verify-razorpay-payment.php`, paymentData, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });
        console.log('Payment verification successful:', response.data);
        return response.data;
      } catch (directError) {
        console.warn('Direct payment verification failed:', directError);
        
        // Try with API_BASE_URL
        const response = await axios.post(`${API_BASE_URL}/api/verify-razorpay-payment.php`, paymentData, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });
        console.log('Payment verification successful with API_BASE_URL:', response.data);
        return response.data;
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  },
  
  /**
   * Update booking status
   */
  updateBookingStatus: async (bookingId: number | string, status: BookingStatus) => {
    try {
      const payload = { bookingId: bookingId, status };
      const headers = { 'Content-Type': 'application/json' };
      // Try non-admin endpoint first
      try {
        const r1 = await axios.post(`/api/update-booking.php`, payload, { headers });
        return r1.data;
      } catch (e1) {
        // Fallback to admin endpoint
        const r2 = await axios.post(`${API_BASE_URL}/api/admin/update-booking.php`, payload, { headers });
        return r2.data;
      }
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
      const headers = { 'Content-Type': 'application/json' };
      const payload = { bookingId: bookingId, ...data } as any;
      // Try non-admin endpoint first
      try {
        const r1 = await axios.post(`/api/update-booking.php`, payload, { headers });
        return r1.data;
      } catch (e1) {
        // Fallback to admin endpoint
        const r2 = await axios.post(`${API_BASE_URL}/api/admin/update-booking.php`, payload, { headers });
        return r2.data;
      }
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
        `${API_BASE_URL}/api/admin/cancel-booking.php`,
        { bookingId: bookingId },
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
        `${API_BASE_URL}/api/admin/delete-booking.php`,
        { bookingId: bookingId },
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
