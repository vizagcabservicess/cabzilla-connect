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
import { dedupeDriversByPhoneOrEmail } from '../utils/driverListDedupe';

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

export interface InvoiceTripSummaryInput {
  tripType?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  tripDate?: string;
  noOfHours?: string;
  noOfKilometers?: string;
}

export interface InvoiceRequestOptions {
  gstEnabled?: boolean;
  isIGST?: boolean;
  includeTax?: boolean;
  lockedBaseFare?: number;
  adminNotes?: string;
  gstDetails?: { gstNumber?: string; companyName?: string; companyAddress?: string; lockedBaseFare?: number };
  customInvoiceNumber?: string;
  billingAddress?: string;
  tripSummary?: InvoiceTripSummaryInput;
}

function appendInvoiceBillingParams(params: URLSearchParams, options?: InvoiceRequestOptions): void {
  const billing = (options?.billingAddress ?? '').trim();
  if (billing) params.append('billingAddress', billing);
  const trip = options?.tripSummary;
  if (!trip) return;
  if ((trip.tripType ?? '').trim()) params.append('tripType', trip.tripType!.trim());
  if ((trip.vehicleType ?? '').trim()) params.append('vehicleType', trip.vehicleType!.trim());
  if ((trip.tripDate ?? '').trim()) params.append('tripDate', trip.tripDate!.trim());
  if ((trip.noOfHours ?? '').trim()) params.append('noOfHours', trip.noOfHours!.trim());
  if ((trip.noOfKilometers ?? '').trim()) params.append('noOfKm', trip.noOfKilometers!.trim());
  params.append('vehicleNumber', (trip.vehicleNumber ?? '').trim());
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

  /** Upcoming trips — same as web `bookingAPI.getUpcomingBookings` */
  getUpcomingBookings: async (
    params?: Record<string, string>
  ): Promise<{ bookings: UserBooking[]; count: number; drivers: string[]
}> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const qs = params && Object.keys(params).length ? new URLSearchParams(params).toString() : '';
    const url = qs
      ? `${base}/api/admin/upcoming-bookings.php?${qs}`
      : `${base}/api/admin/upcoming-bookings.php`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Force-Refresh': 'true',
      },
      timeout: 20000,
    });
    const data = response.data;
    if (data?.status === 'error') {
      throw new Error(data?.message || 'Failed to load upcoming bookings');
    }
    const raw = data?.bookings ?? [];
    const bookings = raw.map((b: Record<string, unknown>) => normalizeBooking(b));
    return {
      bookings,
      count: typeof data?.count === 'number' ? data.count : bookings.length,
      drivers: Array.isArray(data?.drivers) ? data.drivers.map(String) : [],
    };
  },

  /** Plain-text WhatsApp via trip/payment Cloud API line (admin JWT) */
  sendAdminTripWhatsApp: async (
    phone: string,
    message: string,
    channel: 'trip' | 'payment' = 'trip'
  ): Promise<unknown> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const url = `${base}/api/admin/send-trip-whatsapp.php`;
    const response = await axios.post(
      url,
      { phone, message, channel },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        timeout: 45000,
      }
    );
    if (response.data?.status === 'error') {
      throw new Error(response.data?.message || 'WhatsApp send failed');
    }
    return response.data;
  },

  /** Grouped tomorrow summary to admin WhatsApp numbers (admin JWT) */
  sendTomorrowAdminWhatsAppBulk: async (): Promise<{
    status: string;
    message?: string | null;
    data?: {
      booking_count: number;
      admin_recipients: number;
      whatsapp_parts: number;
      notification_log?: string;
    };
  }> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const url = `${base}/api/admin/send-tomorrow-admin-whatsapp.php`;
    const response = await axios.post(
      url,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        timeout: 120000,
      }
    );
    if (response.data?.status === 'error') {
      throw new Error(response.data?.message || 'Bulk WhatsApp failed');
    }
    return response.data;
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
        timeout: 30000,
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
    const linkEmail = ((driver as { linkUserEmail?: string }).linkUserEmail ?? '').trim();
    const payload: Record<string, unknown> = {
      name: (driver.name ?? '').trim(),
      phone: phoneDigits,
      email: ((driver.email ?? '').trim() || `driver-${phoneDigits}@vizagtaxihub.com`),
      license_no: ((driver as { license_no?: string }).license_no ?? '').trim(),
      vehicle: (driver.vehicle ?? (driver as { vehicle_type?: string }).vehicle_type ?? '').trim(),
      vehicle_id: ((driver as { vehicle_id?: string }).vehicle_id ?? driver.vehicleNumber ?? '').trim(),
      status: (driver as { status?: string }).status ?? 'available',
      location: ((driver as { location?: string }).location ?? '').trim() || 'Visakhapatnam',
    };
    if (linkEmail) payload.linkUserEmail = linkEmail;
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

  /** Update driver status only (Set Available / Set Offline) - lightweight PUT with only status */
  updateDriverStatus: async (id: string | number, status: 'available' | 'busy' | 'offline'): Promise<void> => {
    const base = getBase();
    const url = `${base}/api/admin/driver.php?id=${id}`;
    const response = await axios.put(url, { status }, {
      headers: { 'Content-Type': 'application/json', 'X-Force-Refresh': 'true' },
      timeout: 15000,
      validateStatus: () => true,
    });
    const data = response.data;
    if (response.status >= 400 || data?.status === 'error') {
      const msg = data?.message ?? (Array.isArray(data?.errors) ? data.errors.join(', ') : null) ?? 'Failed to update status';
      throw new Error(msg);
    }
  },

  /** Update driver (matches web PUT /api/admin/driver.php?id=X - same headers, no Bearer) */
  updateDriver: async (id: string | number, driver: Partial<AdminDriver>): Promise<void> => {
    const base = getBase();
    const url = `${base}/api/admin/driver.php?id=${id}`;
    const phoneDigits = (driver.phone ?? '').replace(/\D/g, '').slice(-10);
    const linkEmail = ((driver as { linkUserEmail?: string }).linkUserEmail ?? '').trim();
    const payload: Record<string, unknown> = {
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
    if (linkEmail) payload.linkUserEmail = linkEmail;
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
    const raw = Array.isArray(list) ? list : [];
    return dedupeDriversByPhoneOrEmail(raw as AdminDriver[]);
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
      validateStatus: () => true,
    });
    const data = response.data;
    if (response.status >= 400) {
      const msg = typeof data?.error === 'string' ? data.error : data?.message || `Request failed (${response.status})`;
      throw new Error(msg);
    }
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
    const list = await loadAdminVehicleCatalog(base, token);
    const wanted = vehicleTypeLookupIds(vehicleId);
    const match = wanted
      .map((id) => list.find((raw) => vehicleRecordMatchesId(raw, id)))
      .find((raw) => raw != null);
    if (!match) throw new Error('Vehicle not found');
    return normalizeVehicleType(match);
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
      image: vehicle.image ?? '',
      description: vehicle.description ?? '',
      ac: vehicle.ac !== false,
      fuelType: vehicle.fuelType ?? '',
      isActive: vehicle.isActive !== false,
      amenities: vehicle.amenities ?? [],
      inactiveDates: (vehicle.inactiveDates ?? []).map((r) => ({
        id: r.id,
        reason: r.reason ?? '',
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
      validateStatus: () => true,
    });
    const data = response.data;
    if (typeof data === 'string') {
      const text = data.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      throw new Error(text.slice(0, 180) || 'Update failed');
    }
    if (response.status >= 400 || data?.status === 'error' || data?.success === false) {
      throw new Error(data?.message || data?.error || `Update failed (${response.status})`);
    }
  },

  /**
   * Assign a driver the same way the website does: name, phone, and the fleet plate
   * are written onto the booking together.
   */
  assignDriver: async (
    bookingId: number | string,
    driver: { id: number | string; name: string; phone: string; vehicleNumber?: string }
  ): Promise<void> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const url = `${base}/api/admin/assign-driver.php`;
    const vehicleNumber = (driver.vehicleNumber ?? '').trim();
    try {
      const response = await axios.post(
        url,
        {
          bookingId: Number(bookingId),
          driverId: Number(driver.id),
          driverName: driver.name,
          driverPhone: driver.phone,
          vehicleNumber,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
          validateStatus: () => true,
        }
      );
      const data = response.data;
      if (response.status >= 400 || data?.status === 'error') {
        throw new Error(data?.message || 'Failed to assign driver');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const serverMessage = error.response?.data?.message;
        if (typeof serverMessage === 'string' && serverMessage.trim() !== '') {
          throw new Error(serverMessage.trim());
        }
      }
      throw error;
    }
  },

  /** Fleet vehicle first, then the driver, so the website keeps both on the booking. */
  assignDriverAndVehicle: async (
    bookingId: number | string,
    driver: { id: number | string; name: string; phone: string },
    vehicle?: { id: string | number; vehicleNumber: string }
  ): Promise<void> => {
    const plate = (vehicle?.vehicleNumber ?? '').trim();
    if (vehicle?.id != null && String(vehicle.id) !== '') {
      await adminAPI.assignVehicle(bookingId, vehicle.id, driver.id);
    }
    await adminAPI.assignDriver(bookingId, { ...driver, vehicleNumber: plate });
  },

  getDutyAssignment: async (bookingId: number): Promise<{
    tripCode: string;
    days: Array<{
      id: number;
      dayIndex: number;
      dutyDate: string;
      status: string;
      segments: Array<{
        status: string;
        driverName: string;
        vehicleNumber: string;
        vehicleModel: string;
        openingKm: number | null;
        closingKm: number | null;
      }>;
    }>;
  }> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const response = await axios.get(`${base}/api/admin/duty-assignment.php`, {
      params: { bookingId },
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });
    if (response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Could not load duty days');
    }
    return response.data;
  },

  changeDutyAssignment: async (payload: {
    bookingId: number;
    effectiveDate: string;
    newDriverId: number;
    newVehicleId: number;
    reason: string;
    note: string;
    closingKm: number | null;
  }): Promise<void> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const response = await axios.post(`${base}/api/admin/duty-assignment.php`, payload, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 20000,
    });
    if (response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Could not change the assignment');
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
    options?: InvoiceRequestOptions
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
    if ((options?.customInvoiceNumber ?? '').trim()) {
      params.append('invoiceNumber', (options?.customInvoiceNumber ?? '').trim());
    }
    if ((options?.adminNotes ?? '').trim()) {
      params.append('adminNotes', (options?.adminNotes ?? '').trim());
    }
    const lockedBase = options?.lockedBaseFare ?? options?.gstDetails?.lockedBaseFare;
    if (lockedBase != null && lockedBase > 0) {
      params.append('lockedBaseFare', String(lockedBase));
    }
    if (options?.gstEnabled && options?.gstDetails) {
      if (options.gstDetails.gstNumber) params.append('gstNumber', options.gstDetails.gstNumber);
      if (options.gstDetails.companyName) params.append('companyName', options.gstDetails.companyName);
      if (options.gstDetails.companyAddress) params.append('companyAddress', options.gstDetails.companyAddress || '');
    }
    appendInvoiceBillingParams(params, options);
    return `${base}/api/download-invoice.php?${params.toString()}`;
  },

  /**
   * Fetch invoice PDF as binary - for in-app save/share (avoids browser returning JSON).
   * Uses main /api/download-invoice.php.
   */
  getInvoicePdfBlob: async (
    bookingId: number,
    options?: InvoiceRequestOptions
  ): Promise<{ data: ArrayBuffer; isPdf: boolean }> => {
    const url = adminAPI.getInvoicePdfUrl(bookingId, options);
    const token = await authAPI.getStoredToken();
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      validateStatus: () => true,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const bytes = new Uint8Array(response.data as ArrayBuffer);
    // Require PDF magic bytes - Content-Type can be wrong (e.g. server returns JSON with pdf header)
    const startsWithPdf =
      bytes.length >= 5 &&
      bytes[0] === 37 &&
      bytes[1] === 80 &&
      bytes[2] === 68 &&
      bytes[3] === 70 &&
      bytes[4] === 45;
    if (startsWithPdf && response.data && (response.data as ArrayBuffer).byteLength > 0) {
      return { data: response.data as ArrayBuffer, isPdf: true };
    }
    if (!startsWithPdf && response.data && bytes.length > 0) {
      const firstChar = String.fromCharCode(bytes[0]);
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
    throw new Error('Could not get PDF. Please try View Invoice (HTML) instead.');
  },

  /**
   * Fetch invoice HTML for view - uses main download-invoice with format=html for correct GST calculations.
   * Matches web app: Base Fare (excluding GST) + Extra Charges + GST 18% (CGST 9% + SGST 9%) = Total.
   */
  getInvoiceHtml: async (
    bookingId: number,
    options?: InvoiceRequestOptions
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
    if ((options?.customInvoiceNumber ?? '').trim()) {
      params.append('invoiceNumber', (options?.customInvoiceNumber ?? '').trim());
    }
    if ((options?.adminNotes ?? '').trim()) {
      params.append('adminNotes', (options?.adminNotes ?? '').trim());
    }
    const lockedBase = options?.lockedBaseFare ?? options?.gstDetails?.lockedBaseFare;
    if (lockedBase != null && lockedBase > 0) {
      params.append('lockedBaseFare', String(lockedBase));
    }
    if (options?.gstEnabled && options?.gstDetails) {
      if (options.gstDetails.gstNumber) params.append('gstNumber', options.gstDetails.gstNumber);
      if (options.gstDetails.companyName) params.append('companyName', options.gstDetails.companyName);
      if (options.gstDetails.companyAddress) params.append('companyAddress', options.gstDetails.companyAddress || '');
    }
    appendInvoiceBillingParams(params, options);
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

  /** Generate invoice for booking - normalizes response (data.data or data.invoice). Matches web: passes lockedBaseFare for GST-inclusive. */
  generateInvoice: async (
    bookingId: number,
    options?: InvoiceRequestOptions
  ): Promise<AdminInvoice> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const url = `${base}/api/admin/generate-invoice.php`;
    const finalIncludeTax =
      options?.includeTax !== undefined
        ? options.includeTax
        : (options?.gstEnabled ? true : false);
    const gstDetails = options?.gstDetails ?? {};
    const lockedBase = options?.lockedBaseFare ?? gstDetails.lockedBaseFare;
    const mergedGstDetails =
      lockedBase != null && lockedBase > 0 ? { ...gstDetails, lockedBaseFare: lockedBase } : gstDetails;
    const requestBody: Record<string, unknown> = {
      bookingId,
      gstEnabled: options?.gstEnabled ?? false,
      isIGST: options?.isIGST ?? false,
      includeTax: finalIncludeTax,
      invoiceNumber: options?.customInvoiceNumber ?? '',
      gstDetails: mergedGstDetails,
    };
    if (lockedBase != null && lockedBase > 0) {
      requestBody.lockedBaseFare = lockedBase;
    }
    if ((options?.adminNotes ?? '').trim()) {
      requestBody.adminNotes = (options?.adminNotes ?? '').trim();
    }
    if ((options?.billingAddress ?? '').trim()) {
      requestBody.billingAddress = (options?.billingAddress ?? '').trim();
    }
    if (options?.tripSummary) {
      const trip = options.tripSummary;
      requestBody.tripSummary = {
        tripType: (trip.tripType ?? '').trim(),
        vehicleType: (trip.vehicleType ?? '').trim(),
        vehicleNumber: (trip.vehicleNumber ?? '').trim(),
        tripDate: (trip.tripDate ?? '').trim(),
        noOfHours: (trip.noOfHours ?? '').trim(),
        noOfKilometers: (trip.noOfKilometers ?? '').trim(),
      };
    }
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
  image?: string;
  description?: string;
  ac?: boolean;
  fuelType?: string;
  amenities?: string[];
  inactiveDates?: Array<{ id?: string; from: Date | string; to: Date | string; reason?: string }>;
  inclusions?: string[];
  exclusions?: string[];
  cancellationPolicy?: string;
  isActive?: boolean;
}

function normalizeVehicleKey(id: string): string {
  return id.toLowerCase().replace(/[\s-]+/g, '_').trim();
}

function vehicleTypeLookupIds(id: string): string[] {
  const key = normalizeVehicleKey(id);
  const groups = [
    ['bus', 'urbania'],
    ['toyota_glanza', 'glanza', 'toyota'],
    ['sedan', 'swift_dzire', 'dzire'],
    ['amaze', 'aura', 'hyundai_aura'],
    ['mpv', 'hycross', 'innova_hycross'],
    ['innova_crysta', 'innova', 'crysta'],
    ['tempo_traveller', 'tempo'],
    ['ertiga'],
  ];
  const group = groups.find((entry) => entry.includes(key));
  if (!group) return key ? [key] : [];
  return [...new Set([group[0], key, ...group])];
}

function vehicleRecordMatchesId(raw: Record<string, unknown>, id: string): boolean {
  const wanted = normalizeVehicleKey(id);
  if (!wanted) return false;
  const ids = [raw.id, raw.vehicleId, raw.vehicle_id].map((value) => normalizeVehicleKey(String(value ?? '')));
  return ids.includes(wanted);
}

function readVehicleIsActive(raw: Record<string, unknown>): boolean {
  const value = raw.isActive !== undefined ? raw.isActive : raw.is_active;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return true;
}

function readVehicleInactiveDates(raw: Record<string, unknown>): AdminVehicleType['inactiveDates'] {
  let value: unknown = raw.inactiveDates ?? raw.inactive_dates;
  if (typeof value === 'string' && value.trim()) {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.flatMap((row, index) => {
    if (!row || typeof row !== 'object') return [];
    const range = row as { id?: unknown; from?: unknown; to?: unknown; reason?: unknown };
    const from = range.from instanceof Date ? range.from : new Date(String(range.from ?? ''));
    const to = range.to instanceof Date ? range.to : new Date(String(range.to ?? ''));
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return [];
    return [{
      id: range.id == null ? `range-${index}` : String(range.id),
      from,
      to,
      reason: range.reason == null ? undefined : String(range.reason),
    }];
  });
}

function readStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    // comma-separated text
  }
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function normalizeVehicleType(raw: Record<string, unknown>): AdminVehicleType {
  const id = String(raw.id ?? raw.vehicleId ?? raw.vehicle_id ?? '');
  const inactiveDates = readVehicleInactiveDates(raw) ?? [];
  return {
    id,
    vehicleId: id,
    name: String(raw.name ?? ''),
    capacity: Number(raw.capacity ?? 4),
    luggageCapacity: Number(raw.luggageCapacity ?? raw.luggage_capacity ?? 2),
    basePrice: Number(raw.basePrice ?? raw.base_price ?? raw.price ?? 0),
    price: Number(raw.price ?? raw.basePrice ?? raw.base_price ?? 0),
    pricePerKm: Number(raw.pricePerKm ?? raw.price_per_km ?? 14),
    driverAllowance: Number(raw.driverAllowance ?? raw.driver_allowance ?? 250),
    nightHaltCharge: Number(raw.nightHaltCharge ?? raw.night_halt_charge ?? 700),
    image: raw.image == null ? undefined : String(raw.image),
    description: raw.description == null ? undefined : String(raw.description),
    ac: raw.ac === false || raw.ac === 0 || raw.ac === '0' ? false : true,
    fuelType: raw.fuelType == null && raw.fuel_type == null ? undefined : String(raw.fuelType ?? raw.fuel_type),
    amenities: readStringList(raw.amenities),
    inactiveDates,
    inclusions: readStringList(raw.inclusions),
    exclusions: readStringList(raw.exclusions),
    cancellationPolicy: String(raw.cancellationPolicy ?? raw.cancellation_policy ?? ''),
    isActive: readVehicleIsActive(raw),
  };
}

async function loadAdminVehicleCatalog(base: string, token: string): Promise<Record<string, unknown>[]> {
  const urls = [
    `${base}/api/admin/direct-vehicle-modify.php?action=load&includeInactive=true&_t=${Date.now()}`,
    `${base}/api/admin/vehicles-data.php?includeInactive=true&_t=${Date.now()}`,
  ];
  const merged: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const url of urls) {
    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Force-Refresh': 'true',
          'X-Admin-Mode': 'true',
        },
        timeout: 15000,
        validateStatus: () => true,
      });
      const data = response.data;
      if (!data || typeof data === 'string') continue;
      const vehicles = data.vehicles ?? data.data ?? [];
      const list = Array.isArray(vehicles) ? vehicles : [];
      for (const row of list) {
        if (!row || typeof row !== 'object') continue;
        const raw = row as Record<string, unknown>;
        const id = normalizeVehicleKey(String(raw.id ?? raw.vehicleId ?? raw.vehicle_id ?? ''));
        if (!id || seen.has(id)) continue;
        seen.add(id);
        merged.push(raw);
      }
    } catch {
      continue;
    }
  }
  return merged;
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
