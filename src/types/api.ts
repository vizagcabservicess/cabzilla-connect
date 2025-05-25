
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
  vehicleId?: string | number;
  adminNotes?: string;
  extraCharges?: Array<{
    description: string;
    amount: number;
  }>;
  isPaid?: boolean;
  paymentMethod?: string;
  payment_method?: string;
  paymentStatus?: string;
  payment_status?: string;
  discountAmount?: number;
  discountType?: string;
  discountValue?: number;
  billingAddress?: string;
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
  vehicleId?: string | number;
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
  bookingId?: number | string;
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
  id: string;
  name: string;
  type?: 'airport' | 'train_station' | 'bus_station' | 'hotel' | 'landmark' | 'other';
  address: string;
  lat: number;
  lng: number;
  city: string;
  state: string;
  isInVizag?: boolean;
  popularityScore?: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  imageUrl?: string;
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
  basePrice?: number;
  pricePerKm?: number;
  perKmRate?: number;
  nightHaltCharge?: number;
  driverAllowance?: number;
}

export interface VehiclePricingUpdateRequest {
  vehicleId: number;
  vehicleType?: string;
  localRate?: number;
  outstationRate?: number;
  airportTransferRate?: number;
  basePrice?: number;
  pricePerKm?: number;
  perKmRate?: number;
  nightHaltCharge?: number;
  driverAllowance?: number;
}

export interface FareUpdateRequest {
  id?: number;
  vehicleType: string;
  tourId?: string;
  localRate?: number;
  outstationRate?: number;
  airportRate?: number;
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
  revenue: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  availableStatuses?: BookingStatus[];
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
  tourName?: string;
  vehicleType: string;
  rate: number;
  sedan?: number;
  ertiga?: number;
  innova?: number;
  tempo?: number;
  luxury?: number;
}

// Enhanced pooling types
export interface CancellationPolicy {
  id: string;
  name: string;
  description: string;
  timeBeforeDeparture: number;
  refundPercentage: number;
  cancellationFee: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionSetting {
  id: string;
  name: string;
  description?: string;
  defaultPercentage: number;
  default_percentage?: number;
  isActive: boolean;
  is_active?: boolean;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
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

export interface PaymentFilterParams {
  status?: string;
  method?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface Payment {
  id: string | number;
  bookingId: string;
  amount: number;
  method: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'wallet' | 'cheque' | 'razorpay' | 'other';
  status: 'pending' | 'partial' | 'paid' | 'cancelled';
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FareBreakdown {
  basePrice: number;
  driverAllowance?: number;
  nightCharges?: number;
  extraDistanceFare?: number;
  extraHourCharge?: number;
  airportFee?: number;
  priceExtraKm?: number;
  priceExtraHour?: number;
  extraKmCharge?: number;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface DisputeCase {
  id: string;
  bookingId: string;
  reportedBy: string;
  category: string;
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface KYCDocument {
  id: string;
  driverId: string;
  documentType: 'license' | 'rc' | 'insurance' | 'aadhar' | 'pan';
  documentNumber: string;
  documentUrl: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  verifiedAt?: string;
  createdAt: string;
}

export interface RatingReview {
  id: string;
  bookingId: string;
  fromUserId: string;
  toUserId: string;
  rating: number;
  review?: string;
  createdAt: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'whatsapp' | 'push';
  subject?: string;
  content: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollEntry {
  id: string;
  driverId: string | number;
  baseSalary: number;
  incentives: number;
  deductions: number;
  totalAmount: number;
  payPeriodStart: string;
  payPeriodEnd: string;
  status: 'pending' | 'processed' | 'paid';
  createdAt: string;
  updatedAt: string;
}
