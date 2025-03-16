
/**
 * Direct API Client
 * 
 * A minimal, direct API client for bypassing all middleware.
 * Use this when you need to make direct requests to the API without any interceptors.
 */

// Helper function to get base URL
function getApiBaseUrl(): string {
  const env = import.meta.env.VITE_API_BASE_URL;
  const fallback = 'https://saddlebrown-oryx-227656.hostingersite.com/api';
  const storedSuccessful = localStorage.getItem('last_successful_api_endpoint');
  
  return storedSuccessful || env || fallback;
}

// Format URL properly
function formatUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  
  // Handle case when endpoint already has the base URL
  if (endpoint.startsWith('http')) {
    return endpoint;
  }
  
  // Make sure endpoint starts with a slash
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Join and return
  return `${baseUrl}${formattedEndpoint}`;
}

// Direct API request with minimal dependencies
export async function directApiRequest<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' = 'GET',
  data?: any,
  additionalHeaders: Record<string, string> = {}
): Promise<T> {
  // Build URL with timestamp to prevent caching
  const timestamp = new Date().getTime();
  const url = formatUrl(endpoint);
  const urlWithTimestamp = url.includes('?') 
    ? `${url}&_t=${timestamp}` 
    : `${url}?_t=${timestamp}`;
  
  // Setup headers
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    ...additionalHeaders
  };
  
  // Add authorization header if token exists
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    console.log(`🔄 Direct API ${method} request to ${url}`);
    
    // Make the fetch request
    const response = await fetch(urlWithTimestamp, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store'
    });
    
    // Parse response
    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }
    
    // Handle non-OK responses
    if (!response.ok) {
      console.error(`❌ API error: ${response.status} ${response.statusText}`, responseData);
      throw new Error(
        typeof responseData === 'object' && responseData?.message 
        ? responseData.message
        : `API error: ${response.status} ${response.statusText}`
      );
    }
    
    console.log(`✅ API response: ${response.status}`, responseData);
    return responseData as T;
  } catch (error) {
    console.error(`❌ API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    throw error;
  }
}

// Wrapper functions for common HTTP methods
export const directApi = {
  get: <T = any>(endpoint: string, headers?: Record<string, string>) => 
    directApiRequest<T>(endpoint, 'GET', undefined, headers),

  post: <T = any>(endpoint: string, data?: any, headers?: Record<string, string>) => 
    directApiRequest<T>(endpoint, 'POST', data, headers),
    
  put: <T = any>(endpoint: string, data?: any, headers?: Record<string, string>) => 
    directApiRequest<T>(endpoint, 'PUT', data, headers),
    
  delete: <T = any>(endpoint: string, headers?: Record<string, string>) => 
    directApiRequest<T>(endpoint, 'DELETE', undefined, headers),
    
  options: <T = any>(endpoint: string, headers?: Record<string, string>) => 
    directApiRequest<T>(endpoint, 'OPTIONS', undefined, headers)
};
