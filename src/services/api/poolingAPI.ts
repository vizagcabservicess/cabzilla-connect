import axios from 'axios';
import { getApiUrl } from '@/config/api';
import {
  PoolingUser,
  PoolingRide,
  PoolingBooking,
  PoolingRequest,
  UserRole,
  RideStatus,
  BookingStatus,
  RequestStatus,
  PoolingType
} from '@/types/pooling';

const POOLING_API_URL = getApiUrl('/api/pooling');

// Auth API
interface LoginRequest {
  email: string;
  password: string;
  role?: UserRole;
}

interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
}

interface AuthResponse {
  user: PoolingUser;
  token: string;
}

// Rides API
interface CreateRideRequest {
  fromLocation: string;
  toLocation: string;
  departureTime: string;
  totalSeats: number;
  pricePerSeat: number;
  type: PoolingType;
  providerId: number;
  providerName: string;
  description?: string;
}

interface SearchRideRequest {
  from?: string;
  to?: string;
  date?: string;
  type?: PoolingType;
  passengers?: number;
  sortBy?: 'time' | 'price' | 'rating';
}

// Bookings API
interface CreateBookingRequest {
  rideId: number;
  userId: number;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  seatsBooked: number;
  totalAmount: number;
  bookingStatus: BookingStatus;
  paymentStatus: 'pending' | 'paid' | 'failed';
  canCancelFree: boolean;
}

// Requests API
interface CreateRequestRequest {
  rideId: number;
  guestId: number;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  seatsRequested: number;
  status: RequestStatus;
}

class PoolingAPI {
  private getAuthHeaders() {
    const token = localStorage.getItem('pooling_auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Auth endpoints
  auth = {
    login: async (credentials: LoginRequest): Promise<AuthResponse> => {
      console.log('API: Attempting login with:', credentials);
      try {
        const formData = new URLSearchParams();
        formData.append('email', credentials.email);
        formData.append('password', credentials.password);
        if (credentials.role) formData.append('role', credentials.role);
        const response = await axios.post(
          `${POOLING_API_URL}/auth.php?action=login`,
          formData,
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        console.log('API: Login response:', response.data);
        return response.data;
      } catch (error) {
        console.error('API: Login error:', error);
        throw error;
      }
    },

    register: async (userData: RegisterRequest): Promise<AuthResponse> => {
      console.log('API: Attempting register with:', userData);
      try {
        const formData = new URLSearchParams();
        formData.append('name', userData.name);
        formData.append('email', userData.email);
        formData.append('phone', userData.phone);
        formData.append('password', userData.password);
        formData.append('role', userData.role);
        const response = await axios.post(
          `${POOLING_API_URL}/auth.php?action=register`,
          formData,
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        console.log('API: Register response:', response.data);
        return response.data;
      } catch (error) {
        console.error('API: Register error:', error);
        throw error;
      }
    },

    getProfile: async (): Promise<PoolingUser> => {
      try {
        const response = await axios.get(`${POOLING_API_URL}/auth.php`, {
          headers: this.getAuthHeaders()
        });
        return response.data;
      } catch (error) {
        console.error('API: Get profile error:', error);
        throw error;
      }
    },

    logout: async (): Promise<void> => {
      try {
        await axios.post(`${POOLING_API_URL}/auth.php?action=logout`, {}, {
          headers: this.getAuthHeaders()
        });
      } catch (error) {
        console.error('API: Logout error:', error);
        throw error;
      }
    },

    getUserById: async (userId: number): Promise<PoolingUser> => {
      try {
        const response = await axios.get(`${POOLING_API_URL}/users.php?id=${userId}`, {
          headers: this.getAuthHeaders()
        });
        return response.data;
      } catch (error) {
        console.error('API: Get user by ID error:', error);
        throw error;
      }
    }
  };

  // Rides endpoints
  rides = {
    search: async (params: SearchRideRequest): Promise<PoolingRide[]> => {
      try {
        const response = await axios.get(`${POOLING_API_URL}/search.php`, { params });
        return response.data.data || [];
      } catch (error) {
        console.error('API: Search rides error:', error);
        throw error;
      }
    },

    create: async (rideData: CreateRideRequest): Promise<PoolingRide> => {
      try {
        const response = await axios.post(`${POOLING_API_URL}/rides.php`, rideData, {
          headers: this.getAuthHeaders()
        });
        return response.data;
      } catch (error) {
        console.error('API: Create ride error:', error);
        throw error;
      }
    },

    getByProvider: async (providerId: number): Promise<PoolingRide[]> => {
      try {
        const response = await axios.get(`${POOLING_API_URL}/rides.php?provider_id=${providerId}`, {
          headers: this.getAuthHeaders()
        });
        return response.data;
      } catch (error) {
        console.error('API: Get provider rides error:', error);
        throw error;
      }
    },

    update: async (id: number, updates: Partial<PoolingRide>): Promise<PoolingRide> => {
      try {
        const response = await axios.put(`${POOLING_API_URL}/rides.php?id=${id}`, updates, {
          headers: this.getAuthHeaders()
        });
        return response.data;
      } catch (error) {
        console.error('API: Update ride error:', error);
        throw error;
      }
    },

    delete: async (id: number): Promise<void> => {
      try {
        await axios.delete(`${POOLING_API_URL}/rides.php?id=${id}`, {
          headers: this.getAuthHeaders()
        });
      } catch (error) {
        console.error('API: Delete ride error:', error);
        throw error;
      }
    }
  };

  // Bookings endpoints
  bookings = {
    create: async (bookingData: CreateBookingRequest): Promise<PoolingBooking> => {
      try {
        const response = await axios.post(`${POOLING_API_URL}/bookings.php`, bookingData, {
          headers: this.getAuthHeaders()
        });
        return response.data;
      } catch (error) {
        console.error('API: Create booking error:', error);
        throw error;
      }
    },

    getByUser: async (userId: number): Promise<PoolingBooking[]> => {
      try {
        const response = await axios.get(`${POOLING_API_URL}/bookings.php?user_id=${userId}`, {
          headers: this.getAuthHeaders()
        });
        return response.data || [];
      } catch (error) {
        console.error('API: Get user bookings error:', error);
        return [];
      }
    },

    update: async (id: number, updates: Partial<PoolingBooking>): Promise<PoolingBooking> => {
      try {
        const response = await axios.put(`${POOLING_API_URL}/bookings.php?id=${id}`, updates, {
          headers: this.getAuthHeaders()
        });
        return response.data;
      } catch (error) {
        console.error('API: Update booking error:', error);
        throw error;
      }
    }
  };

  // Requests endpoints
  requests = {
    create: async (requestData: CreateRequestRequest): Promise<PoolingRequest> => {
      console.log('[poolingAPI.ts] requests.create called with', requestData);
      try {
        const response = await axios.post(
          'https://vizagup.com/api/pooling/requests.php',
          requestData,
          { headers: this.getAuthHeaders() }
        );
        return response.data;
      } catch (error) {
        console.error('API: Create request error:', error);
        throw error;
      }
    },

    getByProvider: async (providerId: number): Promise<PoolingRequest[]> => {
      try {
        const response = await axios.get(`${POOLING_API_URL}/requests.php?action=by-provider&provider_id=${providerId}`, {
          headers: this.getAuthHeaders()
        });
        return response.data || [];
      } catch (error) {
        console.error('API: Get provider requests error:', error);
        return [];
      }
    },

    update: async (id: number, updates: Partial<PoolingRequest>): Promise<PoolingRequest> => {
      try {
        const response = await axios.put(`${POOLING_API_URL}/requests.php?id=${id}`, updates, {
          headers: this.getAuthHeaders()
        });
        return response.data;
      } catch (error) {
        console.error('API: Update request error:', error);
        throw error;
      }
    },

    approve: async (requestId: number, responseMessage?: string) => {
      return axios.put(
        `${POOLING_API_URL}/requests.php?action=approve`,
        { id: requestId, responseMessage },
        { headers: this.getAuthHeaders() }
      );
    },

    reject: async (requestId: number, responseMessage?: string) => {
      return axios.put(
        `${POOLING_API_URL}/requests.php?action=reject`,
        { id: requestId, responseMessage },
        { headers: this.getAuthHeaders() }
      );
    }
  };

  // Wallet endpoints
  wallet = {
    getBalance: async (userId: number, userType: string = 'provider'): Promise<{ balance: number }> => {
      try {
        const response = await axios.get(`${POOLING_API_URL}/wallet.php?user_id=${userId}&user_type=${userType}`,
          { headers: this.getAuthHeaders() }
        );
        return response.data;
      } catch (error) {
        console.error('API: Get wallet balance error:', error);
        throw error;
      }
    },

    addFunds: async (userId: number, amount: number): Promise<{ balance: number }> => {
      try {
        const response = await axios.post(`${POOLING_API_URL}/wallet.php`, 
          { user_id: userId, amount, type: 'credit' }, 
          { headers: this.getAuthHeaders() }
        );
        return response.data;
      } catch (error) {
        console.error('API: Add funds error:', error);
        throw error;
      }
    },

    getTransactions: async (userId: number, userType: string = 'provider'): Promise<any[]> => {
      try {
        const response = await axios.get(`${POOLING_API_URL}/wallet.php?user_id=${userId}&user_type=${userType}&action=transactions`, {
          headers: this.getAuthHeaders()
        });
        return response.data || [];
      } catch (error) {
        console.error('API: Get wallet transactions error:', error);
        return [];
      }
    },

    withdraw: async (userId: number, amount: number): Promise<{ balance: number }> => {
      try {
        const response = await axios.post(`${POOLING_API_URL}/wallet/withdraw.php`, 
          { user_id: userId, amount },
          { headers: this.getAuthHeaders() }
        );
        return response.data;
      } catch (error) {
        console.error('API: Withdraw error:', error);
        throw error;
      }
    },

    getAllWallets: async (): Promise<any[]> => {
      try {
        const response = await axios.get(`${POOLING_API_URL}/wallet.php?action=all`, {
          headers: this.getAuthHeaders()
        });
        return response.data || [];
      } catch (error) {
        console.error('API: Get all wallets error:', error);
        return [];
      }
    }
  };
}

export const poolingAPI = new PoolingAPI();
