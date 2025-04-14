
// API response types for the application

export interface ApiResponse {
  status: 'success' | 'error';
  message?: string;
  timestamp?: number;
}

export interface LocalPackageFare {
  id?: string;
  vehicleId?: string;
  name?: string;
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number;
  priceExtraKm?: number;
  priceExtraHour?: number;
  // Alternative property names for compatibility
  price_4hr_40km?: number;
  price_8hr_80km?: number;
  price_10hr_100km?: number;
  price_extra_km?: number;
  price_extra_hour?: number;
  // More aliases
  package4hr40km?: number;
  package8hr80km?: number;
  package10hr100km?: number;
  extraKmRate?: number;
  extraHourRate?: number;
}

export interface LocalPackageFaresResponse extends ApiResponse {
  fares: Record<string, LocalPackageFare>;
  source?: string;
  count?: number;
}
