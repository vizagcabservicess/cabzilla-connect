
import { 
  fetchLocalFare, 
  updateLocalFare as updateLocalFareData,
  syncLocalFareTables as syncLocalFareTablesData,
  initializeLocalFareTables as initializeLocalFareTablesData,
  LocalFareData,
  normalizeHourlyPackage
} from './localFareService';

import {
  fetchAirportFare,
  updateAirportFare as updateAirportFareData,
  syncAirportFareTables as syncAirportFareTablesData,
  initializeAirportFareTables as initializeAirportFareTablesData,
  AirportFareData
} from './airportFareService';

import {
  fetchOutstationFare,
  updateOutstationFare as updateOutstationFareData,
  syncOutstationFareTables as syncOutstationFareTablesData,
  initializeOutstationFareTables as initializeOutstationFareTablesData,
  OutstationFareData
} from './outstationFareService';

import fareStateManager from './FareStateManager';
import { clearFareCache } from '@/lib/fareCalculationService';

/**
 * Update local fare data
 */
export const updateLocalFare = async (fareData: LocalFareData): Promise<boolean> => {
  const success = await updateLocalFareData(fareData);
  
  if (success) {
    // Also update the FareStateManager cache
    await fareStateManager.storeLocalFare(fareData.vehicleId, fareData);
    
    // Clear fare calculation cache
    clearFareCache();
  }
  
  return success;
};

/**
 * Update airport fare data
 */
export const updateAirportFare = async (fareData: AirportFareData): Promise<boolean> => {
  const success = await updateAirportFareData(fareData);
  
  if (success) {
    // Also update the FareStateManager cache
    await fareStateManager.storeAirportFare(fareData.vehicleId, fareData);
    
    // Clear fare calculation cache
    clearFareCache();
  }
  
  return success;
};

/**
 * Update outstation fare data
 */
export const updateOutstationFare = async (fareData: OutstationFareData): Promise<boolean> => {
  const success = await updateOutstationFareData(fareData);
  
  if (success) {
    // Also update the FareStateManager cache
    await fareStateManager.storeOutstationFare(fareData.vehicleId, fareData);
    
    // Clear fare calculation cache
    clearFareCache();
  }
  
  return success;
};

/**
 * Sync local fare tables
 */
export const syncLocalFares = async (): Promise<boolean> => {
  const success = await syncLocalFareTablesData();
  
  if (success) {
    // Refresh FareStateManager data
    await fareStateManager.syncFareData();
    
    // Clear fare calculation cache
    clearFareCache();
  }
  
  return success;
};

/**
 * Sync airport fare tables
 */
export const syncAirportFares = async (): Promise<boolean> => {
  const success = await syncAirportFareTablesData();
  
  if (success) {
    // Refresh FareStateManager data
    await fareStateManager.syncFareData();
    
    // Clear fare calculation cache
    clearFareCache();
  }
  
  return success;
};

/**
 * Sync outstation fare tables
 */
export const syncOutstationFares = async (): Promise<boolean> => {
  const success = await syncOutstationFareTablesData();
  
  if (success) {
    // Refresh FareStateManager data
    await fareStateManager.syncFareData();
    
    // Clear fare calculation cache
    clearFareCache();
  }
  
  return success;
};

/**
 * Initialize all fare tables
 */
export const initializeAllFareTables = async (): Promise<boolean> => {
  // Initialize all fare tables
  const localSuccess = await initializeLocalFareTablesData();
  const airportSuccess = await initializeAirportFareTablesData();
  const outstationSuccess = await initializeOutstationFareTablesData();
  
  // Sync FareStateManager data
  if (localSuccess || airportSuccess || outstationSuccess) {
    await fareStateManager.syncFareData();
    clearFareCache();
  }
  
  return localSuccess && airportSuccess && outstationSuccess;
};

/**
 * Get hourly package price based on vehicle and package type
 */
export const getLocalPackagePrice = async (vehicleId: string, hourlyPackage: string): Promise<number> => {
  if (!vehicleId || !hourlyPackage) {
    return 0;
  }
  
  try {
    // Normalize hourly package format
    const normalizedPackage = normalizeHourlyPackage(hourlyPackage);
    
    // Get local fare data for the vehicle
    const fareData = await fetchLocalFare(vehicleId);
    
    if (!fareData) {
      return 0;
    }
    
    // Return appropriate package price
    switch (normalizedPackage) {
      case '4hr40km':
      case '4hrs40km':
        return fareData.price4hrs40km;
      case '8hr80km':
      case '8hrs80km':
        return fareData.price8hrs80km;
      case '10hr100km':
      case '10hrs100km':
        return fareData.price10hrs100km;
      default:
        console.error(`Unsupported package type: ${hourlyPackage}`);
        return 0;
    }
  } catch (error) {
    console.error(`Error getting package price for ${vehicleId}:`, error);
    return 0;
  }
};

// Initialize local fare tables
export const initializeLocalFareTables = initializeLocalFareTablesData;

// Initialize airport fare tables
export const initializeAirportFareTables = initializeAirportFareTablesData;

// Initialize outstation fare tables
export const initializeOutstationFareTables = initializeOutstationFareTablesData;

// Export all services directly
export const fareManagementService = {
  updateLocalFare,
  updateAirportFare,
  updateOutstationFare,
  syncLocalFares,
  syncAirportFares,
  syncOutstationFares,
  initializeLocalFareTables,
  initializeAirportFareTables,
  initializeOutstationFareTables,
  initializeAllFareTables,
  getLocalPackagePrice
};

export default fareManagementService;
