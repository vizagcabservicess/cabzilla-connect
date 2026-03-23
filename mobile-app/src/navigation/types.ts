import type { Location } from '../types';
import type { TripType, TripMode } from '../types';

export type RootStackParamList = {
  Home: { initialTripType?: TripType; showAuthSheet?: boolean } | undefined;
  ToursList: {
    pickupLocation?: Location;
    pickupDate?: number;
    tripMode?: TripMode;
  };
  TourDetail: {
    tourId: string;
    tourName?: string;
    pickupLocation?: Location;
    pickupDate?: number;
  };
  CabResults: {
    pickupLocation: Location;
    dropLocation: Location | null;
    pickupDate: number; // timestamp
    returnDate?: number; // timestamp, for round-trip
    tripType: TripType;
    tripMode?: TripMode;
    distance: number;
    duration: number;
    hourlyPackage?: string;
    tourId?: string;
    tourName?: string;
  };
  BookingSummary: {
    pickupLocation: Location;
    dropLocation: Location | null;
    pickupDate: number;
    returnDate?: number;
    tripType: TripType;
    tripMode?: TripMode;
    distance: number;
    duration?: number;
    hourlyPackage?: string;
    tourId?: string;
    tourName?: string;
    selectedVehicle: {
      id: string;
      name: string;
      capacity?: number;
      amenities?: string[];
      image?: string;
    };
    totalPrice: number;
    paymentMode?: 'partial' | 'full';
  };
  PassengerInfo: {
    pickupLocation: Location;
    dropLocation: Location | null;
    pickupDate: number;
    returnDate?: number;
    tripType: TripType;
    tripMode?: TripMode;
    distance: number;
    duration?: number;
    hourlyPackage?: string;
    tourId?: string;
    tourName?: string;
    selectedVehicle: { id: string; name: string; capacity?: number; amenities?: string[]; image?: string };
    totalPrice: number;
    paymentMode?: 'partial' | 'full';
  };
  ProfileHome: undefined;
  Login: { message?: string } | undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  Dashboard: { viewAs?: number; viewAsName?: string } | undefined;
  AdminDashboard: undefined;
  AdminBookingsList: undefined;
  /** Same behaviour as web Bookings → Upcoming trips tab */
  AdminUpcomingTrips: undefined;
  AdminMenu: undefined;
  AdminDriversList: undefined;
  AdminDriverAdd: undefined;
  AdminDriverEdit: { driver: import('../services/adminAPI').AdminDriver };
  AdminVehiclesList: undefined;
  AdminVehicleAdd: undefined;
  AdminVehicleEdit: { vehicle: import('../services/adminAPI').AdminFleetVehicle };
  AdminCreateBooking: undefined;
  AdminGroupTours: undefined;
  AdminFleet: undefined;
  AdminFares: undefined;
  AdminCommission: undefined;
  AdminFuel: { editRecordId?: string | number } | undefined;
  AdminMaintenance: undefined;
  AdminLedger: undefined;
  AdminExpenses: undefined;
  AdminPayroll: undefined;
  AdminPayments: undefined;
  AdminPaymentTracking: undefined;
  AdminUsers: undefined;
  AdminReports: undefined;
  AdminComingSoon: { feature: string };
  BookingDetail: { booking: Record<string, unknown>; bookingId?: number; source?: 'admin' | 'user' };
  BookingEdit: { bookingId: number; booking: Record<string, unknown> };
  AssignDriver: { bookingId: number; booking: Record<string, unknown> };
  AssignVehicle: { bookingId: number; booking: Record<string, unknown> };
  BookingInvoice: { bookingId: number; booking: Record<string, unknown> };
  WebView: { url: string; title: string; html?: string };
  ContactUs: undefined;
  HelpCenter: undefined;
  StaticContent: { contentKey: 'terms' | 'privacy' | 'refund' };
  DataDeletion: undefined;
  Payment: {
    pickupLocation: Location;
    dropLocation: Location | null;
    pickupDate: number;
    returnDate?: number;
    tripType: TripType;
    tripMode?: TripMode;
    distance: number;
    hourlyPackage?: string;
    tourId?: string;
    tourName?: string;
    selectedVehicle: { id: string; name: string; capacity?: number; amenities?: string[]; image?: string };
    totalPrice: number;
    paymentMode?: 'partial' | 'full';
    payAmount?: number;
    passengerName: string;
    passengerPhone: string;
    passengerEmail: string;
    additionalRequirements?: string;
    gstEnabled?: boolean;
    gstin?: string;
    businessName?: string;
    businessAddress?: string;
    businessEmail?: string;
  };
};

export type ServicesStackParamList = {
  ServicesList: undefined;
  HireDriver: undefined;
};
