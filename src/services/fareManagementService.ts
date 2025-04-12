import axios from 'axios';

export interface FareData {
  vehicleId?: string;
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
  [key: string]: any;
}

// Ensure these functions have the correct number of parameters
export const fetchAirportFares = async (vehicleId: string): Promise<any> => {
  try {
    const timestamp = new Date().getTime();
    const response = await axios.get(`/api/direct-airport-fares.php?vehicleId=${vehicleId}&_t=${timestamp}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Force-Refresh': 'true'
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching airport fares:", error);
    throw error;
  }
};

export const updateAirportFares = async (fareData: FareData): Promise<any> => {
  try {
    const timestamp = new Date().getTime();
    const response = await axios.post(`/api/direct-airport-fares.php?_t=${timestamp}`, fareData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Force-Refresh': 'true'
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error updating airport fares:", error);
    throw error;
  }
};

export const syncAirportFares = async (): Promise<any> => {
  try {
    const timestamp = new Date().getTime();
    const response = await axios.get(`/api/admin/sync-airport-fares.php?_t=${timestamp}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Force-Refresh': 'true',
        'X-Admin-Mode': 'true'
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error syncing airport fares:", error);
    throw error;
  }
};
