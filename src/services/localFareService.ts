
import { LocalFare } from "@/types/cab";
import { updateLocalFares, fetchLocalFares } from '@/services/fareManagementService';

/**
 * Get local fare for a specific vehicle ID
 * @param vehicleId The ID of the vehicle to get fares for
 * @returns Promise with fare data or null if not found
 */
export async function getLocalFare(vehicleId: string): Promise<LocalFare | null> {
  try {
    console.log(`Getting local fare data for vehicle ID: ${vehicleId}`);
    
    // Try to fetch from the API first
    try {
      const fares = await fetchLocalFares(vehicleId);
      
      if (fares && fares.length > 0) {
        const fare = fares[0];
        console.log(`Received local fare from API:`, fare);
        
        // Convert to standard format
        return {
          price4hrs40km: fare.price4hrs40km || fare.price_4hrs_40km || fare.package4hr40km || fare.local_package_4hr || 0,
          price8hrs80km: fare.price8hrs80km || fare.price_8hrs_80km || fare.package8hr80km || fare.local_package_8hr || 0,
          price10hrs100km: fare.price10hrs100km || fare.price_10hrs_100km || fare.package10hr100km || fare.local_package_10hr || 0,
          priceExtraKm: fare.priceExtraKm || fare.price_extra_km || fare.extraKmRate || fare.extra_km_charge || 0,
          priceExtraHour: fare.priceExtraHour || fare.price_extra_hour || fare.extraHourRate || fare.extra_hour_charge || 0
        };
      }
    } catch (apiError) {
      console.error(`API error when fetching local fare:`, apiError);
    }
    
    // If API fails, try to load from local data files
    try {
      const response = await fetch(`/data/local_fares/${vehicleId}.json?t=${Date.now()}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Loaded local fare from file:`, data);
        
        return {
          price4hrs40km: data.price4hrs40km || data.price_4hrs_40km || data.package4hr40km || 0,
          price8hrs80km: data.price8hrs80km || data.price_8hrs_80km || data.package8hr80km || 0,
          price10hrs100km: data.price10hrs100km || data.price_10hrs_100km || data.package10hr100km || 0,
          priceExtraKm: data.priceExtraKm || data.price_extra_km || data.extraKmRate || 0,
          priceExtraHour: data.priceExtraHour || data.price_extra_hour || data.extraHourRate || 0
        };
      } else {
        console.log(`No local fare file found for vehicle: ${vehicleId}`);
      }
    } catch (fileError) {
      console.error(`File error when fetching local fare:`, fileError);
    }
    
    // If no data found from either source, return null
    return null;
  } catch (error) {
    console.error(`Error in getLocalFare:`, error);
    throw error;
  }
}

/**
 * Update local fare for a specific vehicle
 * @param vehicleId The ID of the vehicle to update fares for
 * @param fareData The fare data to update
 * @returns Promise with success status
 */
export async function updateLocalFare(vehicleId: string, fareData: LocalFare): Promise<{success: boolean, message?: string}> {
  try {
    console.log(`Updating local fare for vehicle ID: ${vehicleId}`, fareData);
    
    // Add vehicleId to the fare data
    const fullFareData = {
      vehicleId,
      vehicle_id: vehicleId,
      ...fareData
    };
    
    // Call the fare management service to update
    await updateLocalFares(fullFareData);
    
    // Successful update
    console.log(`Local fare updated successfully for vehicle ID: ${vehicleId}`);
    
    // Also save to local file for fallback
    try {
      // In a real implementation this would save to the server
      // For now, we'll dispatch an event to notify listeners
      window.dispatchEvent(new CustomEvent('local-fares-updated', {
        detail: { vehicleId, timestamp: Date.now() }
      }));
    } catch (saveError) {
      console.warn(`Non-critical: Failed to save local file backup:`, saveError);
    }
    
    return { success: true };
  } catch (error) {
    console.error(`Error updating local fare:`, error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error updating local fare'
    };
  }
}
