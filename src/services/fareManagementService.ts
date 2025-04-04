
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
        'X-Force-Refresh': 'true'
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
    
    const result = await directVehicleOperation('api/admin/airport-fares-update.php', 'POST', {
      headers: {
        'X-Admin-Mode': 'true', 
        'X-Force-Refresh': 'true'
      },
      data: dataToSend
    });

    console.log('Airport fares update response:', result);

    if (result.status === 'error') {
      throw new Error(result.message || 'Failed to update airport fares');
    }
  } catch (error) {
    console.error('Error updating airport fares:', error);
    throw error;
  }
};
