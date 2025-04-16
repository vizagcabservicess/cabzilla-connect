
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
    // Ensure the endpoint has a leading slash if it's a relative path
    const normalizedEndpoint = endpoint.startsWith('/') || endpoint.startsWith('http') 
      ? endpoint 
      : `/${endpoint}`;
    
    // Construct the full URL if needed
    const url = normalizedEndpoint.startsWith('http') 
      ? normalizedEndpoint 
      : `${getApiUrl('')}${normalizedEndpoint}`;
    
    // Apply default headers for better caching control
    const headers = {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      ...config.headers
    };

    // Make the request with a reasonable timeout
    const response = await axios.get(url, {
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

  for (const endpoint of endpoints) {
    try {
      const result = await safeApiRequest<T>(endpoint, config);
      if (result) {
        return result;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`API endpoint ${endpoint} failed, trying next endpoint`);
    }
  }

  console.error(`All API endpoints failed. Last error:`, lastError);
  return null;
}
