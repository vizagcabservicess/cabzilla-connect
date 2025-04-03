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
      if (text.trim() === '') {
        return { status: 'success', message: 'Operation completed' };
      }
      throw new Error('Invalid JSON response from server');
    }
  } catch (error: any) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Convert Javascript object to FormData for multipart/form-data requests
export const formatDataForMultipart = (data: any): FormData => {
  const formData = new FormData();
  
  // Recursively add all fields to FormData, handling nested objects and arrays
  const addToFormData = (obj: any, prefix = '') => {
    // Convert simple values directly
    if (typeof obj !== 'object' || obj === null) {
      formData.append(prefix, String(obj));
      return;
    }
    
    // Handle arrays
    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        formData.append(`${prefix}[]`, '');
      } else if (typeof obj[0] !== 'object') {
        // For simple arrays, convert to JSON string
        formData.append(prefix, JSON.stringify(obj));
      } else {
        // For arrays of objects, append each with index notation
        obj.forEach((value, index) => {
          addToFormData(value, `${prefix}[${index}]`);
        });
      }
      return;
    }
    
    // Handle objects by recursively adding each property
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const keyPath = prefix ? `${prefix}[${key}]` : key;
      
      if (value === undefined || value === null) {
        formData.append(keyPath, '');
        return;
      }
      
      if (typeof value === 'object' && !(value instanceof File) && !(value instanceof Blob)) {
        // For nested objects
        addToFormData(value, keyPath);
      } else {
        // For primitive values, File and Blob
        formData.append(keyPath, value);
      }
    });
  };
  
  addToFormData(data);
  return formData;
};

// Function to fix database tables
export const fixDatabaseTables = async (): Promise<boolean> => {
  try {
    const urls = [
      `${apiBaseUrl}/api/admin/fix-vehicle-tables.php`,
      `${apiBaseUrl}/api/admin/repair-database.php`,
      `${apiBaseUrl}/api/admin/sync-vehicle-tables.php`
    ];
    
    let fixed = false;
    
    // Try each URL in sequence
    for (const url of urls) {
      try {
        console.log(`Attempting to fix database tables using ${url}`);
        
        const response = await fetch(`${url}?_t=${Date.now()}`, {
          method: 'GET',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-Force-Refresh': 'true',
            'X-Admin-Mode': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        
        const result = await response.json();
        
        if (result && (result.status === 'success' || result.success === true)) {
          console.log(`Successfully fixed database tables using ${url}`);
          fixed = true;
          break;
        }
      } catch (error) {
        console.error(`Failed to fix database tables using ${url}:`, error);
      }
    }
    
    return fixed;
  } catch (error) {
    console.error('Failed to fix database tables:', error);
    return false;
  }
};

// New helper function to standardize response formatting
export const formatApiResponse = <T>(data: any): { status: string; data: T | null; message?: string } => {
  if (!data) {
    return { status: 'error', data: null, message: 'No data received' };
  }
  
  // Check if response has expected format
  if (data.status === 'success' || data.status === 'error') {
    return {
      status: data.status,
      data: data.data || data.fares || data.result || null,
      message: data.message
    };
  }
  
  // If response doesn't follow standard format but has useful data
  if (Array.isArray(data) || (data && typeof data === 'object' && Object.keys(data).length > 0)) {
    return {
      status: 'success',
      data: data
    };
  }
  
  return { status: 'error', data: null, message: 'Invalid response format' };
};
