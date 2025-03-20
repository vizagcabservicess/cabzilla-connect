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
  hr8km80Price?: number; // Added for local package pricing
  hr10km100Price?: number; // Added for local package pricing
  airportFee?: number; // Added for airport transfer pricing
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
