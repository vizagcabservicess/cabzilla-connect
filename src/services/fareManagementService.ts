
import { directVehicleOperation } from '@/utils/apiHelper';
import { getApiUrl } from '@/config/api';

export interface FareData {
  vehicleId: string;
  basePrice?: number;
  pricePerKm?: number;
  pickupPrice?: number;
  dropPrice?: number;
  tier1Price?: number;
  tier2Price?: number;
  tier3Price?: number;
  tier4Price?: number;
  extraKmCharge?: number;
  price4hrs40km?: number;
  price8hrs80km?: number;
  price10hrs100km?: number;
  priceExtraHour?: number;
  // Airport specific fields
  priceOneWay?: number;
  priceRoundTrip?: number;
  nightCharges?: number;
  extraWaitingCharges?: number;
}

export const fetchLocalFares = async (vehicleId?: string): Promise<FareData[]> => {
  try {
    const endpoint = `api/admin/direct-local-fares.php${vehicleId ? `?vehicle_id=${vehicleId}` : ''}`;
    const result = await directVehicleOperation(endpoint, 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

    console.log('Local fares response:', result);
    
    return result.fares || [];
  } catch (error) {
    console.error('Error fetching local fares:', error);
    throw error;
  }
};

export const fetchAirportFares = async (vehicleId?: string): Promise<FareData[]> => {
  try {
    const endpoint = `api/admin/direct-airport-fares.php${vehicleId ? `?vehicle_id=${vehicleId}` : ''}`;
    const result = await directVehicleOperation(endpoint, 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

    console.log('Airport fares response:', result);
    
    return result.fares || [];
  } catch (error) {
    console.error('Error fetching airport fares:', error);
    throw error;
  }
};

export const updateLocalFares = async (fareData: FareData): Promise<void> => {
  try {
    console.log('Updating local fares with data:', fareData);
    
    const result = await directVehicleOperation('api/admin/local-fares-update.php', 'POST', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Content-Type': 'application/json'
      },
      data: fareData
    });

    console.log('Local fares update response:', result);

    if (result.status === 'error') {
      throw new Error(result.message || 'Failed to update local fares');
    }
  } catch (error) {
    console.error('Error updating local fares:', error);
    throw error;
  }
};

export const updateAirportFares = async (fareData: FareData): Promise<void> => {
  try {
    console.log('Updating airport fares with data:', fareData);
    
    // Ensure we have both field formats (for compatibility with different backends)
    const dataToSend = {
      ...fareData,
      vehicleId: fareData.vehicleId,
      vehicle_id: fareData.vehicleId
    };
    
    console.log('Data being sent to API:', JSON.stringify(dataToSend));
    
    const result = await directVehicleOperation('api/admin/airport-fares-update.php', 'POST', {
      headers: {
        'X-Admin-Mode': 'true', 
        'X-Force-Refresh': 'true',
        'Content-Type': 'application/json'
      },
      data: dataToSend
    });

    console.log('Airport fares update response:', result);

    if (result.status === 'error') {
      throw new Error(result.message || 'Failed to update airport fares');
    }
    
    // Trigger a sync after updating fares
    try {
      await syncAirportFares();
    } catch (syncError) {
      console.warn('Warning: Airport fare sync failed after update:', syncError);
      // Continue anyway, the update was successful
    }
  } catch (error) {
    console.error('Error updating airport fares:', error);
    throw error;
  }
};

export const syncLocalFares = async (): Promise<any> => {
  try {
    const result = await directVehicleOperation('api/admin/sync-local-fares.php', 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true'
      }
    });
    
    console.log('Local fares sync response:', result);
    return result;
  } catch (error) {
    console.error('Error syncing local fares:', error);
    throw error;
  }
};

export const syncAirportFares = async (): Promise<any> => {
  try {
    const result = await directVehicleOperation('api/admin/sync-airport-fares.php', 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true'
      }
    });
    
    console.log('Airport fares sync response:', result);
    return result;
  } catch (error) {
    console.error('Error syncing airport fares:', error);
    throw error;
  }
};
