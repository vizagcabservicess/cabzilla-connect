// User related types
export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role?: string; // Adding role property for admin checks
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  success: boolean;
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
}

// Booking related types
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Booking {
  id: number;
  userId: number;
  bookingNumber: string;
  pickupLocation: string;
  dropLocation: string | null;
  pickupDate: string;
  returnDate: string | null;
  cabType: string;
  distance: number;
  tripType: 'outstation' | 'local' | 'airport' | 'tour';
  tripMode: 'one-way' | 'round-trip';
  totalAmount: number;
  status: BookingStatus;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  driverName?: string;
  driverPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingRequest {
  pickupLocation: string;
  dropLocation?: string;
  pickupDate: string;
  returnDate?: string | null;
  cabType: string;
  distance: number;
  tripType: 'outstation' | 'local' | 'airport' | 'tour';
  tripMode: 'one-way' | 'round-trip';
  totalAmount: number;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  hourlyPackage?: string | null;
  tourId?: string;
  driverName?: string;
  driverPhone?: string;
}

// Fare management types
export interface TourFare {
  id: number;
  tourId: string;
  tourName: string;
  sedan: number;
  ertiga: number;
  innova: number;
  tempo: number;
  luxury: number;
}

export interface VehiclePricing {
  id: number;
  vehicleType: string;
  basePrice: number;
  pricePerKm: number;
  nightHaltCharge: number;
  driverAllowance: number;
}

export interface FareUpdateRequest {
  tourId: string;
  sedan: number;
  ertiga: number;
  innova: number;
  tempo: number;
  luxury: number;
}

export interface VehiclePricingUpdateRequest {
  vehicleType: string;
  basePrice: number;
  pricePerKm: number;
  nightHaltCharge: number;
  driverAllowance: number;
}

// Driver management types
export type DriverStatus = 'available' | 'busy' | 'offline' | 'suspended';

export interface Driver {
  id: number;
  name: string;
  phone: string;
  email: string;
  licenseNo: string;
  status: DriverStatus;
  totalRides: number;
  earnings: number;
  rating: number;
  location: string;
  createdAt: string;
  updatedAt: string;
}

// Customer management types
export type CustomerStatus = 'active' | 'flagged' | 'blocked';

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  totalRides: number;
  totalSpent: number;
  rating: number;
  status: CustomerStatus;
  lastRide: string;
  createdAt: string;
  updatedAt: string;
}

// Admin dashboard metrics
export interface DashboardMetrics {
  totalBookings: number;
  activeRides: number;
  totalRevenue: number;
  availableDrivers: number;
  busyDrivers: number;
  avgRating: number;
  upcomingRides: number;
}

// Notification types
export type NotificationType = 
  'emergency' | 'booking' | 'maintenance' | 
  'driver' | 'payment' | 'complaint' | 'system';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  read: boolean;
  createdAt: string;
}

// Report types
export interface RevenueReport {
  period: string;
  data: Array<{
    date: string;
    revenue: number;
    tripCount: number;
    avgFare: number;
  }>;
  total: number;
  comparison: {
    previous: number;
    percentChange: number;
  };
}

export interface DriverPerformance {
  driverId: number;
  driverName: string;
  totalTrips: number;
  totalEarnings: number;
  avgRating: number;
  completionRate: number;
}

export interface RoutePopularity {
  route: string;
  tripCount: number;
  revenue: number;
  avgFare: number;
  peakTime: string;
}

// Updated Location type to be compatible with lib/locationData.ts Location
export interface Location {
  id?: string;
  name?: string;
  city?: string;
  state?: string;
  lat?: number;
  lng?: number;
  type?: 'airport' | 'train_station' | 'bus_station' | 'hotel' | 'landmark' | 'other';
  popularityScore?: number;
  isPickupLocation?: boolean;
  isDropLocation?: boolean;
  isInVizag?: boolean; // Added this property to fix type errors
  address: string;
}

// Admin API types for Fare management
export interface FareAPI {
  getTourFares(): Promise<TourFare[]>;
  updateTourFares(fareData: FareUpdateRequest): Promise<TourFare>;
  getVehiclePricing(): Promise<VehiclePricing[]>;
  updateVehiclePricing(pricingData: VehiclePricingUpdateRequest): Promise<VehiclePricing>;
}

// Admin Dashboard API
export interface AdminAPI {
  getAdminDashboardMetrics(period: 'today' | 'week' | 'month'): Promise<DashboardMetrics>;
}
