export type TripStatus = 'assigned' | 'in_progress' | 'completed';
export type PaymentType =
  | 'company_paid'
  | 'company_phonepe'
  | 'self_paid'
  | 'corporate_booking'
  | 'agent_booking';

export interface DriverDashboardTrip {
  tripId: number;
  tripCode: string;
  driverId: number;
  driverName: string;
  vehicleNumber: string;
  passengerName?: string;
  passengerPhone?: string;
  tripType?: string;
  tripMode?: string;
  cabType?: string;
  startTime: string | null;
  endTime: string | null;
  pickupLocation: string;
  dropLocation: string;
  status: TripStatus;
  /** Raw `bookings.status` before driver-dashboard mapping (for admin edits). */
  bookingStatusRaw?: string;
  /** When the trip was completed (drives “hours” with pickup). */
  completedAt?: string | null;
  /** Stored `bookings.distance` (km); display may prefer odometer-derived `totalKilometers`. */
  storedDistanceKm?: number;
  paymentType: PaymentType;
  /** Cash/UPI amount the driver reported at trip end (if captured). */
  driverCollectedAmount?: number | null;
  startingOdometer: number;
  endingOdometer: number;
  totalKilometers: number;
  totalDurationHours: number;
  fuelSpend: number;
  tripAmount: number;
}

export interface DriverFuelRecord {
  id: number;
  dateTime: string | null;
  fuelAmount: number;
  fuelQuantityLitres: number;
  /** From fuel record vehicle, else booking vehicle / fleet vehicle. */
  vehicleNumber?: string | null;
  linkedTripId: number | null;
}

export interface DriverEarningsSummary {
  totalTripsCompleted: number;
  totalKilometers: number;
  totalHours: number;
  totalTripAmount: number;
  totalFuelSpend: number;
  numberOfRefills: number;
  fuelEfficiencyKmPerLitre: number;
  netEarnings: number;
  profitEstimation: number;
  /** company_paid includes trips marked company_phonepe */
  earningsBreakdown: {
    company_paid: number;
    self_paid: number;
    corporate_booking: number;
    agent_booking: number;
  };
}

export interface DriverDashboardData {
  driverId: number | null;
  trips: {
    items: DriverDashboardTrip[];
    total: number;
    limit: number;
    offset: number;
  };
  fuelRecords: {
    items: DriverFuelRecord[];
    total: number;
    limit: number;
    offset: number;
  };
  summary: DriverEarningsSummary;
}

export interface DriverDashboardFilters {
  fromDate?: string;
  toDate?: string;
  status?: TripStatus;
  paymentType?: PaymentType;
  search?: string;
  driverId?: number;
  tripLimit?: number;
  tripOffset?: number;
  fuelLimit?: number;
  fuelOffset?: number;
}
