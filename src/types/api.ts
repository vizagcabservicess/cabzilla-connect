
// API Types

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'user' | 'admin' | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponse {
  status?: string;
  message?: string;
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  phone: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected' | string;

export interface Location {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  isInVizag?: boolean;
}

export interface Booking {
  id: number;
  userId?: number;
  bookingNumber: string;
  pickupLocation: string;
  dropLocation?: string;
  pickupDate: string;
  returnDate?: string;
  cabType: string;
  distance?: number;
  tripType: string;
  tripMode: string;
  totalAmount: number;
  status: BookingStatus;
  passengerName?: string;
  passengerPhone?: string;
  passengerEmail?: string;
  driverId?: number;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingRequest {
  pickupLocation: string;
  dropLocation?: string;
  pickupDate: string;
  returnDate?: string | null;
  cabType: string;
  distance?: number;
  tripType: string;
  tripMode: string;
  totalAmount: number;
  passengerName?: string;
  passengerPhone?: string;
  passengerEmail?: string;
  hourlyPackage?: string | null;
  tourId?: string;
}

export interface DashboardMetrics {
  totalBookings: number;
  activeRides: number;
  totalRevenue: number;
  availableDrivers: number;
  busyDrivers: number;
  avgRating: number;
  upcomingRides: number;
  availableStatuses: BookingStatus[];
  currentFilter: BookingStatus | 'all';
}

export interface FareData {
  id?: number;
  cabType: string;
  basePrice: number;
  pricePerKm: number;
  minDistance?: number;
  waitingCharges?: number;
  nightCharges?: number;
  surgeMultiplier?: number;
  discount?: number;
  updatedAt?: string;
}

export interface TourFareData {
  tourId: string;
  sedan: number;
  ertiga: number;
  innova: number;
  updatedAt?: string;
}

export interface TourFare {
  id?: number;
  tourId: string;
  cabType: string;
  price: number;
  updatedAt?: string;
}

export interface VehiclePricing {
  id?: number;
  vehicleType: string;
  basePrice: number;
  pricePerKm: number;
  minDistance?: number;
  waitingCharges?: number;
  nightCharges?: number;
  surgeMultiplier?: number;
  updatedAt?: string;
}

export interface FareUpdateRequest {
  cabType: string;
  basePrice: number;
  pricePerKm: number;
  minDistance?: number;
  waitingCharges?: number;
  nightCharges?: number;
}

export interface VehiclePricingUpdateRequest {
  basePrice: number;
  pricePerKm: number;
  minDistance?: number;
  waitingCharges?: number;
  nightCharges?: number;
  surgeMultiplier?: number;
}
