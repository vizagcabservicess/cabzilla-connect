
// Define all cab-related types and interfaces

export interface CabType {
  id: string;
  vehicleId?: string;
  name: string;
  image?: string;
  description?: string;
  capacity: number;
  luggageCapacity: number;
  basePrice?: number;
  price?: number;
  pricePerKm?: number;
  ac?: boolean;
  isActive?: boolean;
  amenities?: string[];
  driverAllowance?: number;
  nightHaltCharge?: number;
  outstationFares?: OutstationFare;
  localFares?: LocalFare;
  airportFares?: AirportFare;
  maxHours?: number;
  maxDistance?: number;
  localPackageFares?: any;
}

export interface HourlyPackage {
  id: string;
  name: string;
  hours: number;
  kilometers: number;
  basePrice?: number;
  description?: string;
  multiplier?: number;
}

export interface LocalPackagePriceMatrix {
  [key: string]: {
    [key: string]: number;
  };
}

export interface FareCache {
  [key: string]: {
    fare: number;
    timestamp: number;
    expiry: number;
  };
}

export interface TourInfo {
  id: string;
  name: string;
  distance: number;
  description?: string;
  image?: string;
  duration?: string;
  includes?: string[];
  excludes?: string[];
  attractions?: string[];
  basePrice?: number;
  days?: number;
}

export interface TourFares {
  [tourId: string]: {
    [cabId: string]: number;
  };
}

export interface ExtraCharges {
  nightCharges?: number;
  extraKmCharges?: number;
  extraHourCharges?: number;
  driverAllowance?: number;
  gst?: number;
}

export interface FareCalculationParams {
  cabType: CabType | string;
  distance: number;
  tripType: string;
  tripMode?: string;
  hourlyPackage?: string;
  extraKm?: number;
  extraHours?: number;
  pickupDate?: Date;
  returnDate?: Date | null;
  forceRefresh?: boolean;
}

export interface OutstationFare {
  vehicleId?: string;
  vehicle_id?: string;
  basePrice?: number;
  pricePerKm?: number;
  minDistance?: number;
  driverAllowance?: number;
  nightHaltCharges?: number;
  roundTripPricePerKm?: number;
  gst?: number;
}

export interface LocalFare {
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number; 
  priceExtraKm: number;
  priceExtraHour: number;
  driverAllowance: number;
  package4hr40km?: number;
  package8hr80km?: number;
  package10hr100km?: number;
  extraKmRate?: number;
  extraHourRate?: number;
  local_package_4hr?: number;
  local_package_8hr?: number;
  local_package_10hr?: number;
  extra_km_charge?: number;
  extra_hour_charge?: number;
  price_4hrs_40km?: number;
  price_8hrs_80km?: number;
  price_10hrs_100km?: number;
  price_extra_km?: number;
  price_extra_hour?: number;
}

export interface AirportFare {
  vehicleId?: string;
  vehicle_id?: string;
  basePrice?: number;
  pricePerKm?: number;
  pickupPrice?: number;
  dropPrice?: number;
  tier1Price?: number;
  tier2Price?: number;
  tier3Price?: number;
  tier4Price?: number;
  extraKmCharge?: number;
  nightCharges?: number;
  extraWaitingCharges?: number;
}

export interface VehiclePricing {
  vehicle_id: string;
  price_per_km: number;
  base_price: number;
  driver_allowance?: number;
  night_halt_charge?: number;
  gst_percentage?: number;
}

export interface FareData {
  vehicleId?: string;
  vehicle_id?: string;
  basePrice?: number;
  [key: string]: any;
}

// Making vehicleId required to match service expectations
export interface LocalFareData extends FareData {
  vehicleId: string;
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number;
  priceExtraKm: number;
  priceExtraHour: number;
}

// Making vehicleId required to match service expectations
export interface AirportFareData extends FareData {
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
}

export interface OutstationFareData {
  vehicleId: string;
  basePrice: number;
  pricePerKm: number;
  roundTripPricePerKm: number;
  minDistance: number;
  driverAllowance: number;
  nightHaltCharge: number;
  roundTripBasePrice?: number;
  oneWayBasePrice?: number;
  oneWayPricePerKm?: number;
}
