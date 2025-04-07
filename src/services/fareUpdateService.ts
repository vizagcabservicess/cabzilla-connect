import { apiCall } from '@/utils/apiHelper';
import { clearVehicleDataCache } from './vehicleDataService';
import { toast } from 'sonner';

export interface LocalFareUpdate {
  vehicleId: string;
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number;
  priceExtraKm: number;
  priceExtraHour: number;
}

export interface AirportFareUpdate {
  vehicleId: string;
  basePrice: number;
  pricePerKm: number;
  pickupPrice: number;
  dropPrice: number;
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier4Price: number;
  extraKmCharge: number;
  nightCharges: number;
  extraWaitingCharges: number;
}

export interface OutstationFareUpdate {
  vehicleId: string;
  basePrice: number;
  pricePerKm: number;
  driverAllowance: number;
  nightHaltCharge: number;
  roundTripBasePrice?: number;
  roundTripPricePerKm?: number;
}

/**
 * Updates local package fares for a vehicle
 */
export async function updateLocalFare(data: LocalFareUpdate) {
  console.log('Updating local fare:', data);
  
  try {
    // Validate data
    if (!data.vehicleId) {
      throw new Error('Vehicle ID is required');
    }
    
    // Make sure all numeric values are properly set (not undefined)
    const fareData = {
      vehicleId: data.vehicleId,
      price4hrs40km: data.price4hrs40km || 0,
      price8hrs80km: data.price8hrs80km || 0,
      price10hrs100km: data.price10hrs100km || 0,
      priceExtraKm: data.priceExtraKm || 0,
      priceExtraHour: data.priceExtraHour || 0
    };
    
    const response = await apiCall('api/admin/update-local-fare.php', {
      data: fareData,
      method: 'POST',
      headers: {
        'X-Admin-Mode': 'true'
      }
    });
    
    if (response.status === 'success') {
      // Clear vehicle cache to ensure updated data is fetched next time
      clearVehicleDataCache();
      
      // Dispatch an event to notify components that fares changed
      window.dispatchEvent(new CustomEvent('local-fares-updated', {
        detail: { timestamp: Date.now(), vehicleId: data.vehicleId }
      }));
      
      return response;
    } else {
      console.error('Error updating local fare:', response.message);
      throw new Error(response.message || 'Failed to update local fare');
    }
  } catch (error: any) {
    console.error('Error in updateLocalFare:', error);
    throw error;
  }
}

// Add alias for updateLocalFare as updateLocalFares for compatibility
export const updateLocalFares = updateLocalFare;

/**
 * Updates airport transfer fares for a vehicle
 */
export async function updateAirportFare(data: AirportFareUpdate) {
  console.log('Updating airport fare:', data);
  const errors: string[] = [];
  
  try {
    // Validate data
    if (!data.vehicleId) {
      throw new Error('Vehicle ID is required');
    }
    
    // Make sure all numeric values are properly set (not undefined)
    const fareData = {
      vehicleId: data.vehicleId,
      basePrice: data.basePrice || 0,
      pricePerKm: data.pricePerKm || 0,
      pickupPrice: data.pickupPrice || 0,
      dropPrice: data.dropPrice || 0,
      tier1Price: data.tier1Price || 0,
      tier2Price: data.tier2Price || 0,
      tier3Price: data.tier3Price || 0,
      tier4Price: data.tier4Price || 0,
      extraKmCharge: data.extraKmCharge || 0,
      nightCharges: data.nightCharges || 0,
      extraWaitingCharges: data.extraWaitingCharges || 0
    };
    
    console.log('Sending airport fare data to API:', fareData);
    
    // Try using form data format instead of JSON
    const formData = new FormData();
    Object.entries(fareData).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    
    // Create an array to hold all errors
    let directApiError = null;
    
    try {
      // First try the direct-airport-fares-update endpoint which is more reliable
      const directResponse = await fetch('/api/admin/direct-airport-fares-update.php', {
        method: 'POST',
        body: formData,
        headers: {
          'X-Admin-Mode': 'true',
          'X-Debug': 'true',
          'Cache-Control': 'no-cache'
        }
      });
      
      // Log raw response for debugging
      const rawText = await directResponse.text();
      console.log('Direct endpoint raw response:', rawText);
      
      // Try to parse the response as JSON
      let directJsonResponse;
      try {
        directJsonResponse = JSON.parse(rawText);
        console.log('Direct endpoint parsed response:', directJsonResponse);
      } catch (jsonError) {
        console.error('Error parsing direct endpoint response as JSON:', jsonError);
        errors.push(`Direct API failed: ${jsonError.message}`);
        directApiError = new Error(`Invalid JSON response: ${rawText.substring(0, 100)}`);
      }
      
      if (directJsonResponse && directJsonResponse.status === 'success') {
        // Clear vehicle cache to ensure updated data is fetched next time
        clearVehicleDataCache();
        
        // Dispatch an event to notify components that fares changed
        window.dispatchEvent(new CustomEvent('airport-fares-updated', {
          detail: { timestamp: Date.now(), vehicleId: data.vehicleId }
        }));
        
        toast.success('Airport fares updated successfully');
        return directJsonResponse;
      } else if (directJsonResponse) {
        // Response has error message
        errors.push(`Direct API failed: ${directJsonResponse.message || 'Unknown error'}`);
        directApiError = new Error(directJsonResponse.message || 'Direct API request failed');
      } else {
        // Response couldn't be parsed as JSON
        errors.push('Direct API failed: Invalid response format');
        directApiError = new Error('Invalid response format from direct API');
      }
    } catch (directError: any) {
      console.error('Error with direct endpoint:', directError);
      errors.push(`Direct API failed: ${directError.message}`);
      directApiError = directError;
    }
    
    // Try fallback method: airport-fares-update.php
    try {
      console.log('Trying airport-fares-update.php endpoint...');
      
      // Use a URL-encoded format for this endpoint
      const params = new URLSearchParams();
      Object.entries(fareData).forEach(([key, value]) => {
        params.append(key, String(value));
      });
      
      const response = await fetch('/api/admin/airport-fares-update.php', {
        method: 'POST',
        body: params.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Admin-Mode': 'true',
          'X-Debug': 'true',
          'Cache-Control': 'no-cache'
        }
      });
      
      // Log raw response
      const rawText = await response.text();
      console.log('Fallback endpoint raw response:', rawText);
      
      // Try to parse the response
      let jsonResponse;
      try {
        jsonResponse = JSON.parse(rawText);
        console.log('Fallback endpoint parsed response:', jsonResponse);
      } catch (jsonError) {
        console.error('Error parsing fallback endpoint response as JSON:', jsonError);
        errors.push(`Fare Update API failed: ${jsonError.message}`);
        throw new Error(`Invalid JSON response from fallback API: ${rawText.substring(0, 100)}`);
      }
      
      if (jsonResponse && jsonResponse.status === 'success') {
        // Clear vehicle cache to ensure updated data is fetched next time
        clearVehicleDataCache();
        
        // Dispatch an event to notify components that fares changed
        window.dispatchEvent(new CustomEvent('airport-fares-updated', {
          detail: { timestamp: Date.now(), vehicleId: data.vehicleId }
        }));
        
        toast.success('Airport fares updated successfully via fallback API');
        return jsonResponse;
      } else {
        errors.push(`Fare Update API failed: ${jsonResponse?.message || 'Unknown error'}`);
        throw new Error(jsonResponse?.message || 'Fallback API request failed');
      }
    } catch (fallbackError: any) {
      console.error('Error with fallback endpoint:', fallbackError);
      errors.push(`Fare Update API failed: ${fallbackError.message}`);
      
      // If we reach here, both attempts failed. Try a third approach using direct-fare-update.php
      try {
        console.log('Trying direct-fare-update.php as last resort...');
        
        // Prepare data for direct-fare-update.php
        const directFareData = new FormData();
        directFareData.append('vehicleId', data.vehicleId);
        directFareData.append('tripType', 'airport');
        
        // Add all fare data
        Object.entries(fareData).forEach(([key, value]) => {
          directFareData.append(key, String(value));
        });
        
        const directFareResponse = await fetch('/api/admin/direct-fare-update.php', {
          method: 'POST',
          body: directFareData,
          headers: {
            'X-Admin-Mode': 'true',
            'X-Debug': 'true'
          }
        });
        
        // Log raw response
        const rawDirectFareText = await directFareResponse.text();
        console.log('Direct fare update endpoint raw response:', rawDirectFareText);
        
        // Try to parse response
        let directFareJson;
        try {
          directFareJson = JSON.parse(rawDirectFareText);
          console.log('Direct fare update endpoint parsed response:', directFareJson);
        } catch (jsonError) {
          console.error('Error parsing direct fare update response as JSON:', jsonError);
          errors.push(`Fare Service failed: ${jsonError.message}`);
          throw new Error('All update approaches failed');
        }
        
        if (directFareJson && directFareJson.status === 'success') {
          // Clear vehicle cache to ensure updated data is fetched next time
          clearVehicleDataCache();
          
          // Dispatch an event to notify components that fares changed
          window.dispatchEvent(new CustomEvent('airport-fares-updated', {
            detail: { timestamp: Date.now(), vehicleId: data.vehicleId }
          }));
          
          toast.success('Airport fares updated successfully via direct fare update');
          return directFareJson;
        } else {
          errors.push(`Fare Service failed: ${directFareJson?.message || 'Unknown error'}`);
          throw new Error('All update approaches failed');
        }
      } catch (directFareError: any) {
        console.error('Error with direct fare update endpoint:', directFareError);
        errors.push(`Fare Service failed: ${directFareError.message}`);
        
        // If we get here, all three attempts failed
        const combinedError = new Error(`Failed to update airport fare: ${errors.join(', ')}`);
        toast.error(combinedError.message);
        throw combinedError;
      }
    }
  } catch (error: any) {
    console.error('Error in updateAirportFare:', error);
    toast.error(error.message || 'Error updating airport fare');
    throw error;
  }
}

// Add alias for updateAirportFare as updateAirportFares for compatibility
export const updateAirportFares = updateAirportFare;

/**
 * Updates outstation fares for a vehicle
 */
export async function updateOutstationFare(data: OutstationFareUpdate) {
  console.log('Updating outstation fare:', data);
  
  try {
    // Validate data
    if (!data.vehicleId) {
      throw new Error('Vehicle ID is required');
    }
    
    // Make sure all numeric values are properly set (not undefined)
    const fareData = {
      vehicleId: data.vehicleId,
      basePrice: data.basePrice || 0,
      pricePerKm: data.pricePerKm || 0,
      driverAllowance: data.driverAllowance || 0,
      nightHaltCharge: data.nightHaltCharge || 0,
      ...(data.roundTripBasePrice !== undefined && { roundTripBasePrice: data.roundTripBasePrice }),
      ...(data.roundTripPricePerKm !== undefined && { roundTripPricePerKm: data.roundTripPricePerKm })
    };
    
    const response = await apiCall('api/admin/update-outstation-fare.php', {
      data: fareData,
      method: 'POST',
      headers: {
        'X-Admin-Mode': 'true'
      }
    });
    
    if (response.status === 'success') {
      // Clear vehicle cache to ensure updated data is fetched next time
      clearVehicleDataCache();
      
      // Dispatch an event to notify components that fares changed
      window.dispatchEvent(new CustomEvent('outstation-fares-updated', {
        detail: { timestamp: Date.now(), vehicleId: data.vehicleId }
      }));
      
      return response;
    } else {
      console.error('Error updating outstation fare:', response.message);
      throw new Error(response.message || 'Failed to update outstation fare');
    }
  } catch (error: any) {
    console.error('Error in updateOutstationFare:', error);
    throw error;
  }
}

// Add alias for updateOutstationFare as updateOutstationFares for compatibility
export const updateOutstationFares = updateOutstationFare;

/**
 * Gets all outstation fares from the backend
 */
export async function getAllOutstationFares() {
  try {
    const response = await apiCall('api/admin/outstation-fares.php', {
      method: 'GET',
      headers: {
        'X-Admin-Mode': 'true'
      }
    });
    
    if (response.status === 'success') {
      return response.fares || [];
    }
    
    console.error('Error getting outstation fares:', response.message);
    return [];
  } catch (error: any) {
    console.error('Error in getAllOutstationFares:', error);
    return [];
  }
}

/**
 * Gets all local fares from the backend
 */
export async function getAllLocalFares() {
  try {
    const response = await apiCall('api/admin/local-fares.php', {
      method: 'GET',
      headers: {
        'X-Admin-Mode': 'true'
      }
    });
    
    if (response.status === 'success') {
      return response.fares || [];
    }
    
    console.error('Error getting local fares:', response.message);
    return [];
  } catch (error: any) {
    console.error('Error in getAllLocalFares:', error);
    return [];
  }
}

/**
 * Gets all airport fares from the backend
 */
export async function getAllAirportFares() {
  try {
    const response = await apiCall('api/admin/airport-fares.php', {
      method: 'GET',
      headers: {
        'X-Admin-Mode': 'true'
      }
    });
    
    if (response.status === 'success') {
      return response.fares || [];
    }
    
    console.error('Error getting airport fares:', response.message);
    return [];
  } catch (error: any) {
    console.error('Error in getAllAirportFares:', error);
    return [];
  }
}

/**
 * Syncs the airport fares table from a reliable source
 */
export async function syncAirportFares(forceRefresh: boolean = false): Promise<boolean> {
  try {
    console.log('Syncing airport fares table');
    toast.info('Syncing airport fares table...');
    
    const formData = new FormData();
    formData.append('force', forceRefresh ? 'true' : 'false');
    
    const response = await fetch('/api/admin/fix-database.php', {
      method: 'POST',
      body: formData,
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Creation': 'true',
        'X-Debug': 'true',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Database fix failed with status ${response.status}`);
    }
    
    // Get raw response text for debugging
    const rawText = await response.text();
    console.log('Database fix raw response:', rawText);
    
    // Try to parse as JSON
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(rawText);
      console.log('Database fix parsed response:', jsonResponse);
    } catch (e) {
      console.error('Error parsing database fix response:', e);
      throw new Error(`Invalid JSON response: ${rawText.substring(0, 100)}`);
    }
    
    if (jsonResponse.status === 'success') {
      // Clear vehicle cache to ensure updated data is fetched next time
      clearVehicleDataCache();
      
      // Dispatch an event to notify components that fares changed
      window.dispatchEvent(new CustomEvent('airport-fares-updated', {
        detail: { timestamp: Date.now() }
      }));
      
      toast.success(`Database fix completed: ${jsonResponse.message || 'Tables verified'}`);
      return true;
    }
    
    console.error('Failed to fix airport fares database:', jsonResponse.message);
    toast.error(jsonResponse.message || 'Failed to fix airport fares database');
    return false;
  } catch (error: any) {
    console.error('Error fixing airport fares database:', error);
    toast.error(`Error fixing airport fares database: ${error.message}`);
    return false;
  }
}

/**
 * Syncs the local fares table from a reliable source
 */
export async function syncLocalFares(forceRefresh: boolean = false): Promise<boolean> {
  try {
    console.log('Syncing local fares table');
    
    const response = await apiCall('api/admin/sync-local-fares.php', {
      method: 'POST',
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': forceRefresh ? 'true' : 'false'
      }
    });
    
    if (response.status === 'success') {
      // Clear vehicle cache to ensure updated data is fetched next time
      clearVehicleDataCache();
      
      // Dispatch an event to notify components that fares changed
      window.dispatchEvent(new CustomEvent('local-fares-updated', {
        detail: { timestamp: Date.now() }
      }));
      
      return true;
    }
    
    console.error('Failed to sync local fares:', response.message);
    return false;
  } catch (error: any) {
    console.error('Error syncing local fares:', error);
    return false;
  }
}

/**
 * Syncs the outstation fares table from a reliable source
 */
export async function syncOutstationFares(forceRefresh: boolean = false): Promise<boolean> {
  try {
    console.log('Syncing outstation fares table');
    
    const response = await apiCall('api/admin/sync-outstation-fares.php', {
      method: 'POST',
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': forceRefresh ? 'true' : 'false'
      }
    });
    
    if (response.status === 'success') {
      // Clear vehicle cache to ensure updated data is fetched next time
      clearVehicleDataCache();
      
      // Dispatch an event to notify components that fares changed
      window.dispatchEvent(new CustomEvent('outstation-fares-updated', {
        detail: { timestamp: Date.now() }
      }));
      
      return true;
    }
    
    console.error('Failed to sync outstation fares:', response.message);
    return false;
  } catch (error: any) {
    console.error('Error syncing outstation fares:', error);
    return false;
  }
}
