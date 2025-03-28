
// Re-export all cab-related types and functions for easier imports
export * from './cabData';

// Export everything from packageData and tourData
export * from './packageData';
export * from './tourData';

// Export fare calculation functions
export { 
  calculateFare, 
  calculateAirportFare,
  clearFareCache
} from './fareCalculationService';

// Export types with the 'export type' syntax to avoid TypeScript errors
export type { TripType, TripMode } from './tripTypes';

// Re-export all methods from fareService
export { 
  initializeDatabase,
  forceSyncOutstationFares,
  syncOutstationFares,
  getOutstationFares,
  getLocalFares,
  getAirportFares,
  getOutstationFaresForVehicle,
  getLocalFaresForVehicle,
  getAirportFaresForVehicle,
  getFaresByTripType,
  syncLocalFareTables,
  syncVehicleTables,
  resetCabOptionsState,
  fareService,
  directFareUpdate,
} from '@/services/fareService';

// Import and re-export the config functions
export { 
  getBypassHeaders,
  getForcedRequestConfig 
} from '@/config/requestConfig';

// Re-export CabType from the types directly
export type { 
  CabType, 
  HourlyPackage, 
  FareCache, 
  TourInfo, 
  TourFares, 
  ExtraCharges, 
  LocalPackagePriceMatrix, 
  FareCalculationParams,
  VehiclePricing,
  OutstationFare,
  LocalFare,
  AirportFare
} from '@/types/cab';
