import fareStateManager from './FareStateManager';
import { toast } from 'sonner';
import { getBypassHeaders, getForcedRequestConfig, formatDataForMultipart } from '@/config/requestConfig';

// Re-export the utility functions from config/requestConfig
export { getBypassHeaders, getForcedRequestConfig, formatDataForMultipart };

// Re-export the FareStateManager's methods for direct use
export const calculateAirportFare = fareStateManager.calculateAirportFare.bind(fareStateManager);
export const calculateLocalFare = fareStateManager.calculateLocalFare.bind(fareStateManager);
export const calculateOutstationFare = fareStateManager.calculateOutstationFare.bind(fareStateManager);
export const syncFareData = fareStateManager.syncFareData.bind(fareStateManager);
export const clearCache = fareStateManager.clearCache.bind(fareStateManager);
export const clearFareCache = clearCache; // Alias for compatibility with existing code

// Function to initialize fare data on app load
export const initializeFareData = async (): Promise<boolean> => {
  try {
    console.log('Initializing fare data...');
    
    // Attempt to sync fare data
    const success = await fareStateManager.syncFareData();
    
    if (success) {
      console.log('Fare data initialized successfully');
      return true;
    } else {
      console.warn('Failed to initialize fare data');
      return false;
    }
  } catch (error) {
    console.error('Error initializing fare data:', error);
    return false;
  }
};

// Functions for specific fare operations
export const directFareUpdate = async (tripType: string, vehicleId: string, fareData: any): Promise<{status: string, message?: string}> => {
  try {
    console.log(`Updating ${tripType} fare for ${vehicleId}:`, fareData);
    
    // Create a FormData object for the request
    const formData = new FormData();
    formData.append('vehicle_id', vehicleId);
    
    // Add all fare data to the form
    Object.entries(fareData).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    
    // Define the endpoint based on trip type
    let endpoint = '';
    switch (tripType) {
      case 'airport':
        endpoint = 'api/admin/direct-airport-fares.php';
        break;
      case 'local':
        endpoint = 'api/admin/direct-local-fares.php';
        break;
      case 'outstation':
        endpoint = 'api/admin/direct-outstation-fares.php';
        break;
      default:
        throw new Error(`Unsupported trip type: ${tripType}`);
    }
    
    // Make the request
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Force-Refresh': 'true',
        'X-Admin-Mode': 'true'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      toast.success(`${tripType} fare updated successfully for ${vehicleId}`);
      
      // Clear cache and notify components
      fareStateManager.clearCache();
      
      // Dispatch custom event for fare data update
      window.dispatchEvent(new CustomEvent('fare-data-updated', {
        detail: {
          tripType,
          vehicleId,
          timestamp: Date.now()
        }
      }));
      
      return { status: 'success' };
    } else {
      toast.error(`Failed to update ${tripType} fare: ${result.message || 'Unknown error'}`);
      return { 
        status: 'error',
        message: result.message || 'Unknown error'
      };
    }
  } catch (error) {
    console.error(`Error updating ${tripType} fare:`, error);
    toast.error(`Failed to update ${tripType} fare: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { 
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Functions for fare data retrieval by trip type
export const getFaresByTripType = async (tripType: string, vehicleId?: string): Promise<any> => {
  try {
    let endpoint = '';
    
    switch (tripType) {
      case 'airport':
        endpoint = 'api/direct-airport-fares.php';
        break;
      case 'local':
        endpoint = 'api/direct-local-fares.php';
        break;
      case 'outstation':
        endpoint = 'api/outstation-fares.php';
        break;
      default:
        throw new Error(`Unsupported trip type: ${tripType}`);
    }
    
    // Add vehicle ID if provided
    if (vehicleId) {
      endpoint += `?vehicle_id=${encodeURIComponent(vehicleId)}`;
    }
    
    // Add cache-busting timestamp
    endpoint += vehicleId ? `&_t=${Date.now()}` : `?_t=${Date.now()}`;
    
    const response = await fetch(endpoint, {
      headers: {
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'success') {
      return data.fares;
    } else {
      throw new Error(data.message || 'Failed to retrieve fare data');
    }
  } catch (error) {
    console.error(`Error retrieving ${tripType} fares:`, error);
    return null;
  }
};

// Convenience methods for specific trip types
export const getAirportFares = async (vehicleId?: string) => getFaresByTripType('airport', vehicleId);
export const getLocalFares = async (vehicleId?: string) => getFaresByTripType('local', vehicleId);
export const getOutstationFares = async (vehicleId?: string) => getFaresByTripType('outstation', vehicleId);

// Convenience methods for specific vehicles
export const getAirportFaresForVehicle = async (vehicleId: string) => getFaresByTripType('airport', vehicleId);
export const getLocalFaresForVehicle = async (vehicleId: string) => getFaresByTripType('local', vehicleId);
export const getOutstationFaresForVehicle = async (vehicleId: string) => getFaresByTripType('outstation', vehicleId);

// Database initialization helpers
export const initializeDatabase = async (): Promise<{status: string, message?: string}> => {
  try {
    console.log('Initializing database...');
    
    // Just try syncing fare data for now
    const success = await fareStateManager.syncFareData();
    return { 
      status: success ? 'success' : 'error',
      message: success ? 'Database initialized successfully' : 'Failed to initialize database'
    };
  } catch (error) {
    console.error('Error initializing database:', error);
    return { 
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error initializing database'
    };
  }
};

// Force synchs of specific fare tables
export const syncLocalFareTables = async (): Promise<boolean> => {
  try {
    const endpoint = 'api/local-fares.php?sync=true&_t=' + Date.now();
    const response = await fetch(endpoint, {
      headers: { 'X-Force-Refresh': 'true' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Synced local fare tables:', data);
    
    // Clear cache and notify components
    fareStateManager.clearCache();
    
    return true;
  } catch (error) {
    console.error('Error syncing local fare tables:', error);
    return false;
  }
};

export const syncOutstationFares = async (): Promise<boolean> => {
  try {
    const endpoint = 'api/outstation-fares.php?sync=true&_t=' + Date.now();
    const response = await fetch(endpoint, {
      headers: { 'X-Force-Refresh': 'true' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Synced outstation fare tables:', data);
    
    // Clear cache and notify components
    fareStateManager.clearCache();
    
    return true;
  } catch (error) {
    console.error('Error syncing outstation fare tables:', error);
    return false;
  }
};

export const forceSyncOutstationFares = async (): Promise<boolean> => {
  try {
    const endpoint = 'api/outstation-fares.php?force_sync=true&_t=' + Date.now();
    const response = await fetch(endpoint, {
      headers: { 'X-Force-Refresh': 'true' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Force synced outstation fare tables:', data);
    
    // Clear cache and notify components
    fareStateManager.clearCache();
    
    return true;
  } catch (error) {
    console.error('Error force syncing outstation fare tables:', error);
    return false;
  }
};

// Reset CabOptions state
export const resetCabOptionsState = (): void => {
  try {
    window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
      detail: { timestamp: Date.now(), forceRefresh: true }
    }));
    
    console.log('CabOptions state reset triggered');
  } catch (error) {
    console.error('Error resetting CabOptions state:', error);
  }
};

// Export the complete service
export const fareService = {
  calculateAirportFare,
  calculateLocalFare,
  calculateOutstationFare,
  clearFareCache,
  clearCache,
  syncFareData,
  initializeFareData,
  directFareUpdate,
  getAirportFares,
  getLocalFares,
  getOutstationFares,
  getAirportFaresForVehicle,
  getLocalFaresForVehicle,
  getOutstationFaresForVehicle,
  syncLocalFareTables,
  syncOutstationFares,
  forceSyncOutstationFares,
  resetCabOptionsState,
  initializeDatabase,
  getBypassHeaders,
  getForcedRequestConfig,
  formatDataForMultipart
};

export default fareService;
