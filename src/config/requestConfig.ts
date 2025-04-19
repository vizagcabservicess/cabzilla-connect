
/**
 * Configuration for API requests with fallback mechanisms
 */

import { forceRefreshHeaders } from './api';
import axios, { AxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';

/**
 * Safe fetch implementation with timeout and error handling
 * @param url The URL to fetch
 * @param options Fetch options
 * @param timeout Timeout in milliseconds (default: 10000)
 * @returns Promise with the fetch response
 */
export const safeFetch = async (
  url: string, 
  options: RequestInit = {}, 
  timeout: number = 10000
): Promise<Response> => {
  // Add a timeout to the fetch request
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    // Ensure headers exist
    if (!options.headers) {
      options.headers = {};
    }
    
    // Add force refresh headers if not present
    Object.entries(forceRefreshHeaders).forEach(([key, value]) => {
      if (!options.headers[key]) {
        options.headers[key] = value;
      }
    });
    
    // Add signal from abort controller
    options.signal = controller.signal;
    
    // Make the request
    const response = await fetch(url, options);
    
    // Check if the response is ok
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Fetch with retry logic for unreliable connections
 * @param url The URL to fetch
 * @param options Fetch options
 * @param retries Number of retries (default: 3)
 * @param delayMs Delay between retries in milliseconds (default: 1000)
 * @returns Promise with the fetch response
 */
export const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  retries: number = 3,
  delayMs: number = 1000
): Promise<Response> => {
  let lastError: Error;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await safeFetch(url, options);
    } catch (error) {
      console.warn(`Attempt ${i + 1}/${retries} failed for ${url}:`, error);
      lastError = error as Error;
      
      // If this is not the last retry, wait before trying again
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError;
};

/**
 * Get request configuration with force refresh headers
 * This ensures the server doesn't return cached responses
 * @returns AxiosRequestConfig object with appropriate headers
 */
export const getForcedRequestConfig = (): AxiosRequestConfig => {
  return {
    headers: {
      ...forceRefreshHeaders,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    } as RawAxiosRequestHeaders,
    cache: 'no-store'
  };
};

/**
 * Get bypass headers for authentication and security mechanisms
 * @param token Optional authentication token
 * @returns Record of header keys and values
 */
export const getBypassHeaders = (token?: string): RawAxiosRequestHeaders => {
  const headers: RawAxiosRequestHeaders = {
    ...forceRefreshHeaders,
    'X-Bypass-Cache': 'true',
    'X-Direct-Access': 'true'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

/**
 * Format data for multipart form submission
 * @param data Object containing form data
 * @returns FormData object ready for submission
 */
export const formatDataForMultipart = (data: Record<string, any>): FormData => {
  const formData = new FormData();
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (value instanceof File) {
        formData.append(key, value);
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (item instanceof File) {
            formData.append(`${key}[${index}]`, item);
          } else {
            formData.append(`${key}[${index}]`, String(item));
          }
        });
      } else if (typeof value === 'object' && !(value instanceof File)) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    }
  });
  
  return formData;
};
