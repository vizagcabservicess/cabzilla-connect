
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { toast } from 'sonner';

/**
 * Default API options
 */
const defaultOptions: AxiosRequestConfig = {
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'X-Debug': 'true'
  },
  timeout: 15000 // 15 seconds
};

/**
 * Main API call function using Axios
 */
export async function apiCall(
  endpoint: string, 
  options: AxiosRequestConfig = {}
): Promise<any> {
  try {
    // Merge default options with provided options
    const mergedOptions: AxiosRequestConfig = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };
    
    // Log request details for debugging
    console.log(`API call to ${endpoint}`, mergedOptions);
    
    // Make the API call
    const response = await axios(endpoint, mergedOptions);
    
    // Log successful response
    console.log(`API response from ${endpoint}:`, response.data);
    
    // Return the response data
    return response.data;
  } catch (error: any) {
    // Log the error
    console.error(`API call to ${endpoint} failed:`, error);
    
    // Extract error message
    let errorMessage = 'API call failed';
    
    if (error.response) {
      // Server responded with an error status
      errorMessage = `Server error: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`;
      console.error('Error response data:', error.response.data);
    } else if (error.request) {
      // No response received
      errorMessage = 'No response from server. Please check your connection.';
    } else {
      // Error setting up the request
      errorMessage = error.message || 'Unknown error occurred';
    }
    
    // Rethrow with improved error message
    throw new Error(errorMessage);
  }
}

/**
 * Helper function to handle API errors consistently
 */
export function handleApiError(error: any, context: string = 'API call') {
  const errorMessage = error.message || 'Unknown error occurred';
  console.error(`${context} failed:`, error);
  toast.error(`${context} failed: ${errorMessage}`);
  return error;
}

/**
 * Helper to create a debounced function
 */
export function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): Promise<ReturnType<F>> => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    return new Promise(resolve => {
      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
  };
}
