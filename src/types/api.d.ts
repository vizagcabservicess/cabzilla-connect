
export type BookingStatus = 
  | 'pending'
  | 'confirmed'
  | 'assigned'
  | 'completed'
  | 'cancelled'
  | 'payment_received'
  | 'payment_pending'
  | 'continued';

export interface Booking {
  id: number;
  userId?: number;
  bookingNumber: string;
  pickupLocation: string;
  dropLocation?: string;
  pickupDate: string;
  returnDate?: string;
  cabType: string;
  tripType?: string;
  tripMode?: string;
  distance?: number;
  totalAmount?: number;
  status: string;
  passengerName?: string;
  passengerPhone?: string;
  passengerEmail?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  adminNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Driver {
  id: number;
  name: string;
  phone: string;
  licenseNumber?: string;
  vehicleId?: string;
  status: 'available' | 'busy' | 'offline';
  createdAt?: string;
  updatedAt?: string;
}

export interface Invoice {
  id: number;
  bookingId: number;
  invoiceNumber: string;
  amount: number;
  taxAmount?: number;
  totalAmount: number;
  status: string;
  generatedAt: string;
  updatedAt?: string;
}
