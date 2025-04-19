
/**
 * Configuration for API requests with fallback mechanisms
 */

import { forceRefreshHeaders } from './api';

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
