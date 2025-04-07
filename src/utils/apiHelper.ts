
import { toast } from 'sonner';

interface ApiResponse {
  status: 'success' | 'error';
  message?: string;
  [key: string]: any;
}

interface ApiOptions {
  headers?: Record<string, string>;
  data?: any;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  timeout?: number;
}

export interface DatabaseConnectionResponse {
  connection: boolean;
  message?: string;
  version?: string;
  tables?: string[];
}

const API_TIMEOUT = 20000; // 20 seconds default timeout

/**
 * Logs API operations to console and/or storage
 */
export function logOperation(endpoint: string, method: string, success: boolean, data?: any, error?: any) {
  console.log(`API ${method} ${endpoint}: ${success ? 'Success' : 'Failed'}`, data || error);
  
  // Append to in-memory log
  const logEntry = {
    timestamp: new Date().toISOString(),
    endpoint,
    method,
    success,
    data: data || null,
    error: error ? (typeof error === 'string' ? error : error.message || 'Unknown error') : null
  };
  
  // Save to sessionStorage with some limit
  try {
    const logs = JSON.parse(sessionStorage.getItem('api_logs') || '[]');
    logs.unshift(logEntry);
    // Keep only last 100 logs
    if (logs.length > 100) logs.length = 100;
    sessionStorage.setItem('api_logs', JSON.stringify(logs));
  } catch (e) {
    console.error('Error saving logs to sessionStorage', e);
  }
}

/**
 * Format data for multipart form submission
 * This is more reliable for PHP endpoints than JSON
 */
export const formatDataForMultipart = (data: Record<string, any>): FormData => {
  const formData = new FormData();
  
  Object.entries(data).forEach(([key, value]) => {
    // Handle arrays and objects
    if (typeof value === 'object' && value !== null) {
      formData.append(key, JSON.stringify(value));
    } else {
      // Convert other values to string
      formData.append(key, String(value ?? ''));
    }
  });
  
  return formData;
};

/**
 * Enhanced fetch with timeout and retries
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = API_TIMEOUT } = options;
  
  // Create a new options object without the timeout property
  const fetchOptions: RequestInit = { ...options };
  // Remove timeout from fetchOptions since it's not part of RequestInit
  if ('timeout' in fetchOptions) {
    delete (fetchOptions as any).timeout;
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
    
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Make an API call to the backend with better error handling
 */
export async function apiCall(endpoint: string, options: ApiOptions = {}): Promise<ApiResponse> {
  const { 
    headers = {}, 
    data = null, 
    method = data ? 'POST' : 'GET',
    timeout = API_TIMEOUT
  } = options;
  
  const url = endpoint.startsWith('http') ? endpoint : `/${endpoint}`;
  
  try {
    const fetchOptions: RequestInit & { timeout?: number } = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...headers
      },
      cache: 'no-store',
      timeout
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = JSON.stringify(data);
    }
    
    const response = await fetchWithTimeout(url, fetchOptions);
    
    try {
      // First try to get the response as text
      const textResponse = await response.text();
      
      // Detect HTML responses (which would indicate an error)
      if (textResponse.trim().startsWith('<!DOCTYPE html>') || 
          textResponse.trim().startsWith('<html') || 
          textResponse.trim().startsWith('<?php')) {
        console.error('Received HTML instead of JSON:', textResponse.substring(0, 500));
        
        logOperation(endpoint, method, false, null, `Received HTML instead of JSON: ${textResponse.substring(0, 100)}...`);
        
        // Return a structured error response
        return {
          status: 'error',
          message: 'Server returned HTML instead of JSON. This usually indicates a PHP error.',
          htmlResponse: textResponse.substring(0, 500)
        };
      }
      
      try {
        // Try to parse as JSON
        const jsonResponse = JSON.parse(textResponse);
        
        // Log the successful operation
        logOperation(endpoint, method, true, jsonResponse);
        
        return jsonResponse;
      } catch (jsonError) {
        // If parsing fails, log the raw response
        console.error('Error parsing JSON response:', textResponse);
        
        logOperation(endpoint, method, false, null, `Invalid JSON: ${textResponse.substring(0, 200)}`);
        
        throw new Error(`Invalid JSON response: ${textResponse.substring(0, 200)}...`);
      }
    } catch (textError) {
      console.error('Error reading response text:', textError);
      logOperation(endpoint, method, false, null, 'Error reading response');
      throw new Error('Error reading API response');
    }
  } catch (error: any) {
    console.error(`API call failed for ${endpoint}:`, error);
    
    logOperation(endpoint, method, false, null, error.message || 'Unknown error');
    
    // Return a structured error response
    return {
      status: 'error',
      message: error.message || 'API call failed with unknown error',
      error: error.toString()
    };
  }
}

/**
 * Check database connection status
 */
export async function checkDatabaseConnection(): Promise<DatabaseConnectionResponse> {
  try {
    const timestamp = Date.now();
    const response = await apiCall(`api/admin/check-connection.php?_t=${timestamp}`, {
      method: 'GET',
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      timeout: 10000
    });
    
    if (response.status === 'success') {
      return {
        connection: true,
        message: response.message || 'Connected successfully',
        version: response.version,
        tables: response.tables
      };
    } else {
      return {
        connection: false,
        message: response.message || 'Connection failed'
      };
    }
  } catch (error: any) {
    console.error('Error checking database connection:', error);
    return {
      connection: false,
      message: error.message || 'Error checking connection'
    };
  }
}

/**
 * Fix database tables with improved error handling
 */
export async function fixDatabaseTables(): Promise<boolean> {
  try {
    const timestamp = Date.now();
    // Try direct form submission first - more reliable for PHP
    const formData = new FormData();
    formData.append('timestamp', timestamp.toString());
    formData.append('action', 'fix');
    
    console.log('Attempting to fix database tables with form data...');
    
    // First attempt with FormData
    try {
      const formResponse = await fetch('/api/admin/fix-database.php', {
        method: 'POST',
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: formData
      });
      
      const textResponse = await formResponse.text();
      
      // Check if we got HTML instead of JSON
      if (textResponse.trim().startsWith('<!DOCTYPE html>') || 
          textResponse.trim().startsWith('<html') || 
          textResponse.trim().startsWith('<?php')) {
        console.error('Received HTML response when fixing database:', textResponse.substring(0, 500));
        // Continue to try JSON approach below
      } else {
        try {
          const jsonResponse = JSON.parse(textResponse);
          if (jsonResponse.status === 'success') {
            console.log('Database fixed successfully with form data:', jsonResponse);
            toast.success('Database tables fixed successfully');
            return true;
          }
        } catch (jsonError) {
          console.error('Error parsing JSON from form response:', jsonError);
          // Continue to try JSON approach below
        }
      }
    } catch (formError) {
      console.error('Form data approach failed:', formError);
      // Continue to try JSON approach below
    }
    
    // Fall back to standard JSON approach
    console.log('Falling back to JSON approach...');
    const response = await apiCall(`api/admin/fix-database.php?_t=${timestamp}`, {
      method: 'GET',
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': timestamp.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      timeout: 30000 // Longer timeout for database operations
    });
    
    console.log('Fix database response:', response);
    
    if (response.status === 'success') {
      // If there were tables fixed, log them
      if (response.fixed && Array.isArray(response.fixed) && response.fixed.length > 0) {
        console.log('Fixed tables:', response.fixed);
      }
      
      toast.success('Database tables fixed successfully');
      return true;
    }
    
    console.error('Failed to fix database tables:', response.message || 'Unknown error');
    toast.error(response.message || 'Failed to fix database tables');
    return false;
  } catch (error: any) {
    console.error('Error fixing database tables:', error);
    toast.error('Error fixing database: ' + (error.message || 'Unknown error'));
    return false;
  }
}

/**
 * Force refresh vehicles data
 */
export async function forceRefreshVehicles(): Promise<boolean> {
  try {
    const timestamp = Date.now();
    const response = await apiCall(`api/admin/reload-vehicles.php?_t=${timestamp}`, {
      method: 'GET',
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': timestamp.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (response.status === 'success') {
      toast.success('Vehicles data refreshed successfully');
      return true;
    }
    
    toast.error(response.message || 'Failed to refresh vehicles data');
    return false;
  } catch (error: any) {
    console.error('Error refreshing vehicles:', error);
    toast.error('Error refreshing vehicles: ' + (error.message || 'Unknown error'));
    return false;
  }
}

/**
 * Direct operation on vehicle data with improved error handling
 */
export async function directVehicleOperation(endpoint: string, method: string = 'GET', options: ApiOptions = {}): Promise<any> {
  try {
    const timestamp = Date.now();
    // Add timestamp to endpoint to prevent caching
    const endpointWithTimestamp = endpoint.includes('?') 
      ? `${endpoint}&_t=${timestamp}` 
      : `${endpoint}?_t=${timestamp}`;
    
    const response = await apiCall(endpointWithTimestamp, {
      method: method as 'GET' | 'POST' | 'PUT' | 'DELETE',
      headers: {
        ...options.headers,
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      ...options
    });
    
    return response;
  } catch (error: any) {
    console.error(`Error in direct vehicle operation (${endpoint}):`, error);
    throw error;
  }
}

/**
 * Returns true if the application is in preview mode
 */
export function isPreviewMode(): boolean {
  return window.location.hostname.includes('preview') ||
         window.location.hostname.includes('lovable.app') ||
         window.location.hostname.includes('localhost');
}
