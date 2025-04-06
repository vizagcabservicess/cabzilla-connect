
import { OutstationFare } from "@/types/cab";
import { updateOutstationFares, fetchOutstationFares } from '@/services/fareManagementService';

/**
 * Get outstation fare for a specific vehicle ID
 * @param vehicleId The ID of the vehicle to get fares for
 * @returns Promise with fare data or null if not found
 */
export async function getOutstationFare(vehicleId: string): Promise<OutstationFare | null> {
  try {
    console.log(`Getting outstation fare data for vehicle ID: ${vehicleId}`);
    
    // Try to fetch from the API first
    try {
      const fares = await fetchOutstationFares(vehicleId);
      
      if (fares && fares.length > 0) {
        const fare = fares[0];
        console.log(`Received outstation fare from API:`, fare);
        
        // Convert to standard format
        return {
          baseFare: fare.baseFare || fare.base_price || fare.basePrice || 0,
          pricePerKm: fare.pricePerKm || fare.price_per_km || fare.perKmRate || 0,
          roundTripBaseFare: fare.roundTripBaseFare || fare.roundtrip_base_price || fare.roundTripBasePrice || 0,
          roundTripPricePerKm: fare.roundTripPricePerKm || fare.roundtrip_price_per_km || fare.roundTripPerKmRate || 0,
          driverAllowance: fare.driverAllowance || fare.driver_allowance || 250,
          nightHaltCharge: fare.nightHaltCharge || fare.night_halt_charge || 700,
          vehicleId: vehicleId
        };
      }
    } catch (apiError) {
      console.error(`API error when fetching outstation fare:`, apiError);
    }
    
    // If API fails, try to load from local data files
    try {
      const response = await fetch(`/data/outstation_fares/${vehicleId}.json?t=${Date.now()}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Loaded outstation fare from file:`, data);
        
        return {
          baseFare: data.baseFare || data.base_price || data.basePrice || 0,
          pricePerKm: data.pricePerKm || data.price_per_km || data.perKmRate || 0,
          roundTripBaseFare: data.roundTripBaseFare || data.roundtrip_base_price || data.roundTripBasePrice || 0,
          roundTripPricePerKm: data.roundTripPricePerKm || data.roundtrip_price_per_km || data.roundTripPerKmRate || 0,
          driverAllowance: data.driverAllowance || data.driver_allowance || 250,
          nightHaltCharge: data.nightHaltCharge || data.night_halt_charge || 700,
          vehicleId: vehicleId
        };
      } else {
        console.log(`No outstation fare file found for vehicle: ${vehicleId}`);
      }
    } catch (fileError) {
      console.error(`File error when fetching outstation fare:`, fileError);
    }
    
    // If no data found from either source, return null
    return null;
  } catch (error) {
    console.error(`Error in getOutstationFare:`, error);
    throw error;
  }
}

/**
 * Update outstation fare for a specific vehicle
 * @param vehicleId The ID of the vehicle to update fares for
 * @param fareData The fare data to update
 * @returns Promise with success status
 */
export async function updateOutstationFare(vehicleId: string, fareData: OutstationFare): Promise<{success: boolean, message?: string}> {
  try {
    console.log(`Updating outstation fare for vehicle ID: ${vehicleId}`, fareData);
    
    // Add vehicleId to the fare data
    const fullFareData = {
      vehicleId,
      vehicle_id: vehicleId,
      ...fareData
    };
    
    // Call the fare management service to update
    await updateOutstationFares(fullFareData);
    
    // Successful update
    console.log(`Outstation fare updated successfully for vehicle ID: ${vehicleId}`);
    
    // Also save to local file for fallback
    try {
      // In a real implementation this would save to the server
      // For now, we'll dispatch an event to notify listeners
      window.dispatchEvent(new CustomEvent('outstation-fares-updated', {
        detail: { vehicleId, timestamp: Date.now() }
      }));
    } catch (saveError) {
      console.warn(`Non-critical: Failed to save local file backup:`, saveError);
    }
    
    return { success: true };
  } catch (error) {
    console.error(`Error updating outstation fare:`, error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error updating outstation fare'
    };
  }
}
