
export interface Location {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  city: string;
  state: string;
  type?: 'airport' | 'hotel' | 'railway' | 'tourist' | 'other' | 'train_station' | 'bus_station' | 'landmark';
  popularityScore?: number;
  isInVizag?: boolean;
}

export interface BookingRequest {
  pickupLocation: string;
  dropLocation: string;
  pickupDate: string;
  returnDate?: string | null;
  cabType: string;
  distance: number;
  tripType: string;
  tripMode: string;
  totalAmount: number;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  hourlyPackage?: string | null;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  pickupLocation: string;
  dropLocation: string;
  pickupDate: string;
  returnDate?: string;
  cabType: string;
  distance: number;
  tripType: string;
  tripMode: string;
  totalAmount: number;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  hourlyPackage?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'assigned' | 'in_progress' | 'payment_received' | 'payment_pending' | 'continued';
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  vehicleId?: string;
  billingAddress?: string;
  extraCharges?: {
    amount: number;
    description: string;
  }[];
  payment_status?: string;
  payment_method?: string;
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'assigned' | 'in_progress' | 'payment_received' | 'payment_pending' | 'continued';

export interface DashboardMetrics {
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  revenue: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

export type DriverStatus = 'available' | 'busy' | 'offline';

export interface Driver {
  id: number;
  name: string;
  phone: string;
  email: string;
  license_no: string;
  status: DriverStatus;
  total_rides?: number;
  earnings?: number;
  rating?: number;
  location: string;
  vehicle?: string;
  vehicle_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

export interface TourFare {
  id: number;
  vehicle_type: string;
  duration_hours: number;
  base_fare: number;
  per_km_rate: number;
  driver_allowance: number;
  created_at: string;
  updated_at: string;
}

export interface FareUpdateRequest {
  vehicle_type: string;
  base_fare: number;
  per_km_rate: number;
  driver_allowance: number;
}

export interface CommissionPayment {
  id: number;
  driver_id: number;
  booking_id: number;
  commission_amount: number;
  payment_status: string;
  payment_date?: string;
  created_at: string;
}

export interface CommissionSetting {
  id: number;
  vehicle_type: string;
  commission_percentage: number;
  base_commission: number;
  created_at: string;
  updated_at: string;
}

export interface PayrollEntry {
  id: number;
  driver_id: number;
  driver_name: string;
  month: string;
  year: number;
  base_salary: number;
  commission: number;
  bonus: number;
  deductions: number;
  total_amount: number;
  status: string;
  created_at: string;
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

export interface CancellationPolicy {
  id: number;
  name: string;
  description: string;
  hours_before: number;
  refund_percentage: number;
  active: boolean;
}

export interface PoolingRide {
  id: number;
  route: string;
  departure_time: string;
  arrival_time: string;
  available_seats: number;
  price_per_seat: number;
  driver_id: number;
  vehicle_id: number;
  status: string;
  created_at: string;
}

export interface PoolingBooking {
  id: number;
  ride_id: number;
  passenger_name: string;
  passenger_phone: string;
  passenger_email: string;
  seats_booked: number;
  total_amount: number;
  booking_status: string;
  payment_status: string;
  created_at: string;
}
