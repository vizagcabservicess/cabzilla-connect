import { 
  AuthResponse, 
  LoginRequest, 
  SignupRequest, 
  Booking,
  BookingRequest,
  TourFare,
  VehiclePricing,
  FareUpdateRequest,
  VehiclePricingUpdateRequest
} from '@/types/api';

// Base API URL - use current domain
const API_URL = `${window.location.origin}/api`;

// Helper for handling API responses
const handleResponse = async (response: Response) => {
  // Check if response is HTML instead of JSON (common error with PHP)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.indexOf('application/json') === -1) {
    const text = await response.text();
    console.error('Received non-JSON response:', text);
    console.error('Content-Type received:', contentType);
    throw new Error('Server returned invalid response format. Check server configuration.');
  }
  
  try {
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Something went wrong');
    }
    
    return data;
  } catch (error) {
    console.error('API Response Error:', error);
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse JSON response from server. Check API response format.');
    }
    throw error;
  }
};

// Helper to get auth token from localStorage
const getAuthToken = () => localStorage.getItem('auth_token');

// Auth API calls
export const authAPI = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    try {
      console.log('Login request to:', `${API_URL}/login`);
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      const data = await handleResponse(response);
      console.log('Login response:', data);
      
      // Store token in localStorage if login successful
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  signup: async (userData: SignupRequest): Promise<AuthResponse> => {
    try {
      console.log('Signup request to:', `${API_URL}/signup`);
      const response = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      const data = await handleResponse(response);
      console.log('Signup response:', data);
      
      // Store token in localStorage if signup successful
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      return data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  },
  
  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/';
  },
  
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('auth_token');
  },
  
  isAdmin: () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    
    const user = JSON.parse(userStr);
    return user.role === 'admin';
  }
};

// Booking API calls
export const bookingAPI = {
  getUserBookings: async (): Promise<Booking[]> => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    
    console.log('Fetching user bookings...');
    
    try {
      const response = await fetch(`${API_URL}/user/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
      });
      
      const data = await handleResponse(response);
      console.log('User bookings response:', data);
      
      // Ensure the response is an array
      if (!Array.isArray(data)) {
        console.error('Expected array but got:', data);
        return [];
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      throw error;
    }
  },
  
  createBooking: async (bookingData: BookingRequest): Promise<Booking> => {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_URL}/book`, {
      method: 'POST',
      headers,
      body: JSON.stringify(bookingData),
    });
    
    return handleResponse(response);
  },
  
  updateBooking: async (id: number, bookingData: Partial<BookingRequest>): Promise<Booking> => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_URL}/book/edit/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(bookingData),
    });
    
    return handleResponse(response);
  },
  
  getAllBookings: async (): Promise<Booking[]> => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_URL}/admin/bookings`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return handleResponse(response);
  }
};

// Fare management API calls
export const fareAPI = {
  getTourFares: async (): Promise<TourFare[]> => {
    const response = await fetch(`${API_URL}/fares/tours`);
    return handleResponse(response);
  },
  
  updateTourFares: async (fareData: FareUpdateRequest): Promise<TourFare> => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_URL}/admin/fares/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(fareData),
    });
    
    return handleResponse(response);
  },
  
  getVehiclePricing: async (): Promise<VehiclePricing[]> => {
    const response = await fetch(`${API_URL}/fares/vehicles`);
    return handleResponse(response);
  },
  
  updateVehiclePricing: async (pricingData: VehiclePricingUpdateRequest): Promise<VehiclePricing> => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_URL}/admin/km-price/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(pricingData),
    });
    
    return handleResponse(response);
  }
};
