
/**
 * Utility functions for safely handling API operations
 */

import axios, { AxiosRequestConfig } from 'axios';
import { getApiUrl } from '@/config/api';

/**
 * Safely makes an API request with extensive error handling
 * @param endpoint API endpoint path
 * @param config Axios request configuration
 * @returns Response data or null on error
 */
export async function safeApiRequest<T = any>(endpoint: string, config: AxiosRequestConfig = {}): Promise<T | null> {
  if (!endpoint) {
    console.error('Invalid endpoint provided for API request');
    return null;
  }

  try {
    // Endpoint could be either relative or absolute URL
    let url = endpoint;
    
    // Only add the base URL if the endpoint is not already a full URL
    if (!endpoint.match(/^https?:\/\//i)) {
      // Special handling for PHP endpoints in the Lovable environment
      if (endpoint.includes('.php')) {
        // For PHP endpoints, prioritize the backend path
        if (!endpoint.startsWith('/backend/') && !endpoint.startsWith('/api/')) {
          // Strip any leading slash for cleaner concatenation
          const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
          url = `/backend/php-templates/api/${cleanEndpoint}`;
          console.log(`Converted PHP endpoint to backend path: ${url}`);
        } else {
          url = endpoint;
        }
      } else {
        // If endpoint doesn't start with a slash, add it
        url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      }
    }
    
    console.log(`Making API request to: ${url}`);
    
    // Apply default headers for better caching control
    const headers = {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'X-Requested-With': 'XMLHttpRequest',
      ...config.headers
    };

    // Make the request with a reasonable timeout
    const response = await axios({
      method: config.method || 'get',
      url,
      ...config,
      headers,
      timeout: config.timeout || 8000
    });

    return response.data as T;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle specific Axios errors
      if (error.code === 'ECONNABORTED') {
        console.error(`API request to ${endpoint} timed out`);
      } else if (error.response) {
        console.error(`API request to ${endpoint} failed with status ${error.response.status}:`, error.response.data);
        
        // If we get a 404 for a PHP endpoint, try the fallback path
        if (error.response.status === 404 && endpoint.includes('.php')) {
          try {
            console.log(`Trying fallback for PHP endpoint ${endpoint}`);
            
            // Try with a different path structure
            const endpointBase = endpoint.split('/').pop() || '';
            const fallbackUrl = `/backend/php-templates/api/${endpointBase}`;
            
            console.log(`Using fallback URL: ${fallbackUrl}`);
            
            const fallbackResponse = await axios({
              method: config.method || 'get',
              url: fallbackUrl,
              ...config,
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'X-Requested-With': 'XMLHttpRequest',
                ...config.headers
              },
              timeout: config.timeout || 8000
            });
            
            return fallbackResponse.data as T;
          } catch (fallbackError) {
            console.error(`Fallback PHP endpoint also failed:`, fallbackError);
          }
        }
      } else if (error.request) {
        console.error(`No response received from ${endpoint}:`, error.message);
      } else {
        console.error(`Error setting up API request to ${endpoint}:`, error.message);
      }
    } else {
      console.error(`Unexpected error during API request to ${endpoint}:`, error);
    }
    
    return null;
  }
}

/**
 * Attempts to make an API request to multiple endpoints, using the first successful response
 * @param endpoints Array of endpoint paths to try
 * @param config Axios request configuration
 * @returns First successful response data or null if all fail
 */
export async function tryMultipleEndpoints<T = any>(
  endpoints: string[], 
  config: AxiosRequestConfig = {}
): Promise<T | null> {
  if (!endpoints || !Array.isArray(endpoints) || endpoints.length === 0) {
    console.error('No valid endpoints provided for API request');
    return null;
  }

  let lastError: Error | null = null;
  let failures = 0;

  // Always prioritize backend PHP template paths for PHP files
  const prioritizedEndpoints = [...endpoints];
  prioritizedEndpoints.sort((a, b) => {
    // First priority: backend PHP templates
    if (a.includes('/backend/php-templates/') && !b.includes('/backend/php-templates/')) return -1;
    if (!a.includes('/backend/php-templates/') && b.includes('/backend/php-templates/')) return 1;
    
    // Second priority: API paths
    if (a.startsWith('/api/') && !b.startsWith('/api/')) return -1;
    if (!a.startsWith('/api/') && b.startsWith('/api/')) return 1;
    
    return 0;
  });

  for (const endpoint of prioritizedEndpoints) {
    try {
      console.log(`Trying endpoint ${failures+1}/${endpoints.length}: ${endpoint}`);
      const result = await safeApiRequest<T>(endpoint, config);
      if (result) {
        console.log(`Successfully fetched data from endpoint: ${endpoint}`);
        return result;
      }
    } catch (error) {
      failures++;
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`API endpoint ${endpoint} failed (${failures}/${endpoints.length}), trying next endpoint`);
    }
  }

  console.error(`All ${endpoints.length} API endpoints failed. Last error:`, lastError);
  
  // Try alternatives for PHP files before giving up completely
  const phpEndpoints = endpoints.filter(e => e.includes('.php'));
  if (phpEndpoints.length > 0) {
    for (const phpEndpoint of phpEndpoints) {
      try {
        // Extract the PHP filename
        const phpFile = phpEndpoint.split('/').pop() || '';
        // Try various path combinations
        const alternativePaths = [
          `/backend/php-templates/api/${phpFile}`, 
          `/api/${phpFile}`,
          `/${phpFile}`
        ];
        
        for (const altPath of alternativePaths) {
          try {
            console.log(`Trying one last attempt with path: ${altPath}`);
            const response = await fetch(altPath, {
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log(`Alternative path succeeded for ${altPath}`);
              return data as T;
            }
          } catch (altError) {
            console.warn(`Alternative path ${altPath} failed:`, altError);
          }
        }
      } catch (error) {
        console.error('Final PHP alternatives also failed:', error);
      }
    }
  }
  
  return null;
}

/**
 * Fetches data from a local fallback file when API requests fail
 * @param apiEndpoints API endpoints to try first
 * @param fallbackPath Path to local fallback JSON file
 * @param config Axios request configuration
 * @returns API response or fallback data
 */
export async function fetchWithLocalFallback<T = any>(
  apiEndpoints: string[],
  fallbackPath: string,
  config: AxiosRequestConfig = {}
): Promise<T | null> {
  // First try the backend PHP templates for PHP endpoints
  const phpEndpoints = apiEndpoints.filter(ep => ep.includes('.php'));
  const backendPhpEndpoints = phpEndpoints.map(ep => {
    const phpFile = ep.split('/').pop() || '';
    return `/backend/php-templates/api/${phpFile}`;
  });
  
  if (backendPhpEndpoints.length > 0) {
    const backendResult = await tryMultipleEndpoints<T>(backendPhpEndpoints, config);
    if (backendResult) {
      return backendResult;
    }
  }
  
  // Then try the local endpoints
  const localEndpoints = apiEndpoints.filter(ep => ep.startsWith('/api') || ep.startsWith('/backend'));
  
  if (localEndpoints.length > 0) {
    const localResult = await tryMultipleEndpoints<T>(localEndpoints, config);
    if (localResult) {
      return localResult;
    }
  }
  
  // Then try all endpoints
  const apiResult = await tryMultipleEndpoints<T>(apiEndpoints, config);
  if (apiResult) {
    return apiResult;
  }

  // If API fails, try the local fallback
  try {
    console.log(`All API endpoints failed, trying local fallback: ${fallbackPath}`);
    const fallbackResponse = await fetch(fallbackPath);
    if (!fallbackResponse.ok) {
      throw new Error(`Fallback fetch failed with status: ${fallbackResponse.status}`);
    }
    const fallbackData = await fallbackResponse.json();
    console.log(`Successfully loaded fallback data from: ${fallbackPath}`);
    return fallbackData as T;
  } catch (fallbackError) {
    console.error(`Fallback data fetch failed:`, fallbackError);
    return null;
  }
}
