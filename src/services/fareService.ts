// File: src/services/fareService.ts
import axios from 'axios';
import { CabType, LocalFare, AirportFare, OutstationFare } from '@/types/cab';

// Force refresh header
export const getBypassHeaders = () => ({
  'X-Force-Refresh': 'true',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
});

// Forced request config for API calls
export const getForcedRequestConfig = () => ({
  headers: getBypassHeaders(),
  params: { _t: Date.now() }
});

// Direct fare update using our API
export const directFareUpdate = async (tripType: string, vehicleId: string, fareData: any) => {
  try {
    const endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/direct-fare-update.php?tripType=${tripType}&_t=${Date.now()}`;
    
    const response = await axios.post(endpoint, 
      { vehicleId, ...fareData }, 
      { headers: getBypassHeaders() }
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error in directFareUpdate for ${tripType}:`, error);
    throw error;
  }
};

// Initialize the database for the fare service
export const initializeDatabase = async () => {
  // Implementation details
  return { success: true };
};

// Force sync outstation fares
export const forceSyncOutstationFares = async () => {
  // Implementation details
  return { success: true };
};

// Sync outstation fares
export const syncOutstationFares = async () => {
  // Implementation details
  return { success: true };
};

// Get outstation fares
export const getOutstationFares = async (): Promise<OutstationFare[]> => {
  // Implementation details
  return [];
};

// Get local fares
export const getLocalFares = async (): Promise<LocalFare[]> => {
  // Implementation details
  return [];
};

// Get airport fares
export const getAirportFares = async (): Promise<AirportFare[]> => {
  // Implementation details
  return [];
};

// Get outstation fares for a specific vehicle
export const getOutstationFaresForVehicle = async (vehicleId: string): Promise<OutstationFare> => {
  // Implementation details
  return {} as OutstationFare;
};

// Get local fares for a specific vehicle
export const getLocalFaresForVehicle = async (vehicleId: string): Promise<LocalFare> => {
  // Implementation details
  return {} as LocalFare;
};

// Get airport fares for a specific vehicle
export const getAirportFaresForVehicle = async (vehicleId: string): Promise<AirportFare> => {
  // Implementation details
  return {} as AirportFare;
};

// Get fares by trip type
export const getFaresByTripType = async (tripType: string) => {
  // Implementation details
  return [];
};

// Sync local fare tables
export const syncLocalFareTables = async () => {
  // Implementation details
  return { success: true };
};

// Clear fare cache
export const clearFareCache = () => {
  // Implementation details
  return true;
};

// Reset cab options state
export const resetCabOptionsState = () => {
  // Implementation details
  return true;
};

// Update local fare - implementation of the missing function
export const updateLocalFare = async (
  vehicleId: string, 
  fareData: {
    package4hr40km?: number;
    package8hr80km?: number;
    package10hr100km?: number;
    extraKmRate?: number;
    extraHourRate?: number;
    [key: string]: any;
  }
) => {
  const endpoints = [
    // Primary endpoint using direct-local-fares.php
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/direct-local-fares.php`,
    // Fallback to admin endpoint
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/direct-local-fares.php`,
    // Last resort using general fare update endpoint
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/direct-fare-update.php?tripType=local`
  ];

  console.log(`Attempting to update local fares for vehicle ${vehicleId}`, fareData);
  
  // Try multiple potential endpoints for maximum compatibility
  let lastError = null;
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying endpoint: ${endpoint}`);
      
      // Format data for sending - using string vehicle ID not number
      const data = {
        vehicleId: String(vehicleId),
        vehicle_id: String(vehicleId), // Alternative name
        vehicle_type: String(vehicleId), // Alternative name
        ...fareData,
        packages: {
          '4hrs-40km': fareData.package4hr40km || 0,
          '8hrs-80km': fareData.package8hr80km || 0,
          '10hrs-100km': fareData.package10hr100km || 0,
          'extra-km': fareData.extraKmRate || 0,
          'extra-hour': fareData.extraHourRate || 0
        }
      };
      
      const response = await axios.post(
        endpoint, 
        data,
        { 
          headers: {
            ...getBypassHeaders(),
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`Success updating local fares with endpoint ${endpoint}:`, response.data);
      
      // If successful, clear any fare caches
      clearFareCache();
      
      return {
        success: true,
        endpoint,
        data: response.data
      };
    } catch (error) {
      console.error(`Error updating local fares with endpoint ${endpoint}:`, error);
      lastError = error;
      // Continue to try next endpoint
    }
  }
  
  // If we reach here, all endpoints failed
  console.error('All endpoints failed when updating local fares');
  throw lastError || new Error('Failed to update local fares');
};

// Export fare service as a singleton
export const fareService = {
  getBypassHeaders,
  getForcedRequestConfig,
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
  clearFareCache,
  resetCabOptionsState,
  syncLocalFareTables,
  updateLocalFare
};
