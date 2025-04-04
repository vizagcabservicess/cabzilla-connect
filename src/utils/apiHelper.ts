
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
export const forceEnableFallbackMode = (minutesDuration?: number): void => {
  localStorage.setItem('useFallbackMode', 'true');
  
  // If duration provided, set expiry time
  if (minutesDuration && minutesDuration > 0) {
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + minutesDuration);
    localStorage.setItem('fallback_mode_expiry', expiryTime.toISOString());
  } else {
    // Clear any existing expiry
    localStorage.removeItem('fallback_mode_expiry');
  }
  
  // Dispatch an event to notify other components
  window.dispatchEvent(new CustomEvent('fallback-mode-enabled'));
  
  console.log('Fallback mode enabled.');
  toast.info('Using fallback mode for vehicle data.');
};

// For backward compatibility
export const enableFallbackMode = forceEnableFallbackMode;

// Disable fallback mode
export const disableFallbackMode = (): void => {
  localStorage.removeItem('useFallbackMode');
  localStorage.removeItem('fallback_mode_expiry');
  
  // Dispatch an event to notify other components
  window.dispatchEvent(new CustomEvent('fallback-mode-disabled'));
  
  console.log('Fallback mode disabled.');
  toast.info('Fallback mode disabled.');
};

// Check if fallback mode is needed
export const isFallbackNeeded = (): boolean => {
  return localStorage.getItem('useFallbackMode') === 'true' || isPreviewMode();
};

// Get system status for components
export const getSystemStatus = (): {
  fallbackMode: boolean;
  fallbackExpiry: string | null;
  apiErrorCount: number;
  isPreview: boolean;
} => {
  const fallbackMode = isFallbackNeeded();
  const fallbackExpiry = localStorage.getItem('fallback_mode_expiry');
  const apiErrorCount = parseInt(localStorage.getItem('api_error_count') || '0', 10);
  const isPreview = isPreviewMode();
  
  return {
    fallbackMode,
    fallbackExpiry,
    apiErrorCount,
    isPreview
  };
};

// Auto fix database issues
export const autoFixDatabaseIssues = async (): Promise<{success: boolean; message: string}> => {
  try {
    // First try to fix database tables
    const fixResult = await fixDatabaseTables();
    
    if (fixResult) {
      return { success: true, message: 'Database tables fixed successfully' };
    }
    
    // If that doesn't work, try alternative method
    const response = await fetch(`${apiBaseUrl}/api/admin/fix-database.php?_t=${Date.now()}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Admin-Mode': 'true',
        'X-Debug': 'true'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return { 
        success: data.status === 'success', 
        message: data.message || 'Auto-fix completed with partial success'
      };
    }
    
    return { success: false, message: 'Auto-fix failed, database may need manual repair' };
  } catch (error) {
    console.error('Error in autoFixDatabaseIssues:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error during auto-fix'
    };
  }
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

// Type definition for DB connection result
export interface DbConnectionResult {
  working: boolean;
  message: string;
  version?: string;
  structure?: Record<string, any>;
}

// Check database connection
export const checkDatabaseConnection = async (): Promise<DbConnectionResult> => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/admin/check-connection.php?_t=${Date.now()}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Admin-Mode': 'true'
      }
    });
    
    if (!response.ok) {
      return {
        working: false,
        message: `HTTP error ${response.status}`
      };
    }
    
    const data = await response.json();
    return {
      working: data.connection === true,
      message: data.message || (data.connection ? 'Database connection successful' : 'Database connection failed'),
      version: data.version,
      structure: data.structure
    };
  } catch (error) {
    console.error("Error checking database connection:", error);
    return {
      working: false,
      message: error instanceof Error ? error.message : "Unknown error checking connection"
    };
  }
};

// Get mock vehicle data for fallback
export const getMockVehicleData = async (vehicleId?: string): Promise<any> => {
  try {
    // First try to get from localStorage
    const cachedData = localStorage.getItem('mockVehicleData');
    let vehicles = [];
    
    if (cachedData) {
      vehicles = JSON.parse(cachedData);
    } else {
      // If not in localStorage, fetch from public data
      const response = await fetch('/data/vehicles.json');
      const data = await response.json();
      
      // Cache in localStorage
      localStorage.setItem('mockVehicleData', JSON.stringify(data.vehicles || []));
      
      vehicles = data.vehicles || [];
    }
    
    // If vehicleId is provided, filter for that specific vehicle
    if (vehicleId) {
      return {
        vehicles: vehicles.filter((v: any) => v.id === vehicleId || v.id.toString() === vehicleId.toString())
      };
    }
    
    return { vehicles };
  } catch (error) {
    console.error("Error fetching mock vehicle data:", error);
    return { vehicles: [] };
  }
};
