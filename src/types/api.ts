// src/types/api.ts
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'assigned'
  | 'payment_received'
  | 'payment_pending'
  | 'completed'
  | 'continued'
  | 'cancelled';

export type DriverStatus = 'available' | 'busy' | 'offline';

export interface Driver {
  id: number;
  name: string;
  phone: string;
  email: string;
  license_no?: string;
  license_number?: string;  // Alternative field name for compatibility
  vehicle?: string;
  vehicleNumber?: string;   // Added for compatibility with DriverAssignment component
  vehicle_id?: string;
  status?: DriverStatus;
  location?: string;
  total_rides?: number;
  earnings?: number;
  rating?: number;
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
  billingAddress?: string;
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

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface DashboardData {
  userDetails: {
    name: string;
    email: string;
    phone?: string;
  };
  recentBookings: Booking[];
  upcomingBookings: Booking[];
}

export interface DashboardMetrics {
  totalBookings: number;
  activeRides: number;
  totalRevenue: number;
  availableDrivers: number;
  busyDrivers: number;
  avgRating: number;
  upcomingRides: number;
  availableStatuses?: string[];
  currentFilter?: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  phone?: string;
  createdAt: string;
}

export interface FareData {
  id: number;
  tourName: string;
  description?: string;
  oneWayPrice: number;
  roundTripPrice: number;
  distanceKm?: number;
  isActive: boolean;
  tourType?: string;
  tourDuration?: string;
  vehiclePrices?: {
    [key: string]: {
      oneWayPrice: number;
      roundTripPrice: number;
    };
  };
}

export interface VehiclePricingData {
  id: number;
  vehicleType: string;
  vehicleId?: string;  // Added to support both column names
  basePrice: number;
  pricePerKm: number;
  hourlyPrice?: number;
  isActive: boolean;
  capacity?: number;
  acType?: string;
  description?: string;
  imageUrl?: string;
  nightHaltCharge?: number;
  driverAllowance?: number;
}

// New interfaces for different fare types
export interface OutstationFareData {
  basePrice: number;
  pricePerKm: number;
  roundTripBasePrice: number;
  roundTripPricePerKm: number;
  nightHaltCharge: number;
  driverAllowance: number;
}

export interface LocalPackageFareData {
  package4hr40km: number;
  package8hr80km: number;
  package10hr100km: number;
  extraKmRate: number;
  extraHourRate: number;
  // Alternative field names for flexibility
  price4hrs40km?: number;
  price8hrs80km?: number;
  price10hrs100km?: number;
  priceExtraKm?: number;
  priceExtraHour?: number;
}

export interface AirportFareData {
  basePrice: number;
  pricePerKm: number;
  pickupPrice: number;
  dropPrice: number;
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier4Price: number;
  extraKmCharge: number;
}

export interface Location {
  id?: string;
  name?: string;
  address: string;
  lat?: number;
  lng?: number;
  isInVizag?: boolean;
  type?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
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
  passengerName?: string;
  passengerPhone?: string;
  passengerEmail?: string;
  hourlyPackage?: string | null;
  tourId?: string;
  userId?: number; // Added this property to fix the TypeScript error
}

export interface TourFare {
  id: number;
  tourId: string;
  tourName: string;
  sedan: number;
  ertiga: number;
  innova: number;
  tempo: number;
  luxury: number;
}

export interface FareUpdateRequest {
  tourId: string;
  sedan: number;
  ertiga: number;
  innova: number;
  tempo: number;
  luxury: number;
}

export type VehiclePricing = VehiclePricingData;

export interface VehiclePricingUpdateRequest {
  vehicleType: string;
  vehicleId?: string;  // Added to support both column names
  basePrice: number;
  pricePerKm: number;
  nightHaltCharge?: number;
  driverAllowance?: number;
}

// Outstation fare update request
export interface OutstationFareUpdateRequest {
  vehicleId: string;
  basePrice: number;
  pricePerKm: number;
  roundTripBasePrice: number;
  roundTripPricePerKm: number;
  nightHaltCharge: number;
  driverAllowance: number;
}

// Local package fare update request
export interface LocalPackageFareUpdateRequest {
  vehicleId: string;
  package4hr40km?: number;
  package8hr80km?: number;
  package10hr100km?: number;
  extraKmRate?: number;
  extraHourRate?: number;
  // Alternative field names for flexibility
  price4hrs40km?: number;
  price8hrs80km?: number;
  price10hrs100km?: number;
  priceExtraKm?: number;
  priceExtraHour?: number;
}

// Airport fare update request
export interface AirportFareUpdateRequest {
  vehicleId: string;
  basePrice: number;
  pricePerKm: number;
  pickupPrice: number;
  dropPrice: number;
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier4Price: number;
  extraKmCharge: number;
}

// Booking update request
export interface BookingUpdateRequest {
  passengerName?: string;
  passengerPhone?: string;
  passengerEmail?: string;
  pickupLocation?: string;
  dropLocation?: string;
  pickupDate?: string;
  status?: BookingStatus;
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

// Add new interfaces related to reporting

export interface ReportPeriod {
  daily: 'daily';
  weekly: 'weekly';
  monthly: 'monthly';
  quarterly: 'quarterly';
  yearly: 'yearly';
  custom: 'custom';
  last_month: 'last_month';
  last_year: 'last_year';
}

export interface ReportType {
  summary: 'summary';
  detailed: 'detailed';
  financial: 'financial';
  gst: 'gst';
}

export interface GstInvoice {
  id: number;
  invoiceNumber: string;
  customerName: string;
  gstNumber: string;
  companyName: string;
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

export interface GstSummary {
  taxableAmount: number;
  gstRate: string;
  gstAmount: number;
  totalWithGst: number;
}

export interface RevenueSummary {
  totalRevenue: number;
  revenueByTripType: Record<string, number>;
  dailyRevenue: { date: string; total: number }[];
  gstSummary?: GstSummary;
}

export interface BookingSummary {
  totalBookings: number;
  bookingsByStatus: Record<string, number>;
  dailyBookings: { date: string; count: number }[];
}

export interface ReportResponse {
  status: string;
  reportType: string;
  period: string;
  startDate: string;
  endDate: string;
  data: any;
}
