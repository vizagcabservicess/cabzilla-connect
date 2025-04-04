
import { directVehicleOperation } from '@/utils/apiHelper';

/**
 * Fetch local fares for a specific vehicle
 * @param vehicleId Vehicle ID to fetch fares for
 * @returns Promise with array of local fare data
 */
export async function fetchLocalFares(vehicleId: string): Promise<any[]> {
  try {
    const results = await directVehicleOperation(`/api/admin/direct-local-fares.php`, 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true',
        'Cache-Control': 'no-cache'
      },
      data: { vehicleId }
    });
    
    if (results && results.fares && Array.isArray(results.fares)) {
      return results.fares;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching local fares:', error);
    throw error;
  }
}

/**
 * Fetch airport fares for a specific vehicle
 * @param vehicleId Vehicle ID to fetch fares for
 * @returns Promise with array of airport fare data
 */
export async function fetchAirportFares(vehicleId: string): Promise<any[]> {
  try {
    const results = await directVehicleOperation(`/api/admin/direct-airport-fares.php?vehicleId=${encodeURIComponent(vehicleId)}`, 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (results && results.fares && Array.isArray(results.fares)) {
      return results.fares;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching airport fares:', error);
    throw error;
  }
}

/**
 * Update local fares for a specific vehicle
 * @param fareData Local fare data to update
 * @returns Promise that resolves when update is complete
 */
export async function updateLocalFares(fareData: Record<string, any>): Promise<void> {
  if (!fareData.vehicleId) {
    throw new Error('Vehicle ID is required to update local fares');
  }
  
  try {
    // Create a clean copy of data to avoid circular references
    const cleanData = { ...fareData };
    
    // Ensure both vehicleId formats are present
    cleanData.vehicle_id = cleanData.vehicleId;
    
    // Try the direct API first
    const directResult = await directVehicleOperation('/api/admin/direct-local-fares-update.php', 'POST', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true',
        'Content-Type': 'application/json'
      },
      data: cleanData
    });
    
    if (!directResult || directResult.status !== 'success') {
      const directError = directResult?.message || 'Unknown error in direct API';
      
      // Try the fare update API as a backup
      const updateResult = await directVehicleOperation('/api/admin/local-fares-update.php', 'POST', {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Debug': 'true',
          'Content-Type': 'application/json'
        },
        data: cleanData
      });
      
      if (!updateResult || updateResult.status !== 'success') {
        throw new Error(`Failed to update local fares: ${directError}`);
      }
    }
    
    // Dispatch event for any listeners
    const event = new CustomEvent('fare-data-updated', { 
      detail: { fareType: 'local', vehicleId: fareData.vehicleId } 
    });
    window.dispatchEvent(event);
    
  } catch (error) {
    console.error('Error updating local fares:', error);
    throw error;
  }
}

/**
 * Update airport fares for a specific vehicle
 * @param fareData Airport fare data to update
 * @returns Promise that resolves when update is complete
 */
export async function updateAirportFares(fareData: Record<string, any>): Promise<void> {
  if (!fareData.vehicleId) {
    throw new Error('Vehicle ID is required to update airport fares');
  }
  
  try {
    // Create a clean copy of data to avoid circular references
    const cleanData = { ...fareData };
    
    // Ensure all vehicle ID formats are present
    cleanData.vehicle_id = cleanData.vehicleId;
    
    // Avoid infinite recursion by removing any self-references
    delete cleanData.id; // We don't need this as we have vehicleId and vehicle_id
    
    // Try the direct API first
    let success = false;
    let errorMessage = '';
    
    try {
      console.log('Sending airport fare data to direct API:', JSON.stringify(cleanData));
      
      const directResult = await directVehicleOperation('/api/admin/direct-airport-fares-update.php', 'POST', {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Debug': 'true',
          'Content-Type': 'application/json'
        },
        data: cleanData
      });
      
      if (directResult && directResult.status === 'success') {
        success = true;
      } else {
        errorMessage = directResult?.message || 'Unknown error in direct API';
      }
    } catch (directError: any) {
      errorMessage = directError.message || 'Request to direct API failed';
    }
    
    // Try backup API if direct one failed
    if (!success) {
      try {
        console.log('Direct API failed, trying backup API with data:', JSON.stringify(cleanData));
        
        const updateResult = await directVehicleOperation('/api/admin/airport-fares-update.php', 'POST', {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Debug': 'true',
            'Content-Type': 'application/json'
          },
          data: cleanData
        });
        
        if (updateResult && updateResult.status === 'success') {
          success = true;
        } else {
          errorMessage += `, Backup API: ${updateResult?.message || 'Unknown error in backup API'}`;
        }
      } catch (updateError: any) {
        errorMessage += `, Backup API: ${updateError.message || 'Request to backup API failed'}`;
      }
    }
    
    if (!success) {
      throw new Error(`Failed to update airport fares: ${errorMessage}`);
    }
    
    // Dispatch event for any listeners
    const event = new CustomEvent('fare-data-updated', { 
      detail: { fareType: 'airport', vehicleId: fareData.vehicleId } 
    });
    window.dispatchEvent(event);
    
  } catch (error) {
    console.error('Error updating airport fares:', error);
    throw error;
  }
}
