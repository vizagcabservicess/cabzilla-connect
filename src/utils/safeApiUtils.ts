
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
      // If endpoint doesn't start with a slash, add it
      const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      url = formattedEndpoint;
    }
    
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

  for (const endpoint of endpoints) {
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
  
  // Try one more time with direct fetch API
  try {
    const endpoint = endpoints[0];
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
      const data = await response.json();
      console.log(`Direct fetch succeeded for ${endpoint}`);
      return data as T;
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
  // First try the API endpoints
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
