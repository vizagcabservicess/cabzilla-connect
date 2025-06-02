import axios from 'axios';
import { 
  PoolingRide, 
  PoolingBooking, 
  PoolingSearchRequest, 
  CreateRideRequest,
  PoolingUser,
  UserRole,
  RideRequest,
  PoolingWallet,
  WalletTransaction
} from '@/types/pooling';

// Set API base URL based on environment
const API_BASE_URL =
  import.meta.env.VITE_POOLING_API_URL ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost/api/pooling'
    : 'https://vizagup.com/api/pooling');

const AUTH_BASE_URL =
  import.meta.env.VITE_AUTH_API_URL ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost/api/auth'
    : 'https://vizagup.com/api/auth');

// Create axios instances
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const authApi = axios.create({
  baseURL: AUTH_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pooling_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('pooling_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error);
    throw error.response?.data || error;
  }
);
authApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('Auth API Error:', error);
    throw error.response?.data || error;
  }
);

export const poolingAPI = {
  // Authentication APIs
  auth: {
    login: async (credentials: { email: string; password: string }): Promise<{ user: PoolingUser; token: string }> => {
      const payload = { email: credentials.email, password: credentials.password };
      const response = await authApi.post('/login.php', payload);
      if (response.data?.token) {
        localStorage.setItem('pooling_auth_token', response.data.token);
      }
      return response.data;
    },

    register: async (userData: { name: string; email: string; phone: string; password: string; role: UserRole }): Promise<{ user: PoolingUser; token: string }> => {
      const payload = {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        password: userData.password,
        role: userData.role
      };
      const response = await authApi.post('/register.php', payload);
      if (response.data?.token) {
        localStorage.setItem('pooling_auth_token', response.data.token);
      }
      return response.data;
    },

    logout: async (): Promise<void> => {
      await authApi.post('/logout.php');
      localStorage.removeItem('pooling_auth_token');
    },

    getProfile: async (): Promise<PoolingUser> => {
      const response = await authApi.get('/me.php');
      return response.data;
    },

    updateProfile: async (userData: Partial<PoolingUser>): Promise<PoolingUser> => {
      const response = await authApi.put('/me.php', userData);
      return response.data;
    }
  },

  // Ride management APIs
  rides: {
    search: async (searchParams: PoolingSearchRequest): Promise<PoolingRide[]> => {
      const response = await api.get('/rides/search.php', { params: searchParams });
      return response.data;
    },

    getById: async (rideId: number): Promise<PoolingRide> => {
      const response = await api.get(`/rides/details.php?id=${rideId}`);
      return response.data;
    },

    create: async (rideData: CreateRideRequest, providerId?: number): Promise<PoolingRide> => {
      const payload = providerId ? { ...rideData, providerId } : rideData;
      const response = await api.post('/rides.php', payload);
      return response.data;
    },

    update: async (rideId: number, rideData: Partial<CreateRideRequest>): Promise<PoolingRide> => {
      const response = await api.put('/rides/update.php', { id: rideId, ...rideData });
      return response.data;
    },

    delete: async (rideId: number): Promise<void> => {
      await api.delete('/rides/delete.php', { data: { id: rideId } });
    },

    getByProvider: async (providerId: number): Promise<PoolingRide[]> => {
      const response = await api.get(`/rides.php?provider_id=${providerId}`);
      return response.data;
    }
  },

  // Request management APIs
  requests: {
    create: async (requestData: Omit<RideRequest, 'id' | 'requestedAt'>): Promise<RideRequest> => {
      const response = await api.post('/requests/create.php', requestData);
      return response.data;
    },

    getByRide: async (rideId: number): Promise<RideRequest[]> => {
      const response = await api.get(`/requests/by-ride.php?ride_id=${rideId}`);
      return response.data;
    },

    getByUser: async (userId: number): Promise<RideRequest[]> => {
      const response = await api.get(`/requests/by-user.php?user_id=${userId}`);
      return response.data;
    },

    approve: async (requestId: number, responseMessage?: string): Promise<void> => {
      await api.put('/requests/approve.php', { id: requestId, responseMessage });
    },

    reject: async (requestId: number, responseMessage?: string): Promise<void> => {
      await api.put('/requests/reject.php', { id: requestId, responseMessage });
    }
  },

  // Booking management APIs
  bookings: {
    create: async (bookingData: Omit<PoolingBooking, 'id' | 'bookingDate'>): Promise<PoolingBooking> => {
      const response = await api.post('/bookings/create.php', bookingData);
      return response.data;
    },

    getById: async (bookingId: number): Promise<PoolingBooking> => {
      const response = await api.get(`/bookings/details.php?id=${bookingId}`);
      return response.data;
    },

    getByUser: async (userId: number): Promise<PoolingBooking[]> => {
      const response = await api.get(`/bookings/by-user.php?user_id=${userId}`);
      return response.data;
    },

    cancel: async (bookingId: number, reason?: string): Promise<void> => {
      await api.put('/bookings/cancel.php', { id: bookingId, reason });
    },

    updateStatus: async (bookingId: number, status: string): Promise<void> => {
      await api.put('/bookings/status.php', { id: bookingId, status });
    }
  },

  // Payment APIs
  payments: {
    createOrder: async (bookingId: number): Promise<{ orderId: string; amount: number; currency: string; key: string }> => {
      const response = await api.post('/payments/create-order.php', { booking_id: bookingId });
      return response.data;
    },

    verifyPayment: async (paymentData: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }): Promise<void> => {
      await api.post('/payments/verify.php', paymentData);
    },

    getHistory: async (userId: number): Promise<any[]> => {
      const response = await api.get(`/payments/history.php?user_id=${userId}`);
      return response.data;
    }
  },

  // Wallet APIs
  wallet: {
    get: async (userId: number): Promise<PoolingWallet> => {
      const response = await api.get(`/wallet/details.php?user_id=${userId}`);
      return response.data;
    },

    deposit: async (userId: number, amount: number): Promise<WalletTransaction> => {
      const response = await api.post('/wallet/deposit.php', { user_id: userId, amount });
      return response.data;
    },

    withdraw: async (userId: number, amount: number): Promise<WalletTransaction> => {
      const response = await api.post('/wallet/withdraw.php', { user_id: userId, amount });
      return response.data;
    },

    getTransactions: async (userId: number): Promise<WalletTransaction[]> => {
      const response = await api.get(`/wallet.php?action=transactions&user_id=${userId}`);
      return response.data;
    }
  },

  // Rating APIs
  ratings: {
    create: async (ratingData: any): Promise<void> => {
      await api.post('/ratings/create.php', ratingData);
    },

    getByUser: async (userId: number): Promise<any[]> => {
      const response = await api.get(`/ratings/by-user.php?user_id=${userId}`);
      return response.data;
    }
  },

  // Admin APIs
  admin: {
    getAnalytics: async (): Promise<any> => {
      const response = await api.get('/admin/analytics.php');
      return response.data;
    },

    getUsers: async (): Promise<PoolingUser[]> => {
      const response = await api.get('/admin/users.php');
      return response.data;
    },

    getRides: async (): Promise<PoolingRide[]> => {
      const response = await api.get('/admin/rides.php');
      return response.data;
    },

    getBookings: async (): Promise<PoolingBooking[]> => {
      const response = await api.get('/admin/bookings.php');
      return response.data;
    }
  }
};

// Export individual API modules for convenience
export const { auth, rides, requests, bookings, payments, wallet, ratings, admin } = poolingAPI;
