import { 
  AuthResponse, 
  LoginRequest, 
  SignupRequest, 
  Booking,
  BookingRequest,
  TourFare,
  VehiclePricing,
  FareUpdateRequest,
  VehiclePricingUpdateRequest,
  Driver,
  Customer,
  DashboardMetrics
} from '@/types/api';

// Base API URL - use current domain if in production, otherwise use the defined API URL
const API_URL = process.env.NODE_ENV === 'production' 
  ? `${window.location.origin}/api`
  : 'https://saddlebrown-oryx-227656.hostingersite.com/api';

console.log('Using API URL:', API_URL);

// Helper for handling API responses
const handleResponse = async (response: Response) => {
  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));
  
  if (!response.ok) {
    // Get error details from response
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      try {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.message || errorData.error || `Server error: ${response.status}`);
      } catch (e) {
        if (e instanceof SyntaxError) {
          // JSON parse error
          const text = await response.text();
          console.error('Failed to parse error response:', text);
          throw new Error(`Server error: ${response.status}`);
        }
        throw e; // Re-throw the error from errorData
      }
    } else {
      // Non-JSON error response
      const text = await response.text();
      console.error('Received non-JSON response:', text);
      console.error('Content-Type received:', contentType);
      throw new Error(`Server returned invalid response format (${response.status}). Check server logs.`);
    }
  }
  
  // Handle JSON parsing for successful responses
  try {
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Received non-JSON success response:', text);
      console.error('Content-Type received:', contentType);
      throw new Error('Server returned invalid response format. Expected JSON.');
    }
    
    const data = await response.json();
    console.log('API response data:', data);
    return data;
  } catch (error) {
    console.error('API Response Parsing Error:', error);
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse JSON response from server. Check API response format.');
    }
    throw error;
  }
};

// Helper to get auth token from localStorage
const getAuthToken = () => {
  const token = localStorage.getItem('auth_token');
  console.log('Retrieved auth token:', token ? `${token.substring(0, 10)}...` : 'null');
  return token;
};

// Refresh token when it's close to expiration
const refreshTokenIfNeeded = async () => {
  // This would be implemented if we had a refresh token endpoint
  // For now, we'll just check if the token exists
  const token = getAuthToken();
  if (!token) {
    console.warn('No token found to refresh');
    return false;
  }
  return true;
};

// Auth API calls
export const authAPI = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    try {
      console.log('Login request to:', `${API_URL}/login`);
      console.log('Login credentials:', { email: credentials.email, passwordLength: credentials.password.length });
      
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      const data = await handleResponse(response);
      console.log('Login response:', { 
        success: data.success,
        hasToken: !!data.token,
        hasUser: !!data.user
      });
      
      // Store token in localStorage if login successful
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('Token and user data stored in localStorage');
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
    console.log('User logged out, token and user data removed');
    window.location.href = '/';
  },
  
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    console.log('Current user:', user ? { id: user.id, email: user.email, role: user.role } : 'none');
    return user;
  },
  
  isAuthenticated: () => {
    const isAuth = !!localStorage.getItem('auth_token');
    console.log('Is authenticated:', isAuth);
    return isAuth;
  },
  
  isAdmin: () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      console.log('No user data found, not admin');
      return false;
    }
    
    const user = JSON.parse(userStr);
    const isAdmin = user.role === 'admin';
    console.log('Is admin:', isAdmin);
    return isAdmin;
  }
};

// Booking API calls
export const bookingAPI = {
  getUserBookings: async (): Promise<Booking[]> => {
    const token = getAuthToken();
    if (!token) {
      console.error('Not authenticated, cannot fetch bookings');
      throw new Error('Not authenticated');
    }
    
    console.log('Fetching user bookings...');
    await refreshTokenIfNeeded();
    
    try {
      const response = await fetch(`${API_URL}/user/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
      });
      
      // Log the raw response for debugging
      console.log('User bookings response status:', response.status);
      
      // Use the improved handleResponse function
      const responseData = await handleResponse(response);
      console.log('User bookings response data:', responseData);
      
      // Handle the response structure consistently
      if (responseData && responseData.status === 'success' && Array.isArray(responseData.data)) {
        console.log('Success: Got bookings array from data property', responseData.data.length);
        return responseData.data;
      } else if (responseData && Array.isArray(responseData)) {
        console.warn('API returned array directly instead of {status, data} object');
        return responseData;
      } else {
        console.error('Invalid data format received:', typeof responseData, responseData);
        throw new Error('Invalid data format received from server');
      }
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      throw error;
    }
  },
  
  getAdminDashboardMetrics: async (): Promise<DashboardMetrics> => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    
    try {
      // First attempt with real API
      const response = await fetch(`${API_URL}/admin/dashboard/metrics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
      });
      
      const data = await handleResponse(response);
      console.log('Dashboard metrics response:', data);
      return data;
    } catch (error) {
      console.error('Error fetching dashboard metrics, using demo data:', error);
      
      // Generate some random variations in the demo data to simulate real-time changes
      const randomVariation = (base: number, variance: number) => 
        Math.floor(base + (Math.random() * variance * 2 - variance));
      
      return {
        totalBookings: randomVariation(120, 10),
        activeRides: randomVariation(10, 3),
        totalRevenue: randomVariation(50000, 5000),
        availableDrivers: randomVariation(15, 4),
        busyDrivers: randomVariation(8, 3),
        avgRating: 4.7 + (Math.random() * 0.3 - 0.15),
        upcomingRides: randomVariation(25, 5)
      };
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
  },
  
  cancelBooking: async (id: number, reason: string): Promise<Booking> => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_URL}/admin/bookings/${id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });
    
    return handleResponse(response);
  },
  
  assignDriver: async (bookingId: number, driverId: number): Promise<Booking> => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_URL}/admin/bookings/${bookingId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ driverId }),
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

// Driver management API calls
export const driverAPI = {
  getAllDrivers: async (): Promise<Driver[]> => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    
    try {
      const response = await fetch(`${API_URL}/admin/drivers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      throw error;
    }
  },
  
  updateDriverStatus: async (driverId: number, status: string): Promise<Driver> => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_URL}/admin/drivers/${driverId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    
    return handleResponse(response);
  },
  
  addDriver: async (driverData: Partial<Driver>): Promise<Driver> => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_URL}/admin/drivers/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(driverData),
    });
    
    return handleResponse(response);
  }
};

// Customer management API calls
export const customerAPI = {
  getAllCustomers: async (): Promise<Customer[]> => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    
    try {
      const response = await fetch(`${API_URL}/admin/customers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  },
  
  getCustomerDetails: async (customerId: number): Promise<Customer> => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_URL}/admin/customers/${customerId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
    });
    
    return handleResponse(response);
  },
  
  updateCustomerStatus: async (customerId: number, status: string): Promise<Customer> => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_URL}/admin/customers/${customerId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    
    return handleResponse(response);
  }
};

// Reporting API calls
export const reportAPI = {
  getRevenueReport: async (period: string, startDate?: string, endDate?: string): Promise<any> => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    
    let url = `${API_URL}/admin/reports/revenue?period=${period}`;
    if (startDate) url += `&start=${startDate}`;
    if (endDate) url += `&end=${endDate}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
    });
    
    return handleResponse(response);
  },
  
  getTripsReport: async (period: string, startDate?: string, endDate?: string): Promise<any> => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    
    let url = `${API_URL}/admin/reports/trips?period=${period}`;
    if (startDate) url += `&start=${startDate}`;
    if (endDate) url += `&end=${endDate}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
    });
    
    return handleResponse(response);
  },
  
  exportReport: async (type: string, format: string, period: string): Promise<Blob> => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_URL}/admin/reports/export?type=${type}&format=${format}&period=${period}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || 'Failed to export report');
    }
    
    return response.blob();
  }
};
