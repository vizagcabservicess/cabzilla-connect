
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
    console.error('Error fetching airport fares:', error);
    return {};
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
    // Ensure vehicleId is present in all possible formats
    const updatedFareData: AirportFare = {
      ...fareData,
      vehicleId: vehicleId,
      vehicle_id: vehicleId,
      id: vehicleId
    };
    
    console.log('Updating airport fares with data:', updatedFareData);
    
    // Try the direct API first
    try {
      const directResult = await directVehicleOperation('/api/admin/direct-airport-fares-update.php', 'POST', {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Debug': 'true'
        },
        data: updatedFareData
      });
      
      if (!directResult || directResult.status !== 'success') {
        const directError = directResult?.message || 'Unknown error in direct API';
        console.error('Direct API error:', directError);
        throw new Error(`Direct API: ${directError}`);
      }
      
      console.log('Successfully updated airport fares using direct API');
    } catch (directError: any) {
      console.error('Direct API failed:', directError);
      
      // Try the fare update API as a backup
      try {
        const updateResult = await directVehicleOperation('/api/admin/airport-fares-update.php', 'POST', {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Debug': 'true'
          },
          data: updatedFareData
        });
        
        if (!updateResult || updateResult.status !== 'success') {
          const updateError = updateResult?.message || 'Unknown error in fare update API';
          console.error('Fare Update API error:', updateError);
          throw new Error(`Direct API: ${directError.message || 'Request failed'}, Fare Update API: ${updateError}`);
        }
        
        console.log('Successfully updated airport fares using fare update API');
      } catch (updateError: any) {
        console.error('Fare Update API failed:', updateError);
        throw new Error(`Direct API: ${directError.message || 'Request failed'}, Fare Update API: ${updateError.message || 'Missing required parameter: vehicleId'}, Fare Service failed: ${updateError.message || 'Request failed'}`);
      }
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
