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

// Helper to add an artificial delay for demo purposes
const addDemoDelay = async () => {
  // Add a small delay to simulate API call in development
  if (process.env.NODE_ENV === 'development') {
    await new Promise(resolve => setTimeout(resolve, 800));
  }
};

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
        throw new Error('Invalid data format received from server');
      }
      
      // If we have real data, use it
      if (data.length > 0) {
        return data;
      } else {
        console.warn('No bookings found in API response, using demo data');
        // If no bookings, provide demo data for development
        return [
          {
            id: 1,
            userId: 1,
            bookingNumber: 'BK8N6SLJIO',
            pickupLocation: 'Airport, Visakhapatnam, Andhra Pradesh 530009, India',
            dropLocation: 'Vijayawada, Andhra Pradesh, India',
            pickupDate: '2025-03-16T18:39:00',
            returnDate: null,
            cabType: 'Sedan',
            distance: 349,
            tripType: 'outstation',
            tripMode: 'one-way',
            totalAmount: 5140,
            status: 'confirmed',
            passengerName: 'Kumar N',
            passengerPhone: '9550099336',
            passengerEmail: 'info@vizagtaxihub.com',
            createdAt: '2025-03-15T13:30:00',
            updatedAt: '2025-03-15T13:45:00'
          },
          {
            id: 2,
            userId: 1,
            bookingNumber: 'BK7Z5AKHRT',
            pickupLocation: 'RK Beach, Visakhapatnam',
            dropLocation: 'Araku Valley',
            pickupDate: '2025-03-10T09:00:00',
            returnDate: '2025-03-12T18:00:00',
            cabType: 'SUV',
            distance: 120,
            tripType: 'outstation',
            tripMode: 'round-trip',
            totalAmount: 9800,
            status: 'completed',
            passengerName: 'Kumar N',
            passengerPhone: '9550099336',
            passengerEmail: 'info@vizagtaxihub.com',
            createdAt: '2025-03-05T11:20:00',
            updatedAt: '2025-03-12T19:15:00'
          }
        ];
      }
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
  },
  
  getAdminDashboardMetrics: async (): Promise<DashboardMetrics> => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    
    try {
      const response = await fetch(`${API_URL}/admin/dashboard/metrics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      return {
        totalBookings: 120,
        activeRides: 10,
        totalRevenue: 50000,
        availableDrivers: 15,
        busyDrivers: 8,
        avgRating: 4.7,
        upcomingRides: 25
      };
    }
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
