
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
  cabType?: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  distance?: number; // Add distance property
  totalAmount?: number; // Add totalAmount property
  hourlyPackage?: string | null; // Add hourlyPackage property
  adminNotes?: string; // Add adminNotes property
  discountAmount?: number; // Add discountAmount property
  discountType?: string | null; // Add discountType property
  discountValue?: number; // Add discountValue property
  isPaid?: boolean; // Add isPaid property
  createdBy?: string; // Add createdBy property
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
  bookingNumber?: string;
  user_id: number;
  pickup_location: string | Location;
  pickupLocation?: string;
  drop_location?: string | Location;
  dropLocation?: string;
  pickup_date: string;
  pickupDate?: string;
  return_date?: string;
  trip_type: string;
  tripType?: string;
  trip_mode?: string;
  tripMode?: string;
  vehicle_type: string;
  cabType?: string;
  fare: number;
  totalAmount?: number;
  status: BookingStatus;
  payment_status: string;
  payment_method?: string; // Add payment_method property
  vehicleId?: string;
  vehicleNumber?: string;
  created_at: string;
  updated_at: string;
  updatedAt?: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  passengerName?: string;
  passengerPhone?: string;
  passengerEmail?: string;
  driverName?: string;
  driverPhone?: string;
  billingAddress?: string;
  extraCharges?: Array<{
    amount: number;
    description: string;
  }>;
  paymentStatus?: string; // Add paymentStatus as alias
}

export type DriverStatus = 'available' | 'busy' | 'offline';

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  license_number: string;
  license_no?: string; // Add license_no as alias
  experience_years: number;
  status: DriverStatus;
  rating: number;
  total_trips: number;
  created_at: string;
  updated_at: string;
  location?: string; // Add location property
  vehicle?: string; // Add vehicle property
  vehicle_id?: string; // Add vehicle_id property
}

export interface DashboardMetrics {
  totalBookings: number;
  totalRevenue: number;
  revenue?: number; // Add revenue as alias
  activeRides: number;
  upcomingRides: number;
  availableDrivers: number;
  busyDrivers: number;
  avgRating: number;
  availableStatuses: BookingStatus[];
}

// Add missing type exports for tour management
export interface TourData {
  id: string;
  name: string;
  description: string;
  duration: string;
  price: number;
  image?: string;
  gallery?: TourGalleryItem[];
  itinerary?: TourItineraryDay[];
}

export interface TourManagementRequest {
  name: string;
  description: string;
  duration: string;
  price: number;
  image?: string;
  gallery?: TourGalleryItem[];
  itinerary?: TourItineraryDay[];
}

export interface TourGalleryItem {
  url: string;
  caption?: string;
  alt?: string;
}

export interface TourItineraryDay {
  day: number;
  title: string;
  description: string;
  activities: string[];
}

export interface TourFare {
  tourId: string;
  vehicleId: string;
  price: number;
}

export interface FareUpdateRequest {
  vehicleId: string;
  fareType: string;
  price: number;
}

export interface VehiclePricing {
  vehicleType: string;
  vehicleId?: string;
  basePrice: number;
  pricePerKm: number;
  nightHaltCharge: number;
  driverAllowance: number;
  roundtripBasePrice?: number;
  roundtripPricePerKm?: number;
  localPackage4hr?: number;
  localPackage8hr?: number;
  localPackage10hr?: number;
  extraKmCharge?: number;
  extraHourCharge?: number;
  price4hrs40km?: number;
  price8hrs80km?: number;
  price10hrs100km?: number;
  priceExtraKm?: number;
  priceExtraHour?: number;
  airportBasePrice?: number;
  airportPricePerKm?: number;
  airportDropPrice?: number;
  airportPickupPrice?: number;
  airportTier1Price?: number;
  airportTier2Price?: number;
  airportTier3Price?: number;
  airportTier4Price?: number;
  airportExtraKmCharge?: number;
}

export interface VehiclePricingUpdateRequest {
  vehicleId: string;
  pricing: Partial<VehiclePricing>;
}

// Add commission-related interfaces
export interface CommissionPayment {
  id: string;
  bookingId: string;
  bookingNumber?: string; // Add bookingNumber property
  vehicleId: string;
  driverId?: string;
  amount: number;
  commissionAmount: number;
  commissionPercentage: number;
  status: 'pending' | 'paid' | 'cancelled';
  paymentDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
