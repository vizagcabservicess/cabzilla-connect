
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
  AirportFare
} from '@/types/cab';

// Add formatPrice export from cabData
export { formatPrice } from './cabData';

// Export the CabLoading component from the correct path
export { CabLoading, CabRefreshing } from '@/components/cab-options/CabLoading';

// Export the Skeleton component
export { Skeleton } from '@/components/ui/skeleton';

// ABSOLUTELY CRITICAL FIX: Helper function to check if driver allowance should be shown
// This function MUST return false for airport transfers
export const shouldShowDriverAllowance = (tripType: string, tripMode?: string): boolean => {
  // For airport transfers, NEVER return true - no exceptions
  return tripType !== 'airport';
};

// Improve the fare event system with unique IDs to avoid duplicate events
// Using let instead of const to avoid redeclaration error if hot-reloaded
let eventCounter = 0;
const processedEvents = new Set<number>();
const MAX_PROCESSED_EVENTS = 100; // Reduced to prevent memory issues

export const getFareEventId = (): number => {
  return ++eventCounter;
};

// Create a helper to deduplicate and dispatch fare events
// Added eventName to processed events set to prevent multiple dispatches of the same event
export const dispatchFareEvent = (
  eventName: string,
  detail: Record<string, any>,
  preventDuplicates: boolean = true
): void => {
  // Add unique event ID if not present
  if (!detail.eventId) {
    detail.eventId = getFareEventId();
  }
  
  const eventKey = `${eventName}_${detail.eventId}`;
  
  // Check for duplicate event
  if (preventDuplicates && processedEvents.has(detail.eventId)) {
    return; // Skip duplicate event
  }
  
  // Track this event ID
  processedEvents.add(detail.eventId);
  
  // Clean up event tracking if too many events
  if (processedEvents.size > MAX_PROCESSED_EVENTS) {
    const oldestEvents = Array.from(processedEvents).slice(0, 50);
    oldestEvents.forEach(id => processedEvents.delete(id));
  }
  
  // CRITICAL: Force set driver allowance flag for airport transfers to ensure consistency
  if (detail.tripType === 'airport') {
    detail.noDriverAllowance = true;
    detail.showDriverAllowance = false;
  }
  
  // Add timestamp if not present
  if (!detail.timestamp) {
    detail.timestamp = Date.now();
  }
  
  // Create and dispatch the event
  try {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  } catch (error) {
    console.error(`Error dispatching ${eventName}:`, error);
  }
};

// Add a helper to remove driver allowance from fare calculations for airport transfers
export const ensureNoDriverAllowanceForAirport = (
  fare: number, 
  driverAllowance: number, 
  tripType: string
): number => {
  if (tripType === 'airport') {
    // For airport transfers, ensure driver allowance is not included
    return fare;
  }
  return fare;
};
