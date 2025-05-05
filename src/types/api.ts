
// If this file doesn't exist, we'll create it with the needed types
export type BookingStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'assigned' 
  | 'in-progress' 
  | 'completed' 
  | 'cancelled';

export interface Booking {
  id: number;
  bookingNumber: string;
  pickupLocation: string;
  dropLocation?: string;
  pickupDate: string;
  cabType: string;
  distance?: number;
  tripType: string;
  tripMode: string;
  totalAmount: number;
  status: BookingStatus;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  createdAt: string;
  updatedAt: string;
  userId?: number;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  notes?: string;
}

export interface BookingRequest {
  pickupLocation: string;
  dropLocation?: string;
  pickupDate: string;
  cabType: string;
  distance?: number;
  tripType: string;
  tripMode: string;
  totalAmount: number;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  userId?: number;
  notes?: string;
  [key: string]: any; // To allow for additional properties
}

export interface Driver {
  id: number | string;
  name: string;
  phone: string;
  email?: string;
  vehicleNumber?: string;
  vehicle?: string;
  status?: string;
  profileImage?: string;
}
