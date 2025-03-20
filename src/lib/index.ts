
// Re-export all cab-related types and functions for easier imports
export * from './cabData';

// Export everything from packageData and tourData
export * from './packageData';
export * from './tourData';

// Export everything from fareCalculationService
export { 
  calculateFare,
  clearFareCache 
} from './fareCalculationService';

// Export types with the 'export type' syntax to avoid TypeScript errors
export type { TripType, TripMode } from './tripTypes';

// Re-export CabType from the types directly
export type { CabType, HourlyPackage, FareCache, TourInfo, TourFares, ExtraCharges, LocalPackagePriceMatrix, FareCalculationParams } from '@/types/cab';
