
// Cab Types
export interface CabType {
  id: string;
  name: string;
  type: string;
  capacity: number;
  luggageCapacity: number;
  luggage: string;
  price: number;
  basePrice: number;
  pricePerKm: number;
  image: string;
  amenities: string[];
  description: string;
  ac: boolean;
  nightHaltCharge: number;
  driverAllowance: number;
  isActive: boolean;
  outstationFares?: any;
  airportFares?: any;
}

export interface FareCalculationParams {
  cabType: CabType;
  tripType: string;
  tripMode: string;
  distance: number;
}

export interface LocalFare {
  id: string;
  vehicle_type: string;
  package4hr40km: number;
  package8hr80km: number;
  package10hr100km: number;
  extra_km_charge: number;
  extra_hour_charge: number;
  priceExtraKm?: number;
  priceExtraHour?: number;
}
