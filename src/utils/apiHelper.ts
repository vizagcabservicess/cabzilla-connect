
import { CabType } from '@/types/cab';
import { apiBaseUrl } from '@/config/api';

/**
 * Helper function for making direct vehicle operations
 * 
 * @param endpoint API endpoint path
 * @param method HTTP method
 * @param options Additional options
 * @returns 
 */
export const directVehicleOperation = async (
  endpoint: string,
  method: string = 'GET',
  options: {
    headers?: Record<string, string>;
    data?: any;
  } = {}
) => {
  try {
    // Add timestamp to URL to prevent caching
    const url = `${apiBaseUrl}/${endpoint.startsWith('/') ? endpoint.slice(1) : endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...(options.headers || {})
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
      cache: 'no-store',
    };

    // For GET requests, remove Content-Type header and encode params in the URL
    let finalUrl = url;
    if (method === 'GET' && options.data) {
      const params = new URLSearchParams();
      Object.entries(options.data).forEach(([key, value]) => {
        params.append(key, String(value));
      });
      const separator = url.includes('?') ? '&' : '?';
      finalUrl = `${url}${separator}${params.toString()}`;
    } else if (method !== 'GET' && options.data) {
      fetchOptions.body = JSON.stringify(options.data);
    }

    const response = await fetch(finalUrl, fetchOptions);
    
    if (!response.ok) {
      throw new Error(`API response not OK: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in directVehicleOperation:', error);
    throw error;
  }
};

/**
 * Check if the application is running in preview mode
 */
export const isPreviewMode = (): boolean => {
  // Check if we're in a Lovable development environment
  if (typeof window !== 'undefined') {
    return window.location.hostname.includes('lovableproject.com') || 
           window.location.hostname.includes('localhost') ||
           window.location.hostname.includes('127.0.0.1');
  }
  return false;
};

/**
 * Format data for multipart form submission
 */
export const formatDataForMultipart = (data: any): FormData => {
  const formData = new FormData();
  
  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      formData.append(key, JSON.stringify(value));
    } else if (typeof value === 'object' && value !== null) {
      formData.append(key, JSON.stringify(value));
    } else if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });
  
  return formData;
};

/**
 * Fix database tables
 */
export const fixDatabaseTables = async (): Promise<boolean> => {
  try {
    console.log('Attempting to fix database tables...');
    
    // Try the primary fix-database endpoint
    const response = await fetch(`${apiBaseUrl}/api/admin/fix-database.php?_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      console.error('Primary database fix failed with status:', response.status);
      
      // Try alternate endpoint
      const altResponse = await fetch(`${apiBaseUrl}/api/admin/repair-tables.php?_t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (!altResponse.ok) {
        console.error('Alternate database fix failed with status:', altResponse.status);
        return false;
      }
      
      const altResult = await altResponse.json();
      return altResult && altResult.status === 'success';
    }
    
    const result = await response.json();
    return result && result.status === 'success';
  } catch (error) {
    console.error('Error fixing database tables:', error);
    return false;
  }
};
