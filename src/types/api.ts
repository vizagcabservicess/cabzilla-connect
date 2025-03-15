
// User related types
export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface BookingRequest {
  pickupLocation: string;
  dropLocation?: string;
  pickupDate: string;
  returnDate?: string;
  cabType: string;
  distance: number;
  tripType: 'outstation' | 'local' | 'airport' | 'tour';
  tripMode: 'one-way' | 'round-trip';
  totalAmount: number;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  hourlyPackage?: string;
  tourId?: string;
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
