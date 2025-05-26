
// Guest-specific types for pooling system

export interface RideRequest {
  id: number;
  rideId: number;
  guestId: number;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  seatsRequested: number;
  requestMessage?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  requestDate: string;
  approvedDate?: string;
  paymentLink?: string;
  totalAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GuestBooking {
  id: number;
  requestId: number;
  rideId: number;
  guestId: number;
  seatsBooked: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentId?: string;
  paymentDate?: string;
  bookingStatus: 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  contactsUnlocked: boolean;
  providerPhone?: string;
  providerEmail?: string;
  guestRating?: number;
  providerRating?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GuestDashboardData {
  activeBookings: GuestBooking[];
  pendingRequests: RideRequest[];
  completedRides: GuestBooking[];
  totalRides: number;
  averageRating: number;
}

export interface RideSearchFilters {
  type: 'car' | 'bus' | 'shared-taxi';
  from: string;
  to: string;
  date: string;
  passengers: number;
  maxPrice?: number;
  sortBy: 'price' | 'time' | 'rating';
  departureTimeRange?: {
    start: string;
    end: string;
  };
}

export interface GuestRideDetails extends PoolingRide {
  hasActiveRequest: boolean;
  requestStatus?: 'pending' | 'approved' | 'rejected';
  paymentLink?: string;
  contactsAvailable: boolean;
}
