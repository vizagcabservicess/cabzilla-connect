
export interface LocalFare {
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number; 
  priceExtraKm: number;
  priceExtraHour: number;
  driverAllowance: number;  // Add this line to include driver allowance
  // Alias properties for compatibility with different component usages
  package4hr40km?: number;  // Alias for price4hrs40km
  package8hr80km?: number;  // Alias for price8hrs80km
  package10hr100km?: number;  // Alias for price10hrs100km
  extraKmRate?: number;  // Alias for priceExtraKm
  extraHourRate?: number;  // Alias for priceExtraHour
  // Additional aliases for database column name variations
  local_package_4hr?: number;  // For vehicle_pricing table
  local_package_8hr?: number;  // For vehicle_pricing table
  local_package_10hr?: number; // For vehicle_pricing table
  extra_km_charge?: number;    // For vehicle_pricing table
  extra_hour_charge?: number;  // For vehicle_pricing table
  // Raw database column names from local_package_fares
  price_4hrs_40km?: number;    // From local_package_fares table
  price_8hrs_80km?: number;    // From local_package_fares table
  price_10hrs_100km?: number;  // From local_package_fares table
  price_extra_km?: number;     // From local_package_fares table
  price_extra_hour?: number;   // From local_package_fares table
}
