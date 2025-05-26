
// Pooling Authentication Types
export type PoolingUserRole = 'guest' | 'provider' | 'admin';

export interface PoolingUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: PoolingUserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Provider specific fields
  providerStatus?: 'pending' | 'verified' | 'rejected' | 'suspended';
  documentStatus?: 'pending' | 'verified' | 'incomplete';
  walletBalance?: number;
  totalRides?: number;
  rating?: number;
  // Guest specific fields
  totalBookings?: number;
  preferredPaymentMethod?: string;
}

export interface PoolingAuthState {
  user: PoolingUser | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isProvider: boolean;
  isAdmin: boolean;
  loading: boolean;
}

export interface PoolingLoginRequest {
  email: string;
  password: string;
  role: PoolingUserRole;
}

export interface PoolingRegisterRequest {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: PoolingUserRole;
  // Provider specific registration fields
  vehicleInfo?: {
    type: string;
    make: string;
    model: string;
    plateNumber: string;
    seatingCapacity: number;
  };
  documents?: {
    drivingLicense: string;
    vehicleRegistration: string;
    insurance: string;
    identityProof: string;
  };
}

export interface PoolingAuthResponse {
  success: boolean;
  user: PoolingUser;
  token: string;
  message?: string;
}
