
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

// Improved formatPrice implementation that prevents double currency symbols
export const formatPrice = (price: number | string): string => {
  // Handle null, undefined, or invalid values
  if (price === null || price === undefined || isNaN(Number(price))) {
    return '₹0';
  }
  
  // Convert to number and ensure it's not negative
  const numPrice = Math.max(0, Number(price));
  
  // Check if the input already contains the ₹ symbol
  if (typeof price === 'string' && price.includes('₹')) {
    // Extract just the numeric part and format that
    const numericPart = price.replace(/[^\d.]/g, '');
    return `₹${Number(numericPart).toLocaleString('en-IN')}`;
  }
  
  // Format with Indian locale and add ₹ symbol
  return `₹${numPrice.toLocaleString('en-IN')}`;
};

// NEW IMPLEMENTATION: Fixed shouldShowDriverAllowance to absolutely never show for airport transfers
export const shouldShowDriverAllowance = (tripType: string, tripMode?: string): boolean => {
  // For airport transfers, NEVER show driver allowance - no exceptions
  if (tripType === 'airport') {
    return false;
  }
  
  // For all other trip types, driver allowance should be shown
  return true;
};

// Improve the fare event system with better deduplication
const processedEvents = new Set<string>();
const MAX_PROCESSED_EVENTS = 100;
let eventCounter = 0;

export const getFareEventId = (): number => {
  return ++eventCounter;
};

// FIXED: Create a helper to deduplicate and dispatch fare events with better event key tracking
export const dispatchFareEvent = (
  eventName: string,
  detail: Record<string, any>,
  preventDuplicates: boolean = true
): void => {
  // Add unique event ID if not present
  if (!detail.eventId) {
    detail.eventId = getFareEventId();
  }
  
  // Create a unique event key based on name, cab, and fare
  const eventKey = `${eventName}_${detail.cabId || detail.cabType || ''}_${detail.fare || ''}`;
  
  // Check for duplicate event to prevent processing same event multiple times
  if (preventDuplicates && processedEvents.has(eventKey)) {
    return; // Skip duplicate event
  }
  
  // Track this event
  processedEvents.add(eventKey);
  
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

// Add a helper to ensure driver allowance is removed for airport transfers
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
