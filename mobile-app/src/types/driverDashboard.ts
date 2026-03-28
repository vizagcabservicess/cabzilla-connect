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
  driverName?: string;
  vehicleNumber?: string;
  passengerName?: string;
  passengerPhone?: string;
  tripType?: string;
  tripMode?: string;
  cabType?: string;
  fuelSpend?: number;
  startTime: string | null;
  endTime: string | null;
  pickupLocation: string;
  dropLocation: string;
  status: TripStatus;
  /** Raw `bookings.status` for admin trip edits (maps to wider status set on server). */
  bookingStatusRaw?: string;
  completedAt?: string | null;
  /** Stored `bookings.distance` (km). */
  storedDistanceKm?: number;
  paymentType: PaymentType;
  driverCollectedAmount?: number | null;
  startingOdometer: number;
  endingOdometer: number;
  totalKilometers: number;
  totalDurationHours: number;
  tripAmount: number;
}

export interface DriverFuelRecord {
  id: number;
  dateTime: string | null;
  fuelAmount: number;
  fuelQuantityLitres: number;
  vehicleNumber?: string | null;
  linkedTripId: number | null;
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
  status?: TripStatus;
  paymentType?: PaymentType;
  search?: string;
  driverId?: number;
  tripLimit?: number;
  tripOffset?: number;
  fuelLimit?: number;
  fuelOffset?: number;
}
