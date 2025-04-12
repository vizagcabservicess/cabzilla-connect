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
    // Add auth token to all requests if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
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

// Helper to get current user ID from localStorage
const getCurrentUserId = (): number | null => {
  try {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const parsed = JSON.parse(userData);
      return parsed.id || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting user ID from localStorage:', error);
    return null;
  }
};

export const bookingAPI = {
  getBookings: async (userId?: number) => {
    const user_id = userId || getCurrentUserId();
    const response = await apiClient.get(user_id ? `/user/bookings?user_id=${user_id}` : '/bookings');
    return response.data;
  },
  
  getBookingById: async (id: string | number) => {
    const response = await apiClient.get(`/bookings/${id}`);
    return response.data;
  },
  
  createBooking: async (bookingData: BookingRequest): Promise<Booking> => {
    try {
      console.log('Creating booking with data:', bookingData);
      
      // Enhanced validation - check all required fields with detailed logging
      const requiredFields = ['pickupLocation', 'cabType', 'pickupDate', 'tripType', 
                             'tripMode', 'totalAmount', 'passengerName', 
                             'passengerPhone', 'passengerEmail'];
      
      // For non-local trips, require drop location
      if (bookingData.tripType !== 'local') {
        requiredFields.push('dropLocation');
      }
      
      // Validate all fields are present
      const missingFields = requiredFields.filter(field => {
        const value = bookingData[field as keyof BookingRequest];
        if (value === undefined || value === null) return true;
        if (typeof value === 'string' && value.trim() === '') return true;
        return false;
      });
      
      if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        console.error('Booking data:', bookingData);
        throw new Error(`Missing required booking information: ${missingFields.join(', ')}`);
      }
      
      // For local trips, ensure dropLocation has at least an empty string
      if (bookingData.tripType === 'local' && bookingData.dropLocation === undefined) {
        bookingData.dropLocation = '';
      }

      // Add user ID from localStorage if available and not already set
      const userId = getCurrentUserId();
      if (userId && !bookingData.userId) {
        bookingData.userId = userId;
        console.log('Added user ID to booking:', userId);
      }
      
      // Get the absolute URL for book.php
      const bookingUrl = getApiUrl('/api/book.php');
      console.log('Booking endpoint URL:', bookingUrl);
      
      // Use direct fetch with proper error handling and debugging
      console.log('Sending booking request with data:', JSON.stringify(bookingData));
      
      const response = await fetch(bookingUrl, {
        method: 'POST',
        headers: {
          ...defaultHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Requested-With': 'fetch',
          // Add auth token if available
          ...(localStorage.getItem('authToken') ? {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          } : {})
        },
        body: JSON.stringify(bookingData),
      });
      
      console.log('Response status:', response.status, response.statusText);
      
      // Get the response text first to debug potential issues
      const responseText = await response.text();
      console.log('Raw server response text length:', responseText.length);
      console.log('Raw server response:', responseText.substring(0, 500));
      
      // Safety check - empty responses
      if (!responseText || responseText.trim() === '') {
        console.error('Server returned an empty response');
        throw new Error('Server returned an empty response');
      }
      
      // Parse the response text into JSON
      let result;
      try {
        result = JSON.parse(responseText);
        console.log('Parsed JSON result:', result);
      } catch (parseError) {
        console.error('Failed to parse server response as JSON:', parseError);
        // Try to extract JSON if there's any HTML content before/after it
        const jsonMatch = responseText.match(/\{.*\}/s);
        if (jsonMatch) {
          try {
            result = JSON.parse(jsonMatch[0]);
            console.log('Extracted JSON from response:', result);
          } catch (extractError) {
            console.error('Failed to extract JSON from response:', extractError);
            throw new Error('Server returned invalid JSON: ' + responseText.substring(0, 100));
          }
        } else {
          throw new Error('Server returned invalid JSON: ' + responseText.substring(0, 100));
        }
      }
      
      // Check if the result contains expected data
      if (!result || result.status === 'error') {
        throw new Error(result?.message || 'Unknown error occurred during booking');
      }
      
      console.log('Booking created successfully:', result);
      
      // Send email confirmation separately with improved error handling
      try {
        if (result.data && result.data.passengerEmail) {
          console.log('Sending email confirmation for booking:', result.data.bookingNumber);
          
          // Send to the dedicated email confirmation endpoint
          const confirmEmailUrl = getApiUrl('/api/send-booking-confirmation.php');
          console.log('Email confirmation URL:', confirmEmailUrl);
          console.log('Email confirmation data:', JSON.stringify(result.data));
          
          const confirmResponse = await fetch(confirmEmailUrl, {
            method: 'POST',
            headers: {
              ...defaultHeaders,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            },
            body: JSON.stringify(result.data)
          });
          
          console.log('Email confirmation response status:', confirmResponse.status);
          
          // Try to parse the response as JSON with proper error handling
          try {
            const confirmText = await confirmResponse.text();
            console.log('Email confirmation response:', confirmText.substring(0, 500));
            
            if (confirmText && confirmText.trim() !== '') {
              try {
                const confirmResult = JSON.parse(confirmText);
                console.log('Parsed email confirmation result:', confirmResult);
                
                // Add email confirmation result to the booking response
                result.data.emailConfirmation = confirmResult.status === 'success';
                result.data.emailDetails = confirmResult.details || {};
              } catch (parseError) {
                console.warn('Could not parse email confirmation response as JSON:', confirmText.substring(0, 200));
                result.data.emailConfirmation = false;
                result.data.emailError = 'Invalid response from email service';
              }
            } else {
              console.warn('Empty response from email confirmation endpoint');
              result.data.emailConfirmation = false;
              result.data.emailError = 'Empty response from email service';
            }
          } catch (textError) {
            console.warn('Error reading email confirmation response:', textError);
            result.data.emailConfirmation = false;
            result.data.emailError = 'Could not read email service response';
          }
        } else {
          console.warn('Email confirmation skipped - missing passenger email in booking data');
          result.data.emailConfirmation = false;
          result.data.emailError = 'Missing passenger email';
        }
      } catch (emailError) {
        // Don't fail booking just because email failed
        console.warn('Failed to trigger confirmation email:', emailError);
        result.data.emailConfirmation = false;
        result.data.emailError = emailError.message || 'Unknown email error';
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

  getUserBookings: async (userId?: number) => {
    try {
      const user_id = userId || getCurrentUserId();
      console.log('Fetching bookings for user ID:', user_id);
      
      if (!user_id) {
        console.warn('No user ID available for fetching bookings');
        return [];
      }
      
      // Use the correct endpoint path with .php extension
      const apiUrl = getApiUrl('/api/user/bookings.php');
      console.log('User bookings endpoint URL:', apiUrl);
      
      // Get token and add dev_mode parameter for fallback
      const token = localStorage.getItem('authToken');
      const urlWithParams = `${apiUrl}?user_id=${user_id}&dev_mode=true`;
      
      console.log('Making request to:', urlWithParams);
      console.log('With token available:', !!token);
      
      // First attempt with Authorization header
      try {
        const response = await fetch(urlWithParams, {
          method: 'GET',
          headers: {
            ...defaultHeaders,
            ...forceRefreshHeaders,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        
        console.log('Bookings API response status:', response.status);
        
        if (response.status === 401) {
          throw new Error('Authentication failed (401)');
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch bookings: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('User bookings response:', data);
        
        // Check if the response has a bookings array property
        if (data && data.bookings && Array.isArray(data.bookings)) {
          return data.bookings;
        } else if (data && Array.isArray(data)) {
          // Some endpoints may return an array directly
          return data;
        }
        
        console.warn('Unexpected bookings response format:', data);
        return [];
      } catch (authError) {
        // If authentication fails, try without Authorization header but with user_id parameter
        console.warn('Auth request failed, trying without Authorization header:', authError);
        
        const fallbackUrl = `${apiUrl}?user_id=${user_id}&fallback=true&dev_mode=true`;
        const response = await fetch(fallbackUrl, {
          method: 'GET',
          headers: {
            ...defaultHeaders,
            ...forceRefreshHeaders
          }
        });
        
        console.log('Fallback API response status:', response.status);
        
        if (!response.ok) {
          console.error('Fallback request also failed:', response.status, response.statusText);
          // Return empty array instead of throwing to prevent UI from breaking
          return [];
        }
        
        const data = await response.json();
        console.log('Fallback bookings response:', data);
        
        // Check for bookings in response
        if (data && data.bookings && Array.isArray(data.bookings)) {
          return data.bookings;
        } else if (data && Array.isArray(data)) {
          return data;
        }
        
        return [];
      }
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      // Return empty array instead of throwing to prevent UI from breaking
      return [];
    }
  },

  updateBookingStatus: async (id: string | number, status: string) => {
    const response = await apiClient.put(`/update-booking/${id}`, { status });
    return response.data;
  },

  deleteBooking: async (id: string | number) => {
    const response = await apiClient.delete(`/admin/booking/${id}`);
    return response.data;
  },

  getAdminDashboardMetrics: async (period: string, userId?: number) => {
    try {
      const user_id = userId || getCurrentUserId();
      console.log('Fetching admin metrics for user ID:', user_id);
      
      if (!user_id) {
        console.warn('No user ID available for fetching admin metrics');
        return null;
      }
      
      // Use correct PHP endpoint path with .php extension
      const url = getApiUrl(`/api/admin/metrics.php?period=${period}`);
      console.log('Admin metrics URL:', url);
      
      const token = localStorage.getItem('authToken');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...defaultHeaders,
          ...forceRefreshHeaders,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      if (!response.ok) {
        console.error('Admin metrics API error:', response.status, response.statusText);
        throw new Error(`Failed to fetch admin metrics: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Admin metrics response:', data);
      
      // Check if the response has a data property
      if (data && data.status === 'success' && data.data) {
        return data.data;
      }
      
      // Fallback to null
      return null;
    } catch (error) {
      console.error('Error fetching admin metrics:', error);
      return null;
    }
  }
};

export const authAPI = {
  login: async (credentials: { email: string; password: string }) => {
    try {
      console.log('Logging in with credentials:', credentials.email);
      
      // Use the direct URL for login with proper error handling
      const loginUrl = getApiUrl('/api/login.php');
      console.log('Login endpoint URL:', loginUrl);
      
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          ...defaultHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      console.log('Login response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Login failed with status ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Login response data:', data);
      
      if (data.status === 'error') {
        throw new Error(data.message || 'Login failed');
      }
      
      if (!data.token) {
        throw new Error('No token received from server');
      }
      
      // Store token and user data in localStorage
      localStorage.setItem('authToken', data.token);
      
      // Ensure we have a proper user object with ID and role
      if (data.user && data.user.id) {
        localStorage.setItem('userData', JSON.stringify(data.user));
      } else {
        throw new Error('Invalid user data received from server');
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  signup: async (userData: { name: string; email: string; password: string; phone?: string }) => {
    const response = await apiClient.post('/signup', userData);
    return response.data;
  },
  
  getCurrentUser: async () => {
    try {
      const token = localStorage.getItem('authToken');
      const userDataStr = localStorage.getItem('userData');
      
      if (!token) {
        console.log('No auth token found in localStorage');
        return null;
      }
      
      // First try to use cached user data
      if (userDataStr) {
        try {
          const cachedUser = JSON.parse(userDataStr);
          console.log('Using cached user data:', cachedUser);
          
          // If we have complete user data, return it
          if (cachedUser && cachedUser.id && cachedUser.email) {
            return cachedUser;
          }
        } catch (error) {
          console.warn('Error parsing cached user data:', error);
          // Continue to fetch fresh data
        }
      }
      
      // Fetch fresh user data from server
      console.log('Fetching fresh user data from server');
      const userUrl = getApiUrl('/api/user.php');
      
      const response = await fetch(userUrl, {
        method: 'GET',
        headers: {
          ...defaultHeaders,
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        console.error('Error fetching user data:', response.status, response.statusText);
        throw new Error(`Failed to fetch user data: ${response.status} ${response.statusText}`);
      }
      
      const userData = await response.json();
      console.log('User data response:', userData);
      
      // Check if response has user data in expected format
      if (userData.status === 'success' && userData.user) {
        // Update cached user data
        localStorage.setItem('userData', JSON.stringify(userData.user));
        return userData.user;
      } else if (userData.id) {
        // Some endpoints may return user data directly
        localStorage.setItem('userData', JSON.stringify(userData));
        return userData;
      }
      
      console.warn('Unexpected user response format:', userData);
      return null;
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
    try {
      // Try multiple endpoints with fallbacks
      const urls = [
        '/api/admin/get-vehicles.php',
        '/api/vehicles.php',
        '/api/vehicles/list',
        '/data/vehicles.json'  // Added local JSON as last resort
      ];
      
      let response = null;
      let error = null;
      
      for (const url of urls) {
        try {
          console.log(`Attempting to fetch vehicles from: ${url}`);
          response = await fetch(getApiUrl(url), {
            headers: {
              ...forceRefreshHeaders,
              'X-Requested-With': 'XMLHttpRequest'
            }
          });
          
          if (response.ok) {
            const responseText = await response.text();
            
            // Skip empty responses
            if (!responseText || responseText.trim() === '') {
              console.log(`Empty response from ${url}, trying next endpoint`);
              continue;
            }
            
            // Try to parse JSON
            try {
              const data = JSON.parse(responseText);
              console.log(`Successfully fetched vehicles from ${url}:`, data);
              return data;
            } catch (parseError) {
              console.error(`Error parsing JSON from ${url}:`, parseError);
              console.log(`Response was:`, responseText.substring(0, 100));
              // Continue to next endpoint if JSON parsing fails
              continue;
            }
          }
        } catch (err) {
          console.error(`Error fetching from ${url}:`, err);
          error = err;
        }
      }
      
      // Last resort - static fallback data
      console.warn('All vehicle fetch attempts failed, using fallback data');
      return {
        status: 'success',
        message: 'Fallback vehicle data',
        vehicles: [
          {
            id: "sedan",
            name: "Sedan",
            capacity: 4,
            luggageCapacity: 2,
            price: 2500,
            pricePerKm: 14,
            image: "/cars/sedan.png",
            amenities: ["AC", "Bottle Water", "Music System"],
            description: "Comfortable sedan suitable for 4 passengers.",
            ac: true,
            nightHaltCharge: 700,
            driverAllowance: 250,
            isActive: true
          },
          {
            id: "ertiga",
            name: "Ertiga",
            capacity: 6,
            luggageCapacity: 3,
            price: 3200,
            pricePerKm: 18,
            image: "/cars/ertiga.png",
            amenities: ["AC", "Bottle Water", "Music System", "Extra Legroom"],
            description: "Spacious SUV suitable for 6 passengers.",
            ac: true,
            nightHaltCharge: 1000,
            driverAllowance: 250,
            isActive: true
          }
        ]
      };
    } catch (error) {
      console.error('All vehicle fetch attempts failed:', error);
      
      // Return fallback data if everything fails
      return {
        status: 'success',
        message: 'Fallback vehicle data',
        vehicles: []
      };
    }
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
