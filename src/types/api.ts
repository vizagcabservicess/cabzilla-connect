
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
  distance?: number;
  totalAmount?: number;
  hourlyPackage?: string | null;
  adminNotes?: string;
  discountAmount?: number;
  discountType?: string | null;
  discountValue?: number;
  isPaid?: boolean;
  createdBy?: string;
  // Optional GST details captured during guest form submission
  gstEnabled?: boolean;
  gstDetails?: {
    gstNumber?: string;
    companyName?: string;
    companyAddress?: string;
    companyEmail?: string;
  };
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
  role: 'guest' | 'admin' | 'super_admin' | 'driver' | 'user' | 'customer' | 'provider';
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
  payment_method?: string;
  advance_paid_amount?: number;
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
  paymentStatus?: string;
  discountAmount?: number;
  discountType?: string;
  discountValue?: number;
  adminNotes?: string;
  // GST fields (optional)
  gstEnabled?: boolean;
  gstDetails?: {
    gstNumber?: string;
    companyName?: string;
    companyAddress?: string;
    companyEmail?: string;
  };
}

export type DriverStatus = 'available' | 'busy' | 'offline';

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  license_number: string;
  license_no?: string;
  experience_years: number;
  status: DriverStatus;
  rating: number;
  total_trips: number;
  created_at: string;
  updated_at: string;
  location?: string;
  vehicle?: string;
  vehicle_id?: string;
}

export interface DashboardMetrics {
  totalBookings: number;
  totalRevenue: number;
  revenue?: number;
  activeRides: number;
  upcomingRides: number;
  availableDrivers: number;
  busyDrivers: number;
  avgRating: number;
  availableStatuses: BookingStatus[];
}

export interface TourData {
  id: string;
  tourId?: string;
  name: string;
  tourName?: string;
  description: string;
  duration: string;
  timeDuration?: string;
  price: number;
  distance?: number;
  days?: number;
  image?: string;
  imageUrl?: string;
  gallery?: TourGalleryItem[];
  itinerary?: TourItineraryDay[];
  inclusions?: string[];
  exclusions?: string[];
  pricing?: { [vehicleId: string]: number };
}

export interface TourManagementRequest {
  tourId?: string;
  name: string;
  tourName?: string;
  description: string;
  duration: string;
  timeDuration?: string;
  price: number;
  distance?: number;
  days?: number;
  image?: string;
  imageUrl?: string;
  gallery?: TourGalleryItem[];
  itinerary?: TourItineraryDay[];
  inclusions?: string[];
  exclusions?: string[];
  pricing?: { [vehicleId: string]: number };
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

export interface CommissionPayment {
  id: string;
  bookingId: string;
  bookingNumber?: string;
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
