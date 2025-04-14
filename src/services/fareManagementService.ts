
import { 
  fetchLocalFare, 
  updateLocalFare as updateLocalFareData,
  syncLocalFareTables as syncLocalFareTablesData,
  initializeLocalFareTables as initializeLocalFareTablesData,
  normalizeHourlyPackage
} from './localFareService';

import {
  fetchAirportFare,
  updateAirportFare as updateAirportFareData,
  syncAirportFareTables as syncAirportFareTablesData,
  initializeAirportFareTables as initializeAirportFareTablesData
} from './airportFareService';

import {
  fetchOutstationFare,
  updateOutstationFare as updateOutstationFareData,
  syncOutstationFareTables as syncOutstationFareTablesData,
  initializeOutstationFareTables as initializeOutstationFareTablesData
} from './outstationFareService';

import fareStateManager from './FareStateManager';
import { clearFareCache } from '@/lib/fareCalculationService';
import { LocalFareData, AirportFareData, OutstationFareData, FareData } from '@/types/cab';

/**
 * Update local fare data
 */
export const updateLocalFare = async (fareData: LocalFareData): Promise<boolean> => {
  const success = await updateLocalFareData(fareData);
  
  if (success) {
    try {
      if (typeof fareStateManager.storeLocalFare === 'function') {
        await fareStateManager.storeLocalFare(fareData.vehicleId, fareData);
      } else {
        await fareStateManager.syncFareData();
      }
      
      clearFareCache();
    } catch (e) {
      console.error('Failed to update FareStateManager cache:', e);
    }
  }
  
  return success;
};

/**
 * Update airport fare data
 */
export const updateAirportFare = async (fareData: AirportFareData): Promise<boolean> => {
  const success = await updateAirportFareData(fareData);
  
  if (success) {
    try {
      if (typeof fareStateManager.storeAirportFare === 'function') {
        await fareStateManager.storeAirportFare(fareData.vehicleId, fareData);
      } else {
        await fareStateManager.syncFareData();
      }
      
      clearFareCache();
    } catch (e) {
      console.error('Failed to update FareStateManager cache:', e);
    }
  }
  
  return success;
};

/**
 * Update outstation fare data
 */
export const updateOutstationFare = async (fareData: OutstationFareData): Promise<boolean> => {
  const success = await updateOutstationFareData(fareData);
  
  if (success) {
    try {
      if (typeof fareStateManager.storeOutstationFare === 'function') {
        await fareStateManager.storeOutstationFare(fareData.vehicleId, fareData);
      } else {
        await fareStateManager.syncFareData();
      }
      
      clearFareCache();
    } catch (e) {
      console.error('Failed to update FareStateManager cache:', e);
    }
  }
  
  return success;
};

/**
 * Sync local fare tables
 */
export const syncLocalFares = async (): Promise<boolean> => {
  const success = await syncLocalFareTablesData();
  
  if (success) {
    await fareStateManager.syncFareData();
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
    await fareStateManager.syncFareData();
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
    await fareStateManager.syncFareData();
    clearFareCache();
  }
  
  return success;
};

/**
 * Initialize all fare tables
 */
export const initializeAllFareTables = async (): Promise<boolean> => {
  const localSuccess = await initializeLocalFareTablesData();
  const airportSuccess = await initializeAirportFareTablesData();
  const outstationSuccess = await initializeOutstationFareTablesData();
  
  const result = (localSuccess || airportSuccess || outstationSuccess);
  
  if (result) {
    await fareStateManager.syncFareData();
    clearFareCache();
  }
  
  return result;
};

/**
 * Get hourly package price based on vehicle and package type
 */
export const getLocalPackagePrice = async (vehicleId: string, hourlyPackage: string): Promise<number> => {
  if (!vehicleId || !hourlyPackage) {
    return 0;
  }
  
  try {
    const normalizedPackage = normalizeHourlyPackage(hourlyPackage);
    
    const fareData = await fetchLocalFare(vehicleId);
    
    if (!fareData) {
      return 0;
    }
    
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

/**
 * Fetch local fares for a vehicle
 */
export const fetchLocalFares = async (vehicleId: string): Promise<FareData[]> => {
  try {
    const fareData = await fetchLocalFare(vehicleId);
    if (!fareData) return [];
    
    return [{
      vehicleId: fareData.vehicleId,
      vehicle_id: fareData.vehicleId,
      price4hrs40km: fareData.price4hrs40km,
      price8hrs80km: fareData.price8hrs80km,
      price10hrs100km: fareData.price10hrs100km,
      priceExtraKm: fareData.priceExtraKm,
      priceExtraHour: fareData.priceExtraHour
    }];
  } catch (error) {
    console.error('Error fetching local fares:', error);
    return [];
  }
};

/**
 * Fetch airport fares for a vehicle
 */
export const fetchAirportFares = async (vehicleId: string): Promise<FareData[]> => {
  try {
    const fareData = await fetchAirportFare(vehicleId);
    if (!fareData) return [];
    
    return [{
      vehicleId: fareData.vehicleId,
      vehicle_id: fareData.vehicleId,
      basePrice: fareData.basePrice || 0,
      pricePerKm: fareData.pricePerKm || 0,
      pickupPrice: fareData.pickupPrice || 0,
      dropPrice: fareData.dropPrice || 0,
      tier1Price: fareData.tier1Price || 0,
      tier2Price: fareData.tier2Price || 0,
      tier3Price: fareData.tier3Price || 0,
      tier4Price: fareData.tier4Price || 0,
      extraKmCharge: fareData.extraKmCharge || 0
    }];
  } catch (error) {
    console.error('Error fetching airport fares:', error);
    return [];
  }
};

// For compatibility with existing code
export const updateLocalFares = updateLocalFare;
export const updateAirportFares = updateAirportFare;
export const initializeDatabaseTables = initializeAllFareTables;

export const initializeLocalFareTables = initializeLocalFareTablesData;
export const initializeAirportFareTables = initializeAirportFareTablesData;
export const initializeOutstationFareTables = initializeOutstationFareTablesData;

export const fareManagementService = {
  updateLocalFare,
  updateAirportFare,
  updateOutstationFare,
  updateLocalFares,
  updateAirportFares,
  fetchLocalFares,
  fetchAirportFares,
  syncLocalFares,
  syncAirportFares,
  syncOutstationFares,
  initializeLocalFareTables,
  initializeAirportFareTables,
  initializeOutstationFareTables,
  initializeAllFareTables,
  initializeDatabaseTables,
  getLocalPackagePrice
};

export default fareManagementService;
