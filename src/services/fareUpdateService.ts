
import { directVehicleOperation } from '@/utils/apiHelper';
import { toast } from 'sonner';
import { AirportFare, LocalFare, OutstationFare } from '@/types/cab';

interface OutstationFareUpdate {
  vehicleId: string;
  vehicle_id?: string;
  basePrice: number;
  pricePerKm: number;
  roundTripBasePrice: number;
  roundTripPricePerKm: number;
  driverAllowance: number;
  nightHaltCharge: number;
}

interface LocalFareUpdate {
  vehicleId: string;
  vehicle_id?: string;
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number;
  priceExtraKm: number;
  priceExtraHour: number;
}

interface AirportFareUpdate {
  vehicleId: string;
  vehicle_id?: string;
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

export interface FareUpdateResponse {
  status: string;
  message: string;
  vehicle_id?: string;
  vehicleId?: string;
  data?: any;
  timestamp: number;
}

/**
 * Updates the fare for a vehicle with outstation fare data
 */
export const updateOutstationFare = async (data: OutstationFareUpdate): Promise<FareUpdateResponse> => {
  try {
    console.log('Updating outstation fare for vehicle', data.vehicleId || data.vehicle_id, ':', data);
    
    // Ensure both vehicleId properties are set
    const fareData = {
      ...data,
      vehicleId: data.vehicleId || data.vehicle_id,
      vehicle_id: data.vehicle_id || data.vehicleId
    };
    
    const response = await directVehicleOperation(
      'api/admin/outstation-fares-update.php',
      'POST',
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Mode': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        data: JSON.stringify(fareData)
      }
    );
    
    console.log('Outstation fare update response:', response);
    
    if (!response || response.status === 'error') {
      throw new Error(response?.message || 'Unknown error updating outstation fare');
    }
    
    return response;
  } catch (error: any) {
    console.error('Error updating outstation fare:', error);
    throw error;
  }
};

/**
 * Updates the fare for a vehicle with local fare data
 */
export const updateLocalFare = async (data: LocalFareUpdate): Promise<FareUpdateResponse> => {
  try {
    console.log('Updating local fare for vehicle', data.vehicleId || data.vehicle_id, ':', data);
    
    // Ensure both vehicleId properties are set
    const fareData = {
      ...data,
      vehicleId: data.vehicleId || data.vehicle_id,
      vehicle_id: data.vehicle_id || data.vehicleId
    };
    
    const response = await directVehicleOperation(
      'api/admin/local-fares-update.php',
      'POST',
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Mode': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        data: JSON.stringify(fareData)
      }
    );
    
    console.log('Local fare update response:', response);
    
    if (!response || response.status === 'error') {
      throw new Error(response?.message || 'Unknown error updating local fare');
    }
    
    return response;
  } catch (error: any) {
    console.error('Error updating local fare:', error);
    throw error;
  }
};

/**
 * Updates the fare for a vehicle with airport fare data
 */
export const updateAirportFare = async (data: AirportFareUpdate): Promise<FareUpdateResponse> => {
  try {
    // Ensure both vehicleId properties are set
    const fareData = {
      ...data,
      vehicleId: data.vehicleId || data.vehicle_id,
      vehicle_id: data.vehicle_id || data.vehicleId,
      nightCharges: data.nightCharges || 0,
      extraWaitingCharges: data.extraWaitingCharges || 0
    };
    
    console.log('Updating airport fare for vehicle', fareData.vehicleId, ':', fareData);
    
    // First, try the direct API endpoint which matches our local fare logic
    try {
      const response = await directVehicleOperation(
        'api/admin/direct-airport-fares-update.php',
        'POST',
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Mode': 'true',
            'X-Force-Creation': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          },
          data: JSON.stringify(fareData)
        }
      );
      
      console.log('Direct airport fare update response:', response);
      
      if (response && response.status === 'success') {
        return response;
      }
    } catch (directApiError) {
      console.warn('Direct airport fare API failed, falling back to admin API:', directApiError);
    }
    
    // Fallback to admin endpoint if direct API fails
    const response = await directVehicleOperation(
      'api/admin/airport-fares-update.php',
      'POST',
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Mode': 'true',
          'X-Force-Creation': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        data: JSON.stringify(fareData)
      }
    );
    
    console.log('Admin airport fare update response:', response);
    
    if (!response || response.status === 'error') {
      throw new Error(response?.message || 'Unknown error updating airport fare');
    }
    
    return response;
  } catch (error: any) {
    console.error('Error updating airport fare:', error);
    throw error;
  }
};

/**
 * Sync outstation fares from vehicle data
 */
export const syncOutstationFares = async (applyDefaults: boolean = true): Promise<boolean> => {
  try {
    console.log('Syncing outstation fares with applyDefaults =', applyDefaults);
    
    const response = await directVehicleOperation(
      'api/admin/sync-outstation-fares.php', 
      'POST',
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Mode': 'true',
          'X-Force-Creation': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        data: JSON.stringify({ applyDefaults })
      }
    );
    
    console.log('Sync outstation fares response:', response);
    
    if (response && response.status === 'success') {
      return true;
    }
    
    return false;
  } catch (error: any) {
    console.error('Error syncing outstation fares:', error);
    return false;
  }
};

/**
 * Sync local fares from vehicle data
 */
export const syncLocalFares = async (applyDefaults: boolean = true): Promise<boolean> => {
  try {
    console.log('Syncing local fares with applyDefaults =', applyDefaults);
    
    // Attempt to use the dedicated sync endpoint first
    try {
      const response = await directVehicleOperation(
        'api/admin/sync-local-fares.php', 
        'POST',
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Mode': 'true',
            'X-Force-Creation': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          },
          data: JSON.stringify({ applyDefaults })
        }
      );
      
      console.log('Sync local fares response:', response);
      
      if (response && response.status === 'success') {
        return true;
      }
    } catch (err) {
      console.warn('Primary sync endpoint failed, trying fallback');
    }
    
    // Fallback to the generic sync endpoint
    const fallbackResponse = await directVehicleOperation(
      'api/local-fares-sync.php', 
      'POST',
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Mode': 'true',
          'X-Force-Creation': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        data: JSON.stringify({ applyDefaults })
      }
    );
    
    console.log('Fallback sync local fares response:', fallbackResponse);
    
    if (fallbackResponse && fallbackResponse.status === 'success') {
      return true;
    }
    
    return false;
  } catch (error: any) {
    console.error('Error syncing local fares:', error);
    return false;
  }
};

/**
 * Sync airport fares from vehicle data
 */
export const syncAirportFares = async (applyDefaults: boolean = true): Promise<boolean> => {
  try {
    console.log('Syncing airport fares with applyDefaults =', applyDefaults);
    
    // Attempt to use the dedicated sync endpoint first
    try {
      const response = await directVehicleOperation(
        'api/admin/sync-airport-fares.php', 
        'POST',
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Mode': 'true',
            'X-Force-Creation': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          },
          data: JSON.stringify({ applyDefaults })
        }
      );
      
      console.log('Sync airport fares response:', response);
      
      if (response && response.status === 'success') {
        return true;
      }
    } catch (err) {
      console.warn('Primary sync endpoint failed, trying fallback');
    }
    
    // Fallback to the generic sync endpoint
    const fallbackResponse = await directVehicleOperation(
      'api/airport-fares-sync.php', 
      'POST',
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Mode': 'true',
          'X-Force-Creation': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        data: JSON.stringify({ applyDefaults })
      }
    );
    
    console.log('Fallback sync airport fares response:', fallbackResponse);
    
    if (fallbackResponse && fallbackResponse.status === 'success') {
      return true;
    }
    
    return false;
  } catch (error: any) {
    console.error('Error syncing airport fares:', error);
    return false;
  }
};

/**
 * Get direct airport fare data for a single vehicle
 */
export const getDirectAirportFare = async (vehicleId: string): Promise<AirportFare | null> => {
  try {
    console.log('Getting direct airport fare for vehicle:', vehicleId);
    
    // First try the direct endpoint
    try {
      const directResponse = await directVehicleOperation(
        `api/admin/direct-airport-fares.php?vehicleId=${encodeURIComponent(vehicleId)}&_t=${Date.now()}`,
        'GET',
        {
          headers: {
            'X-Admin-Mode': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }
      );
      
      console.log('Direct airport fare endpoint response:', directResponse);
      
      if (directResponse && directResponse.status === 'success' && directResponse.fares) {
        return {
          ...(typeof directResponse.fares === 'object' && !Array.isArray(directResponse.fares) 
            ? directResponse.fares 
            : {}),
          vehicleId,
          nightCharges: 0,
          extraWaitingCharges: 0
        } as AirportFare;
      }
    } catch (directError) {
      console.warn('Direct airport fare endpoint failed, falling back to admin endpoint:', directError);
    }
    
    // Fallback to admin endpoint if direct API fails
    const response = await directVehicleOperation(
      `api/admin/direct-airport-fares.php?id=${encodeURIComponent(vehicleId)}&_t=${Date.now()}`,
      'GET',
      {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Creation': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
    
    console.log('Admin direct airport fare response:', response);
    
    if (response && response.status === 'success' && response.fare) {
      return {
        ...response.fare,
        vehicleId,
        nightCharges: response.fare.nightCharges || 0,
        extraWaitingCharges: response.fare.extraWaitingCharges || 0
      } as AirportFare;
    }
    
    return null;
  } catch (error: any) {
    console.error('Error getting direct airport fare:', error);
    return null;
  }
};

// Functions for VehicleTripFaresForm.tsx
export const getAllOutstationFares = async (): Promise<Record<string, any>> => {
  try {
    const response = await directVehicleOperation(
      'api/admin/direct-outstation-fares.php',
      'GET',
      {
        headers: {
          'X-Admin-Mode': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
    
    if (response && response.status === 'success' && response.fares) {
      return response.fares;
    }
    
    return {};
  } catch (error) {
    console.error('Error getting all outstation fares:', error);
    return {};
  }
};

export const getAllLocalFares = async (): Promise<Record<string, any>> => {
  try {
    const response = await directVehicleOperation(
      'api/admin/direct-local-fares.php',
      'GET',
      {
        headers: {
          'X-Admin-Mode': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
    
    if (response && response.status === 'success' && response.fares) {
      return response.fares;
    }
    
    return {};
  } catch (error) {
    console.error('Error getting all local fares:', error);
    return {};
  }
};

export const getAllAirportFares = async (): Promise<Record<string, any>> => {
  try {
    const response = await directVehicleOperation(
      'api/admin/direct-airport-fares.php',
      'GET',
      {
        headers: {
          'X-Admin-Mode': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
    
    if (response && response.status === 'success' && response.fares) {
      return response.fares;
    }
    
    return {};
  } catch (error) {
    console.error('Error getting all airport fares:', error);
    return {};
  }
};

// Update function signatures to match usage in VehicleTripFaresForm
export const updateOutstationFares = async (data: OutstationFareUpdate): Promise<FareUpdateResponse> => {
  return updateOutstationFare(data);
};

export const updateLocalFares = async (data: LocalFareUpdate): Promise<FareUpdateResponse> => {
  return updateLocalFare(data);
};

export const updateAirportFares = async (data: AirportFareUpdate): Promise<FareUpdateResponse> => {
  return updateAirportFare(data);
};
