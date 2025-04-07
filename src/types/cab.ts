
/**
 * Interface representing a Local Fare package
 */
export interface LocalFare {
  vehicleId: string;
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number;
  priceExtraKm: number;
  priceExtraHour: number;
  // Additional fields needed by LocalFareManagement
  extraKmRate?: number;
  extraHourRate?: number;
  // Backwards compatibility for different property names
  package4hr40km?: number; 
  package8hr80km?: number;
  package10hr100km?: number;
}

/**
 * Interface representing an Airport Transfer Fare
 */
export interface AirportFare {
  vehicleId: string;
  basePrice: number;
  pricePerKm: number;
  pickupPrice: number;
  dropPrice: number;
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier4Price: number;
  extraKmCharge: number;
  nightCharges: number;
  extraWaitingCharges: number;
}

/**
 * Interface representing an Outstation Fare
 */
export interface OutstationFare {
  vehicleId: string;
  basePrice: number;
  pricePerKm: number;
  driverAllowance: number;
  nightHaltCharge?: number;
  nightHalt?: number; // Backwards compatibility
  minDays?: number; // Added missing property
  extraKmCharge?: number; // Added missing property
  roundTripBasePrice?: number;
  roundTripPricePerKm?: number;
}

/**
 * Interface representing a Vehicle
 */
export interface Vehicle {
  id: string;
  vehicle_id: string;
  name: string;
  capacity?: number;
  luggage_capacity?: number;
  image?: string;
  amenities?: string[];
  description?: string;
  is_active?: boolean;
  base_price?: number;
}

/**
 * Interface representing a Cab Type (Vehicle with additional properties)
 */
export interface CabType {
  id: string;
  vehicle_id: string;  // Required field that's missing in many places
  vehicleId?: string; // For backward compatibility
  name: string;
  capacity?: number;
  luggage_capacity?: number;
  luggageCapacity?: number;
  image?: string;
  amenities?: string[];
  description?: string;
  is_active?: boolean;
  isActive?: boolean; // For backward compatibility
  ac?: boolean;
  price?: number;
  pricePerKm?: number;
  basePrice?: number; // For backward compatibility
  base_price?: number;
  nightHaltCharge?: number;
  driverAllowance?: number;
  localPackageFares?: {
    price4hrs40km?: number;
    price8hrs80km?: number;
    price10hrs100km?: number;
  };
  airportFares?: AirportFare;
  outstationFares?: OutstationFare;
}

/**
 * Interface representing an Hourly Package
 */
export interface HourlyPackage {
  id: string;
  name: string;
  hours: number;
  kilometers: number;
  basePrice: number;
  description?: string;
  multiplier?: number; // Add for backward compatibility
}

/**
 * Interface for fare calculation parameters
 */
export interface FareCalculationParams {
  cabType: CabType;
  distance: number;
  tripType: string;
  tripMode?: string;
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date | null;
  forceRefresh?: boolean;
}

/**
 * Interface for tour information
 */
export interface TourInfo {
  id: string;
  name: string;
  description: string;
  duration: number;
  distance: number;
  locations: string[];
  basePrice: number;
  days?: number; // Add for backward compatibility
  image?: string; // Add for backward compatibility
}

/**
 * Interface for tour fares
 */
export interface TourFares {
  tourId: string;
  vehicleId: string;
  basePrice: number;
  perKmPrice: number;
  [key: string]: any; // Allow for string indexing
}

/**
 * Interface for extra charges
 */
export interface ExtraCharges {
  name: string;
  price: number;
  description?: string;
  isOptional?: boolean;
}

/**
 * Interface for local package price matrix
 */
export interface LocalPackagePriceMatrix {
  [vehicleId: string]: {
    [packageId: string]: number;
  };
}

/**
 * Interface for vehicle pricing
 */
export interface VehiclePricing {
  vehicleId: string;
  basePrice: number;
  pricePerKm: number;
  minDistance: number;
}

/**
 * Interface for fare cache
 */
export interface FareCache {
  [cabId: string]: {
    [tripType: string]: {
      [tripMode: string]: {
        [distance: string]: number;
      };
    };
  };
}
