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
  driverName: string;
  driverPhone?: string;
  vehicleNumber: string;
  passengerName?: string;
  passengerPhone?: string;
  tripType?: string;
  tripMode?: string;
  cabType?: string;
  startTime: string | null;
  endTime: string | null;
  /** When the driver photographed the opening odometer. */
  startedAt?: string | null;
  /** When the driver photographed the closing odometer. */
  endedAt?: string | null;
  pickupLocation: string;
  dropLocation: string;
  status: TripStatus;
  /** Duty progress shown on the driver-ops status tabs. */
  opsStatus: OpsTripStatus;
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
  /** Litres or kg filled on this booking. */
  fuelLitres?: number;
  /** before = every linked fill was saved while the trip was open, after = after it ended, mixed = both. */
  fuelTiming?: 'before' | 'after' | 'mixed' | null;
  tripAmount: number;
  /** Amount already received before the trip. The driver collects the balance. */
  advancePaidAmount?: number;
  /** Extra cash the driver collected on top of the package fare. */
  extraCollectedAmount?: number | null;
  /** extra_hours, extra_km, tolls, or other. */
  extraCollectedCategory?: string | null;
  /** Latest driver GPS fix while live tracking is on. */
  liveLat?: number | null;
  liveLng?: number | null;
  liveTrackedAt?: string | null;
  /** False on agent jobs: the driver must not see or collect a fare. */
  driverCollectsPayment?: boolean;
  additionalRequirements?: string | null;
  tripTerms?: {
    notes?: string[];
    places?: string[];
  } | null;
}

export interface DriverFuelRecord {
  id: number;
  dateTime: string | null;
  fuelAmount: number;
  fuelQuantityLitres: number;
  /** From fuel record vehicle, else booking vehicle / fleet vehicle. */
  vehicleNumber?: string | null;
  linkedTripId: number | null;
  /** True when this fill was saved after its trip ended. */
  loggedAfterTripEnd?: boolean | null;
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
  status?: OpsTripStatus;
  paymentType?: PaymentType;
  search?: string;
  driverId?: number;
  vehicleNumber?: string;
  tripLimit?: number;
  tripOffset?: number;
  fuelLimit?: number;
  fuelOffset?: number;
}
