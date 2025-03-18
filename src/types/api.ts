
// src/types/api.ts
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'assigned'
  | 'payment_received'
  | 'payment_pending'
  | 'completed'
  | 'continued'
  | 'cancelled';

export interface Booking {
  id: number;
  user_id?: number;
  bookingNumber: string;
  tripType: string;
  tripMode: string;
  pickupLocation: string;
  dropLocation?: string;
  pickupDate: string;
  returnDate?: string;
  cabType: string;
  passengers?: number;
  days?: number;
  hours?: number;
  kms?: number;
  status: BookingStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  passengerName?: string;
  passengerEmail?: string;
  passengerPhone?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  driverComments?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  adminNotes?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'user' | 'admin';
  createdAt: string;
  lastLogin?: string;
}

export interface DashboardData {
  userDetails: {
    name: string;
    email: string;
    phone?: string;
  };
  recentBookings: Booking[];
  upcomingBookings: Booking[];
}

export interface DashboardMetrics {
  totalBookings: number;
  activeRides: number;
  totalRevenue: number;
  availableDrivers: number;
  busyDrivers: number;
  avgRating: number;
  upcomingRides: number;
  availableStatuses?: string[];
  currentFilter?: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  phone?: string;
}

export interface FareData {
  id: number;
  tourName: string;
  description?: string;
  oneWayPrice: number;
  roundTripPrice: number;
  distanceKm?: number;
  isActive: boolean;
  tourType?: string;
  tourDuration?: string;
  vehiclePrices?: {
    [key: string]: {
      oneWayPrice: number;
      roundTripPrice: number;
    };
  };
}

export interface VehiclePricingData {
  id: number;
  vehicleType: string;
  basePrice: number;
  pricePerKm: number;
  hourlyPrice?: number;
  isActive: boolean;
  capacity?: number;
  acType?: string;
  description?: string;
  imageUrl?: string;
}
