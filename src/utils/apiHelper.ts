
/**
 * API helper functions for handling CORS and common API operations
 */
import { apiBaseUrl } from '@/config/api';
import { CabType } from '@/types/cab';

/**
 * Specialized function for direct vehicle operations that need to work despite CORS
 * This creates a more direct approach bypassing CORS proxies
 */
export const directVehicleOperation = async (
  endpoint: string, 
  method: 'GET' | 'POST', 
  data?: any
): Promise<any> => {
  try {
    // Handle online/offline - don't proceed if offline
    if (!navigator.onLine) {
      throw new Error('No network connection available');
    }

    // Prepare URL for direct access
    const url = endpoint.startsWith('http') ? endpoint : `${apiBaseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    
    console.log(`Direct vehicle operation to: ${url}`);
    
    // Prepare form data if needed
    let body = undefined;
    if (data) {
      if (method === 'POST') {
        if (data instanceof FormData) {
          body = data;
        } else {
          const formData = new FormData();
          Object.entries(data).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              if (typeof value === 'object') {
                formData.append(key, JSON.stringify(value));
              } else {
                formData.append(key, String(value));
              }
            }
          });
          body = formData;
        }
      }
    }
    
    // Create headers optimized for CORS
    const headers: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Force-Refresh': 'true',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
    
    // Make the request
    const response = await fetch(url, {
      method,
      headers,
      body,
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store'
    });
    
    // Check for errors
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    // Parse response
    try {
      return await response.json();
    } catch (e) {
      // If parsing fails but response is OK, return success object
      if (response.ok) {
        return { status: 'success', message: 'Operation completed successfully' };
      }
      throw new Error('Failed to parse API response');
    }
  } catch (error) {
    console.error('Direct vehicle operation failed:', error);
    throw error;
  }
};

/**
 * Cache vehicle data in localStorage for offline fallback
 */
export const cacheVehicleData = (vehicles: CabType[]): void => {
  try {
    localStorage.setItem('cachedVehicles', JSON.stringify(vehicles));
    localStorage.setItem('cachedVehiclesTimestamp', Date.now().toString());
  } catch (error) {
    console.error('Failed to cache vehicle data:', error);
  }
};

/**
 * Update specific vehicle in cache
 */
export const updateVehicleInCache = (vehicleId: string, vehicleData: Partial<CabType>): boolean => {
  try {
    const cachedVehiclesString = localStorage.getItem('cachedVehicles');
    if (!cachedVehiclesString) return false;
    
    const cachedVehicles = JSON.parse(cachedVehiclesString);
    const updatedVehicles = cachedVehicles.map((v: CabType) => 
      v.id === vehicleId ? { ...v, ...vehicleData } : v
    );
    
    localStorage.setItem('cachedVehicles', JSON.stringify(updatedVehicles));
    localStorage.setItem('cachedVehiclesTimestamp', Date.now().toString());
    return true;
  } catch (error) {
    console.error('Failed to update vehicle in cache:', error);
    return false;
  }
};

/**
 * Delete vehicle from cache
 */
export const deleteVehicleFromCache = (vehicleId: string): boolean => {
  try {
    const cachedVehiclesString = localStorage.getItem('cachedVehicles');
    if (!cachedVehiclesString) return false;
    
    const cachedVehicles = JSON.parse(cachedVehiclesString);
    const updatedVehicles = cachedVehicles.filter((v: CabType) => v.id !== vehicleId);
    
    localStorage.setItem('cachedVehicles', JSON.stringify(updatedVehicles));
    localStorage.setItem('cachedVehiclesTimestamp', Date.now().toString());
    return true;
  } catch (error) {
    console.error('Failed to delete vehicle from cache:', error);
    return false;
  }
};

/**
 * Check API server health
 */
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/admin/status.php`, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache'
      },
      mode: 'cors',
      credentials: 'omit'
    });
    
    return response.ok;
  } catch (error) {
    console.warn('API health check failed:', error);
    return false;
  }
};
