
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
    
    // Apply default values for any missing fields
    if (!cleanData.price4hrs40km) cleanData.price4hrs40km = 2500;
    if (!cleanData.price8hrs80km) cleanData.price8hrs80km = 4000;
    if (!cleanData.price10hrs100km) cleanData.price10hrs100km = 5000;
    if (!cleanData.priceExtraKm) cleanData.priceExtraKm = 15;
    if (!cleanData.priceExtraHour) cleanData.priceExtraHour = 200;
    
    console.log('Updating local fares with clean data:', cleanData);
    
    // Try the direct API first
    const directResult = await directVehicleOperation('/api/admin/direct-local-fares-update.php', 'POST', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true',
        'Content-Type': 'application/json',
        'X-Force-Creation': 'true'
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
          'Content-Type': 'application/json',
          'X-Force-Creation': 'true'
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
    
    // Try to sync the fares after a successful update
    try {
      setTimeout(async () => {
        await syncLocalFares();
      }, 1000);
    } catch (syncError) {
      console.warn('Non-critical: Failed to trigger fares sync after update:', syncError);
    }
    
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
    
    // Default values based on vehicle type
    let baseDefaults = {
      basePrice: 3000,
      pricePerKm: 15,
      pickupPrice: 1000,
      dropPrice: 1000,
      tier1Price: 800,
      tier2Price: 1000,
      tier3Price: 1200,
      tier4Price: 1400,
      extraKmCharge: 15,
      nightCharges: 300,
      extraWaitingCharges: 200
    };
    
    // Apply vehicle-specific defaults if needed
    const vehicleId = cleanData.vehicleId.toLowerCase();
    if (vehicleId.includes('sedan')) {
      baseDefaults = {
        basePrice: 3000, pricePerKm: 12, pickupPrice: 800, dropPrice: 800,
        tier1Price: 600, tier2Price: 800, tier3Price: 1000, tier4Price: 1200, 
        extraKmCharge: 12, nightCharges: 250, extraWaitingCharges: 150
      };
    } else if (vehicleId.includes('ertiga')) {
      baseDefaults = {
        basePrice: 3500, pricePerKm: 15, pickupPrice: 1000, dropPrice: 1000,
        tier1Price: 800, tier2Price: 1000, tier3Price: 1200, tier4Price: 1400, 
        extraKmCharge: 15, nightCharges: 300, extraWaitingCharges: 200
      };
    } else if (vehicleId.includes('innova') || vehicleId.includes('crysta')) {
      baseDefaults = {
        basePrice: 4000, pricePerKm: 17, pickupPrice: 1200, dropPrice: 1200,
        tier1Price: 1000, tier2Price: 1200, tier3Price: 1400, tier4Price: 1600, 
        extraKmCharge: 17, nightCharges: 350, extraWaitingCharges: 250
      };
    } else if (vehicleId.includes('tempo')) {
      baseDefaults = {
        basePrice: 6000, pricePerKm: 19, pickupPrice: 2000, dropPrice: 2000,
        tier1Price: 1600, tier2Price: 1800, tier3Price: 2000, tier4Price: 2500, 
        extraKmCharge: 19, nightCharges: 400, extraWaitingCharges: 300
      };
    } else if (vehicleId.includes('luxury')) {
      baseDefaults = {
        basePrice: 7000, pricePerKm: 22, pickupPrice: 2500, dropPrice: 2500,
        tier1Price: 2000, tier2Price: 2200, tier3Price: 2500, tier4Price: 3000, 
        extraKmCharge: 22, nightCharges: 450, extraWaitingCharges: 350
      };
    } else if (vehicleId.includes('dzire')) {
      baseDefaults = {
        basePrice: 3200, pricePerKm: 13, pickupPrice: 800, dropPrice: 800,
        tier1Price: 600, tier2Price: 800, tier3Price: 1000, tier4Price: 1200, 
        extraKmCharge: 13, nightCharges: 250, extraWaitingCharges: 150
      };
    } else if (vehicleId.includes('etios')) {
      baseDefaults = {
        basePrice: 3200, pricePerKm: 13, pickupPrice: 800, dropPrice: 800,
        tier1Price: 600, tier2Price: 800, tier3Price: 1000, tier4Price: 1200, 
        extraKmCharge: 13, nightCharges: 250, extraWaitingCharges: 150
      };
    }
    
    // Apply defaults for any zero or missing values
    for (const [key, defaultValue] of Object.entries(baseDefaults)) {
      if (!cleanData[key] || cleanData[key] === 0) {
        cleanData[key] = defaultValue;
      }
    }
    
    console.log('Updating airport fare data with defaults applied:', cleanData);
    
    // Force creation flag to ensure defaults are applied if needed
    const forceCreation = true;
    
    // Try the direct API first
    let success = false;
    let errorMessages = [];
    
    try {
      console.log('Attempting to update airport fares with direct API...');
      const directResult = await directVehicleOperation('/api/admin/direct-airport-fares-update.php', 'POST', {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Debug': 'true',
          'X-Force-Creation': forceCreation ? 'true' : 'false',
          'Content-Type': 'application/json'
        },
        data: cleanData
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
            'X-Force-Creation': forceCreation ? 'true' : 'false',
            'Content-Type': 'application/json'
          },
          data: cleanData
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
    
    // Always try to sync the fares after a successful update
    try {
      console.log('Triggering airport fares sync after update...');
      setTimeout(async () => {
        await syncAirportFares();
      }, 1000);
    } catch (syncError) {
      console.warn('Non-critical: Failed to trigger fares sync after update:', syncError);
    }
    
  } catch (error) {
    console.error('Error updating airport fares:', error);
    throw error;
  }
}

/**
 * Force synchronization of airport fares to ensure all vehicles have entries
 * @returns Promise that resolves when sync is complete
 */
export async function syncAirportFares(): Promise<any> {
  try {
    console.log('Forcing sync of airport fares...');
    const result = await directVehicleOperation('/api/admin/sync-airport-fares.php', 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true',
        'X-Force-Creation': 'true',
        'Cache-Control': 'no-cache'
      }
    });
    
    console.log('Airport fares sync result:', result);
    return result;
  } catch (error) {
    console.error('Error syncing airport fares:', error);
    throw error;
  }
}

/**
 * Force synchronization of local fares to ensure all vehicles have entries
 * @returns Promise that resolves when sync is complete
 */
export async function syncLocalFares(): Promise<any> {
  try {
    console.log('Forcing sync of local fares...');
    const result = await directVehicleOperation('/api/admin/sync-local-fares.php', 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true',
        'X-Force-Creation': 'true',
        'Cache-Control': 'no-cache'
      }
    });
    
    console.log('Local fares sync result:', result);
    return result;
  } catch (error) {
    console.error('Error syncing local fares:', error);
    throw error;
  }
}
