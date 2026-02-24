import React from 'react';
import axios from 'axios';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { getApiUrl } from '@/config/api';
import GroupTourInvoicePDF from '@/components/invoice/GroupTourInvoicePDF';

const api = axios.create({
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

function fullUrl(path: string): string {
  return getApiUrl(path.startsWith('/') ? path : `/api/group-tour${path.startsWith('/') ? path : path}`);
}

function adminHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

const adminBase = () => getApiUrl('/api/admin/group-tour-management.php');
const adminBookingsBase = () => getApiUrl('/api/admin/group-tour-bookings.php');
const adminSeatsBase = () => getApiUrl('/api/admin/group-tour-seats.php');

export interface ItineraryItem {
  day: string;
  title: string;
  description?: string;
}

export interface BoardingPoint {
  id?: number;
  name: string;
  address: string;
  boarding_time: string;
  sort_order?: number;
}

export interface GroupTour {
  id: number;
  title?: string | null;
  pickup_location: string;
  dropoff_location: string;
  travel_date: string;
  price_per_seat: number;
  capacity: number;
  available_seats: number;
  price_from?: number;
  featured_image_url?: string | null;
  gallery_images?: string[];
  highlights?: string[];
  itinerary?: ItineraryItem[];
  inclusions?: string[];
  exclusions?: string[];
  boarding_points?: BoardingPoint[];
  first_boarding_point_name?: string | null;
  first_boarding_time?: string | null;
}

export interface SeatStatus {
  seat_id: string;
  status: 'available' | 'reserved' | 'booked' | 'blocked';
  reservation_expires_at?: string | null;
  is_female_only?: boolean;
  passenger_gender?: 'male' | 'female' | null;
  price?: number;
}

export interface SeatAvailabilityResponse {
  success: boolean;
  seats: Record<string, SeatStatus>;
  layout: { passenger_seats: Record<string, SeatStatus>; driver: { seat_id: string; status: string }; layout: string[][] };
  base_price?: number;
  price_from?: number;
}

export interface RouteOption {
  pickup_location: string;
  dropoff_location: string;
  title?: string | null;
  label: string;
  first_date?: string | null;
  price_from?: number | null;
  featured_image_url?: string | null;
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
  seats: string[];
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: string;
  created_at: string;
  boarding_point_name?: string | null;
  boarding_point_time?: string | null;
  drop_point_name?: string | null;
}

export const groupTourAPI = {
  getRoutes: async (): Promise<RouteOption[]> => {
    const res = await api.get(fullUrl('/api/group-tour/list-routes'));
    if (!res.data?.success) return [];
    return res.data.routes || [];
  },

  getAvailableDates: async (pickup: string, dropoff: string): Promise<string[]> => {
    const params = new URLSearchParams({ pickup: pickup.trim(), dropoff: dropoff.trim() });
    const res = await api.get(fullUrl(`/api/group-tour/list-dates?${params}`));
    if (!res.data?.success) return [];
    return res.data.dates || [];
  },

  searchTours: async (pickup: string, dropoff: string, date: string): Promise<GroupTour[]> => {
    const params = new URLSearchParams({ pickup, dropoff, date });
    const res = await api.get(fullUrl(`/api/group-tour/search-tours?${params}`));
    if (!res.data?.success) throw new Error(res.data?.error || 'Search failed');
    return res.data.tours || [];
  },

  getSeatAvailability: async (tourId: number): Promise<SeatAvailabilityResponse> => {
    const res = await api.get(fullUrl(`/api/group-tour/seat-availability?tour_id=${tourId}`));
    if (!res.data?.success) throw new Error(res.data?.error || 'Failed to fetch seats');
    return res.data;
  },

  reserveSeats: async (
    tourId: number,
    seatIds: string[],
    customer: { name: string; email: string; phone: string; gender: 'male' | 'female'; passenger_genders?: ('male' | 'female')[] }
  ): Promise<{ reservation_id: string; seat_ids: string[]; expires_at: string; expires_in_seconds: number }> => {
    const payload: Record<string, unknown> = {
      tour_id: tourId,
      seat_ids: seatIds,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      customer_gender: customer.gender,
    };
    if (Array.isArray(customer.passenger_genders) && customer.passenger_genders.length === seatIds.length) {
      payload.passenger_genders = customer.passenger_genders;
    }
    const res = await api.post(fullUrl(`/api/group-tour/reserve-seats`), payload);
    if (!res.data?.success) throw new Error(res.data?.error || 'Reservation failed');
    return res.data;
  },

  createOrder: async (
    tourId: number,
    seatIds: string[],
    reservationId: string,
    totalAmount: number,
    customer: { name: string; email: string; phone: string }
  ): Promise<{ order: { id: string; amount: number; currency: string }; razorpay_key_id: string }> => {
    const res = await api.post(fullUrl(`/api/group-tour/create-order`), {
      tour_id: tourId,
      seat_ids: seatIds,
      reservation_id: reservationId,
      total_amount: totalAmount,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
    });
    if (!res.data?.success) throw new Error(res.data?.error || 'Order creation failed');
    return res.data;
  },

  getBookingDetails: async (bookingId: number | string): Promise<{
    booking_number: string;
    pickup_location: string;
    dropoff_location: string;
    travel_date: string;
    seats: string[];
    total_amount: number;
    customer_name: string;
    customer_phone: string;
    boarding_point_name?: string | null;
    boarding_point_time?: string | null;
    drop_point_name?: string | null;
  }> => {
    const param = typeof bookingId === 'number' ? `booking_id=${bookingId}` : `booking_number=${encodeURIComponent(String(bookingId))}`;
    const base = fullUrl('/api/group-tour/booking-details');
    const res = await api.get(`${base}?${param}`);
    if (!res.data?.success) throw new Error(res.data?.error || 'Failed to fetch booking');
    return res.data.booking;
  },

  // Admin API - requires auth
  adminListTours: async (filters?: { from_date?: string; to_date?: string; status?: string }): Promise<GroupTour[]> => {
    const params = new URLSearchParams(filters as Record<string, string>);
    const res = await axios.get(`${adminBase()}?${params}`, { headers: adminHeaders() });
    if (!res.data?.success) throw new Error(res.data?.error || 'Failed to list tours');
    return res.data.tours || [];
  },

  adminGetTour: async (id: number): Promise<GroupTour | null> => {
    const res = await axios.get(`${adminBase()}?id=${id}`, { headers: adminHeaders() });
    if (!res.data?.success) throw new Error(res.data?.error || 'Failed to fetch tour');
    return res.data.tour ?? null;
  },

  getBoardingPoints: async (tourId: number): Promise<BoardingPoint[]> => {
    const res = await api.get(fullUrl(`/api/group-tour/boarding-points?tour_id=${tourId}`));
    if (!res.data?.success) return [];
    return res.data.boarding_points || [];
  },

  adminCreateTour: async (data: {
    title?: string | null;
    pickup_location: string;
    dropoff_location: string;
    travel_date: string;
    expiry_date?: string | null;
    price_per_seat?: number;
    capacity?: number;
    status?: string;
    featured_image_url?: string;
    gallery_images?: string[];
    highlights?: string[];
    itinerary?: { day: string; title: string; description?: string }[];
    inclusions?: string[];
    exclusions?: string[];
    boarding_points?: BoardingPoint[];
  }): Promise<{ id: number }> => {
    const res = await axios.post(adminBase(), data, { headers: adminHeaders() });
    if (!res.data?.success) throw new Error(res.data?.error || 'Failed to create tour');
    return { id: res.data.id };
  },

  adminUpdateTour: async (id: number, data: Partial<{
    title: string | null;
    pickup_location: string;
    dropoff_location: string;
    travel_date: string;
    expiry_date: string | null;
    price_per_seat: number;
    capacity: number;
    status: string;
    featured_image_url: string;
    gallery_images: string[];
    highlights: string[];
    itinerary: { day: string; title: string; description?: string }[];
    inclusions: string[];
    exclusions: string[];
    boarding_points: BoardingPoint[];
  }>): Promise<void> => {
    const res = await axios.put(adminBase(), { id, ...data }, { headers: adminHeaders() });
    if (!res.data?.success) throw new Error(res.data?.error || 'Failed to update tour');
  },

  adminDeleteTour: async (id: number): Promise<void> => {
    const res = await axios.delete(`${adminBase()}?id=${id}`, { headers: adminHeaders() });
    if (!res.data?.success) throw new Error(res.data?.error || 'Failed to delete tour');
  },

  adminListBookings: async (filters?: { from_date?: string; to_date?: string; status?: string }): Promise<GroupTourBooking[]> => {
    const params = new URLSearchParams(filters as Record<string, string>);
    const res = await axios.get(`${adminBookingsBase()}?${params}`, { headers: adminHeaders() });
    if (!res.data?.success) throw new Error(res.data?.error || 'Failed to list bookings');
    return res.data.bookings || [];
  },

  adminCancelBooking: async (bookingId: number): Promise<void> => {
    const res = await axios.post(adminBookingsBase(), { action: 'cancel', booking_id: bookingId }, { headers: adminHeaders() });
    if (!res.data?.success) throw new Error(res.data?.error || 'Failed to cancel booking');
  },

  /** Download invoice as PDF. For group tour bookings, pass raw id (1000000 + id is used internally). */
  adminDownloadInvoice: async (groupTourBookingId: number): Promise<void> => {
    const bookingId = 1000000 + groupTourBookingId;
    const url = getApiUrl(`/api/admin/get-invoice.php?booking_id=${bookingId}`);
    let res;
    try {
      res = await axios.get(url, { headers: adminHeaders() });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to fetch invoice';
      throw new Error(msg);
    }
    if (res.data?.status !== 'success' || !res.data?.invoice) {
      throw new Error(res.data?.message || 'Failed to fetch invoice');
    }
    const invoiceData = res.data.invoice;
    const blob = await pdf(React.createElement(GroupTourInvoicePDF, { data: invoiceData })).toBlob();
    const bookingNumber = (invoiceData.booking_number || `invoice-${groupTourBookingId}`).replace(/[^a-zA-Z0-9\-]/g, '');
    saveAs(blob, `invoice-${bookingNumber}.pdf`);
  },

  adminGetSeatOccupancy: async (tourId: number): Promise<{
    tour_id: number;
    tour: { pickup_location: string; dropoff_location: string; travel_date: string; price_per_seat?: number };
    seats: { seat_id: string; status: string; reservation_expires_at?: string | null; booking_number?: string | null; customer_name?: string | null; is_female_only?: boolean; passenger_gender?: 'male' | 'female' | null; price?: number }[];
  }> => {
    const res = await axios.get(`${adminSeatsBase()}?tour_id=${tourId}`, { headers: adminHeaders() });
    if (!res.data?.success) throw new Error(res.data?.error || 'Failed to fetch seats');
    return res.data;
  },

  adminBlockSeat: async (tourId: number, seatId: string): Promise<void> => {
    const res = await axios.post(adminSeatsBase(), { tour_id: tourId, seat_id: seatId, action: 'block' }, { headers: adminHeaders() });
    if (!res.data?.success) throw new Error(res.data?.error || 'Failed to block seat');
  },

  adminUnblockSeat: async (tourId: number, seatId: string): Promise<void> => {
    const res = await axios.post(adminSeatsBase(), { tour_id: tourId, seat_id: seatId, action: 'unblock' }, { headers: adminHeaders() });
    if (!res.data?.success) throw new Error(res.data?.error || 'Failed to unblock seat');
  },

  adminUnreserveSeat: async (tourId: number, seatId: string): Promise<void> => {
    const res = await axios.post(adminSeatsBase(), { tour_id: tourId, seat_id: seatId, action: 'unreserve' }, { headers: adminHeaders() });
    if (!res.data?.success) throw new Error(res.data?.error || 'Failed to unreserve seat');
  },

  adminSetFemaleOnly: async (tourId: number, seatId: string): Promise<void> => {
    const res = await axios.post(adminSeatsBase(), { tour_id: tourId, seat_id: seatId, action: 'set_female_only' }, { headers: adminHeaders() });
    if (!res.data?.success) throw new Error(res.data?.error || 'Failed to set female-only');
  },

  adminSetGeneral: async (tourId: number, seatId: string): Promise<void> => {
    const res = await axios.post(adminSeatsBase(), { tour_id: tourId, seat_id: seatId, action: 'set_general' }, { headers: adminHeaders() });
    if (!res.data?.success) throw new Error(res.data?.error || 'Failed to set general');
  },

  adminSetSeatPrice: async (tourId: number, seatId: string, price: number): Promise<void> => {
    const res = await axios.post(adminSeatsBase(), { tour_id: tourId, seat_id: seatId, action: 'set_price', price }, { headers: adminHeaders() });
    if (!res.data?.success) throw new Error(res.data?.error || 'Failed to set price');
  },

  adminBulkAdjustPrices: async (
    tourId: number,
    scope: 'all' | 'available' | 'selected',
    adjustType: 'fixed' | 'percent',
    adjustValue: number,
    selectedSeats?: string[]
  ): Promise<{ updated: number }> => {
    const res = await axios.post(
      adminSeatsBase(),
      { tour_id: tourId, action: 'bulk_adjust', scope, adjust_type: adjustType, adjust_value: adjustValue, selected_seats: selectedSeats },
      { headers: adminHeaders() }
    );
    if (!res.data?.success) throw new Error(res.data?.error || 'Failed to adjust prices');
    return { updated: res.data.updated ?? 0 };
  },

  adminResetSeatPrices: async (tourId: number): Promise<{ deleted: number }> => {
    const res = await axios.post(adminSeatsBase(), { tour_id: tourId, action: 'reset_prices' }, { headers: adminHeaders() });
    if (!res.data?.success) throw new Error(res.data?.error || 'Failed to reset prices');
    return { deleted: res.data.deleted ?? 0 };
  },

  verifyPayment: async (
    paymentId: string,
    orderId: string,
    signature: string,
    payload: {
      tour_id: number;
      seat_ids: string[];
      reservation_id: string;
      total_amount: number;
      seat_amounts?: Record<string, number>;
      customer_name: string;
      customer_email: string;
      customer_phone: string;
      customer_gender?: 'male' | 'female';
      boarding_point_id?: number;
      drop_point_id?: number;
      passengers?: { seat_id: string; name: string; age: number | null; gender: 'male' | 'female' | null }[];
      state_of_residence?: string;
      whatsapp_updates?: boolean;
      gstin?: string;
      business_name?: string;
      business_address?: string;
      business_email?: string;
    }
  ): Promise<{ booking_id: number; booking_number: string }> => {
    const res = await api.post(fullUrl(`/api/group-tour/verify-payment`), {
      razorpay_payment_id: paymentId,
      razorpay_order_id: orderId,
      razorpay_signature: signature,
      seat_amounts: payload.seat_amounts,
      ...payload,
    });
    if (!res.data?.success) throw new Error(res.data?.error || 'Verification failed');
    return res.data;
  },
};
