
/**
 * Helper utility for making direct API calls
 */

import { toast } from 'sonner';

/**
 * Makes a direct API call to fetch data 
 * 
 * @param endpoint The API endpoint to call
 * @param options Fetch options
 * @returns The API response
 */
export async function directApiCall(endpoint: string, options: RequestInit = {}) {
  try {
    // Add default headers if not provided
    const headers = {
      'X-Debug': 'true',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      ...(options.headers || {})
    };

    // Make the fetch request
    const response = await fetch(endpoint, {
      ...options,
      headers
    });

    // Check if the response was successful
    if (!response.ok) {
      throw new Error(`Direct API request failed with status: ${response.status}`);
    }

    // Get the response text
    const responseText = await response.text();
    
    // Try to parse the response as JSON
    try {
      return JSON.parse(responseText);
    } catch (jsonError) {
      console.error('Error parsing API response:', jsonError, responseText);
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
    }
  } catch (error) {
    console.error('Direct API call failed:', error);
    throw error;
  }
}

/**
 * Makes a direct API call with fallback options
 * 
 * @param primaryEndpoint The primary API endpoint to call
 * @param fallbackEndpoint The fallback API endpoint to call if the primary fails
 * @param options Fetch options
 * @returns The API response or null if both fail
 */
export async function directApiCallWithFallback(
  primaryEndpoint: string, 
  fallbackEndpoint: string, 
  options: RequestInit = {}
) {
  try {
    // Try the primary endpoint first
    return await directApiCall(primaryEndpoint, options);
  } catch (primaryError) {
    console.warn(`Primary endpoint (${primaryEndpoint}) failed:`, primaryError);
    
    try {
      // Try the fallback endpoint
      return await directApiCall(fallbackEndpoint, options);
    } catch (fallbackError) {
      console.error(`Fallback endpoint (${fallbackEndpoint}) also failed:`, fallbackError);
      throw fallbackError;
    }
  }
}

/**
 * Send data via a POST request to a direct API endpoint
 * 
 * @param endpoint The API endpoint to post to
 * @param data The data to send
 * @param options Additional fetch options
 * @returns The API response
 */
export async function directApiPost(endpoint: string, data: any, options: RequestInit = {}) {
  try {
    // Create FormData for more reliable transmission if data is an object
    const formData = new FormData();
    
    if (data && typeof data === 'object' && !(data instanceof FormData)) {
      // Add all properties to the FormData
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }
    
    // Make the API call
    const response = await fetch(endpoint, {
      method: 'POST',
      body: data instanceof FormData ? data : formData,
      headers: {
        'X-Debug': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        ...(options.headers || {})
      },
      ...options
    });
    
    // Check if the response was successful
    if (!response.ok) {
      throw new Error(`Direct API post failed with status: ${response.status}`);
    }
    
    // Get the response text
    const responseText = await response.text();
    
    // Log the response for debugging
    console.log(`Response from ${endpoint}:`, responseText);
    
    // Try to parse the response as JSON
    try {
      return JSON.parse(responseText);
    } catch (jsonError) {
      console.error('Error parsing API response:', jsonError, responseText);
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
    }
  } catch (error) {
    console.error('Direct API post failed:', error);
    throw error;
  }
}

/**
 * Send data via a POST request with fallback endpoint
 * 
 * @param primaryEndpoint The primary API endpoint to post to
 * @param fallbackEndpoint The fallback API endpoint to post to if the primary fails
 * @param data The data to send
 * @param options Additional fetch options
 * @returns The API response or null if both fail
 */
export async function directApiPostWithFallback(
  primaryEndpoint: string,
  fallbackEndpoint: string,
  data: any,
  options: RequestInit = {}
) {
  try {
    // Try the primary endpoint first
    return await directApiPost(primaryEndpoint, data, options);
  } catch (primaryError) {
    console.warn(`Primary POST endpoint (${primaryEndpoint}) failed:`, primaryError);
    
    try {
      // Try the fallback endpoint
      return await directApiPost(fallbackEndpoint, data, options);
    } catch (fallbackError) {
      console.error(`Fallback POST endpoint (${fallbackEndpoint}) also failed:`, fallbackError);
      throw fallbackError;
    }
  }
}
