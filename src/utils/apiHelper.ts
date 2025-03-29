
import axios, { AxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

// Get base API URL from environment or use empty string for relative paths
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const apiVersion = import.meta.env.VITE_API_VERSION || '1.0.0';

/**
 * Makes an API request with multiple fallback endpoints and retry logic
 */
export const makeApiRequest = async <T>(
  endpoints: string[],
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any,
  options: {
    contentTypes?: string[];
    headers?: Record<string, string>;
    timeoutMs?: number;
    retries?: number;
    localStorageKey?: string;
    fallbackData?: T;
    notification?: boolean;
  } = {}
): Promise<T> => {
  const {
    contentTypes = ['multipart/form-data', 'application/json'],
    headers = {},
    timeoutMs = 8000,
    retries = 1,
    localStorageKey,
    fallbackData,
    notification = true
  } = options;
  
  // Add cache busting timestamp
  const timestamp = Date.now();
  
  // Try to load from localStorage first if a key is provided
  if (localStorageKey && method === 'GET') {
    try {
      const cachedData = localStorage.getItem(localStorageKey);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        console.log(`Loaded data from localStorage (${localStorageKey})`);
        return parsedData as T;
      }
    } catch (error) {
      console.error(`Error loading from localStorage (${localStorageKey}):`, error);
    }
  }
  
  // Prepare common headers
  const commonHeaders = {
    'X-API-Version': apiVersion,
    'X-Force-Refresh': 'true',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Cache-Timestamp': timestamp.toString(),
    ...headers
  };
  
  let lastError: any = null;
  
  // Try each endpoint with multiple content types
  for (const endpoint of endpoints) {
    for (const contentType of contentTypes) {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          let requestConfig: AxiosRequestConfig = {
            method,
            url: endpoint.includes('://') ? endpoint : `${apiBaseUrl}${endpoint}`,
            headers: {
              ...commonHeaders
            },
            timeout: timeoutMs
          };
          
          // Handle different content types and methods
          if (method !== 'GET' && data) {
            if (contentType === 'application/json') {
              requestConfig.headers['Content-Type'] = contentType;
              requestConfig.data = data;
            } else if (contentType === 'application/x-www-form-urlencoded') {
              requestConfig.headers['Content-Type'] = contentType;
              const params = new URLSearchParams();
              for (const key in data) {
                if (data[key] !== undefined) {
                  params.append(key, String(data[key]));
                }
              }
              requestConfig.data = params;
            } else if (contentType === 'multipart/form-data') {
              // For multipart/form-data, let axios set the content type with boundary
              const formData = new FormData();
              for (const key in data) {
                if (data[key] !== undefined) {
                  if (Array.isArray(data[key])) {
                    formData.append(key, JSON.stringify(data[key]));
                  } else {
                    formData.append(key, String(data[key]));
                  }
                }
              }
              requestConfig.data = formData;
            }
          }
          
          console.log(`Making ${method} request to ${endpoint} (attempt ${attempt + 1}/${retries + 1})`);
          
          const response = await axios(requestConfig);
          
          // If we have a localStorage key and this was a successful GET, cache the result
          if (localStorageKey && method === 'GET' && response.data) {
            try {
              localStorage.setItem(localStorageKey, JSON.stringify(response.data));
              console.log(`Cached data in localStorage (${localStorageKey})`);
            } catch (error) {
              console.error(`Error caching in localStorage (${localStorageKey}):`, error);
            }
          }
          
          return response.data;
        } catch (error: any) {
          lastError = error;
          const status = error.response?.status;
          const detail = error.response?.data?.message || error.message;
          
          console.error(
            `Error making ${method} request to ${endpoint} (attempt ${attempt + 1}/${retries + 1}): ${status} - ${detail}`
          );
          
          // Only wait before retry if this wasn't the last attempt
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
    }
  }
  
  // If we got here, all attempts failed
  if (notification) {
    toast.error('API request failed after multiple attempts');
  }
  
  console.error('All API endpoints failed');
  
  // Return fallback data if provided
  if (fallbackData !== undefined) {
    return fallbackData;
  }
  
  // Re-throw the last error if no fallback
  throw lastError || new Error('API request failed');
};
