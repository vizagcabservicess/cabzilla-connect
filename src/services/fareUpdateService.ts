
import { directVehicleOperation } from '@/utils/apiHelper';
import { toast } from 'sonner';

interface OutstationFare {
  vehicleId: string;
  vehicle_id: string;
  basePrice: number;
  pricePerKm: number;
  roundTripBasePrice: number;
  roundTripPricePerKm: number;
  driverAllowance: number;
  nightHaltCharge: number;
}

interface LocalPackage {
  hours: number;
  km: number;
  price: number;
}

interface LocalFare {
  vehicleId: string;
  vehicle_id: string;
  extraKmRate: number;
  extraHourRate: number;
  packages: LocalPackage[];
}

interface AirportFare {
  vehicleId: string;
  vehicle_id: string;
  id?: string;
  basePrice: number;
  pricePerKm: number;
  pickupPrice: number;
  dropPrice: number;
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier4Price: number;
  extraKmCharge: number;
  nightCharges: number;
  extraWaitingCharges: number;
  [key: string]: any;
}

export async function getAllOutstationFares(): Promise<Record<string, any>> {
  try {
    const results = await directVehicleOperation('/api/admin/direct-outstation-fares.php', 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true'
      }
    });
    
    const fares: Record<string, any> = {};
    
    if (results && results.fares && Array.isArray(results.fares)) {
      results.fares.forEach((fare: any) => {
        const id = fare.vehicleId || fare.vehicle_id;
        if (id) {
          fares[id] = fare;
        }
      });
    }
    
    return fares;
  } catch (error) {
    console.error('Error fetching outstation fares:', error);
    return {};
  }
}

export async function getAllLocalFares(): Promise<Record<string, any>> {
  try {
    const results = await directVehicleOperation('/api/admin/direct-local-fares.php', 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true'
      }
    });
    
    const fares: Record<string, any> = {};
    
    if (results && results.fares && Array.isArray(results.fares)) {
      results.fares.forEach((fare: any) => {
        const id = fare.vehicleId || fare.vehicle_id;
        if (id) {
          fares[id] = fare;
        }
      });
    }
    
    return fares;
  } catch (error) {
    console.error('Error fetching local fares:', error);
    return {};
  }
}

export async function getAllAirportFares(): Promise<Record<string, any>> {
  try {
    const results = await directVehicleOperation('/api/admin/direct-airport-fares.php', 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true',
        'X-Force-Creation': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    const fares: Record<string, any> = {};
    
    if (results && results.fares && Array.isArray(results.fares)) {
      results.fares.forEach((fare: any) => {
        const id = fare.vehicleId || fare.vehicle_id;
        if (id) {
          fares[id] = fare;
        }
      });
    }
    
    return fares;
  } catch (error) {
    console.error('Error fetching airport fares:', error);
    return {};
  }
}

export async function syncAirportFares(forceRefresh: boolean = false): Promise<boolean> {
  try {
    console.log('Syncing airport fares with forceRefresh:', forceRefresh);
    
    const response = await directVehicleOperation('/api/airport-fares-sync.php', 'POST', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true',
        'X-Force-Creation': forceRefresh ? 'true' : 'false',
        'Content-Type': 'application/json'
      },
      data: {
        applyDefaults: true,
        forceRefresh: forceRefresh
      }
    });
    
    console.log('Airport fares sync response:', response);
    
    if (response && response.status === 'success') {
      return true;
    } else {
      console.error('Failed to sync airport fares:', response);
      
      // Try alternate method if the first one fails
      try {
        const altResponse = await directVehicleOperation('/api/admin/sync-airport-fares.php', 'POST', {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Debug': 'true',
            'X-Force-Creation': forceRefresh ? 'true' : 'false',
            'Content-Type': 'application/json'
          },
          data: {
            applyDefaults: true,
            forceRefresh: forceRefresh
          }
        });
        
        console.log('Alternate airport fares sync response:', altResponse);
        
        if (altResponse && altResponse.status === 'success') {
          return true;
        }
      } catch (altError) {
        console.error('Error with alternate sync method:', altError);
      }
      
      return false;
    }
  } catch (error) {
    console.error('Error syncing airport fares:', error);
    
    // Try alternate method if the first one fails
    try {
      const altResponse = await directVehicleOperation('/api/admin/sync-airport-fares.php', 'POST', {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Debug': 'true',
          'X-Force-Creation': forceRefresh ? 'true' : 'false',
          'Content-Type': 'application/json'
        },
        data: {
          applyDefaults: true,
          forceRefresh: forceRefresh
        }
      });
      
      console.log('Alternate airport fares sync response:', altResponse);
      
      if (altResponse && altResponse.status === 'success') {
        return true;
      }
    } catch (altError) {
      console.error('Error with alternate sync method:', altError);
    }
    
    return false;
  }
}

export async function updateOutstationFares(
  vehicleId: string,
  basePrice: number,
  pricePerKm: number,
  roundTripBasePrice: number,
  roundTripPricePerKm: number,
  driverAllowance: number = 300,
  nightHaltCharge: number = 700
): Promise<void> {
  try {
    const fareData: OutstationFare = {
      vehicleId,
      vehicle_id: vehicleId,
      basePrice,
      pricePerKm,
      roundTripBasePrice,
      roundTripPricePerKm,
      driverAllowance,
      nightHaltCharge
    };
    
    console.log('Updating outstation fares with data:', fareData);
    
    const directResult = await directVehicleOperation('/api/admin/direct-outstation-fares-update.php', 'POST', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true'
      },
      data: fareData
    });
    
    if (!directResult || directResult.status !== 'success') {
      const directError = directResult?.message || 'Unknown error in direct API';
      console.error('Direct API error:', directError);
      
      // Try the fare update API as a backup
      try {
        const updateResult = await directVehicleOperation('/api/admin/outstation-fares-update.php', 'POST', {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Debug': 'true'
          },
          data: fareData
        });
        
        if (!updateResult || updateResult.status !== 'success') {
          const updateError = updateResult?.message || 'Unknown error in fare update API';
          console.error('Fare Update API error:', updateError);
          throw new Error(`Direct API: ${directError}, Fare Update API: ${updateError}`);
        }
      } catch (updateError: any) {
        throw new Error(`Direct API: ${directError}, Fare Update API: ${updateError.message || 'Request failed'}`);
      }
    }
    
    // Dispatch an event to notify other components that outstation fare data has been updated
    const event = new CustomEvent('fare-data-updated', { 
      detail: { fareType: 'outstation', vehicleId } 
    });
    window.dispatchEvent(event);
    
  } catch (error: any) {
    console.error('Error updating outstation fares:', error);
    throw new Error(`Failed to update outstation fares: ${error.message}`);
  }
}

export async function updateLocalFares(
  vehicleId: string,
  extraKmRate: number,
  extraHourRate: number,
  packages: LocalPackage[]
): Promise<void> {
  try {
    const fareData: LocalFare = {
      vehicleId,
      vehicle_id: vehicleId,
      extraKmRate,
      extraHourRate,
      packages
    };
    
    console.log('Updating local fares with data:', fareData);
    
    const directResult = await directVehicleOperation('/api/admin/direct-local-fares-update.php', 'POST', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true'
      },
      data: fareData
    });
    
    if (!directResult || directResult.status !== 'success') {
      const directError = directResult?.message || 'Unknown error in direct API';
      console.error('Direct API error:', directError);
      
      // Try the fare update API as a backup
      try {
        const updateResult = await directVehicleOperation('/api/admin/local-fares-update.php', 'POST', {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Debug': 'true'
          },
          data: fareData
        });
        
        if (!updateResult || updateResult.status !== 'success') {
          const updateError = updateResult?.message || 'Unknown error in fare update API';
          console.error('Fare Update API error:', updateError);
          throw new Error(`Direct API: ${directError}, Fare Update API: ${updateError}`);
        }
      } catch (updateError: any) {
        throw new Error(`Direct API: ${directError}, Fare Update API: ${updateError.message || 'Request failed'}`);
      }
    }
    
    // Dispatch an event to notify other components that local fare data has been updated
    const event = new CustomEvent('fare-data-updated', { 
      detail: { fareType: 'local', vehicleId } 
    });
    window.dispatchEvent(event);
    
  } catch (error: any) {
    console.error('Error updating local fares:', error);
    throw new Error(`Failed to update local fares: ${error.message}`);
  }
}

export async function updateAirportFares(
  vehicleId: string,
  fareData: Record<string, any>
): Promise<void> {
  try {
    // Create a clean copy of the fare data to avoid circular references
    const cleanFareData = { ...fareData };
    
    // Ensure vehicleId is present in all possible formats
    const updatedFareData: AirportFare = {
      ...cleanFareData,
      vehicleId: vehicleId,
      vehicle_id: vehicleId,
      id: vehicleId,
      basePrice: Number(cleanFareData.basePrice || cleanFareData.base_price || 0),
      pricePerKm: Number(cleanFareData.pricePerKm || cleanFareData.price_per_km || 0),
      pickupPrice: Number(cleanFareData.pickupPrice || cleanFareData.pickup_price || 0),
      dropPrice: Number(cleanFareData.dropPrice || cleanFareData.drop_price || 0),
      tier1Price: Number(cleanFareData.tier1Price || cleanFareData.tier1_price || 0),
      tier2Price: Number(cleanFareData.tier2Price || cleanFareData.tier2_price || 0),
      tier3Price: Number(cleanFareData.tier3Price || cleanFareData.tier3_price || 0),
      tier4Price: Number(cleanFareData.tier4Price || cleanFareData.tier4_price || 0),
      extraKmCharge: Number(cleanFareData.extraKmCharge || cleanFareData.extra_km_charge || 0),
      nightCharges: Number(cleanFareData.nightCharges || cleanFareData.night_charges || 0),
      extraWaitingCharges: Number(cleanFareData.extraWaitingCharges || cleanFareData.extra_waiting_charges || 0)
    };
    
    console.log('Updating airport fares with data:', updatedFareData);
    
    // Try the direct API first
    let success = false;
    let errorMessage = '';
    
    try {
      const directResult = await directVehicleOperation('/api/admin/direct-airport-fares-update.php', 'POST', {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Debug': 'true',
          'X-Force-Creation': 'true',
          'Content-Type': 'application/json'
        },
        data: updatedFareData
      });
      
      console.log('Direct airport fares update response:', directResult);
      
      if (directResult && directResult.status === 'success') {
        success = true;
        console.log('Successfully updated airport fares using direct API');
      } else {
        errorMessage = `Direct API: ${directResult?.message || 'Unknown error in direct API'}`;
        console.error('Direct API error:', errorMessage);
      }
    } catch (directError: any) {
      errorMessage = `Direct API: ${directError.message || 'Request failed'}`;
      console.error('Direct API failed:', directError);
    }
    
    // If direct API failed, try the airport-fares-update.php as a backup
    if (!success) {
      try {
        const updateResult = await directVehicleOperation('/api/admin/airport-fares-update.php', 'POST', {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Debug': 'true',
            'X-Force-Creation': 'true',
            'Content-Type': 'application/json'
          },
          data: updatedFareData
        });
        
        console.log('Airport fares update API response:', updateResult);
        
        if (updateResult && updateResult.status === 'success') {
          success = true;
          console.log('Successfully updated airport fares using fare update API');
        } else {
          errorMessage += `, Fare Update API: ${updateResult?.message || 'Unknown error in fare update API'}`;
          console.error('Fare Update API error:', updateResult?.message);
        }
      } catch (updateError: any) {
        errorMessage += `, Fare Update API: ${updateError.message || 'Request failed'}`;
        console.error('Fare Update API failed:', updateError);
      }
    }
    
    // If all previous methods failed, try one last method with the sync API
    if (!success) {
      try {
        // First sync airport fares to ensure the vehicle exists in the table
        const syncResult = await syncAirportFares(true);
        console.log('Sync result before final update attempt:', syncResult);
        
        // Then try updating once more
        const finalResult = await directVehicleOperation('/api/admin/airport-fares-update.php', 'POST', {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Debug': 'true',
            'X-Force-Creation': 'true',
            'Content-Type': 'application/json'
          },
          data: updatedFareData
        });
        
        console.log('Final update attempt response:', finalResult);
        
        if (finalResult && finalResult.status === 'success') {
          success = true;
          console.log('Successfully updated airport fares using final method');
        } else {
          errorMessage += `, Final attempt: ${finalResult?.message || 'Unknown error in final attempt'}`;
        }
      } catch (finalError: any) {
        errorMessage += `, Final attempt: ${finalError.message || 'Request failed'}`;
        console.error('Final update attempt failed:', finalError);
      }
    }
    
    if (!success) {
      throw new Error(errorMessage || 'Failed to update airport fares after multiple attempts');
    }
    
    // Dispatch an event to notify other components that airport fare data has been updated
    const event = new CustomEvent('fare-data-updated', { 
      detail: { fareType: 'airport', vehicleId } 
    });
    window.dispatchEvent(event);
    
  } catch (error: any) {
    console.error('Error updating airport fares:', error);
    throw new Error(`Failed to update airport fares: ${error.message}`);
  }
}
