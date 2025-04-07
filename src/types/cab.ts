
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
  nightHaltCharge: number;
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
