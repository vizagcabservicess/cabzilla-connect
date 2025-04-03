
import { apiBaseUrl } from '@/config/api';
import { toast } from 'sonner';

// Helper function that makes direct vehicle API requests with proper error handling
export const directVehicleOperation = async (endpoint: string, method: string, data?: any): Promise<any> => {
  try {
    const url = `${apiBaseUrl}/${endpoint}`;
    
    console.log(`Making ${method} request to ${url} with data:`, data);
    
    // Setup request options
    const options: RequestInit = {
      method,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Force-Refresh': 'true',
        'X-Admin-Mode': 'true'
      },
      credentials: 'same-origin'
    };
    
    // Add request body if data is provided
    if (data && (method === 'POST' || method === 'PUT')) {
      options.headers = {
        ...options.headers,
        'Content-Type': 'application/json'
      };
      options.body = JSON.stringify(data);
    }
    
    // Make the request
    const response = await fetch(url, options);
    
    // Check if response is OK
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      throw new Error(`Request failed with status code ${response.status}`);
    }
    
    // Parse response
    const contentType = response.headers.get('content-type');
    
    // Handle JSON response
    if (contentType && contentType.includes('application/json')) {
      const jsonResponse = await response.json();
      return jsonResponse;
    }
    
    // Handle text response
    const text = await response.text();
    
    // Try to parse as JSON even if content-type is not json
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse response as JSON:', text);
      return text;
    }
  } catch (error) {
    console.error(`API operation error for ${endpoint}:`, error);
    throw error;
  }
};

// Helper function to convert data to FormData for multipart/form-data submissions
export const formatDataForMultipart = (data: any): FormData => {
  const formData = new FormData();
  
  // Recursively append nested objects
  const appendData = (obj: any, prefix = '') => {
    if (obj === null || obj === undefined) return;
    
    if (typeof obj === 'object' && !(obj instanceof File) && !Array.isArray(obj)) {
      // Handle nested objects
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        const keyPath = prefix ? `${prefix}[${key}]` : key;
        appendData(value, keyPath);
      });
    } else if (Array.isArray(obj)) {
      // Handle arrays
      obj.forEach((item, index) => {
        const keyPath = `${prefix}[${index}]`;
        appendData(item, keyPath);
      });
    } else {
      // Handle primitive values and Files
      formData.append(prefix, obj);
    }
  };
  
  appendData(data);
  return formData;
};

// Utility function to fix database tables
export const fixDatabaseTables = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/admin/fix-database.php?_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Admin-Mode': 'true'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fix database tables: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.status === 'success';
  } catch (error) {
    console.error('Error fixing database tables:', error);
    return false;
  }
};
