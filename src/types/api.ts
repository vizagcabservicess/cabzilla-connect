
export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  phone: string;
  role?: 'customer' | 'guest' | 'provider' | 'admin';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface BookingRequest {
  pickupLocation: string;
  dropLocation?: string;
  pickupDate: string;
  pickupTime?: string;
  returnDate?: string;
  tripType: string;
  tripMode?: string;
  vehicleType: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: User;
  token?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'driver' | 'admin' | 'guest' | 'provider';
  is_active: boolean;
  imageUrl?: string;
}

export type BookingStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'assigned' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled'
  | 'payment_pending'
  | 'payment_received'
  | 'continued';

export interface Location {
  city: string;
  state: string;
  lat: number;
  lng: number;
  address?: string;
  placeId?: string;
}

export interface Booking {
  id: number;
  user_id: number;
  pickup_location: string | Location;
  drop_location: string | Location;
  pickup_date: string;
  return_date?: string;
  trip_type: string;
  trip_mode: string;
  vehicle_type: string;
  fare: number;
  status: BookingStatus;
  payment_status: string;
  vehicleId?: string;
  created_at: string;
  updated_at: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  passengerName?: string;
  passengerPhone?: string;
  passengerEmail?: string;
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  license_number: string;
  experience_years: number;
  status: 'available' | 'busy' | 'offline';
  rating: number;
  total_trips: number;
  created_at: string;
  updated_at: string;
}

export interface DashboardMetrics {
  totalBookings: number;
  totalRevenue: number;
  activeRides: number;
  upcomingRides: number;
  availableDrivers: number;
  busyDrivers: number;
  avgRating: number;
  availableStatuses: BookingStatus[];
}
