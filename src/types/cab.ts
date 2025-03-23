
export interface CabType {
  id: string;
  name: string;
  capacity: number;
  luggageCapacity: number;
  image: string;
  amenities: string[];
  description: string;
  ac: boolean;
  price?: number;
  pricePerKm?: number;
  nightHaltCharge?: number;
  driverAllowance?: number;
  isActive?: boolean;
  basePrice?: number;
  vehicleId?: string;
}

export interface OutstationFare {
  basePrice: number;
  pricePerKm: number;
  driverAllowance: number;
  nightHalt: number;
  roundTripBasePrice: number;
  roundTripPricePerKm: number;
}

export interface LocalFare {
  package4hr40km: number;
  package8hr80km: number;
  package10hr100km: number;
  extraKmRate: number;
  extraHourRate: number;
}

export interface AirportFare {
  basePrice: number;
  pricePerKm: number;
  dropPrice: number;
  pickupPrice: number;
  tier1Price: number;   // 0-10 KM
  tier2Price: number;   // 11-20 KM
  tier3Price: number;   // 21-30 KM
  tier4Price: number;   // 31+ KM
  extraKmCharge: number;
}

// Additional interfaces needed for the application
export interface FareCalculationParams {
  cabType: CabType;
  distance: number;
  tripType: string;
  tripMode?: string;
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date;
}

export interface HourlyPackage {
  id: string;
  name: string;
  hours: number;
  kilometers: number;
  description?: string;
}

export interface FareCache {
  timestamp: number;
  fares: Record<string, any>;
}

export interface TourInfo {
  id: string;
  name: string;
  distance: number;
  days: number;
  description?: string;
}

export interface TourFares {
  tour_id: string;
  tour_name: string;
  sedan: number;
  ertiga: number;
  innova: number;
  tempo: number;
  luxury: number;
}

export interface ExtraCharges {
  gst?: number;
  serviceTax?: number;
  driverAllowance?: number;
  parkingCharges?: number;
  stateTax?: number;
  tollCharges?: number;
}

export interface LocalPackagePriceMatrix {
  [cabType: string]: {
    package4hr40km: number;
    package8hr80km: number;
    package10hr100km: number;
    extraKmRate: number;
    extraHourRate: number;
  };
}

export interface VehiclePricing {
  vehicleType: string;
  basePrice: number;
  pricePerKm: number;
  nightHaltCharge: number;
  driverAllowance: number;
  roundtripBasePrice?: number;
  roundtripPricePerKm?: number;
  localPackage4hr?: number;
  localPackage8hr?: number;
  localPackage10hr?: number;
  extraKmCharge?: number;
  extraHourCharge?: number;
  airportBasePrice?: number;
  airportPricePerKm?: number;
  airportDropPrice?: number;
  airportPickupPrice?: number;
  airportTier1Price?: number;
  airportTier2Price?: number;
  airportTier3Price?: number;
  airportTier4Price?: number;
  airportExtraKmCharge?: number;
}
