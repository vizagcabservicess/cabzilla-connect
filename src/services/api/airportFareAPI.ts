
import axios from 'axios';
import { getApiUrl, forceRefreshHeaders } from '@/config/api';

export interface AirportFare {
  id?: number;
  vehicleId: string;
  vehicle_id: string;
  name?: string;
  basePrice: number;
  pricePerKm: number;
  pickupPrice: number;
  dropPrice: number;
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier4Price: number;
  extraKmCharge: number;
}

export interface FareResponse {
  status: string;
  message: string;
  count?: number;
  fares?: AirportFare[];
  timestamp?: number;
}

const parseNumericValue = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const normalizeFare = (fare: any): AirportFare => {
  return {
    id: fare.id ? Number(fare.id) : undefined,
    vehicleId: fare.vehicleId || fare.vehicle_id || '',
    vehicle_id: fare.vehicleId || fare.vehicle_id || '',
    name: fare.name || '',
    basePrice: parseNumericValue(fare.basePrice || fare.base_price),
    pricePerKm: parseNumericValue(fare.pricePerKm || fare.price_per_km),
    pickupPrice: parseNumericValue(fare.pickupPrice || fare.pickup_price),
    dropPrice: parseNumericValue(fare.dropPrice || fare.drop_price),
    tier1Price: parseNumericValue(fare.tier1Price || fare.tier1_price),
    tier2Price: parseNumericValue(fare.tier2Price || fare.tier2_price),
    tier3Price: parseNumericValue(fare.tier3Price || fare.tier3_price),
    tier4Price: parseNumericValue(fare.tier4Price || fare.tier4_price),
    extraKmCharge: parseNumericValue(fare.extraKmCharge || fare.extra_km_charge),
  };
};

// Create default fare for a vehicle if needed
const createDefaultFare = (vehicleId: string): AirportFare => {
  return {
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
  };
};

// Helper function to safely parse JSON from a possibly string response
const safelyParseJson = (data: any): any => {
  if (data === null || data === undefined) {
    return null;
  }
  
  if (typeof data === 'object') {
    return data;
  }
  
  if (typeof data === 'string') {
    try {
      // Try to find the beginning and end of the JSON object in the string
      const jsonStart = data.indexOf('{');
      const jsonEnd = data.lastIndexOf('}');
      
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        // Extract what looks like JSON
        const jsonString = data.substring(jsonStart, jsonEnd + 1);
        return JSON.parse(jsonString);
      } else {
        // Try parsing the whole string
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to parse response as JSON', error);
      console.log('First 200 chars of invalid response:', data.substring(0, 200));
      return null;
    }
  }
  
  return null;
};

export const airportFareAPI = {
  /**
   * Get all airport fares or specific fare for a vehicle
   */
  getAirportFares: async (vehicleId?: string): Promise<AirportFare[]> => {
    try {
      console.log(`Getting airport fares for vehicle: ${vehicleId || 'all'}`);
      
      // Add cache-busting parameters
      const timestamp = Date.now();
      const cacheBuster = Math.random().toString(36).substring(2, 15);
      
      const params: Record<string, string> = {
        _t: timestamp.toString(),
        _cb: cacheBuster
      };
      
      // Add vehicle ID if specified
      if (vehicleId) {
        params.vehicleId = vehicleId;
        params.vehicle_id = vehicleId;
        params.id = vehicleId;
      }
      
      // Use optimized endpoint path
      const endpoint = vehicleId 
        ? `api/admin/direct-airport-fares.php?id=${encodeURIComponent(vehicleId)}`
        : 'api/admin/direct-airport-fares.php';
      
      const response = await axios.get(getApiUrl(endpoint), {
        params,
        headers: {
          ...forceRefreshHeaders,
          'X-Admin-Mode': 'true',
          'X-Debug': 'true',
          'Accept': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        // Set a low timeout to prevent long waits for failed requests
        timeout: 10000,
        // Explicitly tell axios to parse as JSON
        responseType: 'json',
        // Ensure axios doesn't try to parse the response automatically if it's not valid JSON
        transformResponse: [(data) => {
          return safelyParseJson(data);
        }]
      });
      
      console.log('Airport fares raw API response:', response);
      
      // Check if the response is valid
      if (!response.data) {
        console.error('Empty response data');
        throw new Error('Empty response data');
      }
      
      // Extract fares from the response based on various possible formats
      let fares: AirportFare[] = [];
      const data = response.data;
      
      if (data.fares && Array.isArray(data.fares)) {
        fares = data.fares.map(normalizeFare);
      } else if (data.data && Array.isArray(data.data)) {
        fares = data.data.map(normalizeFare);
      } else if (data.data && data.data.fares && Array.isArray(data.data.fares)) {
        fares = data.data.fares.map(normalizeFare);
      } else if (typeof data === 'object' && !Array.isArray(data)) {
        // Try to find any array property that might contain fares
        const arrayProps = Object.keys(data).filter(key => Array.isArray(data[key]));
        if (arrayProps.length > 0) {
          // Use the first array property found
          fares = data[arrayProps[0]].map(normalizeFare);
        } else {
          console.error('No arrays found in response data:', data);
        }
      } else {
        console.error('Could not find fares array in response:', data);
      }
      
      // Return default fare if no fares found and vehicleId is specified
      if (fares.length === 0 && vehicleId) {
        console.log(`No fares found for ${vehicleId}, returning default`);
        return [createDefaultFare(vehicleId)];
      }
      
      // Filter for specific vehicle if requested
      if (vehicleId && fares.length > 0) {
        const filteredFares = fares.filter(fare => 
          fare.vehicleId?.toLowerCase() === vehicleId.toLowerCase() || 
          fare.vehicle_id?.toLowerCase() === vehicleId.toLowerCase()
        );
        
        if (filteredFares.length > 0) {
          return filteredFares;
        }
        
        // Return default if no matching fare found
        return [createDefaultFare(vehicleId)];
      }
      
      return fares;
    } catch (error) {
      console.error('Error getting airport fares:', error);
      
      // Return a default fare if vehicleId is specified
      if (vehicleId) {
        return [createDefaultFare(vehicleId)];
      }
      throw error;
    }
  },
  
  /**
   * Update airport fare for a vehicle
   */
  updateAirportFare: async (fare: AirportFare): Promise<FareResponse> => {
    try {
      console.log('Updating airport fare:', fare);
      
      if (!fare.vehicleId && !fare.vehicle_id) {
        throw new Error('Vehicle ID is required');
      }
      
      // Ensure both vehicle ID formats are present
      const updatedFare = {
        ...fare,
        vehicleId: fare.vehicleId || fare.vehicle_id,
        vehicle_id: fare.vehicle_id || fare.vehicleId
      };
      
      const response = await axios.post(
        getApiUrl('api/admin/airport-fares-update.php'),
        updatedFare,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...forceRefreshHeaders,
            'X-Admin-Mode': 'true',
            'X-Debug': 'true'
          },
          transformResponse: [(data) => {
            return safelyParseJson(data);
          }]
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error updating airport fare:', error);
      throw error;
    }
  },
  
  /**
   * Sync airport fares across tables
   */
  syncAirportFares: async (): Promise<FareResponse> => {
    try {
      console.log('Syncing airport fares tables');
      
      // Add cache-busting parameters
      const timestamp = Date.now();
      
      const response = await axios.get(
        `${getApiUrl('api/admin/sync-airport-fares.php')}?_t=${timestamp}`,
        {
          headers: {
            ...forceRefreshHeaders,
            'Accept': 'application/json',
            'X-Admin-Mode': 'true',
            'X-Debug': 'true'
          },
          transformResponse: [(data) => {
            return safelyParseJson(data);
          }]
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error syncing airport fares:', error);
      throw error;
    }
  }
};
