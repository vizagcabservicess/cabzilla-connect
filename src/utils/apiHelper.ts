// Configuration and helpers for API requests
import { toast } from 'sonner';
import { apiBaseUrl } from '@/config/api';

/**
 * Function to determine if running in preview mode
 */
export const isPreviewMode = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('localhost') ||
     window.location.hostname.includes('127.0.0.1') ||
     window.location.hostname.includes('vizagtaxihub.com') ||
     window.location.hostname.includes('demo'))
  );
};

/**
 * Generic function to handle API operations for vehicles
 */
export const directVehicleOperation = async (
  endpoint: string,
  method: string = 'GET',
  options: {
    headers?: Record<string, string>;
    data?: any;
    mock?: any;
    fallback?: any;
  } = {}
): Promise<any> => {
  // Use mock data in preview mode if provided
  if (isPreviewMode() && options.mock) {
    console.log(`[Preview Mode] Using mock data for ${endpoint}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return options.mock;
  }
  
  try {
    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(options.headers || {})
      }
    };
    
    // Add body data if provided and not GET request
    if (options.data && method !== 'GET') {
      requestOptions.body = JSON.stringify(options.data);
    }
    
    // For GET requests with data, add as query params
    let url = `${apiBaseUrl}/${endpoint}`;
    if (options.data && method === 'GET') {
      const params = new URLSearchParams();
      Object.entries(options.data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      url += `?${params.toString()}`;
    }
    
    // Make the request
    console.log(`Calling API: ${url}`);
    const response = await fetch(url, requestOptions);
    
    // If not OK response, try to parse error message
    if (!response.ok) {
      let errorDetails = {};
      try {
        errorDetails = await response.json();
      } catch (e) {
        // Ignore parse errors
      }
      
      throw new Error(`API request failed: ${response.status} ${response.statusText}. ${JSON.stringify(errorDetails)}`);
    }
    
    // Parse and return JSON response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        return await response.json();
      } catch (e) {
        console.error('Error parsing JSON response:', e);
        return null;
      }
    }
    
    // Return text for non-JSON responses
    return await response.text();
  } catch (error) {
    console.error(`API error for ${endpoint}:`, error);
    
    // Return fallback data if provided and in preview mode
    if (isPreviewMode() && options.fallback) {
      console.warn(`Using fallback data for ${endpoint}`);
      return options.fallback;
    }
    
    throw error;
  }
};

/**
 * Format data for multipart form submission
 */
export const formatDataForMultipart = (data: any): FormData => {
  const formData = new FormData();
  
  // Special handling for JSON data
  if (data) {
    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      
      if (Array.isArray(value)) {
        // Serialize arrays as JSON
        formData.append(key, JSON.stringify(value));
      } else if (typeof value === 'object' && !(value instanceof File)) {
        // Serialize objects as JSON
        formData.append(key, JSON.stringify(value));
      } else {
        // Add primitive values or files directly
        formData.append(key, value as any);
      }
    });
  }
  
  return formData;
};

/**
 * Utility to fix database tables
 */
export const fixDatabaseTables = async (): Promise<boolean> => {
  try {
    console.log('Attempting to fix database tables...');
    
    // Clear any cached vehicle data first
    const vehicleDataService = await import('@/services/vehicleDataService');
    vehicleDataService.clearVehicleDataCache();
    
    // Call the fix-database endpoint
    const response = await directVehicleOperation('api/admin/fix-database.php', 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    console.log('Fix database response:', response);
    
    if (response && response.status === 'success') {
      console.log('Database tables fixed successfully');
      return true;
    }
    
    // Try alternative fix method
    const altResponse = await fetch(`${apiBaseUrl}/api/admin/fix-vehicle-tables.php?_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Admin-Mode': 'true'
      }
    });
    
    const altResult = await altResponse.json();
    return altResult && altResult.status === 'success';
  } catch (error) {
    console.error('Error fixing database tables:', error);
    return false;
  }
};

/**
 * Check database connection
 */
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const response = await directVehicleOperation('api/admin/check-connection.php', 'GET', {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Admin-Mode': 'true'
      }
    });
    
    return response && response.connection === true;
  } catch (error) {
    console.error('Error checking database connection:', error);
    return false;
  }
};

/**
 * Force a refresh of the vehicle data cache
 */
export const forceRefreshVehicles = async (): Promise<boolean> => {
  try {
    // First clear existing cache
    const vehicleDataService = await import('@/services/vehicleDataService');
    vehicleDataService.clearVehicleDataCache();
    
    // Call the reload endpoint
    const response = await directVehicleOperation(
      `api/admin/reload-vehicles.php?_t=${Date.now()}`,
      'GET',
      {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
    
    return response && response.status === 'success';
  } catch (error) {
    console.error('Error refreshing vehicles:', error);
    return false;
  }
};

/**
 * Create a new vehicle
 */
export const createVehicle = async (vehicleData: any): Promise<any> => {
  try {
    return await directVehicleOperation('api/admin/direct-vehicle-create.php', 'POST', {
      data: vehicleData,
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true'
      }
    });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    throw error;
  }
};

/**
 * Update an existing vehicle
 */
export const updateVehicle = async (vehicleData: any): Promise<any> => {
  try {
    return await directVehicleOperation('api/admin/direct-vehicle-update.php', 'POST', {
      data: vehicleData,
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true'
      }
    });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    throw error;
  }
};

/**
 * Delete a vehicle
 */
export const deleteVehicle = async (vehicleId: string): Promise<any> => {
  try {
    return await directVehicleOperation('api/admin/vehicle-delete.php', 'POST', {
      data: { id: vehicleId },
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true'
      }
    });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    throw error;
  }
};
