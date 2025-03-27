
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
  getBypassHeaders,
  getForcedRequestConfig,
  directFareUpdate,  // Using directFareUpdate for all fare updates
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
  clearFareCache as clearFareServiceCache,
  resetCabOptionsState,
  syncLocalFareTables,
  fareService
  // Removed updateLocalFare as it doesn't exist
} from '@/services/fareService';

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
