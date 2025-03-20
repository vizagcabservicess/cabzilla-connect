
import { TripType, TripMode } from '@/lib/tripTypes';

export interface CabType {
  id: string;
  name: string;
  capacity: number;
  luggageCapacity: number;
  price: number;
  pricePerKm: number;
  image: string;
  amenities: string[];
  description: string;
  ac: boolean;
  nightHaltCharge: number;
  driverAllowance: number;
  isActive: boolean;
  vehicleId?: string; // Added for compatibility with API responses
  basePrice?: number; // Added for compatibility with API responses
}

export interface HourlyPackage {
  id: string;
  name: string;
  hours: number;
  kilometers: number;
  basePrice: number;
  multiplier: number;
}

export interface FareCache {
  expire: number;
  price: number;
}

export interface TourInfo {
  id: string;
  name: string;
  distance: number;
  image: string;
}

export interface TourFares {
  [tourId: string]: {
    [cabType: string]: number;
  };
}

export interface ExtraCharges {
  perHour: number;
  perKm: number;
}

export interface LocalPackagePriceMatrix {
  [packageId: string]: {
    [cabType: string]: number;
  };
}

export interface FareCalculationParams {
  cabType: CabType;
  distance: number;
  tripType: TripType;
  tripMode: TripMode;
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date;
}

// Added for vehicle pricing management
export interface VehiclePricing {
  basePrice: number;
  pricePerKm: number;
  nightHaltCharge: number;
  driverAllowance: number;
}

export interface OutstationFare {
  baseFare: number;
  pricePerKm: number;
  nightHaltCharge: number;
  driverAllowance: number;
}

export interface LocalFare {
  price8hrs80km: number;
  price10hrs100km: number;
  priceExtraKm: number;
  priceExtraHour: number;
}

export interface AirportFare {
  pickupFare: number;
  dropFare: number;
}
