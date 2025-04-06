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
 * Enhanced fetch with timeout and retries
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = API_TIMEOUT } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
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
 * Make an API call to the backend 
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
    const fetchOptions: RequestInit = {
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
      
      try {
        // Then try to parse as JSON
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
    const response = await apiCall('api/admin/check-connection.php', {
      method: 'GET',
      headers: {
        'X-Admin-Mode': 'true'
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
 * Fix database tables
 */
export async function fixDatabaseTables(): Promise<boolean> {
  try {
    const response = await apiCall('api/admin/fix-database.php', {
      method: 'GET',
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': Date.now().toString()
      },
      timeout: 20000
    });
    
    console.log('Fix database response:', response);
    
    if (response.status === 'success') {
      // If there were tables fixed, log them
      if (response.fixed && Array.isArray(response.fixed) && response.fixed.length > 0) {
        console.log('Fixed tables:', response.fixed);
      }
      
      return true;
    }
    
    console.error('Failed to fix database tables:', response.message || 'Unknown error');
    return false;
  } catch (error: any) {
    console.error('Error fixing database tables:', error);
    return false;
  }
}

/**
 * Force refresh vehicles data
 */
export async function forceRefreshVehicles(): Promise<boolean> {
  try {
    const response = await apiCall('api/admin/reload-vehicles.php', {
      method: 'GET',
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': Date.now().toString()
      }
    });
    
    return response.status === 'success';
  } catch (error) {
    console.error('Error refreshing vehicles:', error);
    return false;
  }
}

/**
 * Direct operation on vehicle data
 */
export async function directVehicleOperation(endpoint: string, method: string = 'GET', options: ApiOptions = {}): Promise<any> {
  try {
    const response = await apiCall(endpoint, {
      method: method as 'GET' | 'POST' | 'PUT' | 'DELETE',
      ...options
    });
    
    return response;
  } catch (error) {
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
