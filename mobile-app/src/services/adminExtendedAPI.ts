/**
 * Extended Admin API - mirrors web app admin endpoints for full native admin.
 * Create Booking, Group Tours, Fleet, Fares, Commission, Fuel, Maintenance,
 * Ledger, Expenses, Payroll, Payments, Users, Reports.
 */
import axios from 'axios';
import { Platform } from 'react-native';
import { authAPI } from './authAPI';
import { API_BASE_URL, WEB_APP_BASE_URL } from '../config';

const getBase = () => {
  if (API_BASE_URL) return API_BASE_URL;
  if (Platform.OS === 'web') return '';
  return WEB_APP_BASE_URL || 'https://www.vizagtaxihub.com';
};

async function authHeaders() {
  const token = await authAPI.getStoredToken();
  if (!token) throw new Error('Not authenticated');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// --- Create Booking ---
export interface AdminCreateBookingRequest {
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
  passengerCountryCode?: string;
  passengerEmail: string;
  additionalRequirements?: string;
  distance?: number;
  totalAmount?: number;
  hourlyPackage?: string | null;
  airportDirection?: 'from-airport' | 'to-airport';
  createdByAdmin?: boolean;
  discount?: number;
  discountAmount?: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  isPaid?: boolean;
  partialPaymentReceived?: boolean;
  partialPaymentAmount?: number;
  tourId?: string;
}

// --- Group Tours ---
export interface GroupTour {
  id: number;
  title?: string | null;
  pickup_location: string;
  dropoff_location: string;
  travel_date: string;
  price_per_seat: number;
  capacity: number;
  available_seats: number;
}

export interface GroupTourBooking {
  id: number;
  booking_number: string;
  tour_id: number;
  pickup_location: string;
  dropoff_location: string;
  travel_date: string;
  total_amount: number;
  seat_count: number;
  customer_name: string;
  customer_phone: string;
  status: string;
}

// --- Ledger ---
export interface LedgerEntry {
  id: string | number;
  date: string;
  description: string;
  type: 'income' | 'expense' | 'emi';
  amount: number;
  category: string;
  payment_method?: string;
}

// --- Users ---
export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  is_active?: boolean;
}

// --- Reports ---
export interface ReportData {
  summary?: { totalBookings?: number; totalRevenue?: number; [key: string]: unknown };
  bookings?: unknown[];
  [key: string]: unknown;
}

export const adminExtendedAPI = {
  /** Create booking (admin) */
  createBooking: async (data: AdminCreateBookingRequest) => {
    const base = getBase();
    const headers = await authHeaders();
    const payload = { ...data, createdByAdmin: true };
    const res = await axios.post(`${base}/api/admin/create-booking.php`, payload, {
      headers,
      timeout: 15000,
    });
    if (res.data?.status === 'error') throw new Error(res.data?.message || 'Failed to create booking');
    return res.data;
  },

  /** Group Tours - list admin tours */
  groupToursList: async (filters?: { from_date?: string; to_date?: string }) => {
    const base = getBase();
    const headers = await authHeaders();
    const params = new URLSearchParams(filters as Record<string, string>);
    const res = await axios.get(`${base}/api/admin/group-tour-management.php?${params}`, {
      headers,
      timeout: 15000,
    });
    if (!res.data?.success) throw new Error(res.data?.error || 'Failed to list tours');
    return (res.data?.tours ?? []) as GroupTour[];
  },

  /** Group Tours - list admin bookings */
  groupToursBookings: async (filters?: { from_date?: string; to_date?: string }) => {
    const base = getBase();
    const headers = await authHeaders();
    const params = new URLSearchParams(filters as Record<string, string>);
    const res = await axios.get(`${base}/api/admin/group-tour-bookings.php?${params}`, {
      headers,
      timeout: 15000,
    });
    if (!res.data?.success) throw new Error(res.data?.error || 'Failed to list bookings');
    return (res.data?.bookings ?? []) as GroupTourBooking[];
  },

  /** Group Tours - get single tour (for edit) - matches web groupTourAPI.adminGetTour */
  groupTourGet: async (id: number): Promise<GroupTour | null> => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.get(`${base}/api/admin/group-tour-management.php?id=${id}`, {
      headers,
      timeout: 15000,
    });
    if (!res.data?.success) throw new Error(res.data?.error || 'Failed to fetch tour');
    return (res.data?.tour ?? null) as GroupTour | null;
  },

  /** Group Tours - create tour - matches web groupTourAPI.adminCreateTour */
  groupTourCreate: async (data: {
    pickup_location: string;
    dropoff_location: string;
    travel_date: string;
    expiry_date?: string | null;
    price_per_seat?: number;
    capacity?: number;
    title?: string | null;
  }): Promise<{ id: number }> => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.post(`${base}/api/admin/group-tour-management.php`, data, {
      headers,
      timeout: 15000,
    });
    if (!res.data?.success) throw new Error(res.data?.error || 'Failed to create tour');
    return { id: res.data.id };
  },

  /** Group Tours - update tour - matches web groupTourAPI.adminUpdateTour */
  groupTourUpdate: async (
    id: number,
    data: Partial<{
      pickup_location: string;
      dropoff_location: string;
      travel_date: string;
      expiry_date: string | null;
      price_per_seat: number;
      capacity: number;
      title: string | null;
    }>
  ): Promise<void> => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.put(`${base}/api/admin/group-tour-management.php`, { id, ...data }, {
      headers,
      timeout: 15000,
    });
    if (!res.data?.success) throw new Error(res.data?.error || 'Failed to update tour');
  },

  /** Group Tours - delete tour - matches web groupTourAPI.adminDeleteTour */
  groupTourDelete: async (id: number): Promise<void> => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.delete(`${base}/api/admin/group-tour-management.php?id=${id}`, {
      headers,
      timeout: 15000,
    });
    if (!res.data?.success) throw new Error(res.data?.error || 'Failed to delete tour');
  },

  /** Fleet - list vehicles (uses existing adminAPI.getFleetVehicles - re-export) */
  fleetList: async () => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.get(`${base}/api/admin/fleet_vehicles.php/vehicles`, {
      headers,
      timeout: 15000,
    });
    const list = res.data?.vehicles ?? res.data?.data ?? [];
    return Array.isArray(list) ? list : [];
  },

  /** Fares - get fare summary (read-only) */
  faresGet: async (tripType: string) => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.get(`${base}/api/admin/direct-outstation-fares.php`, {
      headers,
      params: { tripType },
      timeout: 15000,
    });
    return res.data;
  },

  /** Commission - get settings (matches web commissionAPI.getCommissionSettings) */
  commissionSettings: async () => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.get(`${base}/api/admin/commission-settings.php`, {
      headers,
      timeout: 15000,
    });
    if (res.data?.status === 'success') return res.data?.data ?? [];
    throw new Error(res.data?.message || 'Failed to load commission');
  },

  /** Commission - create setting */
  commissionCreateSetting: async (data: {
    name: string;
    description?: string;
    default_percentage: number;
    is_active?: boolean;
  }) => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.post(`${base}/api/admin/commission-settings.php`, data, {
      headers,
      timeout: 15000,
    });
    if (res.data?.status === 'success') return res.data?.data;
    throw new Error(res.data?.message || 'Failed to create commission setting');
  },

  /** Commission - update setting */
  commissionUpdateSetting: async (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      default_percentage: number;
      is_active: boolean;
    }>
  ) => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.put(`${base}/api/admin/commission-settings.php`, { id, ...data }, {
      headers,
      timeout: 15000,
    });
    if (res.data?.status === 'success') return res.data?.data;
    throw new Error(res.data?.message || 'Failed to update commission setting');
  },

  /** Commission - delete setting */
  commissionDeleteSetting: async (id: string) => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.delete(`${base}/api/admin/commission-settings.php?id=${id}`, {
      headers,
      timeout: 15000,
    });
    if (res.data?.status === 'success') return;
    throw new Error(res.data?.message || 'Failed to delete commission setting');
  },

  /** Commission - get payments (matches web commissionAPI.getCommissionPayments) */
  commissionGetPayments: async (params?: {
    vehicle_id?: number;
    status?: 'pending' | 'paid' | 'cancelled';
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) => {
    const base = getBase();
    const headers = await authHeaders();
    const qs = new URLSearchParams();
    if (params?.vehicle_id != null) qs.append('vehicle_id', String(params.vehicle_id));
    if (params?.status) qs.append('status', params.status);
    if (params?.start_date) qs.append('start_date', params.start_date);
    if (params?.end_date) qs.append('end_date', params.end_date);
    if (params?.limit != null) qs.append('limit', String(params.limit));
    if (params?.offset != null) qs.append('offset', String(params.offset));
    const res = await axios.get(`${base}/api/admin/vehicle-commissions.php?${qs}`, {
      headers,
      timeout: 15000,
    });
    if (res.data?.status === 'success') {
      return {
        payments: res.data?.data ?? [],
        pagination: res.data?.pagination ?? { total: 0, limit: 10, offset: 0 },
      };
    }
    throw new Error(res.data?.message || 'Failed to load commission payments');
  },

  /** Commission - update payment (status, notes, commission_amount, commission_percentage) */
  commissionUpdatePayment: async (
    id: string,
    data: {
      status?: 'pending' | 'paid' | 'cancelled';
      notes?: string;
      commission_amount?: number;
      commission_percentage?: number;
    }
  ) => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.put(`${base}/api/admin/vehicle-commissions.php`, { id, ...data }, {
      headers,
      timeout: 15000,
    });
    if (res.data?.status === 'success') return res.data?.data;
    throw new Error(res.data?.message || 'Failed to update commission payment');
  },

  /** Commission - get payments (matches web commissionAPI.getCommissionPayments) */
  commissionPayments: async (params?: {
    vehicleId?: string;
    status?: 'pending' | 'paid' | 'cancelled';
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) => {
    const base = getBase();
    const headers = await authHeaders();
    const q = new URLSearchParams();
    if (params?.vehicleId) q.append('vehicle_id', params.vehicleId);
    if (params?.status) q.append('status', params.status);
    if (params?.startDate) q.append('start_date', params.startDate);
    if (params?.endDate) q.append('end_date', params.endDate);
    if (params?.limit != null) q.append('limit', String(params.limit));
    if (params?.offset != null) q.append('offset', String(params.offset));
    const res = await axios.get(`${base}/api/admin/vehicle-commissions.php?${q}`, {
      headers,
      timeout: 15000,
    });
    if (res.data?.status !== 'success') throw new Error(res.data?.message || 'Failed to load payments');
    return {
      payments: res.data?.data ?? [],
      pagination: res.data?.pagination ?? { total: 0, limit: 10, offset: 0 },
    };
  },

  /** Commission - update payment status */
  commissionPaymentUpdate: async (id: string, status: 'pending' | 'paid' | 'cancelled') => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.put(`${base}/api/admin/vehicle-commissions.php`, { id, status }, {
      headers,
      timeout: 15000,
    });
    if (res.data?.status !== 'success') throw new Error(res.data?.message || 'Failed to update');
    return res.data?.data;
  },

  /** Fuel - get prices (matches web FuelPriceManager) */
  fuelPrices: async () => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.get(`${base}/api/admin/fuel_prices.php`, {
      headers,
      timeout: 15000,
    });
    const data = res.data?.data ?? res.data;
    return Array.isArray(data?.fuelPrices) ? data.fuelPrices : (Array.isArray(data) ? data : []);
  },

  /** Fuel - update price (POST fuel_prices.php) */
  fuelUpdatePrice: async (data: { fuelType: string; price: number; location?: string; effectiveDate?: string }) => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.post(`${base}/api/admin/fuel_prices.php`, data, {
      headers,
      timeout: 15000,
    });
    if (res.data?.status === 'error') throw new Error(res.data?.message || 'Failed to update fuel price');
    return res.data;
  },

  /** Fuel - get records (matches web FuelManagementPage, supports filters) */
  fuelRecords: async (params?: {
    vehicle_id?: string;
    fuel_type?: string;
    payment_method?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }) => {
    const base = getBase();
    const headers = await authHeaders();
    const qs = new URLSearchParams();
    if (params?.vehicle_id) qs.append('vehicle_id', params.vehicle_id);
    if (params?.fuel_type) qs.append('fuel_type', params.fuel_type);
    if (params?.payment_method) qs.append('payment_method', params.payment_method);
    if (params?.start_date) qs.append('start_date', params.start_date);
    if (params?.end_date) qs.append('end_date', params.end_date);
    if (params?.limit != null) qs.append('limit', String(params.limit));
    const url = `${base}/api/admin/fuel_records.php${qs.toString() ? `?${qs}` : ''}`;
    const res = await axios.get(url, { headers, timeout: 15000 });
    const data = res.data?.data ?? res.data;
    return Array.isArray(data?.fuelRecords) ? data.fuelRecords : (Array.isArray(data) ? data : []);
  },

  /** Fuel - create record (POST fuel_records.php) */
  fuelCreateRecord: async (record: {
    vehicleId: string;
    fillDate: string;
    quantity: number;
    pricePerUnit: number;
    totalCost: number;
    odometer: number;
    fuelStation?: string;
    fuelType?: string;
    mileage?: number;
    paymentMethod?: string;
    paymentDetails?: { bankName?: string; lastFourDigits?: string };
    notes?: string;
  }) => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.post(`${base}/api/admin/fuel_records.php`, record, {
      headers,
      timeout: 15000,
    });
    if (res.data?.status === 'error') throw new Error(res.data?.message || 'Failed to create fuel record');
    return res.data?.data?.fuelRecord ?? res.data;
  },

  /** Fuel - update record (PUT fuel_records.php?id=) */
  fuelUpdateRecord: async (
    id: string | number,
    record: Partial<{
      vehicleId: string;
      fillDate: string;
      quantity: number;
      pricePerUnit: number;
      totalCost: number;
      odometer: number;
      fuelStation: string;
      fuelType: string;
      mileage: number;
      paymentMethod: string;
      paymentDetails: { bankName?: string; lastFourDigits?: string };
      notes: string;
    }>
  ) => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.put(`${base}/api/admin/fuel_records.php?id=${id}`, record, {
      headers,
      timeout: 15000,
    });
    if (res.data?.status === 'error') throw new Error(res.data?.message || 'Failed to update fuel record');
    return res.data?.data?.fuelRecord ?? res.data;
  },

  /** Fuel - delete record (DELETE fuel_records.php?id=) */
  fuelDeleteRecord: async (id: string | number) => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.delete(`${base}/api/admin/fuel_records.php?id=${id}`, {
      headers,
      timeout: 15000,
    });
    if (res.data?.status === 'error') throw new Error(res.data?.message || 'Failed to delete fuel record');
  },

  /** Ledger - get entries */
  ledgerEntries: async (params?: { from_date?: string; to_date?: string; type?: string }) => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.get(`${base}/api/admin/ledger.php`, {
      headers,
      params,
      timeout: 15000,
    });
    return res.data?.data ?? [];
  },

  /** Expenses - get categories */
  expensesCategories: async () => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.get(`${base}/api/admin/expenses.php`, {
      headers,
      params: { action: 'categories' },
      timeout: 15000,
    });
    if (res.data?.status === 'success') return res.data?.data ?? [];
    return [];
  },

  /** Expenses - get entries (matches web expenseAPI.fetchExpenses) */
  expensesList: async (params?: { from_date?: string; to_date?: string; category?: string }) => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.get(`${base}/api/admin/expenses.php`, {
      headers,
      params: { ...params },
      timeout: 15000,
    });
    return res.data?.data ?? res.data?.entries ?? [];
  },

  /** Expenses - get summary (matches web expenseAPI.getExpenseSummary) */
  expensesSummary: async (params?: { from_date?: string; to_date?: string }) => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.get(`${base}/api/admin/expenses.php`, {
      headers,
      params: { action: 'summary', ...params },
      timeout: 15000,
    });
    return res.data?.data ?? { totalAmount: 0, byCategory: [], byMonth: [], byPaymentMethod: [] };
  },

  /** Expenses - add new expense (matches web expenseAPI.addExpense) */
  expensesAdd: async (data: {
    description: string;
    amount: number;
    date: string;
    category: string;
    paymentMethod?: string;
    vehicleId?: string;
    vendor?: string;
    billNumber?: string;
    billDate?: string;
    notes?: string;
    status?: string;
    isRecurring?: boolean;
    recurringFrequency?: string;
  }) => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.post(`${base}/api/admin/expenses.php`, data, {
      headers,
      timeout: 15000,
      validateStatus: () => true,
    });
    if (res.status >= 400) {
      const body = res.data;
      const msg =
        (typeof body === 'object' && (body?.message ?? body?.error)) ||
        (typeof body === 'string' && body.length < 200 ? body : null) ||
        `Request failed (${res.status})`;
      throw new Error(String(msg));
    }
    if (res.data?.status !== 'success') {
      throw new Error(res.data?.message || 'Failed to add expense');
    }
    return res.data?.data;
  },

  /** Expenses - update expense */
  expensesUpdate: async (
    id: string | number,
    data: Partial<{
      description: string;
      amount: number;
      date: string;
      category: string;
      paymentMethod: string;
      vehicleId: string;
      vendor: string;
      billNumber: string;
      billDate: string | null;
      notes: string;
      status: string;
    }>
  ) => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.put(`${base}/api/admin/expenses.php`, { id, ...data }, {
      headers,
      timeout: 15000,
      validateStatus: () => true,
    });
    if (res.status >= 400) {
      const body = res.data;
      const msg =
        (typeof body === 'object' && (body?.message ?? body?.error)) ||
        (typeof body === 'string' && body.length < 200 ? body : null) ||
        `Request failed (${res.status})`;
      throw new Error(String(msg));
    }
    if (res.data?.status !== 'success') throw new Error(res.data?.message || 'Failed to update expense');
    return res.data?.data;
  },

  /** Expenses - delete expense */
  expensesDelete: async (id: string | number) => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.delete(`${base}/api/admin/expenses.php`, {
      headers,
      params: { id },
      timeout: 15000,
      validateStatus: () => true,
    });
    if (res.status >= 400) {
      const body = res.data;
      const msg =
        (typeof body === 'object' && (body?.message ?? body?.error)) ||
        (typeof body === 'string' && body.length < 200 ? body : null) ||
        `Request failed (${res.status})`;
      throw new Error(String(msg));
    }
    if (res.data?.status !== 'success') throw new Error(res.data?.message || 'Failed to delete expense');
  },

  /** Payroll - get summary (totalPaid, totalPending, byDriver, byMonth) */
  payrollSummary: async (params?: { from_date?: string; to_date?: string }) => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.get(`${base}/api/admin/payroll.php`, {
      headers,
      params: { action: 'summary', ...params },
      timeout: 15000,
    });
    return res.data?.data ?? res.data;
  },

  /** Payroll - get entries list (matches web payrollAPI.fetchPayrollEntries) */
  payrollEntriesList: async (params?: { from_date?: string; to_date?: string; driver_id?: string; payment_status?: string }) => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.get(`${base}/api/admin/payroll.php`, {
      headers,
      params: { ...params },
      timeout: 15000,
    });
    return res.data?.data ?? res.data?.entries ?? [];
  },

  /** Payroll - get salary components (for allowance/deduction types) */
  payrollSalaryComponents: async () => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.get(`${base}/api/admin/payroll.php`, {
      headers,
      params: { action: 'salary_components' },
      timeout: 15000,
    });
    return (res.data?.data ?? res.data ?? []) as Array<{ id: number; name: string; type: string }>;
  },

  /** Payroll - create entry (matches web payrollAPI.createPayrollEntry) */
  payrollCreate: async (data: {
    driverId: string | number;
    payPeriod: { startDate: string; endDate: string };
    basicSalary: number;
    allowances?: Array<{ type: string; amount: number }>;
    deductions?: Array<{ type: string; amount: number }>;
    advances?: Array<{ date: string; amount: number; notes?: string }>;
    daysWorked?: number;
    daysLeave?: number;
    paymentStatus?: string;
    paymentDate?: string;
    description?: string;
  }) => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.post(`${base}/api/admin/payroll.php`, {
      action: 'add_payroll',
      ...data,
    }, { headers, timeout: 15000 });
    if (res.data?.status !== 'success') throw new Error(res.data?.message || 'Failed to create payroll entry');
    return res.data?.data;
  },

  /** Payroll - delete entry */
  payrollDelete: async (id: string | number) => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.delete(`${base}/api/admin/payroll.php?id=${id}`, { headers, timeout: 15000 });
    if (res.data?.status !== 'success') throw new Error(res.data?.message || 'Failed to delete payroll entry');
    return res.data;
  },

  /** Payroll - update entry (matches web payrollAPI.updatePayrollEntry) */
  payrollUpdate: async (
    id: string | number,
    data: Partial<{
      payPeriod: { startDate: string; endDate: string };
      basicSalary: number;
      allowances: Array<{ type: string; amount: number }>;
      deductions: Array<{ type: string; amount: number }>;
      daysWorked: number;
      daysLeave: number;
      paymentStatus: string;
      paymentDate: string | null;
    }>
  ) => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.put(`${base}/api/admin/payroll.php`, { id, ...data }, { headers, timeout: 15000 });
    if (res.data?.status !== 'success') throw new Error(res.data?.message || 'Failed to update payroll entry');
    return res.data?.data;
  },

  /** Payments - get list (matches web payments API: from_date, to_date, status, search)
   * date_field: 'created_at' = filter by booking creation (shows admin create-booking); 'pickup_date' = filter by trip date
   */
  paymentsList: async (params?: {
    from_date?: string;
    to_date?: string;
    status?: string;
    search?: string;
    method?: string;
    date_field?: 'pickup_date' | 'created_at';
  }) => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.get(`${base}/api/admin/payments.php`, {
      headers,
      params,
      timeout: 20000,
      validateStatus: () => true,
    });
    if (res.status >= 400 || res.data?.status === 'error') {
      const msg =
        (typeof res.data?.message === 'string' && res.data.message) ||
        `Payments request failed (${res.status})`;
      throw new Error(msg);
    }
    const data = res.data?.data ?? res.data;
    return {
      payments: data?.payments ?? [],
      summary: data?.summary ?? {},
    };
  },

  /** Payments - send pending digest to admin WhatsApp (for daily follow-up). */
  sendPendingPaymentsWhatsApp: async () => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.post(
      `${base}/api/admin/send-pending-payments-whatsapp.php`,
      {},
      { headers, timeout: 60000 }
    );
    const d = res.data?.data;
    if (res.data?.status === 'error') {
      throw new Error(res.data?.message || 'Send failed');
    }
    return d ?? {};
  },

  /** Payments - update status (mark as paid/partial). paymentId = booking_id. */
  paymentUpdate: async (
    paymentId: number | string,
    status: 'paid' | 'partial' | 'pending' | 'cancelled',
    amount?: number,
    paymentMethod?: string,
    notes?: string
  ) => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.post(
      `${base}/api/admin/payment-update.php`,
      {
        payment_id: paymentId,
        status,
        amount,
        payment_method: paymentMethod,
        notes,
      },
      { headers, timeout: 15000 }
    );
    const data = res.data?.data;
    if (res.data?.status === 'error' || !data) {
      throw new Error(res.data?.message || 'Payment update failed');
    }
    return data;
  },

  /** Users - get all */
  usersList: async () => {
    const base = getBase();
    const headers = await authHeaders();
    const res = await axios.get(`${base}/api/admin/users.php`, {
      headers,
      timeout: 15000,
    });
    return res.data?.users ?? res.data?.data ?? [];
  },

  /** Reports - get report data (matches web reportsAPI, supports period + filters) */
  reportsFetch: async (params: {
    type: string;
    period?: string;
    start_date?: string;
    end_date?: string;
    payment_method?: string;
    gst?: boolean;
    only_gst_enabled?: boolean;
    trip_status?: string;
    payment_status?: string;
    vehicle_id?: string;
    driver_id?: string;
    service_type?: string;
  }) => {
    const base = getBase();
    const headers = await authHeaders();
    const q: Record<string, string> = { type: params.type };
    if (params.period) q.period = params.period;
    if (params.start_date) q.start_date = params.start_date;
    if (params.end_date) q.end_date = params.end_date;
    if (params.payment_method) q.payment_method = params.payment_method;
    if (params.gst) q.gst = 'true';
    if (params.only_gst_enabled) q.only_gst_enabled = 'true';
    const ts = (params.trip_status || '').trim().toLowerCase();
    const ps = (params.payment_status || '').trim().toLowerCase();
    if (ts && ts !== 'all') q.trip_status = ts;
    if (ps && ps !== 'all') q.payment_status = ps;
    if (params.vehicle_id) q.vehicle_id = params.vehicle_id;
    if (params.driver_id) q.driver_id = params.driver_id;
    if (params.service_type) q.service_type = params.service_type;
    const qs = new URLSearchParams(q).toString();
    const res = await axios.get(`${base}/api/admin/reports.php?${qs}`, {
      headers: {
        ...headers,
        'Cache-Control': 'no-cache',
        'X-Force-Refresh': 'true',
      },
      timeout: 15000,
    });
    if (res.data?.status === 'success') return res.data?.data ?? res.data;
    throw new Error(res.data?.message || 'Failed to load report');
  },

  /**
   * Bookings for a vehicle + period/range (matches web ReportVehiclesTable).
   * For non-custom periods send only `period` — PHP derives start/end (same as main report).
   */
  reportsBookingsByVehicle: async (
    vehicleId: string,
    range: { period: string; start_date?: string; end_date?: string },
    filters?: { trip_status?: string; payment_status?: string }
  ): Promise<Record<string, unknown>[]> => {
    const base = getBase();
    const headers = await authHeaders();
    const q = new URLSearchParams({
      type: 'bookings',
      vehicle_id: vehicleId,
      period: range.period,
    });
    if (range.period === 'custom') {
      if (range.start_date) q.set('start_date', range.start_date);
      if (range.end_date) q.set('end_date', range.end_date);
    }
    const ts = (filters?.trip_status || '').trim().toLowerCase();
    const ps = (filters?.payment_status || '').trim().toLowerCase();
    if (ts && ts !== 'all') q.set('trip_status', ts);
    if (ps && ps !== 'all') q.set('payment_status', ps);
    const res = await axios.get(`${base}/api/admin/reports.php?${q}`, {
      headers: {
        ...headers,
        'Cache-Control': 'no-cache',
        'X-Force-Refresh': 'true',
      },
      timeout: 20000,
    });
    if (res.data?.status === 'success' && Array.isArray(res.data?.data)) return res.data.data;
    return [];
  },

  /** Bookings for a driver + period/range (matches web drivers drill-down; requires reports.php driver_id branch) */
  reportsBookingsByDriver: async (
    driverId: string,
    range: { period: string; start_date?: string; end_date?: string },
    filters?: { trip_status?: string; payment_status?: string }
  ): Promise<Record<string, unknown>[]> => {
    const base = getBase();
    const headers = await authHeaders();
    const q = new URLSearchParams({
      type: 'bookings',
      driver_id: driverId,
      period: range.period,
    });
    if (range.period === 'custom') {
      if (range.start_date) q.set('start_date', range.start_date);
      if (range.end_date) q.set('end_date', range.end_date);
    }
    const ts = (filters?.trip_status || '').trim().toLowerCase();
    const ps = (filters?.payment_status || '').trim().toLowerCase();
    if (ts && ts !== 'all') q.set('trip_status', ts);
    if (ps && ps !== 'all') q.set('payment_status', ps);
    const res = await axios.get(`${base}/api/admin/reports.php?${q}`, {
      headers: {
        ...headers,
        'Cache-Control': 'no-cache',
        'X-Force-Refresh': 'true',
      },
      timeout: 20000,
    });
    if (res.data?.status === 'success' && Array.isArray(res.data?.data)) return res.data.data;
    return [];
  },

  /** Bookings drill-down for one day (matches web fetchBookingsByDate) */
  reportsBookingsByDate: async (
    date: string,
    filters?: { trip_status?: string; payment_status?: string }
  ): Promise<Record<string, unknown>[]> => {
    const base = getBase();
    const headers = await authHeaders();
    const q = new URLSearchParams({ type: 'bookings', date });
    const ts = (filters?.trip_status || '').trim().toLowerCase();
    const ps = (filters?.payment_status || '').trim().toLowerCase();
    if (ts && ts !== 'all') q.set('trip_status', ts);
    if (ps && ps !== 'all') q.set('payment_status', ps);
    const res = await axios.get(`${base}/api/admin/reports.php?${q}`, {
      headers: {
        ...headers,
        'Cache-Control': 'no-cache',
        'X-Force-Refresh': 'true',
      },
      timeout: 15000,
    });
    if (res.data?.status === 'success' && Array.isArray(res.data?.data)) return res.data.data;
    return [];
  },

  /** Vehicle list for report filters (same as web ReportGenerator filter_options) */
  reportsFilterVehicles: async (startDate: string, endDate: string): Promise<Array<{ id: number; name?: string; vehicle_number?: string }>> => {
    const base = getBase();
    const headers = await authHeaders();
    const q = new URLSearchParams({
      type: 'filter_options',
      filter: 'vehicles',
      period: 'custom',
      start_date: startDate,
      end_date: endDate,
    });
    const res = await axios.get(`${base}/api/admin/reports.php?${q}`, {
      headers: { ...headers, 'Cache-Control': 'no-cache' },
      timeout: 15000,
    });
    if (res.data?.status === 'success') {
      const payload = res.data?.data ?? res.data;
      const vehicles = payload?.vehicles ?? payload?.filters?.vehicles ?? [];
      return Array.isArray(vehicles) ? vehicles : [];
    }
    return [];
  },

  /** Maintenance - uses fleet vehicles */
  maintenanceList: async () => {
    return adminExtendedAPI.fleetList();
  },
};
