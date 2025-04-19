
import { CabType } from '@/types/cab';

/**
 * Fallback data for when API requests fail
 * This ensures the application can continue to function even when backend services are unavailable
 */

/**
 * Fallback local package fares for different vehicle types
 */
export const fallbackLocalPackageFares = {
  'sedan': {
    price4hrs40km: 1400,
    price8hrs80km: 2400,
    price10hrs100km: 3000,
    priceExtraKm: 13,
    priceExtraHour: 300
  },
  'ertiga': {
    price4hrs40km: 1500,
    price8hrs80km: 3000,
    price10hrs100km: 3500,
    priceExtraKm: 18,
    priceExtraHour: 250
  },
  'innova_crysta': {
    price4hrs40km: 1800,
    price8hrs80km: 3500,
    price10hrs100km: 4000,
    priceExtraKm: 20,
    priceExtraHour: 400
  },
  'tempo_traveller': {
    price4hrs40km: 6500,
    price8hrs80km: 6500,
    price10hrs100km: 7500,
    priceExtraKm: 35,
    priceExtraHour: 750
  },
  'luxury': {
    price4hrs40km: 3500,
    price8hrs80km: 5500,
    price10hrs100km: 6500,
    priceExtraKm: 25,
    priceExtraHour: 300
  },
  // Default fallback values for any other vehicle type
  'default': {
    price4hrs40km: 2000,
    price8hrs80km: 3500,
    price10hrs100km: 4000,
    priceExtraKm: 20,
    priceExtraHour: 300
  }
};

/**
 * Get fallback fare for a specific vehicle and package
 * @param vehicleId The vehicle ID
 * @param packageId The package ID (e.g., '4hrs-40km')
 * @returns The fare for the specified package
 */
export const getFallbackPackageFare = (vehicleId: string, packageId: string): number => {
  const normalizedId = vehicleId.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const vehicleFares = fallbackLocalPackageFares[normalizedId] || fallbackLocalPackageFares.default;
  
  switch (packageId) {
    case '4hrs-40km':
      return vehicleFares.price4hrs40km;
    case '8hrs-80km':
      return vehicleFares.price8hrs80km;
    case '10hrs-100km':
      return vehicleFares.price10hrs100km;
    default:
      return vehicleFares.price8hrs80km; // Default to 8hrs package
  }
};

/**
 * Get extra charges for a specific vehicle
 * @param vehicleId The vehicle ID
 * @returns Object containing extra km and hour rates
 */
export const getFallbackExtraCharges = (vehicleId: string): { km: number, hour: number } => {
  const normalizedId = vehicleId.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const vehicleFares = fallbackLocalPackageFares[normalizedId] || fallbackLocalPackageFares.default;
  
  return {
    km: vehicleFares.priceExtraKm,
    hour: vehicleFares.priceExtraHour
  };
};
