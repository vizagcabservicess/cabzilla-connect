
import fareStateManager from './FareStateManager';
import { toast } from 'sonner';
import { getBypassHeaders, getForcedRequestConfig, formatDataForMultipart } from '@/config/requestConfig';

// Re-export the utility functions from config/requestConfig
export { getBypassHeaders, getForcedRequestConfig, formatDataForMultipart };

// Create a service object to export all the functions grouped together
export const fareService = {
  // Re-export all functions as methods of the fareService object
  calculateAirportFare: async (params: any) => {
    if (typeof fareStateManager.calculateAirportFare === 'function') {
      const fare = await fareStateManager.calculateAirportFare(params);
      if (fare <= 0) {
        console.error(`Airport fare calculation failed for vehicle ${params.vehicleId}`);
        throw new Error(`Airport fare calculation failed for vehicle ${params.vehicleId}`);
      }
      return fare;
    }
    throw new Error('FareStateManager calculateAirportFare method not available');
  },

  calculateLocalFare: async (params: any) => {
    if (typeof fareStateManager.calculateLocalFare === 'function') {
      const fare = await fareStateManager.calculateLocalFare(params);
      if (fare <= 0) {
        console.error(`Local fare calculation failed for vehicle ${params.vehicleId} with package ${params.hourlyPackage}`);
        throw new Error(`Local fare calculation failed for vehicle ${params.vehicleId} with package ${params.hourlyPackage}`);
      }
      return fare;
    }
    throw new Error('FareStateManager calculateLocalFare method not available');
  },

  calculateOutstationFare: async (params: any) => {
    if (typeof fareStateManager.calculateOutstationFare === 'function') {
      const fare = await fareStateManager.calculateOutstationFare(params);
      if (fare <= 0) {
        console.error(`Outstation fare calculation failed for vehicle ${params.vehicleId}`);
        throw new Error(`Outstation fare calculation failed for vehicle ${params.vehicleId}`);
      }
      return fare;
    }
    throw new Error('FareStateManager calculateOutstationFare method not available');
  },

  syncFareData: async () => {
    if (typeof fareStateManager.syncFareData === 'function') {
      const result = await fareStateManager.syncFareData();
      if (!result) {
        console.error('Fare data sync failed');
        toast.error('Failed to sync fare data. Please try again.');
      }
      return result;
    }
    throw new Error('FareStateManager syncFareData method not available');
  },

  clearCache: () => {
    if (typeof fareStateManager.clearCache === 'function') {
      fareStateManager.clearCache();
      console.log('Fare cache cleared successfully');
      toast.success('Fare cache cleared successfully');
    } else {
      console.error('FareStateManager clearCache method not available');
      toast.error('Failed to clear fare cache');
    }
  },

  getBypassHeaders,
  getForcedRequestConfig,
  formatDataForMultipart
};

// Re-export all functions independently
export const calculateAirportFare = async (params: any) => {
  if (typeof fareStateManager.calculateAirportFare === 'function') {
    const fare = await fareStateManager.calculateAirportFare(params);
    if (fare <= 0) {
      console.error(`Airport fare calculation failed for vehicle ${params.vehicleId}`);
      throw new Error(`Airport fare calculation failed for vehicle ${params.vehicleId}`);
    }
    return fare;
  }
  throw new Error('FareStateManager calculateAirportFare method not available');
};

export const calculateLocalFare = async (params: any) => {
  if (typeof fareStateManager.calculateLocalFare === 'function') {
    const fare = await fareStateManager.calculateLocalFare(params);
    if (fare <= 0) {
      console.error(`Local fare calculation failed for vehicle ${params.vehicleId} with package ${params.hourlyPackage}`);
      throw new Error(`Local fare calculation failed for vehicle ${params.vehicleId} with package ${params.hourlyPackage}`);
    }
    return fare;
  }
  throw new Error('FareStateManager calculateLocalFare method not available');
};

export const calculateOutstationFare = async (params: any) => {
  if (typeof fareStateManager.calculateOutstationFare === 'function') {
    const fare = await fareStateManager.calculateOutstationFare(params);
    if (fare <= 0) {
      console.error(`Outstation fare calculation failed for vehicle ${params.vehicleId}`);
      throw new Error(`Outstation fare calculation failed for vehicle ${params.vehicleId}`);
    }
    return fare;
  }
  throw new Error('FareStateManager calculateOutstationFare method not available');
};

export const syncFareData = async () => {
  if (typeof fareStateManager.syncFareData === 'function') {
    const result = await fareStateManager.syncFareData();
    if (!result) {
      console.error('Fare data sync failed');
      toast.error('Failed to sync fare data. Please try again.');
    }
    return result;
  }
  throw new Error('FareStateManager syncFareData method not available');
};

export const clearCache = () => {
  if (typeof fareStateManager.clearCache === 'function') {
    fareStateManager.clearCache();
    console.log('Fare cache cleared successfully');
    toast.success('Fare cache cleared successfully');
  } else {
    console.error('FareStateManager clearCache method not available');
    toast.error('Failed to clear fare cache');
  }
};

export const clearFareCache = clearCache; // Alias for compatibility with existing code

// Function to initialize fare data on app load
export const initializeFareData = async (): Promise<boolean> => {
  try {
    console.log('Initializing fare data...');
    
    // Attempt to sync fare data
    const success = await syncFareData();
    
    if (success) {
      console.log('Fare data initialized successfully');
      
      // Dispatch event to notify components
      window.dispatchEvent(new CustomEvent('fare-data-initialized', {
        detail: { timestamp: Date.now() }
      }));
      
      return true;
    } else {
      console.error('Failed to initialize fare data');
      toast.error('Failed to initialize fare data. Please reload the page.');
      return false;
    }
  } catch (error) {
    console.error('Error initializing fare data:', error);
    toast.error('Error initializing fare data. Please reload the page.');
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
      clearCache();
      
      // Sync fare data with the database
      setTimeout(() => {
        syncFareData().then(() => {
          console.log('Fare data synced after direct fare update');
        });
      }, 1000);
      
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
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'success' && data.fares) {
      console.log(`Retrieved ${tripType} fares:`, data.fares);
      return data.fares;
    } else {
      throw new Error(data.message || 'Failed to retrieve fare data');
    }
  } catch (error) {
    console.error(`Error retrieving ${tripType} fares:`, error);
    
    // We no longer use fallbacks - propagate the error
    throw error;
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
    
    // Sync fare data for all types
    const success = await syncFareData();
    
    if (success) {
      console.log('Database initialized successfully');
      
      // Dispatch event to notify components
      window.dispatchEvent(new CustomEvent('database-initialized', {
        detail: { timestamp: Date.now() }
      }));
      
      return { 
        status: 'success',
        message: 'Database initialized successfully'
      };
    } else {
      console.error('Failed to initialize database');
      return { 
        status: 'error',
        message: 'Failed to initialize database'
      };
    }
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
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Synced local fare tables:', data);
    
    // Clear cache and notify components
    clearCache();
    
    // Sync fare data with the database
    setTimeout(() => {
      syncFareData().then(() => {
        console.log('Fare data synced after local fare table sync');
      });
    }, 1000);
    
    return true;
  } catch (error) {
    console.error('Error syncing local fare tables:', error);
    toast.error('Error syncing local fare tables');
    return false;
  }
};

export const syncOutstationFares = async (): Promise<boolean> => {
  try {
    const endpoint = 'api/outstation-fares.php?sync=true&_t=' + Date.now();
    const response = await fetch(endpoint, {
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Synced outstation fare tables:', data);
    
    // Clear cache and notify components
    clearCache();
    
    // Sync fare data with the database
    setTimeout(() => {
      syncFareData().then(() => {
        console.log('Fare data synced after outstation fare table sync');
      });
    }, 1000);
    
    return true;
  } catch (error) {
    console.error('Error syncing outstation fare tables:', error);
    toast.error('Error syncing outstation fare tables');
    return false;
  }
};

export const syncAirportFares = async (): Promise<boolean> => {
  try {
    const endpoint = 'api/direct-airport-fares.php?sync=true&_t=' + Date.now();
    const response = await fetch(endpoint, {
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Synced airport fare tables:', data);
    
    // Clear cache and notify components
    clearCache();
    
    // Sync fare data with the database
    setTimeout(() => {
      syncFareData().then(() => {
        console.log('Fare data synced after airport fare table sync');
      });
    }, 1000);
    
    return true;
  } catch (error) {
    console.error('Error syncing airport fare tables:', error);
    toast.error('Error syncing airport fare tables');
    return false;
  }
};

// Reset CabOptions state
export const resetCabOptionsState = (): void => {
  try {
    // Clear fare cache first
    clearCache();
    
    // Dispatch event to notify components
    window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
      detail: { timestamp: Date.now(), forceRefresh: true }
    }));
    
    console.log('CabOptions state reset triggered');
    
    // Sync fare data with the database
    setTimeout(() => {
      syncFareData().then(() => {
        console.log('Fare data synced after state reset');
      });
    }, 1000);
  } catch (error) {
    console.error('Error resetting CabOptions state:', error);
    toast.error('Error resetting fare options');
  }
};
