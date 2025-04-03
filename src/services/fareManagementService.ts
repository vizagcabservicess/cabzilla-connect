
import { apiBaseUrl } from '@/config/api';

export interface FareData {
  vehicleId: string;
  basePrice: number;
  pricePerKm: number;
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
}

export const fetchLocalFares = async (vehicleId?: string): Promise<FareData[]> => {
  try {
    const url = `${apiBaseUrl}/api/admin/direct-local-fares.php${vehicleId ? `?vehicle_id=${vehicleId}` : ''}`;
    const response = await fetch(url, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache',
        'X-Force-Refresh': 'true'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Local fares response:', data);
    
    return data.fares || [];
  } catch (error) {
    console.error('Error fetching local fares:', error);
    throw error;
  }
};

export const fetchAirportFares = async (vehicleId?: string): Promise<FareData[]> => {
  try {
    const url = `${apiBaseUrl}/api/admin/direct-airport-fares.php${vehicleId ? `?vehicle_id=${vehicleId}` : ''}`;
    const response = await fetch(url, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache',
        'X-Force-Refresh': 'true'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Airport fares response:', data);
    
    return data.fares || [];
  } catch (error) {
    console.error('Error fetching airport fares:', error);
    throw error;
  }
};

export const updateLocalFares = async (fareData: FareData): Promise<void> => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/admin/local-fares-update.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Force-Refresh': 'true'
      },
      body: JSON.stringify(fareData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
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
    const response = await fetch(`${apiBaseUrl}/api/admin/airport-fares-update.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Force-Refresh': 'true'
      },
      body: JSON.stringify(fareData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Airport fares update response:', result);

    if (result.status === 'error') {
      throw new Error(result.message || 'Failed to update airport fares');
    }
  } catch (error) {
    console.error('Error updating airport fares:', error);
    throw error;
  }
};
