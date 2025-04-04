
import { apiBaseUrl } from '@/config/api';
import { toast } from "sonner";

const DEBUG_API = true;

// Check if we're in a development or preview environment
export const isPreviewMode = (): boolean => {
  return process.env.NODE_ENV === 'development' || 
    window.location.hostname.includes('preview') || 
    window.location.hostname.includes('localhost');
};

// Format data for multipart form submission
export const formatDataForMultipart = (data: Record<string, any>): FormData => {
  const formData = new FormData();
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (typeof value === 'object' && !(value instanceof File) && !(value instanceof Blob)) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    }
  });
  
  return formData;
};

// Enable fallback mode for vehicle data
export const forceEnableFallbackMode = (): void => {
  localStorage.setItem('useFallbackMode', 'true');
  
  // Dispatch an event to notify other components
  window.dispatchEvent(new CustomEvent('fallback-mode-enabled'));
  
  console.log('Fallback mode enabled.');
  toast.info('Using fallback mode for vehicle data.');
};

// For backward compatibility
export const enableFallbackMode = forceEnableFallbackMode;

// Check if fallback mode is needed
export const isFallbackNeeded = (): boolean => {
  return localStorage.getItem('useFallbackMode') === 'true' || isPreviewMode();
};

// Direct vehicle operation for admin operations
export const directVehicleOperation = async (
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any,
  isAdmin: boolean = false
): Promise<any> => {
  try {
    const headers: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest',
    };

    if (isAdmin) {
      headers['X-Admin-Mode'] = 'true';
    }

    // For GET requests
    if (method === 'GET') {
      const queryParams = data ? `?${new URLSearchParams(data).toString()}` : '';
      const url = `${apiBaseUrl}/${endpoint}${queryParams}`;
      
      if (DEBUG_API) console.log(`API ${method} request to: ${url}`);
      
      const response = await fetch(url, { method, headers });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      return await response.json();
    }
    
    // For POST, PUT, DELETE requests
    const url = `${apiBaseUrl}/${endpoint}`;
    
    if (DEBUG_API) console.log(`API ${method} request to: ${url}`, data);
    
    let body: string | FormData;
    
    if (data instanceof FormData) {
      body = data;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(data || {});
    }
    
    const response = await fetch(url, {
      method,
      headers,
      body
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error in ${endpoint}:`, error);
    throw error;
  }
};

// Fix database tables helper function
export const fixDatabaseTables = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/admin/fix-database-tables.php?_t=${Date.now()}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Admin-Mode': 'true'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error("Error fixing database tables:", error);
    return false;
  }
};

// Check database connection
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/admin/check-connection.php?_t=${Date.now()}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Admin-Mode': 'true'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    return data.connection === true;
  } catch (error) {
    console.error("Error checking database connection:", error);
    return false;
  }
};

// Get mock vehicle data for fallback
export const getMockVehicleData = async (): Promise<any[]> => {
  try {
    // First try to get from localStorage
    const cachedData = localStorage.getItem('mockVehicleData');
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    
    // If not in localStorage, fetch from public data
    const response = await fetch('/data/vehicles.json');
    const data = await response.json();
    
    // Cache in localStorage
    localStorage.setItem('mockVehicleData', JSON.stringify(data.vehicles));
    
    return data.vehicles;
  } catch (error) {
    console.error("Error fetching mock vehicle data:", error);
    return [];
  }
};
