
/**
 * API helper functions for handling CORS and common API operations
 */
import { apiBaseUrl } from '@/config/api';
import { CabType } from '@/types/cab';
import { toast } from 'sonner';

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
    
    // Prepare request body
    let body = undefined;
    let headers: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Force-Refresh': 'true',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Origin': window.location.origin
    };

    if (data) {
      if (method === 'POST') {
        if (data instanceof FormData) {
          body = data;
        } else {
          // First try sending as JSON
          try {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(data);
          } catch (e) {
            // Fall back to form data if JSON fails
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            body = new URLSearchParams(data).toString();
          }
        }
      }
    }
    
    // Try to preflight with OPTIONS to establish CORS
    try {
      const preflightResponse = await fetch(url, {
        method: 'OPTIONS',
        headers: {
          ...headers,
          'Access-Control-Request-Method': method,
          'Access-Control-Request-Headers': Object.keys(headers).join(', ')
        },
        mode: 'cors',
        credentials: 'omit'
      });
      
      console.log('CORS preflight response:', preflightResponse.status);
    } catch (e) {
      // Preflight might fail but we continue with the actual request
      console.warn('CORS preflight failed, continuing with request:', e);
    }
    
    // Make the actual request with maximum CORS compatibility
    const response = await fetch(url, {
      method,
      headers,
      body,
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      keepalive: true
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
    
    // Make a second attempt using a different approach if the first fails
    try {
      // Prepare URL for second attempt with explicit CORS fix
      const fixedUrl = endpoint.startsWith('http') 
        ? endpoint 
        : `${apiBaseUrl}/api/admin/fix-cors.php?endpoint=${encodeURIComponent(endpoint)}`;

      console.log('Second attempt with CORS fix:', fixedUrl);
      
      let formData: FormData | URLSearchParams;
      
      if (data) {
        if (data instanceof FormData) {
          formData = data;
        } else if (typeof data === 'object') {
          formData = new FormData();
          Object.entries(data).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              if (typeof value === 'object') {
                formData.append(key, JSON.stringify(value));
              } else {
                formData.append(key, String(value));
              }
            }
          });
        } else {
          formData = new URLSearchParams();
          formData.append('data', JSON.stringify(data));
        }
      } else {
        formData = new FormData();
      }
      
      const secondResponse = await fetch(fixedUrl, {
        method: 'POST',
        body: formData,
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store'
      });

      if (!secondResponse.ok) {
        throw new Error(`Second attempt failed with status ${secondResponse.status}`);
      }
      
      return await secondResponse.json();
    } catch (secondError) {
      console.error('Second attempt also failed:', secondError);
      // Use cached data or show an offline message
      toast.error('Connection issue. Please check your internet connection.');
      throw error; // Throw the original error
    }
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
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Origin': window.location.origin
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

/**
 * Try multiple API endpoints to find a working one for vehicle operations
 */
export const tryMultipleEndpoints = async (operation: string, vehicleData?: any): Promise<any> => {
  const endpoints = [
    `/api/admin/direct-vehicle-${operation}.php`,
    `/api/admin/${operation}-vehicle.php`,
    `/api/vehicles/${operation}.php`
  ];
  
  let lastError: Error | null = null;
  
  for (const endpoint of endpoints) {
    try {
      const result = await directVehicleOperation(
        endpoint,
        'POST',
        vehicleData
      );
      
      if (result && (result.status === 'success' || result.vehicles)) {
        console.log(`Successful operation using endpoint: ${endpoint}`);
        return result;
      }
    } catch (error) {
      console.warn(`Failed with endpoint ${endpoint}:`, error);
      lastError = error as Error;
    }
  }
  
  // If we got here, all endpoints failed
  throw lastError || new Error(`All ${operation} endpoints failed`);
};

/**
 * Fix database tables via API call
 */
export const fixDatabaseTables = async (): Promise<boolean> => {
  try {
    const endpoints = [
      '/api/admin/fix-database-tables.php',
      '/api/admin/fix-vehicle-tables.php'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${apiBaseUrl}${endpoint}`, {
          method: 'GET',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Cache-Control': 'no-cache',
            'Origin': window.location.origin
          },
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.status === 'success') {
            console.log(`Successfully fixed database using ${endpoint}`);
            return true;
          }
        }
      } catch (error) {
        console.warn(`Failed with endpoint ${endpoint}:`, error);
      }
    }
    
    // If we reached here, no endpoint succeeded
    return false;
  } catch (error) {
    console.error('Error fixing database tables:', error);
    return false;
  }
};
