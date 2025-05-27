
// Pooling System Types

export type RideType = 'car' | 'bus' | 'shared-taxi';
export type RideStatus = 'active' | 'pending' | 'full' | 'cancelled' | 'completed';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface VehicleInfo {
  make: string;
  model: string;
  plateNumber: string;
  color?: string;
  year?: number;
}

export interface PoolingRide {
  id: number;
  providerId: number;
  providerName: string;
  providerRating?: number;
  totalRides?: number;
  type: RideType;
  fromLocation: string;
  toLocation: string;
  departureTime: string;
  arrivalTime?: string;
  totalSeats: number;
  availableSeats: number;
  pricePerSeat: number;
  vehicleInfo: VehicleInfo;
  route?: string[];
  amenities?: string[];
  status: RideStatus;
  description?: string;
  pickupPoints?: string[];
  dropPoints?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PoolingBooking {
  id: number;
  rideId: number;
  userId: number;
  userName: string;
  userPhone: string;
  userEmail: string;
  seatsBooked: number;
  totalAmount: number;
  status: BookingStatus;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentId?: string;
  bookingDate: string;
  pickupPoint?: string;
  dropPoint?: string;
  specialRequests?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PoolingProvider {
  id: number;
  userId: number;
  name: string;
  email: string;
  phone: string;
  rating: number;
  totalRides: number;
  vehicleInfo: VehicleInfo;
  documentsVerified: boolean;
  walletBalance: number;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface CreateRideRequest {
  type: RideType;
  fromLocation: string;
  toLocation: string;
  departureTime: string;
  totalSeats: number;
  pricePerSeat: number;
  vehicleInfo: VehicleInfo;
  description?: string;
  amenities?: string[];
}

export interface PoolingSearchRequest {
  fromLocation: string;
  toLocation: string;
  departureDate: string;
  passengers: number;
  type?: RideType;
}

export interface BusRoute {
  id: number;
  name: string;
  fromLocation: string;
  toLocation: string;
  distance: number;
  duration: string;
  stops: string[];
  isActive: boolean;
}

export interface BusSchedule {
  id: number;
  routeId: number;
  departureTime: string;
  arrivalTime: string;
  availableSeats: number;
  totalSeats: number;
  pricePerSeat: number;
  vehicleInfo: VehicleInfo;
  status: RideStatus;
}

export interface CancellationPolicy {
  id: number;
  name: string;
  description: string;
  rules: string[];
  isActive: boolean;
}
