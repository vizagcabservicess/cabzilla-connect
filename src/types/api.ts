
// API Types

export type BookingStatus = 'pending' | 'confirmed' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'no-show' | 'payment_pending' | 'payment_received' | 'continued';

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
  passengerEmail: string;
  hourlyPackage?: string | null;
  tourId?: string | null;
  // Admin-specific fields
  adminNotes?: string;
  discountAmount?: number;
  discountType?: string | null;
  discountValue?: number;
  isPaid?: boolean;
  createdBy?: string;
}

export interface Booking {
  id: number;
  userId?: number | null;
  bookingNumber: string;
  pickupLocation: string;
  dropLocation?: string;
  pickupDate: string;
  returnDate?: string | null;
  cabType: string;
  distance?: number;
  tripType: string;
  tripMode: string;
  totalAmount: number;
  status: BookingStatus;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  hourlyPackage?: string;
  tourId?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  adminNotes?: string;
  extraCharges?: Array<{
    description: string;
    amount: number;
  }>;
  isPaid?: boolean;
  paymentMethod?: string;
  payment_method?: string; // Legacy field - will be deprecated
  discountAmount?: number;
  discountType?: string;
  discountValue?: number;
  billingAddress?: string;
  payment_status?: string; // Legacy field - will be deprecated
  createdAt?: string;
  updatedAt?: string;
}

export interface BookingDetails {
  id: number;
  bookingNumber: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  pickupLocation: string;
  dropLocation?: string;
  pickupDate: string;
  cabType: string;
  tripType: string;
  tripMode?: string;
  status: BookingStatus;
  totalAmount: number;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  gstEnabled?: boolean;
  gstDetails?: {
    gstNumber: string;
    companyName: string;
    companyAddress: string;
  };
  billingAddress?: string;
  extraCharges?: {
    amount: number;
    description: string;
  }[];
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

export interface Location {
  id: number;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
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

export interface VehiclePricing {
  id: number;
  vehicleId: number;
  vehicleType: string;
  localRate: number;
  outstationRate: number;
  airportTransferRate: number;
}

export interface VehiclePricingUpdateRequest {
  vehicleId: number;
  localRate?: number;
  outstationRate?: number;
  airportTransferRate?: number;
}

export interface FareUpdateRequest {
  id?: number;
  vehicleType: string;
  localRate?: number;
  outstationRate?: number;
  airportRate?: number;
}

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
  topLocations: {
    name: string;
    count: number;
  }[];
  recentBookings: Booking[];
  bookingStats: {
    labels: string[];
    data: number[];
  };
  vehicleStats: {
    name: string;
    value: number;
  }[];
}

export interface TourFare {
  id: number;
  tourId: string;
  vehicleType: string;
  rate: number;
}
