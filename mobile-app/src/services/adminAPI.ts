/**
 * Admin API - metrics and bookings for admin dashboard
 * Uses report-metrics.php (no auth) for metrics; admin/bookings.php (JWT) for bookings
 */
import axios from 'axios';
import { Platform } from 'react-native';
import { authAPI } from './authAPI';
import { API_BASE_URL, WEB_APP_BASE_URL } from '../config';
import type { UserBooking } from './userBookingsAPI';
import { normalizeBooking } from './userBookingsAPI';

const getBase = () => {
  if (API_BASE_URL) return API_BASE_URL;
  if (Platform.OS === 'web') return '';
  return WEB_APP_BASE_URL || 'https://www.vizagtaxihub.com';
};

/** Used to distinguish server error messages from JSON parse errors in getInvoicePdfBlob */
class ServerResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServerResponseError';
  }
}

export type MetricsPeriod = '7days' | '30days' | '90days' | 'year';

export interface AdminMetrics {
  totalBookings: number;
  totalRevenue: number;
  activeDrivers: number;
  activeVehicles: number;
  trends?: Array<{ date: string; bookings: number; revenue: number }>;
  bookingsByStatus?: Record<string, number>;
  revenueByTripType?: Array<{ tripType: string; bookings: number; revenue: number }>;
}

export const adminAPI = {
  getAdminMetrics: async (period: MetricsPeriod = '30days'): Promise<AdminMetrics> => {
    const base = getBase();
    const url = `${base}/api/admin/report-metrics.php?period=${period}`;
    const response = await axios.get(url, { timeout: 15000 });
    const data = response.data;
    if (data?.status !== 'success' || !data?.metrics) {
      throw new Error(data?.message || 'Failed to load metrics');
    }
    const m = data.metrics;
    return {
      totalBookings: m.totalBookings ?? 0,
      totalRevenue: m.totalRevenue ?? 0,
      activeDrivers: m.activeDrivers ?? 0,
      activeVehicles: m.activeVehicles ?? 0,
      trends: m.trends ?? [],
      bookingsByStatus: m.bookingsByStatus ?? {},
      revenueByTripType: m.revenueByTripType ?? [],
    };
  },

  getAdminBookings: async (): Promise<UserBooking[]> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const url = `${base}/api/admin/bookings.php`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
    const data = response.data;
    if (data?.status !== 'success') {
      throw new Error(data?.message || 'Failed to load bookings');
    }
    const raw = data?.bookings ?? [];
    return raw.map((b: Record<string, unknown>) => normalizeBooking(b));
  },

  /** Update booking status (admin only). Status: pending, confirmed, assigned, completed, cancelled */
  updateBookingStatus: async (bookingId: number, status: string): Promise<void> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const url = `${base}/api/admin/booking.php?id=${bookingId}`;
    const response = await axios.request({
      method: 'PUT',
      url,
      data: { status },
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
    if (response.data?.status === 'error') {
      throw new Error(response.data?.message || 'Failed to update status');
    }
  },

  /** Cancel booking (admin only) */
  cancelBooking: async (bookingId: number): Promise<void> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const url = `${base}/api/admin/cancel-booking.php`;
    const response = await axios.post(
      url,
      { bookingId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
    if (response.data?.status === 'error') {
      throw new Error(response.data?.message || 'Failed to cancel booking');
    }
  },

  /** Delete booking (admin only) */
  deleteBooking: async (bookingId: number): Promise<void> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const url = `${base}/api/admin/delete-booking.php`;
    const response = await axios.post(
      url,
      { bookingId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
    if (response.data?.status === 'error') {
      throw new Error(response.data?.message || 'Failed to delete booking');
    }
  },

  /** Get booking by ID (admin) */
  getBookingById: async (bookingId: number): Promise<UserBooking> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const url = `${base}/api/admin/booking.php?id=${bookingId}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
    const data = response.data;
    if (data?.status === 'error') throw new Error(data?.message || 'Booking not found');
    const raw = data?.data ?? data;
    return normalizeBooking(typeof raw === 'object' && raw ? raw : {});
  },

  /** Update booking (admin) - partial update */
  updateBooking: async (
    bookingId: number,
    updates: Record<string, unknown>
  ): Promise<void> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const url = `${base}/api/admin/update-booking.php`;
    const response = await axios.post(
      url,
      { bookingId, ...updates },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
        validateStatus: () => true, // Don't throw on 4xx so we can read backend message
      }
    );
    const data = response.data as { status?: string; message?: string } | undefined;
    if (data?.status === 'error' || response.status >= 400) {
      const msg = typeof data?.message === 'string' ? data.message
        : response.status === 400 ? 'This booking may be completed or cancelled and cannot be updated.'
        : `Request failed (${response.status})`;
      throw new Error(msg);
    }
  },

  /** Create driver (matches web POST /api/admin/drivers.php - same headers, no Bearer) */
  createDriver: async (driver: Partial<AdminDriver>): Promise<AdminDriver> => {
    const base = getBase();
    const url = `${base}/api/admin/drivers.php`;
    const phoneDigits = (driver.phone ?? '').replace(/\D/g, '').slice(-10);
    const payload = {
      name: (driver.name ?? '').trim(),
      phone: phoneDigits,
      email: ((driver.email ?? '').trim() || `driver-${phoneDigits}@vizagtaxihub.com`),
      license_no: ((driver as { license_no?: string }).license_no ?? '').trim(),
      vehicle: (driver.vehicle ?? (driver as { vehicle_type?: string }).vehicle_type ?? '').trim(),
      vehicle_id: ((driver as { vehicle_id?: string }).vehicle_id ?? driver.vehicleNumber ?? '').trim(),
      status: (driver as { status?: string }).status ?? 'available',
      location: ((driver as { location?: string }).location ?? '').trim() || 'Visakhapatnam',
    };
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Force-Refresh': 'true',
      },
      timeout: 15000,
      validateStatus: () => true,
    });
    const data = response.data;
    if (response.status >= 400 || data?.status === 'error') {
      const msg = data?.message ?? (Array.isArray(data?.errors) ? data.errors.join(', ') : null) ?? 'Failed to add driver';
      throw new Error(msg);
    }
    const created = data?.data ?? data?.driver;
    return created as AdminDriver;
  },

  /** Update driver (matches web PUT /api/admin/driver.php?id=X - same headers, no Bearer) */
  updateDriver: async (id: string | number, driver: Partial<AdminDriver>): Promise<void> => {
    const base = getBase();
    const url = `${base}/api/admin/driver.php?id=${id}`;
    const phoneDigits = (driver.phone ?? '').replace(/\D/g, '').slice(-10);
    const payload = {
      id: Number(id),
      name: (driver.name ?? '').trim(),
      phone: phoneDigits,
      email: ((driver.email ?? '').trim() || `driver-${phoneDigits}@vizagtaxihub.com`),
      license_no: ((driver as { license_no?: string }).license_no ?? '').trim(),
      vehicle: (driver.vehicle ?? (driver as { vehicle_type?: string }).vehicle_type ?? '').trim(),
      vehicle_id: ((driver as { vehicle_id?: string }).vehicle_id ?? driver.vehicleNumber ?? '').trim(),
      status: (driver as { status?: string }).status ?? 'available',
      location: ((driver as { location?: string }).location ?? '').trim() || 'Visakhapatnam',
    };
    const response = await axios.put(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Force-Refresh': 'true',
      },
      timeout: 15000,
      validateStatus: () => true,
    });
    const data = response.data;
    if (response.status >= 400) {
      const msg =
        (data && typeof data === 'object' && data?.message) ??
        (Array.isArray(data?.errors) ? data.errors.join(', ') : null) ??
        `Request failed (${response.status})`;
      throw new Error(msg);
    }
    if (data && typeof data === 'object' && data?.status === 'error') {
      const msg =
        data?.message ?? (Array.isArray(data?.errors) ? data.errors.join(', ') : null) ?? 'Failed to update driver';
      throw new Error(msg);
    }
  },

  /** Delete driver (matches web DELETE /api/admin/driver.php?id=X - same headers, no Bearer) */
  deleteDriver: async (id: string | number): Promise<void> => {
    const base = getBase();
    const url = `${base}/api/admin/driver.php?id=${id}`;
    const response = await axios.delete(url, {
      headers: { 'X-Force-Refresh': 'true' },
      timeout: 15000,
    });
    const data = response.data;
    if (data?.status === 'error') throw new Error(data?.message || 'Failed to delete driver');
  },

  /** Get drivers list (matches web GET /api/admin/drivers.php - same endpoint and headers) */
  getDrivers: async (): Promise<AdminDriver[]> => {
    const base = getBase();
    const url = `${base}/api/admin/drivers.php?t=${Date.now()}`;
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-Force-Refresh': 'true',
        'X-Debug': 'true',
      },
      timeout: 15000,
    });
    const data = response.data;
    if (data?.status === 'error') throw new Error(data?.message || 'Failed to load drivers');
    const list = data?.data ?? data?.drivers ?? [];
    return Array.isArray(list) ? list : [];
  },

  /** Get fleet vehicles (matches web fleet_vehicles.php) */
  getFleetVehicles: async (includeInactive = false): Promise<AdminFleetVehicle[]> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const url = `${base}/api/admin/fleet_vehicles.php/vehicles`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      params: { includeInactive: includeInactive ? 'true' : undefined },
      timeout: 15000,
    });
    const data = response.data;
    const list = data?.vehicles ?? data?.data ?? [];
    return Array.isArray(list) ? list : [];
  },

  /** Create fleet vehicle (matches web POST /api/admin/fleet_vehicles.php/vehicles) */
  createFleetVehicle: async (vehicle: Partial<AdminFleetVehicle>): Promise<AdminFleetVehicle> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const url = `${base}/api/admin/fleet_vehicles.php/vehicles`;
    const payload = {
      vehicleNumber: vehicle.vehicleNumber ?? vehicle.vehicle_number ?? '',
      name: vehicle.name ?? vehicle.vehicleNumber ?? vehicle.vehicle_number ?? '',
      model: vehicle.model ?? '',
      make: vehicle.make ?? '',
      year: vehicle.year ?? new Date().getFullYear(),
      status: vehicle.status ?? 'Active',
      lastService: (vehicle as { lastService?: string }).lastService ?? new Date().toISOString().slice(0, 10),
      nextServiceDue: (vehicle as { nextServiceDue?: string }).nextServiceDue ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      fuelType: (vehicle as { fuelType?: string }).fuelType ?? 'Petrol',
      vehicleType: (vehicle as { vehicleType?: string }).vehicleType ?? 'sedan',
      cabTypeId: (vehicle as { cabTypeId?: string }).cabTypeId ?? (vehicle as { vehicleType?: string }).vehicleType ?? '',
      capacity: (vehicle as { capacity?: number }).capacity ?? 4,
      luggageCapacity: (vehicle as { luggageCapacity?: number }).luggageCapacity ?? 2,
      isActive: (vehicle as { isActive?: boolean }).isActive !== false,
      lastServiceOdometer: (vehicle as { lastServiceOdometer?: number }).lastServiceOdometer ?? 0,
      nextServiceOdometer: (vehicle as { nextServiceOdometer?: number }).nextServiceOdometer ?? 5000,
      emi: (vehicle as { emi?: number | null }).emi ?? null,
    };
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
    const data = response.data;
    if (data?.error) throw new Error(data.error);
    return (data?.vehicle ?? payload) as AdminFleetVehicle;
  },

  /** Update fleet vehicle (matches web PUT /api/admin/fleet_vehicles.php/vehicles/{id}) */
  updateFleetVehicle: async (id: string | number, vehicle: Partial<AdminFleetVehicle>): Promise<void> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const url = `${base}/api/admin/fleet_vehicles.php/vehicles/${id}`;
    const payload: Record<string, unknown> = {};
    if (vehicle.vehicleNumber ?? vehicle.vehicle_number) payload.vehicleNumber = vehicle.vehicleNumber ?? vehicle.vehicle_number;
    if (vehicle.name != null) payload.name = vehicle.name;
    if (vehicle.model != null) payload.model = vehicle.model;
    if (vehicle.make != null) payload.make = vehicle.make;
    if (vehicle.year != null) payload.year = vehicle.year;
    if (vehicle.status != null) payload.status = vehicle.status;
    const v = vehicle as Record<string, unknown>;
    if (v?.lastService != null) payload.lastService = v.lastService;
    if (v?.nextServiceDue != null) payload.nextServiceDue = v.nextServiceDue;
    if (v?.fuelType != null) payload.fuelType = v.fuelType;
    if (v?.vehicleType != null) payload.vehicleType = v.vehicleType;
    if (v?.cabTypeId != null) payload.cabTypeId = v.cabTypeId;
    if (v?.capacity != null) payload.capacity = v.capacity;
    if (v?.luggageCapacity != null) payload.luggageCapacity = v.luggageCapacity;
    if (v?.isActive != null) payload.isActive = v.isActive;
    if (v?.lastServiceOdometer != null) payload.lastServiceOdometer = v.lastServiceOdometer;
    if (v?.nextServiceOdometer != null) payload.nextServiceOdometer = v.nextServiceOdometer;
    if (v?.emi != null) payload.emi = v.emi;
    const response = await axios.put(url, Object.keys(payload).length ? payload : vehicle, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
    const data = response.data;
    if (data?.error) throw new Error(data.error);
  },

  /** Delete fleet vehicle (matches web DELETE /api/admin/fleet_vehicles.php/vehicles/{id}) */
  deleteFleetVehicle: async (id: string | number): Promise<void> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const url = `${base}/api/admin/fleet_vehicles.php/vehicles/${id}`;
    const response = await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
    const data = response.data;
    if (data?.error) throw new Error(data.error);
  },

  /** Get vehicle type (CabType) - for editing amenities, inactive dates (matches web vehicles-data.php) */
  getVehicleType: async (vehicleId: string): Promise<AdminVehicleType> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const url = `${base}/api/admin/vehicles-data.php?id=${vehicleId}&_t=${Date.now()}&includeInactive=true`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Force-Refresh': 'true',
      },
      timeout: 15000,
    });
    const data = response.data;
    const vehicles = data?.vehicles ?? data?.data ?? [];
    const v = Array.isArray(vehicles) ? vehicles[0] : vehicles;
    if (!v) throw new Error('Vehicle not found');
    return normalizeVehicleType(v);
  },

  /** Update vehicle type (amenities, inactive dates, inclusions, exclusions) - matches web update-vehicle.php */
  updateVehicleType: async (vehicle: AdminVehicleType): Promise<void> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const url = `${base}/api/admin/update-vehicle.php?_t=${Date.now()}`;
    const payload = {
      id: vehicle.id || vehicle.vehicleId,
      vehicleId: vehicle.vehicleId || vehicle.id,
      name: vehicle.name,
      capacity: Number(vehicle.capacity ?? 4),
      luggageCapacity: Number(vehicle.luggageCapacity ?? 2),
      basePrice: Number(vehicle.basePrice ?? vehicle.price ?? 0),
      price: Number(vehicle.price ?? vehicle.basePrice ?? 0),
      pricePerKm: Number(vehicle.pricePerKm ?? 14),
      nightHaltCharge: Number(vehicle.nightHaltCharge ?? 700),
      driverAllowance: Number(vehicle.driverAllowance ?? 250),
      isActive: vehicle.isActive !== false,
      amenities: vehicle.amenities ?? [],
      inactiveDates: (vehicle.inactiveDates ?? []).map((r) => ({
        ...r,
        from: r.from instanceof Date ? r.from.toISOString() : r.from,
        to: r.to instanceof Date ? r.to.toISOString() : r.to,
      })),
      inclusions: vehicle.inclusions ?? [],
      exclusions: vehicle.exclusions ?? [],
      cancellationPolicy: vehicle.cancellationPolicy ?? '',
    };
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Force-Refresh': 'true',
        'X-Admin-Mode': 'true',
      },
      timeout: 15000,
    });
    const data = response.data;
    if (data?.status === 'error') throw new Error(data?.message ?? 'Update failed');
  },

  /** Assign driver to booking */
  assignDriver: async (bookingId: number | string, driverId: number | string): Promise<void> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const url = `${base}/api/admin/assign-driver.php`;
    const response = await axios.post(
      url,
      { bookingId: Number(bookingId), driverId: Number(driverId) },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
    if (response.data?.status === 'error') {
      throw new Error(response.data?.message || 'Failed to assign driver');
    }
  },

  /** Assign fleet vehicle to booking */
  assignVehicle: async (
    bookingId: number | string,
    vehicleId: string | number,
    driverId?: number | string
  ): Promise<void> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const url = `${base}/api/admin/booking-assign-vehicle.php`;
    const payload: Record<string, unknown> = {
      bookingId: Number(bookingId),
      vehicleId: String(vehicleId),
    };
    if (driverId != null) payload.driverId = Number(driverId);
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
    if (response.data?.status === 'error') {
      throw new Error(response.data?.message || 'Failed to assign vehicle');
    }
  },

  /**
   * Build PDF download URL for invoice - opens in browser for download (matches web app).
   * Uses main /api/download-invoice.php (supports format=pdf, GST params).
   */
  getInvoicePdfUrl: (
    bookingId: number,
    options?: {
      gstEnabled?: boolean;
      isIGST?: boolean;
      includeTax?: boolean;
      gstDetails?: { gstNumber?: string; companyName?: string; companyAddress?: string };
      customInvoiceNumber?: string;
    }
  ): string => {
    const base = getBase();
    const params = new URLSearchParams({
      id: String(bookingId),
      format: 'pdf',
      direct_download: '1',
      gstEnabled: options?.gstEnabled ? '1' : '0',
      isIGST: options?.isIGST ? '1' : '0',
      includeTax: options?.includeTax !== false ? '1' : '0',
    });
    if (options?.customInvoiceNumber?.trim()) {
      params.append('invoiceNumber', options.customInvoiceNumber.trim());
    }
    if (options?.gstEnabled && options?.gstDetails) {
      if (options.gstDetails.gstNumber) params.append('gstNumber', options.gstDetails.gstNumber);
      if (options.gstDetails.companyName) params.append('companyName', options.gstDetails.companyName);
      if (options.gstDetails.companyAddress) params.append('companyAddress', options.gstDetails.companyAddress || '');
    }
    return `${base}/api/download-invoice.php?${params.toString()}`;
  },

  /**
   * Fetch invoice PDF as binary - for in-app save/share (avoids browser returning JSON).
   * Uses main /api/download-invoice.php.
   */
  getInvoicePdfBlob: async (
    bookingId: number,
    options?: {
      gstEnabled?: boolean;
      isIGST?: boolean;
      includeTax?: boolean;
      gstDetails?: { gstNumber?: string; companyName?: string; companyAddress?: string };
      customInvoiceNumber?: string;
    }
  ): Promise<{ data: ArrayBuffer; isPdf: boolean }> => {
    const url = adminAPI.getInvoicePdfUrl(bookingId, options);
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      validateStatus: () => true,
    });
    const ct = String(response.headers['content-type'] || '').toLowerCase();
    const isPdfByHeader = ct.includes('application/pdf');
    const bytes = new Uint8Array(response.data as ArrayBuffer);
    // PDF magic bytes: % (37) P (80) D (68) F (70) - (45) - avoid String.fromCharCode spread (can fail on some engines)
    const startsWithPdf =
      bytes.length >= 5 &&
      bytes[0] === 37 &&
      bytes[1] === 80 &&
      bytes[2] === 68 &&
      bytes[3] === 70 &&
      bytes[4] === 45;
    const isPdf = isPdfByHeader || startsWithPdf;
    if (isPdf && response.data && (response.data as ArrayBuffer).byteLength > 0) {
      return { data: response.data as ArrayBuffer, isPdf: true };
    }
    if (!isPdf && response.data && bytes.length > 0) {
      const firstChar = String.fromCharCode(bytes[0]);
      // PDF or binary - never attempt JSON.parse; avoid "Unexpected character: %" errors
      if (firstChar === '%' || bytes[0] === 37) {
        throw new Error('Could not get PDF. Please try View Invoice (HTML) instead.');
      }
      if (firstChar === '{' || firstChar === '[') {
        try {
          const text = new TextDecoder().decode(response.data);
          const json = JSON.parse(text) as { message?: string };
          throw new ServerResponseError(json?.message || 'Server returned an error');
        } catch (e) {
          if (e instanceof ServerResponseError) throw e;
          throw new Error('Could not get PDF. Please try View Invoice (HTML) instead.');
        }
      }
      throw new Error('Server returned unexpected content. Please try View Invoice (HTML) instead.');
    }
    if (!response.data || (response.data as ArrayBuffer).byteLength === 0) {
      throw new Error('Empty response. Generate the invoice first.');
    }
    return { data: response.data as ArrayBuffer, isPdf };
  },

  /**
   * Fetch invoice HTML for view - uses main download-invoice with format=html for correct GST calculations.
   * Matches web app: Base Fare (excluding GST) + Extra Charges + GST 18% (CGST 9% + SGST 9%) = Total.
   */
  getInvoiceHtml: async (
    bookingId: number,
    options?: {
      gstEnabled?: boolean;
      isIGST?: boolean;
      includeTax?: boolean;
      gstDetails?: { gstNumber?: string; companyName?: string; companyAddress?: string };
      customInvoiceNumber?: string;
    }
  ): Promise<string> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const params = new URLSearchParams({
      id: String(bookingId),
      format: 'html',
      gstEnabled: options?.gstEnabled ? '1' : '0',
      isIGST: options?.isIGST ? '1' : '0',
      includeTax: options?.includeTax !== false ? '1' : '0',
    });
    if (options?.customInvoiceNumber?.trim()) {
      params.append('invoiceNumber', options.customInvoiceNumber.trim());
    }
    if (options?.gstEnabled && options?.gstDetails) {
      if (options.gstDetails.gstNumber) params.append('gstNumber', options.gstDetails.gstNumber);
      if (options.gstDetails.companyName) params.append('companyName', options.gstDetails.companyName);
      if (options.gstDetails.companyAddress) params.append('companyAddress', options.gstDetails.companyAddress || '');
    }
    const url = `${base}/api/download-invoice.php?${params.toString()}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      responseType: 'text',
      timeout: 15000,
    });
    return typeof response.data === 'string' ? response.data : '';
  },

  /** Get invoice for booking - normalizes snake_case to camelCase, computes baseFare */
  getInvoice: async (bookingId: number): Promise<AdminInvoice | null> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const url = `${base}/api/admin/get-invoice.php?booking_id=${bookingId}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      responseType: 'text',
      timeout: 15000,
    });
    let data: Record<string, unknown>;
    try {
      const text = typeof response.data === 'string' ? response.data : String(response.data);
      const trimmed = text.trim();
      if (trimmed.startsWith('%') || !trimmed) return null;
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return null;
    }
    if (data?.status === 'error') return null;
    const raw = data?.invoice ?? data ?? null;
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const total = (r.totalAmount ?? r.total_amount ?? 0) as number;
    const advance = (r.advancePaidAmount ?? r.advance_paid_amount ?? 0) as number;
    const baseFareComputed = Math.max(0, Number(total) - Number(advance)) || Number(total);
    const baseFare = (r.baseFare ?? r.base_fare ?? r.baseAmount ?? r.base_amount ?? baseFareComputed) as number;
    const paymentStatus = String(r.paymentStatus ?? r.payment_status ?? 'pending');
    return {
      ...r,
      invoiceNumber: r.invoiceNumber ?? r.invoice_number,
      invoiceDate: r.invoiceDate ?? r.invoice_date ?? r.created_at,
      baseFare,
      totalAmount: total,
      paymentStatus,
      advancePaidAmount: advance,
    } as AdminInvoice;
  },

  /** Generate invoice for booking - normalizes response (data.data or data.invoice) */
  generateInvoice: async (
    bookingId: number,
    options?: {
      gstEnabled?: boolean;
      isIGST?: boolean;
      includeTax?: boolean;
      gstDetails?: { gstNumber?: string; companyName?: string; companyAddress?: string };
      customInvoiceNumber?: string;
    }
  ): Promise<AdminInvoice> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const url = `${base}/api/admin/generate-invoice.php`;
    const finalIncludeTax =
      options?.includeTax !== undefined
        ? options.includeTax
        : (options?.gstEnabled ? true : false);
    const requestBody: Record<string, unknown> = {
      bookingId,
      gstEnabled: options?.gstEnabled ?? false,
      isIGST: options?.isIGST ?? false,
      includeTax: finalIncludeTax,
      invoiceNumber: options?.customInvoiceNumber ?? '',
      gstDetails: options?.gstDetails ?? {},
    };
    const response = await axios.post(url, requestBody, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      responseType: 'text',
      timeout: 20000,
    });
    const text = typeof response.data === 'string' ? response.data : String(response.data);
    const trimmed = text.trim();
    if (trimmed.startsWith('%') || !trimmed) {
      throw new Error('Server returned unexpected content. Please try again.');
    }
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error('Invalid response from server. Please try again.');
    }
    if (data?.status === 'error') {
      throw new Error(String(data?.message ?? 'Failed to generate invoice'));
    }
    const raw = data?.data ?? data?.invoice ?? data ?? null;
    if (!raw || typeof raw !== 'object') return {} as AdminInvoice;
    const r = raw as Record<string, unknown>;
    const total = (r.totalAmount ?? r.total_amount ?? 0) as number;
    const baseAmt = (r.baseAmount ?? r.base_amount ?? r.base_fare ?? total) as number;
    return {
      ...r,
      invoiceNumber: r.invoiceNumber ?? r.invoice_number,
      invoiceDate: r.invoiceDate ?? r.invoice_date,
      baseFare: baseAmt,
      totalAmount: total,
      paymentStatus: (r.paymentStatus ?? r.payment_status ?? 'pending') as string,
    } as AdminInvoice;
  },
};

export interface AdminDriver {
  id: number;
  name: string;
  phone: string;
  email?: string;
  status?: string;
  vehicle?: string;
  vehicle_id?: string;
  vehicleNumber?: string;
  license_no?: string;
  location?: string;
}

export interface AdminFleetVehicle {
  id: string | number;
  vehicleNumber?: string;
  vehicle_number?: string; // API may return snake_case
  name?: string;
  model?: string;
  make?: string;
  year?: number;
  status?: string;
  fuelType?: string;
  vehicleType?: string;
  cabTypeId?: string;
  capacity?: number;
  luggageCapacity?: number;
  emi?: number | null;
  lastService?: string;
  nextServiceDue?: string;
  lastServiceOdometer?: number;
  nextServiceOdometer?: number;
}

export interface AdminVehicleType {
  id: string;
  vehicleId?: string;
  name?: string;
  capacity?: number;
  luggageCapacity?: number;
  basePrice?: number;
  price?: number;
  pricePerKm?: number;
  driverAllowance?: number;
  nightHaltCharge?: number;
  amenities?: string[];
  inactiveDates?: Array<{ id?: string; from: Date | string; to: Date | string; reason?: string }>;
  inclusions?: string[];
  exclusions?: string[];
  cancellationPolicy?: string;
  isActive?: boolean;
}

function normalizeVehicleType(raw: Record<string, unknown>): AdminVehicleType {
  const id = String(raw.id ?? raw.vehicleId ?? raw.vehicle_id ?? '');
  const inactiveDates = (raw.inactiveDates as Array<Record<string, unknown>> ?? []).map((r, i) => ({
    id: (r.id as string) ?? `range-${i}`,
    from: r.from instanceof Date ? r.from : new Date(String(r.from ?? '')),
    to: r.to instanceof Date ? r.to : new Date(String(r.to ?? '')),
    reason: r.reason as string | undefined,
  }));
  const amenities = Array.isArray(raw.amenities) ? raw.amenities.map(String) : [];
  const inclusions = Array.isArray(raw.inclusions) ? raw.inclusions.map(String) : [];
  const exclusions = Array.isArray(raw.exclusions) ? raw.exclusions.map(String) : [];
  return {
    id,
    vehicleId: id,
    name: String(raw.name ?? ''),
    capacity: Number(raw.capacity ?? 4),
    luggageCapacity: Number(raw.luggageCapacity ?? 2),
    basePrice: Number(raw.basePrice ?? raw.price ?? 0),
    price: Number(raw.price ?? raw.basePrice ?? 0),
    pricePerKm: Number(raw.pricePerKm ?? 14),
    driverAllowance: Number(raw.driverAllowance ?? 250),
    nightHaltCharge: Number(raw.nightHaltCharge ?? 700),
    amenities,
    inactiveDates,
    inclusions,
    exclusions,
    cancellationPolicy: String(raw.cancellationPolicy ?? ''),
    isActive: raw.isActive !== false,
  };
}

export interface AdminInvoice {
  invoiceNumber?: string;
  invoiceDate?: string;
  baseFare?: number;
  totalAmount?: number;
  paymentStatus?: string;
  invoiceHtml?: string;
  [key: string]: unknown;
}
