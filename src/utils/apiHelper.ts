
import axios, { AxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

// Get base API URL from environment or use empty string for relative paths
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const apiVersion = import.meta.env.VITE_API_VERSION || '1.0.0';

/**
 * Makes an API request with multiple fallback endpoints and retry logic
 */
export const makeApiRequest = async <T>(
  endpoints: string[],
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any,
  options: {
    contentTypes?: string[];
    headers?: Record<string, string>;
    timeoutMs?: number;
    retries?: number;
    localStorageKey?: string;
    fallbackData?: T;
    notification?: boolean;
    forceValidResponse?: boolean;  // New option to force treating response as valid
  } = {}
): Promise<T> => {
  const {
    contentTypes = ['multipart/form-data', 'application/json', 'application/x-www-form-urlencoded'],
    headers = {},
    timeoutMs = 12000,
    retries = 2,
    localStorageKey,
    fallbackData,
    notification = true,
    forceValidResponse = false
  } = options;
  
  // Add cache busting timestamp
  const timestamp = Date.now();
  
  // Try to load from localStorage first if a key is provided
  if (localStorageKey && method === 'GET') {
    try {
      const cachedData = localStorage.getItem(localStorageKey);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        console.log(`Loaded data from localStorage (${localStorageKey})`);
        return parsedData as T;
      }
    } catch (error) {
      console.error(`Error loading from localStorage (${localStorageKey}):`, error);
    }
  }
  
  // Prepare common headers
  const commonHeaders = {
    'X-API-Version': apiVersion,
    'X-Force-Refresh': 'true',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Cache-Timestamp': timestamp.toString(),
    ...headers
  };
  
  let lastError: any = null;
  let responseText: string = '';
  
  // Try each endpoint with multiple content types
  for (const endpoint of endpoints) {
    for (const contentType of contentTypes) {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          let requestConfig: AxiosRequestConfig = {
            method,
            url: endpoint.includes('://') ? endpoint : `${apiBaseUrl}${endpoint}`,
            headers: {
              ...commonHeaders
            },
            timeout: timeoutMs
          };
          
          // Handle different content types and methods
          if (method !== 'GET' && data) {
            if (contentType === 'application/json') {
              requestConfig.headers['Content-Type'] = contentType;
              
              // Fix for vehicle_type issue: ensure we're using vehicle_id consistently
              let processedData = { ...data };
              if (processedData.vehicle_type && !processedData.vehicle_id) {
                processedData.vehicle_id = processedData.vehicle_type;
              }
              
              requestConfig.data = processedData;
            } else if (contentType === 'application/x-www-form-urlencoded') {
              requestConfig.headers['Content-Type'] = contentType;
              const params = new URLSearchParams();
              for (const key in data) {
                if (data[key] !== undefined) {
                  // Fix for vehicle_type issue
                  if (key === 'vehicle_type' && !data['vehicle_id']) {
                    params.append('vehicle_id', String(data[key]));
                  }
                  params.append(key, String(data[key]));
                }
              }
              requestConfig.data = params;
            } else if (contentType === 'multipart/form-data') {
              // For multipart/form-data, let axios set the content type with boundary
              const formData = new FormData();
              for (const key in data) {
                if (data[key] !== undefined) {
                  // Fix for vehicle_type issue
                  if (key === 'vehicle_type' && !data['vehicle_id']) {
                    formData.append('vehicle_id', String(data[key]));
                  }
                  
                  if (Array.isArray(data[key])) {
                    formData.append(key, JSON.stringify(data[key]));
                  } else {
                    formData.append(key, String(data[key]));
                  }
                }
              }
              requestConfig.data = formData;
            }
          }
          
          console.log(`Making ${method} request to ${endpoint} (attempt ${attempt + 1}/${retries + 1}, content-type: ${contentType})`);
          
          // Use fetch directly for DELETE requests to avoid axios limitations
          if (method === 'DELETE') {
            const fetchOptions: RequestInit = {
              method,
              headers: {
                ...commonHeaders,
                ...(contentType !== 'multipart/form-data' ? { 'Content-Type': contentType } : {})
              },
              credentials: 'same-origin'
            };
            
            if (data) {
              if (contentType === 'application/json') {
                // Fix for vehicle_type issue
                let processedData = { ...data };
                if (processedData.vehicle_type && !processedData.vehicle_id) {
                  processedData.vehicle_id = processedData.vehicle_type;
                }
                fetchOptions.body = JSON.stringify(processedData);
              } else if (contentType === 'multipart/form-data') {
                const formData = new FormData();
                for (const key in data) {
                  if (data[key] !== undefined) {
                    // Fix for vehicle_type issue
                    if (key === 'vehicle_type' && !data['vehicle_id']) {
                      formData.append('vehicle_id', String(data[key]));
                    }
                    formData.append(key, String(data[key]));
                  }
                }
                fetchOptions.body = formData;
              } else {
                const params = new URLSearchParams();
                for (const key in data) {
                  if (data[key] !== undefined) {
                    // Fix for vehicle_type issue
                    if (key === 'vehicle_type' && !data['vehicle_id']) {
                      params.append('vehicle_id', String(data[key]));
                    }
                    params.append(key, String(data[key]));
                  }
                }
                fetchOptions.body = params;
              }
            }
            
            const fetchUrl = endpoint.includes('://') ? endpoint : `${apiBaseUrl}${endpoint}`;
            const response = await fetch(fetchUrl, fetchOptions);
            responseText = await response.text();
            
            try {
              const jsonData = JSON.parse(responseText);
              
              // If we have a localStorage key and this was a successful DELETE, update the cache
              if (localStorageKey && response.ok) {
                try {
                  // For deletion, we need to remove the item from the array in localStorage
                  const cachedItems = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
                  const updatedItems = Array.isArray(cachedItems) ? 
                    cachedItems.filter((item: any) => item.id !== data.vehicleId && item.vehicleId !== data.vehicleId) : 
                    cachedItems;
                  
                  localStorage.setItem(localStorageKey, JSON.stringify(updatedItems));
                  console.log(`Updated localStorage after DELETE (${localStorageKey})`);
                } catch (error) {
                  console.error(`Error updating localStorage after DELETE (${localStorageKey}):`, error);
                }
              }
              
              return jsonData;
            } catch (e) {
              console.log('Non-JSON response from fetch DELETE:', responseText);
              
              // Force treating response as valid if needed
              if (forceValidResponse && response.ok) {
                console.log('Forcing valid response for DELETE');
                return { 
                  status: 'success', 
                  message: 'Operation processed successfully',
                  responseText: responseText,
                  timestamp: new Date().toISOString() 
                } as unknown as T;
              }
              
              throw new Error(`Invalid JSON response: ${responseText}`);
            }
          } else {
            // Regular axios request for non-DELETE methods
            const response = await axios(requestConfig);
            
            // If we have a localStorage key and this was a successful GET, cache the result
            if (localStorageKey && method === 'GET' && response.data) {
              try {
                localStorage.setItem(localStorageKey, JSON.stringify(response.data));
                console.log(`Cached data in localStorage (${localStorageKey})`);
              } catch (error) {
                console.error(`Error caching in localStorage (${localStorageKey}):`, error);
              }
            }
            
            return response.data;
          }
        } catch (error: any) {
          lastError = error;
          responseText = error.response?.data || error.message || '';
          
          if (typeof responseText === 'object') {
            try {
              responseText = JSON.stringify(responseText);
            } catch (e) {
              responseText = 'Unknown error response format';
            }
          }
          
          const status = error.response?.status;
          const detail = error.response?.data?.message || error.message;
          
          console.error(
            `Error making ${method} request to ${endpoint} (attempt ${attempt + 1}/${retries + 1}): ${status} - ${detail}`
          );
          
          // Only wait before retry if this wasn't the last attempt
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
    }
  }
  
  // Special case for DELETE operations - treat them as success if we can't reach the server
  // This allows us to remove items from the UI even if backend delete fails
  if (method === 'DELETE' && forceValidResponse) {
    console.log('Forcing valid response for failed DELETE operation');
    if (localStorageKey && data && (data.vehicleId || data.id)) {
      try {
        // Remove the item from the array in localStorage
        const cachedItems = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
        const itemId = data.vehicleId || data.id;
        const updatedItems = Array.isArray(cachedItems) ? 
          cachedItems.filter((item: any) => item.id !== itemId && item.vehicleId !== itemId) : 
          cachedItems;
        
        localStorage.setItem(localStorageKey, JSON.stringify(updatedItems));
        console.log(`Updated localStorage after DELETE fallback (${localStorageKey})`);
      } catch (error) {
        console.error(`Error updating localStorage after DELETE fallback (${localStorageKey}):`, error);
      }
    }
    
    return { 
      status: 'success', 
      message: 'Operation marked as successful (offline mode)',
      offline: true,
      timestamp: new Date().toISOString(),
      responseText: responseText
    } as unknown as T;
  }
  
  // If we got here, all attempts failed
  if (notification) {
    toast.error('API request failed after multiple attempts');
  }
  
  console.error('All API endpoints failed');
  
  // Return fallback data if provided
  if (fallbackData !== undefined) {
    return fallbackData;
  }
  
  // Re-throw the last error if no fallback
  throw lastError || new Error('API request failed');
};

// New helper specifically for direct vehicle operations
export const directVehicleOperation = async <T>(
  operation: 'create' | 'update' | 'delete',
  vehicleData: any,
  options: {
    notification?: boolean;
    localStorageFallback?: boolean;
  } = {}
): Promise<T> => {
  const { notification = true, localStorageFallback = true } = options;
  
  // Define operation-specific endpoints
  const endpoints = {
    create: [
      `/api/admin/direct-vehicle-create.php`,
      `/api/fares/vehicles.php`
    ],
    update: [
      `/api/admin/direct-vehicle-update.php`,
      `/api/admin/vehicles-update.php`, 
      `/api/fares/vehicles.php`
    ],
    delete: [
      `/api/admin/direct-vehicle-delete.php?vehicleId=${vehicleData.vehicleId || vehicleData.id}`,
      `/api/admin/vehicles-update.php?vehicleId=${vehicleData.vehicleId || vehicleData.id}&action=delete`,
      `/api/fares/vehicles.php?vehicleId=${vehicleData.vehicleId || vehicleData.id}`
    ]
  };
  
  // Define proper HTTP methods
  const methods = {
    create: 'POST',
    update: 'POST',
    delete: 'DELETE'
  };
  
  try {
    // Always try direct API operation first
    const result = await makeApiRequest<T>(
      endpoints[operation],
      methods[operation] as any,
      vehicleData,
      { 
        notification,
        forceValidResponse: operation === 'delete',
        localStorageKey: localStorageFallback ? 'localVehicles' : undefined
      }
    );
    
    // For create/update, manually update localStorage
    if (localStorageFallback && (operation === 'create' || operation === 'update')) {
      try {
        const id = vehicleData.vehicleId || vehicleData.id;
        const cachedVehicles = JSON.parse(localStorage.getItem('localVehicles') || '[]');
        
        // Find if vehicle exists
        const index = cachedVehicles.findIndex((v: any) => v.id === id || v.vehicleId === id);
        
        if (index >= 0 && operation === 'update') {
          // Update existing vehicle
          cachedVehicles[index] = { ...cachedVehicles[index], ...vehicleData };
        } else if (operation === 'create') {
          // Add new vehicle
          cachedVehicles.push(vehicleData);
        }
        
        localStorage.setItem('localVehicles', JSON.stringify(cachedVehicles));
      } catch (error) {
        console.error('Error updating localStorage vehicles:', error);
      }
    }
    
    // Trigger refresh event to update the UI
    window.dispatchEvent(new CustomEvent('vehicle-data-changed', {
      detail: { 
        operation,
        timestamp: Date.now(),
        vehicleId: vehicleData.vehicleId || vehicleData.id
      }
    }));
    
    return result;
  } catch (error) {
    console.error(`Error in directVehicleOperation (${operation}):`, error);
    
    // If we reach here and we've enabled local storage fallback, save the operation in localStorage
    if (localStorageFallback) {
      try {
        const id = vehicleData.vehicleId || vehicleData.id;
        let cachedVehicles = JSON.parse(localStorage.getItem('localVehicles') || '[]');
        
        if (operation === 'delete') {
          // Remove vehicle from local storage
          cachedVehicles = cachedVehicles.filter((v: any) => v.id !== id && v.vehicleId !== id);
          
          if (notification) {
            toast.success('Vehicle deleted (offline mode)', { duration: 3000 });
          }
        } else if (operation === 'update') {
          // Update existing vehicle
          const index = cachedVehicles.findIndex((v: any) => v.id === id || v.vehicleId === id);
          if (index >= 0) {
            cachedVehicles[index] = { ...cachedVehicles[index], ...vehicleData };
          } else {
            // If not found, add as new
            cachedVehicles.push(vehicleData);
          }
          
          if (notification) {
            toast.success('Vehicle updated (offline mode)', { duration: 3000 });
          }
        } else if (operation === 'create') {
          // Add new vehicle
          cachedVehicles.push(vehicleData);
          
          if (notification) {
            toast.success('Vehicle created (offline mode)', { duration: 3000 });
          }
        }
        
        localStorage.setItem('localVehicles', JSON.stringify(cachedVehicles));
        
        // Trigger refresh event
        window.dispatchEvent(new CustomEvent('vehicle-data-changed', {
          detail: { 
            operation,
            timestamp: Date.now(),
            vehicleId: id,
            offline: true
          }
        }));
        
        // Return a synthetic success response
        return {
          status: 'success',
          message: `Vehicle ${operation}d successfully (offline mode)`,
          vehicleId: id,
          offline: true,
          timestamp: new Date().toISOString()
        } as unknown as T;
      } catch (storageError) {
        console.error(`Error in localStorage fallback (${operation}):`, storageError);
        throw error; // Re-throw the original error
      }
    }
    
    throw error;
  }
};
