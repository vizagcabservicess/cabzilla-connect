
/**
 * Fare Calculation Service
 * Main entry point for fare calculation
 */
import { calculateFare } from './fare/fareCalculator';
import { clearFareCache } from './fare/fareCache';

// Re-export the main functions for backward compatibility
export { calculateFare, clearFareCache };
