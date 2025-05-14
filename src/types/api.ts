
// If this file doesn't exist, we'll create it with the needed types
export type BookingStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'assigned' 
  | 'in-progress' 
  | 'completed' 
  | 'cancelled'
  | 'payment_received'
  | 'payment_pending'
  | 'continued';

export type DriverStatus = 'available' | 'busy' | 'offline';

export interface Booking {
  id: number;
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
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  createdAt: string;
  updatedAt: string;
  userId?: number;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  notes?: string;
  billingAddress?: string;
  payment_status?: string;  // Added payment_status property
  payment_method?: string;  // Added payment_method property
  extraCharges?: {
    amount: number;
    description: string;
  }[];
  gstEnabled?: boolean;
  gstDetails?: {
    gstNumber: string;
    companyName: string;
    companyAddress: string;
  };
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
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  userId?: number;
  notes?: string;
  [key: string]: any; // To allow for additional properties
}

export interface Driver {
  id: number | string;
  name: string;
  phone: string;
  email?: string;
  license_no?: string;
  license_number?: string;
  vehicleNumber?: string;
  vehicle?: string;
  vehicle_id?: string;
  status?: DriverStatus;
  profileImage?: string;
  location?: string;
}

export interface Location {
  id: string | number;
  name: string;
  type?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  lat?: number;
  lng?: number;
  popularity?: number;
  isInVizag?: boolean;
}

// DashboardMetrics interface
export interface DashboardMetrics {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  activeRides?: number;
  upcomingRides?: number;
  totalRevenue?: number;
  availableDrivers?: number;
  busyDrivers?: number;
  avgRating?: number;
  availableStatuses?: string[] | Record<string, string>;
  revenue: {
    total: number;
    today: number;
    weekly: number;
    monthly: number;
  };
  popularRoutes: {
    route: string;
    count: number;
  }[];
  recentBookings: Booking[];
}

// GST Report Types
export interface GstInvoice {
  id: number | string;
  invoiceNumber: string;
  customerName: string;
  gstNumber?: string;
  companyName?: string;
  companyAddress?: string;
  taxableValue: number;
  gstRate: string;
  gstAmount: number;
  totalAmount: number;
  invoiceDate: string;
}

export interface GstReportData {
  gstInvoices: GstInvoice[];
  summary: {
    totalInvoices: number;
    totalTaxableValue: number;
    totalGstAmount: number;
    totalWithGst: number;
  };
}

// User related interfaces
export interface User {
  id: number | string;
  name: string;
  email: string;
  phone?: string;
  role: 'user' | 'admin' | 'driver';
  createdAt?: string;
  updatedAt?: string;
  address?: string;
  profileImage?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

// Fare related interfaces
export interface TourFare {
  id: number | string;
  name: string;
  description?: string;
  basePrice: number;
  perKmRate?: number;
  perHourRate?: number;
  destination?: string;
  vehicleType?: string;
  isActive: boolean;
  
  // Additional properties used in FareManagement component
  tourId: string; 
  tourName: string;
  sedan: number;
  ertiga: number;
  innova: number;
  tempo: number;
  luxury: number;
}

export interface VehiclePricing {
  id: number | string;
  vehicleType: string;
  basePrice: number;
  perKmRate: number;
  perHourRate?: number;
  minHours?: number;
  capacityText?: string;
  isActive: boolean;
  nightHaltCharge?: number;
  driverAllowance?: number;
  pricePerKm?: number;
}

export interface FareUpdateRequest {
  id?: number | string;
  basePrice?: number;
  perKmRate?: number;
  perHourRate?: number;
  isActive?: boolean;
  tourId?: string;
  sedan?: number;
  ertiga?: number; 
  innova?: number;
  tempo?: number;
  luxury?: number;
}

export interface VehiclePricingUpdateRequest extends FareUpdateRequest {
  vehicleType?: string;
  capacityText?: string;
  minHours?: number;
  pricePerKm?: number;
  nightHaltCharge?: number;
  driverAllowance?: number;
}
