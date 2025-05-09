
// Report date range type
export interface ReportDateRange {
  from: Date | undefined;
  to: Date | undefined;
}

// Base report filter parameters
export interface ReportFilterParams {
  reportType: string;
  dateRange?: ReportDateRange;
  periodFilter?: string;
  withGst?: boolean;
  paymentMethod?: string;
  onlyGstEnabled?: boolean;
}

// Booking report data types
export interface BookingStatusCount {
  completed: number;
  cancelled: number;
  confirmed: number;
  assigned: number;
  pending: number;
}

export interface BookingsByDate {
  date: string;
  count: number;
}

export interface BookingsReportData {
  totalBookings: number;
  bookingsByStatus: BookingStatusCount;
  dailyBookings: BookingsByDate[];
}

// Revenue report data types
export interface RevenueByTripType {
  [tripType: string]: number;
}

export interface RevenueByPaymentMethod {
  [method: string]: number;
}

export interface DailyRevenue {
  date: string;
  total: number;
}

export interface GstSummary {
  taxableAmount: number;
  gstRate: string;
  gstAmount: number;
  totalWithGst: number;
}

export interface RevenueReportData {
  totalRevenue: number;
  revenueByTripType: RevenueByTripType;
  revenueByPaymentMethod: RevenueByPaymentMethod;
  dailyRevenue: DailyRevenue[];
  gstSummary?: GstSummary;
}

// Driver report data types
export interface DriverData {
  driver_id: number;
  driver_name: string;
  total_trips: number;
  total_earnings: number;
  rating: number;
  average_trip_value: number;
}

export interface DriversReportData {
  drivers: DriverData[];
}

// Vehicle report data types
export interface VehicleData {
  vehicleType: string;
  bookings: number;
  revenue: number;
}

export interface VehiclesReportData {
  vehicles: VehicleData[];
}

// GST report data types
export interface GstInvoiceData {
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

export interface GstReportSummary {
  totalInvoices: number;
  totalTaxableValue: number;
  totalGstAmount: number;
  totalWithGst: number;
}

export interface GstReportData {
  gstInvoices: GstInvoiceData[];
  summary: GstReportSummary;
}

// Non-GST report data types
export interface NonGstBillData {
  id: string;
  billNumber: string;
  date: string;
  customerName: string;
  amount: number;
  description: string;
  paymentStatus: string;
  paymentMethod: string | null;
}

export interface NonGstReportData {
  bills: NonGstBillData[];
}

// Maintenance report data types
export interface MaintenanceRecord {
  id: number;
  vehicleId: string;
  date: string;
  serviceType: string;
  description: string;
  cost: number;
  vendor: string;
  nextServiceDate: string;
}

export interface CostByVehicle {
  [vehicleId: string]: number;
}

export interface CostByType {
  [serviceType: string]: number;
}

export interface MaintenanceReportData {
  maintenance: MaintenanceRecord[];
  totalCost: number;
  costByVehicle: CostByVehicle;
  costByType: CostByType;
}

// Ledger report data types
export interface LedgerEntry {
  id: number;
  date: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  paymentMethod: string | null;
  reference: string;
  balance: number;
}

export interface CategoryBreakdown {
  [category: string]: {
    income: number;
    expense: number;
  };
}

export interface LedgerReportData {
  entries: LedgerEntry[];
  totalIncome: number;
  totalExpense: number;
  netChange: number;
  latestBalance: number;
  byCategory: CategoryBreakdown;
}

// Fuel report data types
export interface FuelRecord {
  id: number;
  vehicleId: string;
  vehicleName: string;
  vehicleNumber: string;
  date: string;
  liters: number;
  pricePerLiter: number;
  cost: number;
  odometer?: number;
  fuelStation?: string;
  paymentMethod?: string;
}

export interface VehicleFuelSummary {
  liters: number;
  cost: number;
  fillCount: number;
}

export interface StationSummary {
  liters: number;
  cost: number;
  fillCount: number;
}

export interface PaymentMethodSummary {
  [method: string]: number;
}

export interface FuelsReportData {
  fuels: FuelRecord[];
  totalLiters: number;
  totalCost: number;
  avgPricePerLiter: number;
  byVehicle: {
    [vehicleId: string]: VehicleFuelSummary;
  };
  byStation: {
    [station: string]: StationSummary;
  };
  byPaymentMethod: PaymentMethodSummary;
}

export type ReportData = 
  | BookingsReportData
  | RevenueReportData
  | DriversReportData
  | VehiclesReportData
  | GstReportData
  | NonGstReportData
  | MaintenanceReportData
  | LedgerReportData
  | FuelsReportData;

// API response types
export interface ApiSuccessResponse<T> {
  status: 'success';
  message: string;
  data: T;
  timestamp: number;
}

export interface ApiErrorResponse {
  status: 'error';
  message: string;
  errors: any[];
  timestamp: number;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
