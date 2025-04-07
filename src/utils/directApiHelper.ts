
import { apiBaseUrl } from '@/config/api';

/**
 * Extended RequestInit that includes data property for convenience
 */
export interface ExtendedRequestInit extends RequestInit {
  body?: any;
}

/**
 * Process request options and convert data to body if needed
 * @param options Request options
 * @returns Processed options
 */
function processRequestOptions(options?: RequestInit & { data?: any }): RequestInit {
  if (!options) return {};
  
  const { data, ...restOptions } = options as any;
  
  // If data is provided and body is not, convert data to JSON body
  if (data && !restOptions.body) {
    return {
      ...restOptions,
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        ...(restOptions.headers || {})
      }
    };
  }
  
  return restOptions;
}

/**
 * Direct API call helper
 * @param endpoint API endpoint path
 * @param options Optional fetch options
 * @returns Response data
 */
export async function directApiCall(endpoint: string, options?: RequestInit & { data?: any }): Promise<any> {
  try {
    const url = endpoint.startsWith('/') 
      ? `${apiBaseUrl}${endpoint}` 
      : `${apiBaseUrl}/${endpoint}`;
    
    const processedOptions = processRequestOptions(options);
    
    const response = await fetch(url, processedOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in direct API call:', error);
    throw error;
  }
}

/**
 * Direct API POST helper
 * @param endpoint API endpoint path
 * @param data Data to send in the request body
 * @param options Optional fetch options
 * @returns Response data
 */
export async function directApiPost(endpoint: string, data: any, options?: RequestInit): Promise<any> {
  try {
    const url = endpoint.startsWith('/') 
      ? `${apiBaseUrl}${endpoint}` 
      : `${apiBaseUrl}/${endpoint}`;
    
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {})
      },
      body: JSON.stringify(data),
      ...options
    };
    
    // Remove headers to avoid duplication since we merged them above
    const { headers, ...restOptions } = options || {};
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(headers || {})
      },
      body: JSON.stringify(data),
      ...restOptions
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in direct API POST:', error);
    throw error;
  }
}

/**
 * Direct API call with fallback to another endpoint if the first one fails
 * @param primaryEndpoint Primary API endpoint path
 * @param fallbackEndpoint Fallback API endpoint path
 * @param options Optional fetch options
 * @returns Response data
 */
export async function directApiCallWithFallback(primaryEndpoint: string, fallbackEndpoint: string, options?: RequestInit & { data?: any }): Promise<any> {
  try {
    return await directApiCall(primaryEndpoint, options);
  } catch (error) {
    console.log(`Primary endpoint ${primaryEndpoint} failed, trying fallback ${fallbackEndpoint}`);
    return await directApiCall(fallbackEndpoint, options);
  }
}

/**
 * Direct API POST with fallback to another endpoint if the first one fails
 * @param primaryEndpoint Primary API endpoint path
 * @param fallbackEndpoint Fallback API endpoint path
 * @param data Data to send in the request body
 * @param options Optional fetch options
 * @returns Response data
 */
export async function directApiPostWithFallback(primaryEndpoint: string, fallbackEndpoint: string, data: any, options?: RequestInit): Promise<any> {
  try {
    return await directApiPost(primaryEndpoint, data, options);
  } catch (error) {
    console.log(`Primary endpoint ${primaryEndpoint} failed, trying fallback ${fallbackEndpoint}`);
    return await directApiPost(fallbackEndpoint, data, options);
  }
}

// Export formatDataForMultipart from here
export function formatDataForMultipart(data: Record<string, any>): FormData {
  const formData = new FormData();
  
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && !(value instanceof File) && !(value instanceof Blob)) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    }
  }
  
  return formData;
}
