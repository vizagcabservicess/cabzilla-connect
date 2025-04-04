
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
    
    // Ensure vehicleId is consistent in all required formats
    cleanData.vehicle_id = fareData.vehicleId;
    
    // Remove circular references that might cause stack overflow
    const sanitizedData = JSON.parse(JSON.stringify(cleanData));
    
    console.log('Sanitized airport fare data to send:', sanitizedData);
    
    // Try the direct API first
    let success = false;
    let errorMessages = [];
    
    try {
      console.log('Attempting to update airport fares with direct API...');
      const directResult = await directVehicleOperation('/api/admin/direct-airport-fares-update.php', 'POST', {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Debug': 'true',
          'Content-Type': 'application/json'
        },
        data: sanitizedData
      });
      
      console.log('Direct API response:', directResult);
      
      if (directResult && directResult.status === 'success') {
        success = true;
        console.log('Airport fares updated successfully via direct API');
      } else {
        errorMessages.push(`Direct API: ${directResult?.message || 'Unknown error'}`);
      }
    } catch (directError: any) {
      errorMessages.push(`Direct API error: ${directError?.message || 'Request failed'}`);
      console.error('Direct API failed:', directError);
    }
    
    // If direct API failed, try the backup API
    if (!success) {
      try {
        console.log('Attempting to update airport fares with backup API...');
        const backupResult = await directVehicleOperation('/api/admin/airport-fares-update.php', 'POST', {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Debug': 'true',
            'Content-Type': 'application/json'
          },
          data: sanitizedData
        });
        
        console.log('Backup API response:', backupResult);
        
        if (backupResult && backupResult.status === 'success') {
          success = true;
          console.log('Airport fares updated successfully via backup API');
        } else {
          errorMessages.push(`Backup API: ${backupResult?.message || 'Unknown error'}`);
        }
      } catch (backupError: any) {
        errorMessages.push(`Backup API error: ${backupError?.message || 'Request failed'}`);
        console.error('Backup API failed:', backupError);
      }
    }
    
    // If both methods failed, throw an error with details
    if (!success) {
      throw new Error(errorMessages.join(', '));
    }
    
    // Dispatch event for any listeners
    const event = new CustomEvent('fare-data-updated', { 
      detail: { fareType: 'airport', vehicleId: fareData.vehicleId } 
    });
    window.dispatchEvent(event);
    
    // Try to sync the fares after a successful update
    try {
      console.log('Triggering airport fares sync after update...');
      setTimeout(async () => {
        try {
          const syncResult = await directVehicleOperation('/api/admin/sync-airport-fares.php', 'GET', {
            headers: {
              'X-Admin-Mode': 'true',
              'X-Debug': 'true',
              'Cache-Control': 'no-cache'
            }
          });
          console.log('Sync result:', syncResult);
        } catch (syncError) {
          console.warn('Non-critical: Error during fare sync:', syncError);
        }
      }, 1000);
    } catch (syncError) {
      console.warn('Non-critical: Failed to trigger fares sync after update:', syncError);
    }
    
  } catch (error) {
    console.error('Error updating airport fares:', error);
    throw error;
  }
}
