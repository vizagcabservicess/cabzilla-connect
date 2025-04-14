
// API response types for the application

export interface ApiResponse {
  status: 'success' | 'error';
  message?: string;
  timestamp?: number;
}

export interface LocalPackageFare {
  id?: string;
  vehicleId?: string;
  name?: string;
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number;
  priceExtraKm?: number;
  priceExtraHour?: number;
  // Alternative property names for compatibility
  price_4hr_40km?: number;
  price_8hr_80km?: number;
  price_10hr_100km?: number;
  price_extra_km?: number;
  price_extra_hour?: number;
  // More aliases
  package4hr40km?: number;
  package8hr80km?: number;
  package10hr100km?: number;
  extraKmRate?: number;
  extraHourRate?: number;
}

export interface LocalPackageFaresResponse extends ApiResponse {
  fares: Record<string, LocalPackageFare>;
  source?: string;
  count?: number;
}

// Booking status type
export type BookingStatus = 
  | 'pending'
  | 'confirmed'
  | 'assigned'
  | 'payment_received'
  | 'payment_pending'
  | 'completed'
  | 'continued'
  | 'cancelled';

// Location interface - making lat/lng optional to fix type errors
export interface Location {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  isInVizag?: boolean;
  type?: string;
  city?: string;
  state?: string;
}

// Booking request interface
export interface BookingRequest {
  pickupLocation: string;
  dropLocation?: string;
  pickupDate: string;
  returnDate?: string | null;
  cabType: string;
  distance: number;
  tripType: string;
  tripMode: string;
  totalAmount: number;
  passengerName: string;
  passengerPhone: string;
  passengerEmail?: string;
  hourlyPackage?: string | null;
  notes?: string;
  tourId?: string; // Added for tour bookings
  userId?: string | number; // Added for user association
}

// Booking interface - adding bookingNumber field
export interface Booking {
  id: string | number; // Allow both string and number types
  bookingId?: string;
  bookingNumber?: string; // Added to fix errors
  pickupLocation: string;
  dropLocation?: string;
  pickupDate: string;
  returnDate?: string | null;
  cabType: string;
  distance: number;
  tripType: string;
  tripMode: string;
  totalAmount: number;
  passengerName: string;
  passengerPhone: string;
  passengerEmail?: string;
  status: BookingStatus;
  hourlyPackage?: string | null;
  createdAt?: string;
  updatedAt?: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  notes?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  amountPaid?: number;
  transactionId?: string;
}

// Dashboard metrics interface
export interface DashboardMetrics {
  totalBookings: number;
  activeRides: number;
  totalRevenue: number;
  upcomingRides: number;
  availableDrivers: number;
  busyDrivers: number;
  avgRating: number;
  availableStatuses?: BookingStatus[] | Record<string, BookingStatus> | string;
}

// Extended Tour fare interface with additional properties used in components
export interface TourFare {
  id: string | number; // Support both string and number types
  tourId?: string; // Required in some components
  tourName?: string; // Required in some components
  name: string;
  description?: string;
  price: number;
  cabType: string;
  duration: number;
  distance: number;
  isActive: boolean;
  // Vehicle-specific prices
  sedan?: number;
  ertiga?: number;
  innova?: number;
  tempo?: number;
  luxury?: number;
}

// Fare update request interface
export interface FareUpdateRequest {
  cabType?: string;
  price?: number;
  tripType?: string;
  fromLocation?: string;
  toLocation?: string;
  packageId?: string;
  // Add properties needed for tour fares
  tourId?: string;
  sedan?: number;
  ertiga?: number;
  innova?: number;
  tempo?: number;
  luxury?: number;
}

// User interface - make ID accept both string and number
export interface User {
  id: string | number; // Allow both string and number types
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'user' | 'driver';
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
  avatar?: string;
}

// Extended Vehicle pricing interface with additional properties
export interface VehiclePricing {
  id: string | number; // Allow both string and number types
  vehicleId: string;
  vehicleType?: string; // Added to fix errors
  name?: string;
  basePrice: number;
  pricePerKm: number;
  pricePerHour?: number;
  airportPickupPrice?: number;
  airportDropPrice?: number;
  minHours?: number;
  minKm?: number;
  isActive: boolean;
  nightHaltCharge?: number; // Added to fix errors
  driverAllowance?: number; // Added to fix errors
}

// Vehicle pricing update request
export interface VehiclePricingUpdateRequest {
  vehicleId: string;
  vehicleType?: string; // Added to match field in VehiclePricing
  basePrice?: number;
  pricePerKm?: number;
  pricePerHour?: number;
  airportPickupPrice?: number;
  airportDropPrice?: number;
  minHours?: number;
  minKm?: number;
  isActive?: boolean;
  nightHaltCharge?: number; // Added to match field in VehiclePricing
  driverAllowance?: number; // Added to match field in VehiclePricing
}

// Login request interface
export interface LoginRequest {
  email: string;
  password: string;
}

// Signup request interface
export interface SignupRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
}
