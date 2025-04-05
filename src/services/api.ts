
import axios from 'axios';
import { isPreviewMode } from '@/utils/apiHelper';

// Base API URL
const API_URL = '/api';

// Authentication API
export const authAPI = {
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },
  
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
  
  getToken: () => {
    return localStorage.getItem('token') || '';
  },
  
  login: async (email: string, password: string) => {
    try {
      if (isPreviewMode()) {
        console.log('[PREVIEW MODE] Simulating login:', { email });
        localStorage.setItem('token', 'demo-token');
        localStorage.setItem('user', JSON.stringify({ 
          id: '1', 
          name: 'Demo User', 
          email, 
          role: 'admin' 
        }));
        return { success: true, user: { id: '1', name: 'Demo User', email, role: 'admin' } };
      }
      
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  signup: async (userData: any) => {
    try {
      if (isPreviewMode()) {
        console.log('[PREVIEW MODE] Simulating signup:', userData);
        localStorage.setItem('token', 'demo-token');
        localStorage.setItem('user', JSON.stringify({ 
          id: '1', 
          name: userData.name, 
          email: userData.email, 
          role: 'user' 
        }));
        return { success: true, user: { id: '1', name: userData.name, email: userData.email, role: 'user' } };
      }
      
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  // Add missing methods for user management
  isAdmin: () => {
    const user = authAPI.getCurrentUser();
    return user && user.role === 'admin';
  },
  
  getAllUsers: async () => {
    try {
      if (isPreviewMode()) {
        return [
          { id: '1', name: 'Admin User', email: 'admin@example.com', role: 'admin' },
          { id: '2', name: 'Regular User', email: 'user@example.com', role: 'user' },
          { id: '3', name: 'Driver User', email: 'driver@example.com', role: 'driver' }
        ];
      }
      
      const response = await axios.get(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${authAPI.getToken()}` }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  updateUserRole: async (userId: string, role: string) => {
    try {
      if (isPreviewMode()) {
        console.log('[PREVIEW MODE] Simulating user role update:', { userId, role });
        return { success: true, message: 'User role updated successfully' };
      }
      
      const response = await axios.put(
        `${API_URL}/admin/users/${userId}/role`, 
        { role },
        { headers: { Authorization: `Bearer ${authAPI.getToken()}` } }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Booking API
export const bookingAPI = {
  createBooking: async (bookingData: any) => {
    try {
      if (isPreviewMode()) {
        console.log('[PREVIEW MODE] Simulating booking creation:', bookingData);
        return { 
          success: true, 
          booking: { 
            id: Math.floor(Math.random() * 10000).toString(),
            ...bookingData, 
            status: 'pending',
            created_at: new Date().toISOString()
          } 
        };
      }
      
      const response = await axios.post(
        `${API_URL}/bookings`, 
        bookingData,
        { headers: { Authorization: `Bearer ${authAPI.getToken()}` } }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getUserBookings: async () => {
    try {
      if (isPreviewMode()) {
        return [
          { 
            id: '1', 
            pickup: 'Airport', 
            dropoff: 'City Center', 
            date: new Date().toISOString(),
            vehicle: 'Sedan',
            status: 'completed',
            amount: 1200,
            user_id: '1'
          },
          { 
            id: '2', 
            pickup: 'Hotel', 
            dropoff: 'Shopping Mall', 
            date: new Date(Date.now() + 86400000).toISOString(),
            vehicle: 'SUV',
            status: 'pending',
            amount: 800,
            user_id: '1'
          }
        ];
      }
      
      const response = await axios.get(
        `${API_URL}/user/bookings`,
        { headers: { Authorization: `Bearer ${authAPI.getToken()}` } }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getBookingDetails: async (bookingId: string | number) => {
    try {
      if (isPreviewMode()) {
        console.log('[PREVIEW MODE] Simulating booking details fetch:', bookingId);
        return { 
          id: bookingId, 
          pickup: 'Sample Pickup', 
          dropoff: 'Sample Dropoff',
          date: new Date().toISOString(),
          vehicle: 'Sedan',
          status: 'pending',
          amount: 1000,
          user_id: '1',
          user: { name: 'Demo User', phone: '1234567890' }
        };
      }
      
      const response = await axios.get(
        `${API_URL}/bookings/${bookingId}`,
        { headers: { Authorization: `Bearer ${authAPI.getToken()}` } }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  cancelBooking: async (bookingId: string | number) => {
    try {
      if (isPreviewMode()) {
        console.log('[PREVIEW MODE] Simulating booking cancellation:', bookingId);
        return { success: true, message: 'Booking cancelled successfully' };
      }
      
      const response = await axios.put(
        `${API_URL}/bookings/${bookingId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${authAPI.getToken()}` } }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getAdminDashboardMetrics: async (period: 'today' | 'week' | 'month' = 'today', status?: string) => {
    try {
      if (isPreviewMode()) {
        return {
          bookings: {
            total: 45,
            pending: 12,
            confirmed: 18,
            completed: 10,
            cancelled: 5
          },
          revenue: {
            total: 28500,
            today: 4500,
            weekly: 18500,
            monthly: 28500
          },
          popular: {
            vehicles: ['Sedan', 'SUV', 'Luxury'],
            routes: ['Airport - City', 'Hotel - Mall', 'City - Beach']
          },
          recent: [
            { 
              id: '1', 
              pickup: 'Airport', 
              dropoff: 'City Center', 
              date: new Date().toISOString(),
              vehicle: 'Sedan',
              status: 'completed',
              amount: 1200,
              user_id: '1',
              user: { name: 'User 1' }
            },
            { 
              id: '2', 
              pickup: 'Hotel', 
              dropoff: 'Shopping Mall', 
              date: new Date(Date.now() - 3600000).toISOString(),
              vehicle: 'SUV',
              status: 'pending',
              amount: 800,
              user_id: '2',
              user: { name: 'User 2' }
            }
          ]
        };
      }
      
      let url = `${API_URL}/admin/dashboard/metrics?period=${period}`;
      if (status) {
        url += `&status=${status}`;
      }
      
      const response = await axios.get(
        url,
        { headers: { Authorization: `Bearer ${authAPI.getToken()}` } }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Add missing methods for booking management
  getAllBookings: async () => {
    try {
      if (isPreviewMode()) {
        return [
          { 
            id: '1', 
            pickup: 'Airport', 
            dropoff: 'City Center', 
            date: new Date().toISOString(),
            vehicle: 'Sedan',
            status: 'completed',
            amount: 1200,
            user_id: '1',
            user: { name: 'User 1' }
          },
          { 
            id: '2', 
            pickup: 'Hotel', 
            dropoff: 'Shopping Mall', 
            date: new Date(Date.now() - 3600000).toISOString(),
            vehicle: 'SUV',
            status: 'pending',
            amount: 800,
            user_id: '2',
            user: { name: 'User 2' }
          }
        ];
      }
      
      const response = await axios.get(
        `${API_URL}/admin/bookings`,
        { headers: { Authorization: `Bearer ${authAPI.getToken()}` } }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  updateBooking: async (bookingId: string | number, bookingData: any) => {
    try {
      if (isPreviewMode()) {
        console.log('[PREVIEW MODE] Simulating booking update:', { bookingId, bookingData });
        return { 
          success: true, 
          booking: { 
            id: bookingId,
            ...bookingData,
            updated_at: new Date().toISOString()
          } 
        };
      }
      
      const response = await axios.put(
        `${API_URL}/bookings/${bookingId}`,
        bookingData,
        { headers: { Authorization: `Bearer ${authAPI.getToken()}` } }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  updateBookingStatus: async (bookingId: string | number, status: string) => {
    try {
      if (isPreviewMode()) {
        console.log('[PREVIEW MODE] Simulating booking status update:', { bookingId, status });
        return { 
          success: true, 
          message: `Booking status updated to ${status}` 
        };
      }
      
      const response = await axios.put(
        `${API_URL}/bookings/${bookingId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${authAPI.getToken()}` } }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  deleteBooking: async (bookingId: string | number) => {
    try {
      if (isPreviewMode()) {
        console.log('[PREVIEW MODE] Simulating booking deletion:', bookingId);
        return { 
          success: true, 
          message: 'Booking deleted successfully' 
        };
      }
      
      const response = await axios.delete(
        `${API_URL}/bookings/${bookingId}`,
        { headers: { Authorization: `Bearer ${authAPI.getToken()}` } }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getBookingById: async (bookingId: string | number) => {
    try {
      if (isPreviewMode()) {
        console.log('[PREVIEW MODE] Simulating booking fetch by ID:', bookingId);
        return { 
          id: bookingId, 
          pickup: 'Sample Pickup', 
          dropoff: 'Sample Dropoff',
          date: new Date().toISOString(),
          vehicle: 'Sedan',
          status: 'pending',
          amount: 1000,
          user_id: '1',
          user: { name: 'Demo User', phone: '1234567890' }
        };
      }
      
      const response = await axios.get(
        `${API_URL}/admin/bookings/${bookingId}`,
        { headers: { Authorization: `Bearer ${authAPI.getToken()}` } }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Fare API
export const fareAPI = {
  getTourFares: async () => {
    try {
      if (isPreviewMode()) {
        return [
          {
            tourId: 'araku_valley',
            sedan: 6000,
            ertiga: 7500,
            innova: 9000
          },
          {
            tourId: 'yarada_beach',
            sedan: 2500,
            ertiga: 3500,
            innova: 4500
          },
          {
            tourId: 'rushikonda',
            sedan: 2000,
            ertiga: 3000,
            innova: 4000
          }
        ];
      }
      
      const response = await axios.get(`${API_URL}/fares/tours`);
      return response.data;
    } catch (error) {
      console.error('Error fetching tour fares:', error);
      return [];
    }
  },
  
  updateTourFare: async (fareData: any) => {
    try {
      if (isPreviewMode()) {
        console.log('[PREVIEW MODE] Simulating tour fare update:', fareData);
        return { success: true, message: 'Tour fare updated successfully' };
      }
      
      const response = await axios.put(
        `${API_URL}/admin/fares/tours/${fareData.tourId}`,
        fareData,
        { headers: { Authorization: `Bearer ${authAPI.getToken()}` } }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getVehiclePricing: async () => {
    try {
      if (isPreviewMode()) {
        return [
          {
            vehicleId: 'sedan',
            basePrice: 2500,
            pricePerKm: 14,
            nightHaltCharge: 700,
            driverAllowance: 250,
            isActive: true
          },
          {
            vehicleId: 'ertiga',
            basePrice: 3200,
            pricePerKm: 18,
            nightHaltCharge: 1000,
            driverAllowance: 250,
            isActive: true
          },
          {
            vehicleId: 'innova_crysta',
            basePrice: 3800,
            pricePerKm: 20,
            nightHaltCharge: 1000,
            driverAllowance: 250,
            isActive: true
          }
        ];
      }
      
      const response = await axios.get(`${API_URL}/admin/vehicle-pricing`);
      return response.data;
    } catch (error) {
      console.error('Error fetching vehicle pricing:', error);
      return [];
    }
  },
  
  updateVehiclePricing: async (pricingData: any) => {
    try {
      if (isPreviewMode()) {
        console.log('[PREVIEW MODE] Simulating vehicle pricing update:', pricingData);
        return { success: true, message: 'Vehicle pricing updated successfully' };
      }
      
      const response = await axios.put(
        `${API_URL}/admin/vehicle-pricing/${pricingData.vehicleId}`,
        pricingData,
        { headers: { Authorization: `Bearer ${authAPI.getToken()}` } }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Additional methods for tour fare management
  addTourFare: async (fareData: any) => {
    try {
      if (isPreviewMode()) {
        console.log('[PREVIEW MODE] Simulating tour fare addition:', fareData);
        return { success: true, message: 'Tour fare added successfully' };
      }
      
      const response = await axios.post(
        `${API_URL}/admin/fares/tours`,
        fareData,
        { headers: { Authorization: `Bearer ${authAPI.getToken()}` } }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  deleteTourFare: async (tourId: string) => {
    try {
      if (isPreviewMode()) {
        console.log('[PREVIEW MODE] Simulating tour fare deletion:', tourId);
        return { success: true, message: 'Tour fare deleted successfully' };
      }
      
      const response = await axios.delete(
        `${API_URL}/admin/fares/tours/${tourId}`,
        { headers: { Authorization: `Bearer ${authAPI.getToken()}` } }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default {
  authAPI,
  bookingAPI,
  fareAPI
};
