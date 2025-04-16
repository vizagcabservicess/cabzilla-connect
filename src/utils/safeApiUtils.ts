
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
    // Get the full URL with the proper base path
    const url = getApiUrl(endpoint);
    
    console.log(`Making API request to: ${url}`);
    
    // Apply default headers for better caching control
    const headers = {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
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

    // Check if the response is HTML (which indicates an error in our PHP API)
    if (typeof response.data === 'string' && 
        (response.data.includes('<!DOCTYPE html>') || 
         response.data.includes('<html'))) {
      console.error(`API endpoint ${url} returned HTML instead of JSON`, response.data.substring(0, 150));
      return null;
    }

    return response.data as T;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle specific Axios errors
      if (error.code === 'ECONNABORTED') {
        console.error(`API request to ${endpoint} timed out`);
      } else if (error.response) {
        console.error(`API request to ${endpoint} failed with status ${error.response.status}:`, error.response.data);
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

  // Try the backend PHP templates first for Lovable environment
  const prioritizedEndpoints = [...endpoints].map(endpoint => {
    // Ensure local PHP endpoints use the correct path
    if (endpoint.includes('.php') && !endpoint.includes('/backend/php-templates')) {
      const trimmedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      return `/backend/php-templates${trimmedEndpoint}`;
    }
    return endpoint;
  });

  console.log(`Attempting to fetch pricing data from ${prioritizedEndpoints.length} endpoints`);
  
  for (let i = 0; i < prioritizedEndpoints.length; i++) {
    const endpoint = prioritizedEndpoints[i];
    try {
      console.log(`Trying endpoint ${i+1}/${endpoints.length}: ${endpoint}`);
      const result = await safeApiRequest<T>(endpoint, config);
      if (result) {
        console.log(`Successfully fetched data from endpoint: ${endpoint}`);
        return result;
      } else {
        console.warn(`Endpoint ${endpoint} returned no valid data`);
      }
    } catch (error) {
      failures++;
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`API endpoint ${endpoint} failed (${failures}/${endpoints.length}), trying next endpoint`);
    }
  }

  console.error(`All ${endpoints.length} API endpoints failed. Last error:`, lastError);
  
  // Try one more time with direct fetch API for PHP endpoints
  try {
    const endpoint = prioritizedEndpoints.find(ep => ep.includes('.php')) || prioritizedEndpoints[0];
    console.log(`Trying one last attempt with direct fetch: ${endpoint}`);
    
    // Convert Axios headers to standard fetch headers
    const fetchHeaders: Record<string, string> = {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };
    
    // Safely copy relevant headers from config
    if (config.headers) {
      // Extract and convert headers to string values
      Object.entries(config.headers).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          fetchHeaders[key] = String(value);
        }
      });
    }
    
    const response = await fetch(endpoint, {
      headers: fetchHeaders
    });
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      // Check if the response is HTML
      if (contentType && contentType.includes('text/html')) {
        console.error(`Endpoint ${endpoint} returned HTML instead of JSON`);
        return null;
      }
      
      const data = await response.json();
      console.log(`Direct fetch succeeded for ${endpoint}`);
      return data as T;
    } else {
      console.error(`Direct fetch failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error('Final direct fetch attempt also failed:', error);
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
  // First try the local endpoints in Lovable environment
  const phpTemplateEndpoints = apiEndpoints.map(endpoint => {
    if (endpoint.includes('.php') && !endpoint.includes('/backend/php-templates')) {
      const trimmedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      return `/backend/php-templates${trimmedEndpoint}`;
    }
    return endpoint;
  });
  
  const apiResult = await tryMultipleEndpoints<T>(phpTemplateEndpoints, config);
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
