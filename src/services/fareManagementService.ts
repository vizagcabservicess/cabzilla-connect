
import axios from 'axios';

export interface FareData {
  vehicleId?: string;
  vehicle_id?: string;
  // Make all these properties optional with '?'
  basePrice?: number;
  pricePerKm?: number;
  pickupPrice?: number;
  dropPrice?: number;
  tier1Price?: number;
  tier2Price?: number;
  tier3Price?: number;
  tier4Price?: number;
  extraKmCharge?: number;
  // Local fare fields
  price4hrs40km?: number;
  price8hrs80km?: number;
  price10hrs100km?: number;
  priceExtraKm?: number;
  priceExtraHour?: number;
  // Airport fare fields
  priceOneWay?: number;
  priceRoundTrip?: number;
  nightCharges?: number;
  extraWaitingCharges?: number;
  [key: string]: any;
}

// Function to add timestamp and cache-busting headers to requests
const getRequestConfig = () => ({
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Force-Refresh': 'true'
  },
  params: {
    _t: new Date().getTime()
  }
});

// Function to initialize database tables
export const initializeDatabaseTables = async (): Promise<boolean> => {
  try {
    const timestamp = new Date().getTime();
    const localTablesResponse = await axios.get(`/api/direct-local-fares.php?initialize=true&_t=${timestamp}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Force-Refresh': 'true'
      }
    });
    
    const airportTablesResponse = await axios.get(`/api/direct-airport-fares.php?initialize=true&_t=${timestamp}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Force-Refresh': 'true'
      }
    });
    
    return (
      localTablesResponse.data?.status === 'success' && 
      airportTablesResponse.data?.status === 'success'
    );
  } catch (error) {
    console.error("Error initializing database tables:", error);
    return false;
  }
};

// LOCAL FARES FUNCTIONS
export const fetchLocalFares = async (vehicleId: string): Promise<any[]> => {
  try {
    const timestamp = new Date().getTime();
    const response = await axios.get(`/api/direct-local-fares.php?vehicleId=${vehicleId}&_t=${timestamp}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Force-Refresh': 'true'
      }
    });
    
    if (response.data && response.data.fares && Array.isArray(response.data.fares)) {
      return response.data.fares;
    } else if (response.data && response.data.fares && typeof response.data.fares === 'object') {
      // Convert object to array if needed
      return Object.values(response.data.fares);
    }
    
    return [];
  } catch (error) {
    console.error("Error fetching local fares:", error);
    throw error;
  }
};

export const updateLocalFares = async (fareData: FareData): Promise<any> => {
  try {
    // Create a complete data object with default values for required fields in API
    const completeData: FareData = {
      ...fareData,
      // Add defaults for any missing required fields
      basePrice: fareData.basePrice ?? 0,
      pricePerKm: fareData.pricePerKm ?? 0,
      pickupPrice: fareData.pickupPrice ?? 0,
      dropPrice: fareData.dropPrice ?? 0,
      tier1Price: fareData.tier1Price ?? 0,
      tier2Price: fareData.tier2Price ?? 0,
      tier3Price: fareData.tier3Price ?? 0,
      tier4Price: fareData.tier4Price ?? 0,
      extraKmCharge: fareData.extraKmCharge ?? 0
    };
    
    const timestamp = new Date().getTime();
    const response = await axios.post(`/api/direct-local-fares.php?_t=${timestamp}`, completeData, {
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
    console.error("Error updating local fares:", error);
    throw error;
  }
};

export const syncLocalFares = async (): Promise<any> => {
  try {
    const timestamp = new Date().getTime();
    const response = await axios.get(`/api/admin/sync-local-fares.php?_t=${timestamp}`, {
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
    console.error("Error syncing local fares:", error);
    throw error;
  }
};

// AIRPORT FARES FUNCTIONS
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
    // Create a complete data object with default values for required fields
    const completeData: FareData = {
      ...fareData,
      // Add defaults for any missing required fields
      basePrice: fareData.basePrice ?? 0,
      pricePerKm: fareData.pricePerKm ?? 0,
      extraKmCharge: fareData.extraKmCharge ?? 0
    };
    
    const timestamp = new Date().getTime();
    const response = await axios.post(`/api/direct-airport-fares.php?_t=${timestamp}`, completeData, {
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
