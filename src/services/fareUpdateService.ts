
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
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Mode': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(data)
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
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Mode': 'true',
          'X-Force-Creation': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(fareData)
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
 * Sync airport fares from vehicle data
 */
export const syncAirportFares = async (applyDefaults: boolean = true): Promise<boolean> => {
  try {
    console.log('Syncing airport fares with applyDefaults =', applyDefaults);
    
    const response = await directVehicleOperation(
      'api/airport-fares-sync.php', 
      'POST',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Mode': 'true',
          'X-Force-Creation': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({ applyDefaults })
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
