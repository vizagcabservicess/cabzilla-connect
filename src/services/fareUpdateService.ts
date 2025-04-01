
import { toast } from 'sonner';
import { apiBaseUrl } from '@/config/api';
import { directVehicleOperation } from '@/utils/apiHelper';

/**
 * Update outstation fares for a specific vehicle
 */
export const updateOutstationFares = async (
  vehicleId: string,
  oneWayBasePrice: number,
  oneWayPricePerKm: number,
  roundTripBasePrice: number = 0,
  roundTripPricePerKm: number = 0,
  driverAllowance: number = 300,
  nightHaltCharge: number = 700
): Promise<any> => {
  console.log(`Updating outstation fares for vehicle ${vehicleId}`);
  
  try {
    // Use directVehicleOperation for direct API access
    const result = await directVehicleOperation('/api/admin/direct-outstation-fares.php', 'POST', {
      vehicleId,
      basePrice: oneWayBasePrice,
      pricePerKm: oneWayPricePerKm,
      roundTripBasePrice: roundTripBasePrice || oneWayBasePrice * 0.9, // Default to 90% of one-way if not specified
      roundTripPricePerKm: roundTripPricePerKm || oneWayPricePerKm * 0.85, // Default to 85% of one-way if not specified
      driverAllowance,
      nightHaltCharge
    });
    
    if (result && result.status === 'success') {
      toast.success(`Updated outstation fares for ${vehicleId}`);
      return result;
    } else {
      throw new Error(result?.message || 'Failed to update outstation fares');
    }
  } catch (error: any) {
    console.error(`Error updating outstation fares: ${error.message}`, error);
    toast.error(`Failed to update outstation fares: ${error.message}`);
    throw error;
  }
};

/**
 * Update local package fares for a specific vehicle
 */
export const updateLocalFares = async (
  vehicleId: string, 
  extraKmRate: number,
  extraHourRate: number = 0,
  packages: any[] = []
): Promise<any> => {
  console.log(`Updating local fares for vehicle ${vehicleId}`);
  
  try {
    const result = await directVehicleOperation('/api/admin/local-package-fares-update.php', 'POST', {
      vehicleId,
      extraKmRate,
      extraHourRate,
      packages: JSON.stringify(packages)
    });
    
    if (result && result.status === 'success') {
      toast.success(`Updated local fares for ${vehicleId}`);
      return result;
    } else {
      throw new Error(result?.message || 'Failed to update local fares');
    }
  } catch (error: any) {
    console.error(`Error updating local fares: ${error.message}`, error);
    toast.error(`Failed to update local fares: ${error.message}`);
    throw error;
  }
};

/**
 * Update airport transfer fares for a specific vehicle
 */
export const updateAirportFares = async (
  vehicleId: string,
  locationFares: Record<string, number>
): Promise<any> => {
  console.log(`Updating airport fares for vehicle ${vehicleId}`);
  
  try {
    const result = await directVehicleOperation('/api/admin/airport-fares-update.php', 'POST', {
      vehicleId,
      fares: locationFares
    });
    
    if (result && result.status === 'success') {
      toast.success(`Updated airport fares for ${vehicleId}`);
      return result;
    } else {
      throw new Error(result?.message || 'Failed to update airport fares');
    }
  } catch (error: any) {
    console.error(`Error updating airport fares: ${error.message}`, error);
    toast.error(`Failed to update airport fares: ${error.message}`);
    throw error;
  }
};
