
import { directVehicleOperation } from '@/utils/apiHelper';
import { toast } from 'sonner';

interface OutstationFare {
  vehicleId: string;
  vehicle_id: string;
  basePrice: number;
  pricePerKm: number;
  roundTripBasePrice: number;
  roundTripPricePerKm: number;
  driverAllowance: number;
  nightHaltCharge: number;
}

interface LocalFare {
  vehicleId: string;
  vehicle_id: string;
  extraKmRate: number;
  extraHourRate: number;
  packages: Array<{
    hours: number;
    km: number;
    price: number;
  }>;
}

interface AirportFare {
  vehicleId: string;
  vehicle_id: string;
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
export const updateOutstationFare = async (data: OutstationFare): Promise<FareUpdateResponse> => {
  try {
    console.log('Updating outstation fare for vehicle', data.vehicleId || data.vehicle_id, ':', data);
    const response = await directVehicleOperation(
      'api/admin/outstation-fares-update.php',
      'POST',
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Mode': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        data: JSON.stringify(data)
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
 * Updates the fare for a vehicle with airport fare data
 */
export const updateAirportFare = async (data: AirportFare): Promise<FareUpdateResponse> => {
  try {
    // Ensure both vehicleId properties are set
    const fareData = {
      ...data,
      vehicleId: data.vehicleId || data.vehicle_id,
      vehicle_id: data.vehicle_id || data.vehicleId
    };
    
    console.log('Updating airport fare for vehicle', fareData.vehicleId, ':', fareData);
    
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
    
    console.log('Airport fare update response:', response);
    
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
 * Updates the fare for a vehicle with local fare data
 */
export const updateLocalFare = async (data: LocalFare): Promise<FareUpdateResponse> => {
  try {
    // Ensure both vehicleId properties are set
    const fareData = {
      ...data,
      vehicleId: data.vehicleId || data.vehicle_id,
      vehicle_id: data.vehicle_id || data.vehicleId
    };
    
    console.log('Updating local fare for vehicle', fareData.vehicleId, ':', fareData);
    
    const response = await directVehicleOperation(
      'api/admin/direct-local-fares-update.php',
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
 * Sync airport fares from vehicle data
 */
export const syncAirportFares = async (applyDefaults: boolean = true): Promise<boolean> => {
  try {
    console.log('Syncing airport fares with applyDefaults =', applyDefaults);
    
    const response = await directVehicleOperation(
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
    
    console.log('Sync airport fares response:', response);
    
    if (response && response.status === 'success') {
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
    
    const response = await directVehicleOperation(
      `api/direct-airport-fares.php?vehicleId=${encodeURIComponent(vehicleId)}&_t=${Date.now()}`,
      'GET',
      {
        headers: {
          'X-Admin-Mode': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
    
    console.log('Direct airport fare response:', response);
    
    if (response && response.status === 'success' && response.data) {
      return response.data;
    }
    
    return null;
  } catch (error: any) {
    console.error('Error getting direct airport fare:', error);
    return null;
  }
};

/**
 * Get all outstation fares
 */
export const getAllOutstationFares = async (): Promise<Record<string, any>> => {
  try {
    console.log('Getting all outstation fares');
    
    const response = await directVehicleOperation(
      'api/admin/outstation-fares.php',
      'GET',
      {
        headers: {
          'X-Admin-Mode': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
    
    console.log('All outstation fares response:', response);
    
    if (response && response.status === 'success' && response.fares) {
      const faresMap: Record<string, any> = {};
      
      response.fares.forEach((fare: any) => {
        const vehicleId = fare.vehicleId || fare.vehicle_id;
        if (vehicleId) {
          faresMap[vehicleId] = fare;
        }
      });
      
      return faresMap;
    }
    
    return {};
  } catch (error: any) {
    console.error('Error getting all outstation fares:', error);
    return {};
  }
};

/**
 * Get all local fares
 */
export const getAllLocalFares = async (): Promise<Record<string, any>> => {
  try {
    console.log('Getting all local fares');
    
    const response = await directVehicleOperation(
      'api/admin/local-fares.php',
      'GET',
      {
        headers: {
          'X-Admin-Mode': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
    
    console.log('All local fares response:', response);
    
    if (response && response.status === 'success' && response.fares) {
      const faresMap: Record<string, any> = {};
      
      response.fares.forEach((fare: any) => {
        const vehicleId = fare.vehicleId || fare.vehicle_id;
        if (vehicleId) {
          faresMap[vehicleId] = fare;
        }
      });
      
      return faresMap;
    }
    
    return {};
  } catch (error: any) {
    console.error('Error getting all local fares:', error);
    return {};
  }
};

/**
 * Get all airport fares
 */
export const getAllAirportFares = async (): Promise<Record<string, any>> => {
  try {
    console.log('Getting all airport fares');
    
    const response = await directVehicleOperation(
      'api/admin/airport-fares.php',
      'GET',
      {
        headers: {
          'X-Admin-Mode': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
    
    console.log('All airport fares response:', response);
    
    if (response && response.status === 'success' && response.fares) {
      const faresMap: Record<string, any> = {};
      
      response.fares.forEach((fare: any) => {
        const vehicleId = fare.vehicleId || fare.vehicle_id;
        if (vehicleId) {
          faresMap[vehicleId] = fare;
        }
      });
      
      return faresMap;
    }
    
    return {};
  } catch (error: any) {
    console.error('Error getting all airport fares:', error);
    return {};
  }
};

// Helper functions for specific uses

/**
 * Update outstation fares with individual parameters
 */
export const updateOutstationFares = async (
  vehicleId: string,
  basePrice: number,
  pricePerKm: number,
  roundTripBasePrice: number,
  roundTripPricePerKm: number,
  driverAllowance: number,
  nightHaltCharge: number
): Promise<FareUpdateResponse> => {
  const data: OutstationFare = {
    vehicleId,
    vehicle_id: vehicleId,
    basePrice,
    pricePerKm,
    roundTripBasePrice,
    roundTripPricePerKm,
    driverAllowance,
    nightHaltCharge
  };
  
  return updateOutstationFare(data);
};

/**
 * Update local fares with individual parameters
 */
export const updateLocalFares = async (
  vehicleId: string,
  extraKmRate: number,
  extraHourRate: number,
  packages: Array<{ hours: number; km: number; price: number; }>
): Promise<FareUpdateResponse> => {
  const data: LocalFare = {
    vehicleId,
    vehicle_id: vehicleId,
    extraKmRate,
    extraHourRate,
    packages
  };
  
  return updateLocalFare(data);
};

/**
 * Update airport fares with object or individual parameters
 */
export const updateAirportFares = async (
  vehicleId: string,
  fareData: Partial<AirportFare> | AirportFare
): Promise<FareUpdateResponse> => {
  // Ensure we have the full data structure
  const fullFareData: AirportFare = {
    vehicleId,
    vehicle_id: vehicleId,
    basePrice: fareData.basePrice || 0,
    pricePerKm: fareData.pricePerKm || 0,
    pickupPrice: fareData.pickupPrice || 0,
    dropPrice: fareData.dropPrice || 0,
    tier1Price: fareData.tier1Price || 0,
    tier2Price: fareData.tier2Price || 0,
    tier3Price: fareData.tier3Price || 0,
    tier4Price: fareData.tier4Price || 0,
    extraKmCharge: fareData.extraKmCharge || 0,
    nightCharges: fareData.nightCharges || 0,
    extraWaitingCharges: fareData.extraWaitingCharges || 0
  };
  
  return updateAirportFare(fullFareData);
};
