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
    return response.map(fare => ({
      ...fare,
      basePrice: parseNumericValue(fare.basePrice || fare.base_price),
      pricePerKm: parseNumericValue(fare.pricePerKm || fare.price_per_km),
      pickupPrice: parseNumericValue(fare.pickupPrice || fare.pickup_price),
      dropPrice: parseNumericValue(fare.dropPrice || fare.drop_price),
      tier1Price: parseNumericValue(fare.tier1Price || fare.tier1_price),
      tier2Price: parseNumericValue(fare.tier2Price || fare.tier2_price),
      tier3Price: parseNumericValue(fare.tier3Price || fare.tier3_price),
      tier4Price: parseNumericValue(fare.tier4Price || fare.tier4_price),
      extraKmCharge: parseNumericValue(fare.extraKmCharge || fare.extra_km_charge),
    }));
  }

  let fares: FareData[] = [];

  try {
    console.log("Raw response to normalize:", JSON.stringify(response));
    
    // Check for various response formats
    if (response?.fares) {
      if (Array.isArray(response.fares)) {
        fares = response.fares;
      } else if (typeof response.fares === 'object' && response.fares !== null) {
        fares = Object.values(response.fares);
      }
    } else if (response?.data?.fares) {
      if (Array.isArray(response.data.fares)) {
        fares = response.data.fares;
      } else if (typeof response.data.fares === 'object' && response.data.fares !== null) {
        fares = Object.values(response.data.fares);
      }
    } else if (response?.data && Array.isArray(response.data)) {
      fares = response.data;
    }
    
    // If still no fares found but we have vehicles array
    if (fares.length === 0 && response?.vehicles && Array.isArray(response.vehicles)) {
      fares = response.vehicles.map(vehicle => ({
        vehicleId: vehicle.vehicleId || vehicle.id,
        vehicle_id: vehicle.vehicleId || vehicle.id,
        basePrice: 0,
        pricePerKm: 0,
        pickupPrice: 0,
        dropPrice: 0,
        tier1Price: 0,
        tier2Price: 0,
        tier3Price: 0,
        tier4Price: 0,
        extraKmCharge: 0
      }));
    }
    
    console.log(`Normalized ${fares.length} fares from response`);
    
    // Normalize each fare object to ensure all properties exist
    return fares.map(fare => ({
      ...fare,
      vehicleId: fare.vehicleId || fare.vehicle_id,
      vehicle_id: fare.vehicleId || fare.vehicle_id,
      basePrice: parseNumericValue(fare.basePrice || fare.base_price),
      pricePerKm: parseNumericValue(fare.pricePerKm || fare.price_per_km),
      pickupPrice: parseNumericValue(fare.pickupPrice || fare.pickup_price),
      dropPrice: parseNumericValue(fare.dropPrice || fare.drop_price),
      tier1Price: parseNumericValue(fare.tier1Price || fare.tier1_price),
      tier2Price: parseNumericValue(fare.tier2Price || fare.tier2_price),
      tier3Price: parseNumericValue(fare.tier3Price || fare.tier3_price),
      tier4Price: parseNumericValue(fare.tier4Price || fare.tier4_price),
      extraKmCharge: parseNumericValue(fare.extraKmCharge || fare.extra_km_charge),
    }));
  } catch (error) {
    console.error('Error normalizing fares response:', error);
    return [];
  }
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
    params._cb = Math.random().toString(36).substring(2, 15); // Add cache buster

    const response = await axios.get(getApiUrl('api/admin/direct-airport-fares'), {
      params,
      headers: {
        ...forceRefreshHeaders,
        'X-Admin-Mode': 'true',
        'X-Debug': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    console.log('Airport fares API raw response:', response);
    console.log('Airport fares API response data:', response.data);
    
    // Basic response validation
    if (!response.data) {
      console.error('Empty response from airport fares API');
      throw new Error('Empty response from airport fares API');
    }

    // New improved response handling logic
    let normalizedFares: FareData[] = [];
    
    try {
      // Try to normalize with our standard function
      normalizedFares = normalizeResponse(response.data);
      
      if (normalizedFares.length === 0) {
        console.warn('Could not find standard fare format, checking for alternative formats');
        
        // Alternative format handling
        if (typeof response.data === 'object') {
          if (response.data.vehicles && Array.isArray(response.data.vehicles)) {
            console.log('Found vehicles array in response');
            // Extract from vehicles data
            normalizedFares = response.data.vehicles.map((v: any) => ({
              vehicleId: v.vehicleId || v.vehicle_id || v.id,
              vehicle_id: v.vehicleId || v.vehicle_id || v.id,
              basePrice: parseNumericValue(v.basePrice || v.base_price || 0),
              pricePerKm: parseNumericValue(v.pricePerKm || v.price_per_km || 0),
              pickupPrice: parseNumericValue(v.pickupPrice || v.pickup_price || 0),
              dropPrice: parseNumericValue(v.dropPrice || v.drop_price || 0),
              tier1Price: parseNumericValue(v.tier1Price || v.tier1_price || 0),
              tier2Price: parseNumericValue(v.tier2Price || v.tier2_price || 0),
              tier3Price: parseNumericValue(v.tier3Price || v.tier3_price || 0), 
              tier4Price: parseNumericValue(v.tier4Price || v.tier4_price || 0),
              extraKmCharge: parseNumericValue(v.extraKmCharge || v.extra_km_charge || 0)
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error during response normalization:', error);
    }
      
    if (normalizedFares.length === 0 && vehicleId) {
      // Create a default fare if nothing was returned but we have a vehicle ID
      console.log('Creating default fare for vehicle:', vehicleId);
      return [{
        vehicleId,
        vehicle_id: vehicleId,
        basePrice: 0,
        pricePerKm: 0,
        pickupPrice: 0,
        dropPrice: 0,
        tier1Price: 0,
        tier2Price: 0,
        tier3Price: 0,
        tier4Price: 0,
        extraKmCharge: 0
      }];
    }
      
    // Filter for requested vehicle if we have a specific ID
    if (vehicleId && normalizedFares.length > 0) {
      const vehicleSpecificFares = normalizedFares.filter(fare => 
        (fare.vehicleId?.toString().toLowerCase() === vehicleId.toLowerCase()) || 
        (fare.vehicle_id?.toString().toLowerCase() === vehicleId.toLowerCase())
      );
      
      if (vehicleSpecificFares.length > 0) {
        return vehicleSpecificFares;
      }
      
      // If we couldn't find the specific vehicle in the normalized fares,
      // create a default entry for it
      return [{
        vehicleId,
        vehicle_id: vehicleId,
        basePrice: 0,
        pricePerKm: 0,
        pickupPrice: 0,
        dropPrice: 0,
        tier1Price: 0,
        tier2Price: 0,
        tier3Price: 0,
        tier4Price: 0,
        extraKmCharge: 0
      }];
    }
    
    return normalizedFares;
  } catch (error) {
    console.error('Error fetching airport fares:', error);
    if (vehicleId) {
      // Return a default fare for the vehicle ID if there was an error
      return [{
        vehicleId,
        vehicle_id: vehicleId,
        basePrice: 0,
        pricePerKm: 0,
        pickupPrice: 0,
        dropPrice: 0,
        tier1Price: 0,
        tier2Price: 0,
        tier3Price: 0,
        tier4Price: 0,
        extraKmCharge: 0
      }];
    }
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
