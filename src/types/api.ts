
// API response types for the application

// Define BookingStatus as a string union type
export type BookingStatus = 
  | 'pending'
  | 'confirmed' 
  | 'assigned'
  | 'payment_received'
  | 'payment_pending'
  | 'completed'
  | 'continued'
  | 'cancelled';

export interface TourFare {
  id: number;
  tourId: string;
  tourName: string;
  sedan: number;
  ertiga: number;
  innova: number;
  tempo: number;
  luxury: number;
  [key: string]: number | string; // Allow dynamic vehicle columns
}

export interface FareUpdateRequest {
  tourId: string;
  tourName?: string;
  [key: string]: any; // Allow dynamic vehicle fields
}

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
  distance: number;
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
  phone: string | null;
  role: 'admin' | 'user';
  createdAt?: string; // Adding createdAt property that was missing
}

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
  passengerName?: string;
  passengerPhone?: string;
  passengerEmail?: string;
  hourlyPackage?: string | null;
  tourId?: string; // Adding tourId for tour bookings
}

export interface SignupRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface DashboardMetrics {
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  todayBookings: number;
  recentBookings: Booking[];
  monthlyRevenue: number;
  totalRevenue: number;
  
  // Adding missing properties that were causing TypeScript errors
  activeDrivers?: number;
  activeRides?: number; // For active/ongoing rides
  availableDrivers?: number;
  busyDrivers?: number;
  upcomingRides?: number;
  avgRating?: number;
  
  // For status filtering
  availableStatuses?: Array<BookingStatus | 'all'>;
  currentFilter?: BookingStatus | 'all';
  
  topLocations?: {
    location: string;
    count: number;
  }[];
}

export interface Location {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  isInVizag?: boolean;
  city?: string;
  state?: string;
  type?: string;
  popularityScore?: number;
}
