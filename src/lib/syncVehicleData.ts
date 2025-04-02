
import { apiBaseUrl } from '@/config/api';
import axios from 'axios';
import { toast } from 'sonner';

/**
 * Utility function to sync vehicle data between database and JSON file
 * This is used to ensure consistent data after vehicle updates
 */
export async function syncVehicleData(): Promise<boolean> {
  try {
    console.log("Syncing vehicle data between database and JSON file");
    
    const syncEndpoint = `${apiBaseUrl}/api/admin/sync-vehicle-data.php?_t=${Date.now()}`;
    
    const response = await axios.get(syncEndpoint, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'X-Admin-Mode': 'true',
        'X-Debug-Mode': 'true'
      },
      timeout: 10000 // 10 second timeout
    });
    
    console.log("Vehicle data sync response:", response.data);
    
    if (response.status === 200) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error syncing vehicle data:", error);
    return false;
  }
}
