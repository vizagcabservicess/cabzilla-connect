
import { apiBaseUrl } from '@/config/api';

/**
 * Direct API call helper
 * @param endpoint API endpoint path
 * @param options Optional fetch options
 * @returns Response data
 */
export async function directApiCall(endpoint: string, options?: RequestInit): Promise<any> {
  try {
    const url = endpoint.startsWith('/') 
      ? `${apiBaseUrl}${endpoint}` 
      : `${apiBaseUrl}/${endpoint}`;
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in direct API call:', error);
    throw error;
  }
}
