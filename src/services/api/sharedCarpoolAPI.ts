import axios from 'axios';
import { getApiUrl } from '@/config/api';

function adminHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

const adminBase = () => getApiUrl('/api/shared-carpool/admin.php');
const publicBase = () => getApiUrl('/api/shared-carpool/public.php');

export type CommuteRequestStatus = 'pending' | 'verified' | 'matched' | 'rejected' | 'cancelled';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type UserStatus = 'pending' | 'verified' | 'blocked';

export interface CommuteRequest {
  id: number;
  full_name: string;
  phone: string;
  company?: string;
  pickup: string;
  drop_location: string;
  travel_date?: string;
  pickup_time?: string;
  travel_days?: string;
  group_preference: string;
  budget?: number;
  seats: number;
  status: CommuteRequestStatus;
  created_at: string;
  deleted_at?: string | null;
}

export interface Verification {
  id: number;
  request_id?: number;
  full_name: string;
  phone: string;
  company?: string;
  employee_email?: string;
  id_card_url?: string;
  date_of_birth?: string | null;
  pickup?: string;
  drop_location?: string;
  pickup_time?: string;
  seats?: number;
  status: VerificationStatus;
  verification_type: 'auto' | 'manual';
  created_at: string;
  notes?: string;
  deleted_at?: string | null;
}

export interface CarpoolUser {
  id: number;
  full_name: string;
  phone: string;
  email?: string;
  company?: string;
  user_role: 'employee' | 'student';
  status: UserStatus;
  joined_at: string;
  date_of_birth?: string | null;
  profile_email?: string;
  id_card_url?: string;
  profile_date_of_birth?: string | null;
  email_verified?: number | boolean;
}

export interface CarpoolSession {
  phone: string;
  fullName?: string;
  email?: string;
  company?: string;
  userRole?: 'employee' | 'student';
  employeeEmail?: string;
  dateOfBirth?: string | null;
  phoneVerified: boolean;
  emailVerified?: boolean;
  verificationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  profileSubmitted?: boolean;
  userId?: number;
}

export type SeatBookingStatus = 'pending' | 'confirmed' | 'cancelled';

export interface SeatBooking {
  id: number;
  ride_id: number;
  user_name: string;
  user_phone: string;
  seats: number;
  amount: number;
  status: SeatBookingStatus;
  travel_date?: string;
  company?: string;
  group_preference?: string;
  created_at: string;
  pickup?: string;
  drop_location?: string;
  pickup_time?: string;
  vehicle?: string;
  vehicle_number?: string;
  driver_name?: string;
  driver_phone?: string;
  price_per_seat?: number;
}

export interface CarpoolRide {
  id: number;
  pickup: string;
  drop_location: string;
  via_route?: string;
  pickup_time: string;
  drop_time_est?: string;
  vehicle: string;
  vehicle_number?: string;
  driver_name: string;
  driver_phone?: string;
  driver_rating: number;
  seats_total: number;
  seats_left: number;
  price_per_seat: number;
  period: 'morning' | 'afternoon' | 'evening' | 'night';
  is_best_match: boolean;
  status: 'active' | 'full' | 'cancelled';
  amenities?: string[];
  schedule_text?: string;
  est_duration?: string;
  created_at?: string;
  deleted_at?: string | null;
}

export interface DashboardData {
  stats: {
    total_requests: number;
    verified_users: number;
    active_rides: number;
    completed_bookings: number;
    pending_verifications: number;
  };
  week_chart: { day: string; date: string; count: number }[];
  status_breakdown: Record<string, number>;
  top_routes: { route: string; count: number }[];
  recent_requests: CommuteRequest[];
  verification_summary: {
    pending: number;
    approved_today: number;
    rejected_today: number;
    auto_verified: number;
    manual_verified: number;
  };
}

export const sharedCarpoolAdminAPI = {
  async getDashboard(): Promise<DashboardData> {
    const { data } = await axios.get(`${adminBase()}?action=dashboard`, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Failed to load dashboard');
    return data;
  },

  async getRequests(status = 'all', search = ''): Promise<CommuteRequest[]> {
    const { data } = await axios.get(`${adminBase()}?action=requests&status=${status}&search=${encodeURIComponent(search)}`, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Failed to load requests');
    return data.requests;
  },

  async updateRequestStatus(id: number, status: CommuteRequestStatus): Promise<void> {
    const { data } = await axios.put(`${adminBase()}?action=request`, { id, status }, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Update failed');
  },

  async deleteRequest(id: number): Promise<void> {
    const { data } = await axios.delete(`${adminBase()}?action=request&id=${id}`, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Delete failed');
  },

  async getVerifications(status = 'all'): Promise<Verification[]> {
    const { data } = await axios.get(`${adminBase()}?action=verifications&status=${status}`, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Failed to load verifications');
    return data.verifications;
  },

  async getVerification(id: number): Promise<Verification> {
    const { data } = await axios.get(`${adminBase()}?action=verification&id=${id}`, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Not found');
    return data.verification;
  },

  async updateVerification(id: number, status: VerificationStatus, notes = ''): Promise<void> {
    const { data } = await axios.put(`${adminBase()}?action=verification`, { id, status, notes }, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Update failed');
  },

  async deleteVerification(id: number): Promise<void> {
    const { data } = await axios.delete(`${adminBase()}?action=verification&id=${id}`, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Delete failed');
  },

  async getUsers(status = 'all'): Promise<{ users: CarpoolUser[]; summary: Record<string, number> }> {
    const { data } = await axios.get(`${adminBase()}?action=users&status=${status}`, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Failed to load users');
    return { users: data.users, summary: data.summary };
  },

  async updateUserStatus(id: number, status: UserStatus): Promise<void> {
    const { data } = await axios.put(`${adminBase()}?action=user`, { id, status }, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Update failed');
  },

  async deleteUser(id: number): Promise<void> {
    const { data } = await axios.delete(`${adminBase()}?action=user&id=${id}`, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Delete failed');
  },

  async getRides(): Promise<CarpoolRide[]> {
    const { data } = await axios.get(`${adminBase()}?action=rides`, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Failed to load rides');
    return data.rides;
  },

  async getDeletedRides(): Promise<CarpoolRide[]> {
    const { data } = await axios.get(`${adminBase()}?action=deleted-rides`, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Failed to load deleted rides');
    return data.rides;
  },

  async getDeletedVerifications(): Promise<Verification[]> {
    const { data } = await axios.get(`${adminBase()}?action=deleted-verifications`, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Failed to load deleted verifications');
    return data.verifications;
  },

  async getDeletedRequests(): Promise<CommuteRequest[]> {
    const { data } = await axios.get(`${adminBase()}?action=deleted-requests`, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Failed to load deleted requests');
    return data.requests;
  },

  async restoreVerification(id: number): Promise<void> {
    const { data } = await axios.put(`${adminBase()}?action=restore-verification`, { id }, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Restore failed');
  },

  async restoreRequest(id: number): Promise<void> {
    const { data } = await axios.put(`${adminBase()}?action=restore-request`, { id }, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Restore failed');
  },

  async createRide(ride: Partial<CarpoolRide>): Promise<number> {
    const { data } = await axios.post(`${adminBase()}?action=ride`, ride, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Create failed');
    return data.id;
  },

  async updateRide(id: number, ride: Partial<CarpoolRide>): Promise<void> {
    const { data } = await axios.put(`${adminBase()}?action=ride`, { id, ...ride }, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Update failed');
  },

  async deleteRide(id: number, permanent = false): Promise<void> {
    const q = permanent ? `&permanent=1` : '';
    const { data } = await axios.delete(`${adminBase()}?action=ride&id=${id}${q}`, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Delete failed');
  },

  async restoreRide(id: number): Promise<void> {
    const { data } = await axios.put(`${adminBase()}?action=restore-ride`, { id }, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Restore failed');
  },

  async seedDemoData(): Promise<void> {
    const { data } = await axios.post(`${adminBase()}?action=seed`, {}, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Seed failed');
  },

  async getBookings(status = 'all', rideId?: number): Promise<SeatBooking[]> {
    const params = new URLSearchParams({ action: 'bookings', status });
    if (rideId) params.set('ride_id', String(rideId));
    const { data } = await axios.get(`${adminBase()}?${params.toString()}`, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Failed to load seat requests');
    return data.bookings;
  },

  async updateBookingStatus(id: number, status: SeatBookingStatus): Promise<void> {
    const { data } = await axios.put(`${adminBase()}?action=booking`, { id, status }, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Update failed');
  },

  async deleteBooking(id: number): Promise<void> {
    const { data } = await axios.delete(`${adminBase()}?action=booking&id=${id}`, { headers: adminHeaders() });
    if (!data.success) throw new Error(data.error || 'Delete failed');
  },
};

export const sharedCarpoolPublicAPI = {
  async searchRides(params: { from?: string; to?: string; period?: string }): Promise<CarpoolRide[]> {
    const q = new URLSearchParams({ action: 'rides' });
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    if (params.period) q.set('period', params.period);
    const { data } = await axios.get(`${publicBase()}?${q.toString()}`);
    if (!data.success) throw new Error(data.error || 'Search failed');
    return data.rides;
  },

  async submitCommuteRequest(payload: Record<string, unknown>): Promise<number> {
    const { data } = await axios.post(`${publicBase()}?action=commute-request`, payload);
    if (!data.success) throw new Error(data.error || 'Submit failed');
    return data.request_id;
  },

  async submitRideRequest(payload: {
    ride_id: number;
    full_name: string;
    phone: string;
    seats?: number;
    travel_date?: string;
    company?: string;
    group_preference?: string;
  }): Promise<number> {
    const { data } = await axios.post(`${publicBase()}?action=ride-request`, payload);
    if (!data.success) throw new Error(data.error || 'Request failed');
    return data.booking_id as number;
  },

  async getBookingStatus(bookingId: number, phone: string): Promise<SeatBooking> {
    const q = new URLSearchParams({
      action: 'booking-status',
      booking_id: String(bookingId),
      phone: phone.replace(/\D/g, ''),
    });
    const { data } = await axios.get(`${publicBase()}?${q.toString()}`);
    if (!data.success) throw new Error(data.error || 'Failed to load booking status');
    return data.booking as SeatBooking;
  },
};

export const sharedCarpoolUserAPI = {
  async sendOtp(phone: string): Promise<{ devOtp?: string }> {
    const { data } = await axios.post(`${publicBase()}?action=send-otp`, { phone });
    if (!data.success) throw new Error(data.error || 'Failed to send OTP');
    return { devOtp: data.dev_otp };
  },

  async verifyOtp(phone: string, otp: string, fullName?: string): Promise<CarpoolSession> {
    const { data } = await axios.post(`${publicBase()}?action=verify-otp`, { phone, otp, full_name: fullName });
    if (!data.success) throw new Error(data.error || 'Invalid OTP');
    return data.session as CarpoolSession;
  },

  async getProfile(phone: string): Promise<CarpoolSession> {
    const { data } = await axios.get(`${publicBase()}?action=profile&phone=${encodeURIComponent(phone)}`);
    if (!data.success) throw new Error(data.error || 'Profile not found');
    return data.session as CarpoolSession;
  },

  async submitProfile(payload: {
    phone: string;
    full_name: string;
    user_role: 'employee' | 'student';
    company?: string;
    employee_email?: string;
    email?: string;
    id_card_url?: string;
    date_of_birth?: string;
  }): Promise<{ verification_email_sent?: boolean }> {
    const { data } = await axios.post(`${publicBase()}?action=submit-profile`, payload);
    if (!data.success) throw new Error(data.error || 'Profile submit failed');
    return { verification_email_sent: data.verification_email_sent };
  },

  async verifyCarpoolEmail(token: string): Promise<CarpoolSession> {
    const { data } = await axios.get(`${publicBase()}?action=verify-carpool-email&token=${encodeURIComponent(token)}`);
    if (!data.success) throw new Error(data.error || 'Verification failed');
    return data.session as CarpoolSession;
  },

  async resendCarpoolEmail(phone: string): Promise<{ verification_email_sent?: boolean }> {
    const { data } = await axios.post(`${publicBase()}?action=resend-carpool-email`, { phone });
    if (!data.success) throw new Error(data.error || 'Could not resend email');
    return { verification_email_sent: data.verification_email_sent };
  },

  async getMyBookings(phone: string): Promise<SeatBooking[]> {
    const { data } = await axios.get(`${publicBase()}?action=my-bookings&phone=${encodeURIComponent(phone)}`);
    if (!data.success) throw new Error(data.error || 'Failed to load bookings');
    return data.bookings as SeatBooking[];
  },
};
