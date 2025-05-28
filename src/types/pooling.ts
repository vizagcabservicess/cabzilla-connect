
export type PoolingType = 'car' | 'bus' | 'shared-taxi';
export type RideStatus = 'active' | 'completed' | 'cancelled' | 'full';
export type SeatStatus = 'available' | 'booked' | 'blocked';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type UserRole = 'guest' | 'provider' | 'admin';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';
export type BookingStatus = 'pending' | 'approved' | 'confirmed' | 'cancelled' | 'completed';

export interface PoolingUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  rating?: number;
  totalRides?: number;
  walletBalance?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PoolingWallet {
  id: number;
  userId: number;
  balance: number;
  lockedAmount: number;
  minimumBalance: number; // ₹500 for providers
  totalEarnings: number;
  totalSpent: number;
  canWithdraw: boolean;
  lastTransactionAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: number;
  walletId: number;
  type: 'credit' | 'debit' | 'lock' | 'unlock' | 'penalty' | 'withdrawal';
  amount: number;
  purpose: string;
  referenceId?: number;
  description: string;
  balanceAfter: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface RideRequest {
  id: number;
  rideId: number;
  guestId: number;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  seatsRequested: number;
  status: RequestStatus;
  requestMessage?: string;
  responseMessage?: string;
  requestedAt: string;
  respondedAt?: string;
}

export interface PoolingRide {
  id: number;
  type: PoolingType;
  providerId: number;
  providerName: string;
  providerPhone: string;
  providerRating?: number;
  fromLocation: string;
  toLocation: string;
  departureTime: string;
  arrivalTime?: string;
  totalSeats: number;
  availableSeats: number;
  pricePerSeat: number;
  vehicleInfo: {
    make?: string;
    model?: string;
    color?: string;
    plateNumber?: string;
  };
  route: string[];
  amenities?: string[];
  rules?: string[];
  status: RideStatus;
  createdAt: string;
  updatedAt: string;
  requests?: RideRequest[];
  ratings?: RideRating[];
}

export interface PoolingBooking {
  id: number;
  userId: number;
  rideId?: number;
  routeId?: number;
  scheduleId?: number;
  requestId?: number;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  seatsBooked: number;
  selectedSeats?: string[];
  fromStop?: string;
  toStop?: string;
  totalAmount: number;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  bookingDate: string;
  paymentId?: string;
  orderId?: string;
  canCancelFree: boolean;
  cancellationDeadline?: string;
}

export interface RideRating {
  id: number;
  rideId: number;
  bookingId: number;
  raterId: number;
  ratedId: number;
  raterType: 'guest' | 'provider';
  rating: number;
  review?: string;
  aspects?: {
    punctuality?: number;
    cleanliness?: number;
    behavior?: number;
    safety?: number;
  };
  createdAt: string;
}

export interface PoolingSearchRequest {
  type: PoolingType;
  from: string;
  to: string;
  date: string;
  passengers: number;
  maxPrice?: number;
  sortBy?: 'price' | 'time' | 'rating';
}

export interface CreateRideRequest {
  type: PoolingType;
  fromLocation: string;
  toLocation: string;
  departureTime: string;
  arrivalTime?: string;
  totalSeats: number;
  pricePerSeat: number;
  vehicleInfo: {
    make?: string;
    model?: string;
    color?: string;
    plateNumber?: string;
  };
  route?: string[];
  amenities?: string[];
  rules?: string[];
}

export interface BusRoute {
  id: number;
  operatorId: number;
  operatorName: string;
  routeName: string;
  fromLocation: string;
  toLocation: string;
  stops: BusStop[];
  schedules: BusSchedule[];
  busInfo: {
    busNumber: string;
    busType: string;
    totalSeats: number;
    amenities: string[];
  };
  pricePerKm: number;
  baseFare: number;
}

export interface BusStop {
  id: number;
  name: string;
  location: string;
  arrivalTime: string;
  departureTime: string;
  fareFromOrigin: number;
}

export interface BusSchedule {
  id: number;
  routeId: number;
  departureTime: string;
  arrivalTime: string;
  date: string;
  availableSeats: number;
  seatMap: Seat[];
}

export interface Seat {
  id: string;
  row: number;
  column: string;
  type: 'regular' | 'premium' | 'sleeper';
  status: SeatStatus;
  price: number;
}
