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
export { 
  ensureCustomerTripType,
  isCustomerTripType,
  isRegularTripType,
  isAdminTripType,
  isTourTripType
} from './tripTypes';

// Import and re-export from config instead of fareService
export { 
  getBypassHeaders,
  getForcedRequestConfig,
  formatDataForMultipart
} from '@/config/requestConfig';

// Re-export all methods from fareService
export { 
  directFareUpdate,  
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
} from '@/services/fareService';

// Export vehicle service functions (use only what's available)
export { 
  addVehicle as createVehicle,
  updateVehicle,
  deleteVehicle,
  updateVehicle as updateVehicleFares,
  getVehicles as syncVehicleData,
  getVehicle as getVehicleById
} from '@/services/directVehicleService';

// Export fare update service functions
export {
  updateLocalFares,
  updateAirportFares,
  syncLocalFares,
  syncAirportFares
} from '@/services/fareManagementService';

// Export getData function from vehicleDataService
export { 
  getVehicleData,
  clearVehicleDataCache,
  getVehicleTypes
} from '@/services/vehicleDataService';

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
  AirportFare,
  CommissionSetting,
  CommissionPayment,
  CommissionReport
} from '@/types/cab';

// Export commission API
export { commissionAPI } from '@/services/api/commissionAPI';

// Add formatPrice export from cabData
export { formatPrice } from './cabData';

// Export the CabLoading component from the correct path
export { CabLoading, CabRefreshing } from '@/components/cab-options/CabLoading';

// Export the Skeleton component
export { Skeleton } from '@/components/ui/skeleton';
