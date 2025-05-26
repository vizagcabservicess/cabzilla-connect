
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
  vehicleId?: string;
  adminNotes?: string;
  extraCharges?: Array<{
    description: string;
    amount: number;
  }>;
  isPaid?: boolean;
  paymentMethod?: string;
  payment_method?: string;
  paymentStatus?: string;
  discountAmount?: number;
  discountType?: string;
  discountValue?: number;
  billingAddress?: string;
  payment_status?: string;
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
  license_number?: string;
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
  bookingId?: number;
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
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  address: string;
  lat?: number;
  lng?: number;
  city?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
  imageUrl?: string;
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
  basePrice?: number;
  pricePerKm?: number;
  perKmRate?: number;
  nightHaltCharge?: number;
  driverAllowance?: number;
}

export interface VehiclePricingUpdateRequest {
  vehicleId: number;
  localRate?: number;
  outstationRate?: number;
  airportTransferRate?: number;
  vehicleType?: string;
  basePrice?: number;
  pricePerKm?: number;
}

export interface FareUpdateRequest {
  id?: number;
  vehicleType: string;
  localRate?: number;
  outstationRate?: number;
  airportRate?: number;
  tourId?: string;
  sedan?: number;
  ertiga?: number;
  innova?: number;
  tempo?: number;
  luxury?: number;
}

export interface DashboardMetrics {
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  activeRides?: number;
  totalRevenue?: number;
  upcomingRides?: number;
  availableDrivers?: number;
  busyDrivers?: number;
  avgRating?: number;
  availableStatuses?: BookingStatus[];
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
  tourName?: string;
  sedan?: number;
  ertiga?: number;
  innova?: number;
  tempo?: number;
  luxury?: number;
}

export interface FareBreakdown {
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  waitingCharges: number;
  tollCharges: number;
  otherCharges: number;
  discount: number;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  totalFare: number;
  roundTrip?: boolean;
  priceExtraKm?: number;
  priceExtraHour?: number;
}

// Commission Types
export interface CommissionSetting {
  id: number;
  vehicleType: string;
  defaultPercentage: number;
  default_percentage?: number; // For backwards compatibility
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionPayment {
  id: number;
  bookingId: number;
  bookingNumber?: string;
  driverId: number;
  driverName: string;
  vehicleType: string;
  totalAmount: number;
  commissionPercentage: number;
  commissionAmount: number;
  payoutAmount: number;
  status: 'pending' | 'paid' | 'cancelled';
  paymentDate?: string;
  createdAt: string;
  updatedAt: string;
}

// Payment Types
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer' | 'wallet' | 'cheque' | 'razorpay' | 'other';

export interface Payment {
  id: number;
  bookingId: number;
  bookingNumber?: string;
  customerName?: string;
  amount: number;
  method: PaymentMethod;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentFilterParams {
  status?: string;
  method?: string;
  dateFrom?: string;
  dateTo?: string;
}
