import axios from 'axios';
import { getApiUrl, forceRefreshHeaders } from '@/config/api';

export interface FareData {
  [key: string]: any;
  vehicleId?: string;
  vehicle_id?: string;
  basePrice?: number;
  pricePerKm?: number;
  pickupPrice?: number;
  dropPrice?: number;
  tier1Price?: number;
  tier2Price?: number;
  tier3Price?: number;
  tier4Price?: number;
  extraKmCharge?: number;
  // Local package fares
  price4hrs40km?: number;
  price8hrs80km?: number;
  price10hrs100km?: number;
  priceExtraKm?: number;
  priceExtraHour?: number;
}

// Function to parse numeric values safely
export const parseNumericValue = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export const normalizeResponse = (response: any): FareData[] => {
  // If response is already an array of fares, return it
  if (Array.isArray(response)) {
    return response;
  }

  let fares: FareData[] = [];

  // Check for various response formats
  if (response.fares) {
    if (Array.isArray(response.fares)) {
      fares = response.fares;
    } else if (typeof response.fares === 'object') {
      fares = Object.values(response.fares);
    }
  } else if (response.data && response.data.fares) {
    if (Array.isArray(response.data.fares)) {
      fares = response.data.fares;
    } else if (typeof response.data.fares === 'object') {
      fares = Object.values(response.data.fares);
    }
  }

  return fares;
};

export const fetchAirportFares = async (vehicleId?: string): Promise<FareData[]> => {
  try {
    console.log(`Fetching airport fares for vehicle ${vehicleId || 'all'}`);
    
    const params: Record<string, string> = {};
    if (vehicleId) {
      params.vehicleId = vehicleId;
    }
    
    // Add timestamp to bust cache
    params._t = Date.now().toString();

    const response = await axios.get(getApiUrl('api/admin/direct-airport-fares'), {
      params,
      headers: {
        ...forceRefreshHeaders,
        'X-Admin-Mode': 'true',
        'X-Debug': 'true'
      }
    });

    console.log('Airport fares API response:', response.data);

    if (response.data && (response.data.status === 'success' || response.data.fares)) {
      return normalizeResponse(response.data);
    } else {
      console.error('Invalid airport fares response format:', response.data);
      throw new Error('Invalid response format from airport fares API');
    }
  } catch (error) {
    console.error('Error fetching airport fares:', error);
    throw error;
  }
};

export const updateAirportFares = async (fareData: FareData): Promise<any> => {
  try {
    console.log('Updating airport fares:', fareData);
    
    // Ensure we have a vehicle ID
    if (!fareData.vehicleId && !fareData.vehicle_id) {
      throw new Error('Vehicle ID is required to update fares');
    }
    
    const vehicleId = fareData.vehicleId || fareData.vehicle_id;
    
    // Use direct API endpoint for updating
    const response = await axios.post(
      getApiUrl('api/admin/airport-fares-update'),
      {
        ...fareData,
        vehicleId,
        vehicle_id: vehicleId,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...forceRefreshHeaders,
          'X-Admin-Mode': 'true',
          'X-Debug': 'true'
        }
      }
    );
    
    console.log('Airport fares update response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('Error updating airport fares:', error);
    throw error;
  }
};

// Sync airport fares between tables
export const syncAirportFares = async (): Promise<any> => {
  try {
    const timestamp = Date.now();
    const response = await axios.get(
      `${getApiUrl('api/admin/sync-fares')}?type=airport&_t=${timestamp}`,
      {
        headers: {
          ...forceRefreshHeaders,
          'X-Admin-Mode': 'true',
          'X-Debug': 'true'
        }
      }
    );
    
    console.log('Sync airport fares response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error syncing airport fares:', error);
    throw error;
  }
};

// Fetch local package fares
export const fetchLocalFares = async (vehicleId?: string): Promise<FareData[]> => {
  try {
    console.log(`Fetching local fares for vehicle ${vehicleId || 'all'}`);
    
    const params: Record<string, string> = {};
    if (vehicleId) {
      params.vehicleId = vehicleId;
    }
    
    // Add timestamp to bust cache
    params._t = Date.now().toString();

    const response = await axios.get(getApiUrl('api/admin/direct-local-fares'), {
      params,
      headers: {
        ...forceRefreshHeaders,
        'X-Admin-Mode': 'true',
        'X-Debug': 'true'
      }
    });

    console.log('Local fares API response:', response.data);

    if (response.data && (response.data.status === 'success' || response.data.fares)) {
      return normalizeResponse(response.data);
    } else {
      console.error('Invalid local fares response format:', response.data);
      throw new Error('Invalid response format from local fares API');
    }
  } catch (error) {
    console.error('Error fetching local fares:', error);
    throw error;
  }
};

// Update local package fares
export const updateLocalFares = async (fareData: FareData): Promise<any> => {
  try {
    console.log('Updating local fares:', fareData);
    
    // Ensure we have a vehicle ID
    if (!fareData.vehicleId && !fareData.vehicle_id) {
      throw new Error('Vehicle ID is required to update fares');
    }
    
    const vehicleId = fareData.vehicleId || fareData.vehicle_id;
    
    // Use direct API endpoint for updating
    const response = await axios.post(
      getApiUrl('api/admin/local-fares-update'),
      {
        ...fareData,
        vehicleId,
        vehicle_id: vehicleId,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...forceRefreshHeaders,
          'X-Admin-Mode': 'true',
          'X-Debug': 'true'
        }
      }
    );
    
    console.log('Local fares update response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('Error updating local fares:', error);
    throw error;
  }
};

// Sync local package fares between tables
export const syncLocalFares = async (): Promise<any> => {
  try {
    const timestamp = Date.now();
    const response = await axios.get(
      `${getApiUrl('api/admin/sync-fares')}?type=local&_t=${timestamp}`,
      {
        headers: {
          ...forceRefreshHeaders,
          'X-Admin-Mode': 'true',
          'X-Debug': 'true'
        }
      }
    );
    
    console.log('Sync local fares response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error syncing local fares:', error);
    throw error;
  }
};

// Initialize database tables
export const initializeDatabaseTables = async (): Promise<boolean> => {
  try {
    const timestamp = Date.now();
    const response = await axios.get(
      `${getApiUrl('api/admin/db-setup')}?_t=${timestamp}`,
      {
        headers: {
          ...forceRefreshHeaders,
          'X-Admin-Mode': 'true',
          'X-Debug': 'true'
        }
      }
    );
    
    console.log('Database initialization response:', response.data);
    return response.data && response.data.status === 'success';
  } catch (error) {
    console.error('Error initializing database tables:', error);
    return false;
  }
};
