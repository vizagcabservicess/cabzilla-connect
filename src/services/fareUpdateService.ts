
import { apiCall, directVehicleOperation } from '@/utils/apiHelper';
import { clearVehicleDataCache } from './vehicleDataService';
import { getBypassHeaders } from '@/config/requestConfig';

/**
 * Sync airport fares
 */
export async function syncAirportFares(forceCreation = false): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/sync-airport-fares.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getBypassHeaders()
      },
      body: JSON.stringify({
        forceCreation
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    
    // Clear the cache if successful
    if (data && data.status === 'success') {
      try {
        clearVehicleDataCache();
      } catch (e) {
        console.warn('Error clearing cache:', e);
      }
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error syncing airport fares:', error);
    return false;
  }
}

/**
 * Fix local fares
 */
export async function fixLocalFares(): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/fix-local-fares.php', {
      headers: getBypassHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    return data && data.status === 'success';
  } catch (error) {
    console.error('Error fixing local fares:', error);
    return false;
  }
}

/**
 * Fix outstation fares
 */
export async function fixOutstationFares(): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/fix-outstation-fares.php', {
      headers: getBypassHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    return data && data.status === 'success';
  } catch (error) {
    console.error('Error fixing outstation fares:', error);
    return false;
  }
}
