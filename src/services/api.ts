
import axios from 'axios';
import { BookingRequest, Booking } from '@/types/api';
import { getApiUrl, defaultHeaders, forceRefreshHeaders } from '@/config/api';

const API_URL = '/api';

// Create an axios instance for better control
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Log requests and responses globally
apiClient.interceptors.request.use(
  config => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, { 
      data: config.data,
      params: config.params,
      headers: config.headers
    });
    return config;
  }, 
  error => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  response => {
    console.log(`API Response (${response.status}):`, response.data);
    return response;
  },
  error => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const bookingAPI = {
  getBookings: async (userId?: number) => {
    const response = await apiClient.get(userId ? `/user/bookings?userId=${userId}` : '/bookings');
    return response.data;
  },
  
  getBookingById: async (id: string | number) => {
    const response = await apiClient.get(`/bookings/${id}`);
    return response.data;
  },
  
  createBooking: async (bookingData: BookingRequest): Promise<Booking> => {
    try {
      console.log('Creating booking with data:', bookingData);
      
      // Validate required data before sending
      if (!bookingData.pickupLocation || !bookingData.cabType || !bookingData.pickupDate) {
        throw new Error('Missing required booking information');
      }
      
      const requestBody = JSON.stringify(bookingData);
      console.log('Request body after stringifying:', requestBody);
      
      // Use timeout and more robust fetch configuration
      const response = await fetch(getApiUrl('/api/book.php'), {
        method: 'POST',
        headers: {
          ...defaultHeaders,
          'Content-Type': 'application/json'
        },
        body: requestBody
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error creating booking:', errorText);
        throw new Error(`Failed to create booking: ${response.status} ${response.statusText}`);
      }
      
      // Safer JSON parsing with error handling
      let responseText;
      let result;
      
      try {
        responseText = await response.text();
        console.log('Raw response:', responseText);
        
        // Only attempt parsing if we have actual content
        if (responseText && responseText.trim()) {
          try {
            result = JSON.parse(responseText);
          } catch (parseError) {
            console.error('JSON parse error:', parseError, 'Response text was:', responseText);
            throw new Error('Invalid JSON response from server');
          }
        } else {
          console.error('Empty response received');
          throw new Error('Empty response received from server');
        }
      } catch (textError) {
        console.error('Error reading response text:', textError);
        throw new Error('Failed to read server response');
      }
      
      if (!result) {
        throw new Error('No data returned from server');
      }
      
      console.log('Booking created successfully:', result);
      
      if (result.status === 'error') {
        throw new Error(result.message || 'Failed to create booking');
      }
      
      // Send email confirmation
      try {
        console.log('Sending email confirmation for booking:', result.data);
        
        const emailResponse = await fetch(getApiUrl('/api/send-booking-confirmation.php'), {
          method: 'POST',
          headers: {
            ...defaultHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(result.data)
        });
        
        if (emailResponse.ok) {
          const emailResult = await emailResponse.json();
          console.log('Email confirmation result:', emailResult);
        } else {
          const emailErrorText = await emailResponse.text();
          console.warn('Email confirmation request failed, but booking was created:', emailErrorText);
        }
      } catch (emailError) {
        console.warn('Failed to send booking confirmation email, but booking was created:', emailError);
      }
      
      return result.data;
    } catch (error) {
      console.error('Error in createBooking:', error);
      throw error;
    }
  },
  
  updateBooking: async (id: string | number, data: any) => {
    const response = await apiClient.put(`/update-booking/${id}`, data);
    return response.data;
  },
  
  cancelBooking: async (id: string | number) => {
    const response = await apiClient.put(`/update-booking/${id}`, { status: 'cancelled' });
    return response.data;
  },

  getAllBookings: async () => {
    const response = await apiClient.get('/admin/bookings');
    return response.data;
  },

  getUserBookings: async () => {
    const response = await apiClient.get('/user/bookings');
    return response.data;
  },

  updateBookingStatus: async (id: string | number, status: string) => {
    const response = await apiClient.put(`/update-booking/${id}`, { status });
    return response.data;
  },

  deleteBooking: async (id: string | number) => {
    const response = await apiClient.delete(`/admin/booking/${id}`);
    return response.data;
  },

  getAdminDashboardMetrics: async (period: string) => {
    const response = await apiClient.get(`/admin/dashboard-metrics?period=${period}`);
    return response.data;
  }
};

export const authAPI = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await apiClient.post('/login', credentials);
    return response.data;
  },
  
  signup: async (userData: { name: string; email: string; password: string; phone?: string }) => {
    const response = await apiClient.post('/signup', userData);
    return response.data;
  },
  
  getCurrentUser: async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return null;
    
    try {
      const response = await apiClient.get('/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },

  isAdmin: () => {
    const userDataStr = localStorage.getItem('userData');
    if (!userDataStr) return false;
    
    try {
      const userData = JSON.parse(userDataStr);
      return userData.role === 'admin';
    } catch (error) {
      console.error('Error parsing user data:', error);
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
  },

  getAllUsers: async () => {
    const response = await apiClient.get('/admin/users');
    return response.data;
  },

  updateUserRole: async (userId: number, role: string) => {
    const response = await apiClient.put(`/admin/users/${userId}/role`, { role });
    return response.data;
  }
};

export const vehicleAPI = {
  getVehicles: async () => {
    const response = await apiClient.get('/vehicles');
    return response.data;
  }
};

export const fareAPI = {
  getTourFares: async () => {
    const response = await apiClient.get('/admin/tour-fares');
    return response.data;
  },
  
  updateTourFare: async (tourId: string, fares: any) => {
    const response = await apiClient.put(`/admin/tour-fares/${tourId}`, fares);
    return response.data;
  },
  
  updateTourFares: async (fares: any) => {
    const response = await apiClient.put(`/admin/tour-fares/${fares.tourId}`, fares);
    return response.data;
  },
  
  addTourFare: async (fareData: any) => {
    const response = await apiClient.post('/admin/tour-fares', fareData);
    return response.data;
  },
  
  deleteTourFare: async (tourId: string) => {
    const response = await apiClient.delete(`/admin/tour-fares/${tourId}`);
    return response.data;
  },
  
  getVehiclePricing: async () => {
    const response = await apiClient.get('/admin/vehicle-pricing');
    return response.data;
  },
  
  updateVehiclePricing: async (pricingData: any) => {
    const response = await apiClient.put('/admin/vehicle-pricing', pricingData);
    return response.data;
  },
  
  getVehicleFares: async () => {
    const response = await apiClient.get('/admin/vehicle-fares');
    return response.data;
  },
  
  updateVehicleFare: async (vehicleId: string, fares: any) => {
    const response = await apiClient.put(`/admin/vehicle-fares/${vehicleId}`, fares);
    return response.data;
  },
  
  getOutstationFares: async () => {
    const response = await apiClient.get('/admin/outstation-fares');
    return response.data;
  },
  
  getLocalFares: async () => {
    const response = await apiClient.get('/admin/local-fares');
    return response.data;
  },
  
  getAirportFares: async () => {
    const response = await apiClient.get('/admin/airport-fares');
    return response.data;
  },
  
  updateOutstationFare: async (vehicleId: string, fares: any) => {
    const response = await apiClient.put(`/admin/outstation-fares/${vehicleId}`, fares);
    return response.data;
  },
  
  updateLocalFare: async (vehicleId: string, fares: any) => {
    const response = await apiClient.put(`/admin/local-fares/${vehicleId}`, fares);
    return response.data;
  },
  
  updateAirportFare: async (vehicleId: string, fares: any) => {
    const response = await apiClient.put(`/admin/airport-fares/${vehicleId}`, fares);
    return response.data;
  }
};

export default {
  booking: bookingAPI,
  auth: authAPI,
  vehicle: vehicleAPI,
  fare: fareAPI
};
