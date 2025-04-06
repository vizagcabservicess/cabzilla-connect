
import { AirportFare, LocalFare, OutstationFare } from "@/types/cab";

/**
 * Fetch airport fares from the API
 * @param vehicleId Vehicle ID to fetch fares for
 * @returns Promise with array of airport fares
 */
export async function fetchAirportFares(vehicleId: string): Promise<AirportFare[]> {
  try {
    const response = await fetch(`/api/airport-fares?vehicleId=${vehicleId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch airport fares: ${response.statusText}`);
    }
    const data = await response.json();
    return data.fares || [];
  } catch (error) {
    console.error("Error fetching airport fares:", error);
    throw error;
  }
}

/**
 * Update airport fares in the API
 * @param fareData Airport fare data to update
 * @returns Promise with API response
 */
export async function updateAirportFares(fareData: AirportFare): Promise<any> {
  try {
    const response = await fetch('/api/airport-fares-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fareData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update airport fares: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error updating airport fares:", error);
    throw error;
  }
}

/**
 * Fetch local fares from the API
 * @param vehicleId Vehicle ID to fetch fares for
 * @returns Promise with array of local fares
 */
export async function fetchLocalFares(vehicleId: string): Promise<any[]> {
  try {
    const response = await fetch(`/api/local-fares?vehicleId=${vehicleId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch local fares: ${response.statusText}`);
    }
    const data = await response.json();
    return data.fares || [];
  } catch (error) {
    console.error("Error fetching local fares:", error);
    throw error;
  }
}

/**
 * Update local fares in the API
 * @param fareData Local fare data to update
 * @returns Promise with API response
 */
export async function updateLocalFares(fareData: any): Promise<any> {
  try {
    const response = await fetch('/api/local-fares-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fareData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update local fares: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error updating local fares:", error);
    throw error;
  }
}

/**
 * Fetch outstation fares from the API
 * @param vehicleId Vehicle ID to fetch fares for
 * @returns Promise with array of outstation fares
 */
export async function fetchOutstationFares(vehicleId: string): Promise<any[]> {
  try {
    const response = await fetch(`/api/outstation-fares?vehicleId=${vehicleId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch outstation fares: ${response.statusText}`);
    }
    const data = await response.json();
    return data.fares || [];
  } catch (error) {
    console.error("Error fetching outstation fares:", error);
    throw error;
  }
}

/**
 * Update outstation fares in the API
 * @param fareData Outstation fare data to update
 * @returns Promise with API response
 */
export async function updateOutstationFares(fareData: any): Promise<any> {
  try {
    const response = await fetch('/api/outstation-fares-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fareData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update outstation fares: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error updating outstation fares:", error);
    throw error;
  }
}
