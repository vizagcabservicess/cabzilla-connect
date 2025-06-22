
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
  cabType?: string; // Add cabType property
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
  imageUrl?: string; // Add imageUrl property
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
  id?: string;
  name?: string;
  type?: string;
  popularityScore?: number;
  city: string;
  state: string;
  lat: number;
  lng: number;
  address?: string;
  placeId?: string;
}

export interface Booking {
  id: number;
  bookingNumber?: string; // Add bookingNumber property
  user_id: number;
  pickup_location: string | Location;
  pickupLocation?: string; // Add camelCase alias
  drop_location?: string | Location;
  dropLocation?: string; // Add camelCase alias
  pickup_date: string;
  pickupDate?: string; // Add camelCase alias
  return_date?: string;
  trip_type: string;
  tripType?: string; // Add camelCase alias
  trip_mode?: string;
  tripMode?: string; // Add camelCase alias
  vehicle_type: string;
  cabType?: string; // Add cabType property
  fare: number;
  totalAmount?: number; // Add totalAmount property
  status: BookingStatus;
  payment_status: string;
  vehicleId?: string;
  vehicleNumber?: string; // Add vehicleNumber property
  created_at: string;
  updated_at: string;
  updatedAt?: string; // Add camelCase alias
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  passengerName?: string;
  passengerPhone?: string;
  passengerEmail?: string;
  driverName?: string; // Add driverName property
  driverPhone?: string; // Add driverPhone property
  billingAddress?: string; // Add billingAddress property
  extraCharges?: Array<{ // Add extraCharges property
    amount: number;
    description: string;
  }>;
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
