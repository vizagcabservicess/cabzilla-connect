
// Cab type definitions

// Common properties of all vehicles
export interface CabType {
  id: string;
  name: string;
  capacity: number;
  luggageCapacity?: number;
  price?: number;
  pricePerKm?: number;
  image?: string;
  amenities?: string[];
  description?: string;
  ac?: boolean;
  nightHaltCharge?: number;
  driverAllowance?: number;
  isActive?: boolean;
  
  // Additional properties used in the application
  vehicleId?: string; // Alternative ID used in some parts of the app
  basePrice?: number; // Base price for fare calculations
  
  // Fare-related properties
  localPackageFares?: {
    price4hrs40km?: number;
    price8hrs80km?: number;
    price10hrs100km?: number;
  };
  outstationFares?: {
    basePrice?: number;
    pricePerKm?: number;
    driverAllowance?: number;
    nightHaltCharge?: number;
    roundTripPricePerKm?: number;
    roundTripBasePrice?: number;
  };
  airportFares?: {
    basePrice?: number;
    tier1Price?: number;
    tier2Price?: number;
    tier3Price?: number;
    tier4Price?: number;
    extraKmCharge?: number;
  };
}

// Local hourly package definition
export interface HourlyPackage {
  id: string;
  name: string;
  hours: number;
  kilometers: number;
  description?: string;
  basePrice?: number; // Optional price field
}

// Additional fare-related types needed in the application
export interface FareCalculationParams {
  tripType: string;
  distance: number;
  cabType: string | CabType;
  tripMode?: 'one-way' | 'round-trip';
  packageId?: string;
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date | null;
  forceRefresh?: boolean;
}

export interface LocalFare {
  price4hrs40km?: number;
  price8hrs80km?: number;
  price10hrs100km?: number;
  price_4hr_40km?: number;
  price_8hr_80km?: number;
  price_10hr_100km?: number;
  
  // Additional properties for compatibility
  package4hr40km?: number;
  package8hr80km?: number;
  package10hr100km?: number;
  extraKmRate?: number;
  extraHourRate?: number;
  priceExtraKm?: number;
  priceExtraHour?: number;
}

export interface OutstationFare {
  basePrice?: number;
  pricePerKm?: number;
  driverAllowance?: number;
  nightHaltCharge?: number;
  roundTripPricePerKm?: number;
  roundTripBasePrice?: number;
}

export interface AirportFare {
  basePrice?: number;
  tier1Price?: number;
  tier2Price?: number;
  tier3Price?: number;
  tier4Price?: number;
  extraKmCharge?: number;
  
  // Additional properties for compatibility
  pickupPrice?: number;
  dropPrice?: number;
  pricePerKm?: number;
}

export interface VehiclePricing {
  vehicleId: string;
  basePrice?: number;
  pricePerKm?: number;
}

export interface LocalPackagePriceMatrix {
  [vehicleId: string]: LocalFare;
}

export interface FareCache {
  timestamp: number;
  data: Record<string, any>;
}

export interface TourInfo {
  id: string;
  name: string;
  description?: string;
  duration?: string;
  distance?: number;
  days?: number;
  image?: string;
}

export interface TourFares {
  [vehicleId: string]: {
    sedan: number;
    ertiga: number;
    innova: number;
  } | number;
}

export interface ExtraCharges {
  driverAllowance?: number;
  nightHaltCharge?: number;
  gst?: number;
}
