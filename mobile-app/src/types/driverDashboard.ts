export type TripStatus = 'assigned' | 'in_progress' | 'completed';
export type OpsTripStatus =
  | 'assigned'
  | 'receipt_accepted'
  | 'in_progress'
  | 'day_closed'
  | 'completed'
  | 'cancelled';
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
  driverName?: string;
  vehicleNumber?: string;
  passengerName?: string;
  passengerPhone?: string;
  tripType?: string;
  tripMode?: string;
  cabType?: string;
  fuelSpend?: number;
  fuelTiming?: 'before' | 'after' | 'mixed' | null;
  /** Litres or kg filled on this booking. */
  fuelLitres?: number;
  startTime: string | null;
  returnDate?: string | null;
  endTime: string | null;
  pickupLocation: string;
  dropLocation: string;
  status: TripStatus;
  /** Duty progress shown on the driver-ops status tabs. */
  opsStatus: OpsTripStatus;
  /** Raw `bookings.status` for admin trip edits (maps to wider status set on server). */
  bookingStatusRaw?: string;
  completedAt?: string | null;
  /** Stored `bookings.distance` (km). */
  storedDistanceKm?: number;
  paymentType: PaymentType;
  driverCollectedAmount?: number | null;
  extraCollectedAmount?: number | null;
  extraCollectedCategory?: string | null;
  startingOdometer: number;
  endingOdometer: number;
  totalKilometers: number;
  totalDurationHours: number;
  tripAmount: number;
  /** Amount already received before the trip. The driver collects the balance. */
  advancePaidAmount?: number;
  /** Latest driver GPS fix while live tracking is on. */
  liveLat?: number | null;
  liveLng?: number | null;
  liveTrackedAt?: string | null;
  /** False on agent jobs: the driver must not see or collect a fare. */
  driverCollectsPayment?: boolean;
  additionalRequirements?: string | null;
  hourlyPackage?: string;
  pickupMapUrl?: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  tripTerms?: {
    places?: string[];
    day_window?: string | null;
    package_hours?: number | null;
    package_km?: number | null;
    notes?: string[];
    duty_dates?: string[];
  } | null;
}

export interface DriverFuelRecord {
  id: number;
  dateTime: string | null;
  fuelAmount: number;
  fuelQuantityLitres: number;
  vehicleNumber?: string | null;
  linkedTripId: number | null;
  loggedAfterTripEnd?: boolean | null;
  /** Pump LCD total vs receipt paid (when API provides). */
  pumpDisplayTotal?: number | null;
  amountVariance?: number | null;
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
  status?: OpsTripStatus;
  paymentType?: PaymentType;
  search?: string;
  driverId?: number;
  vehicleNumber?: string;
  tripLimit?: number;
  tripOffset?: number;
  fuelLimit?: number;
  fuelOffset?: number;
  /** Do not replace the dashboard cache. Used by the live GPS poll. */
  skipCache?: boolean;
}
