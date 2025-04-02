
import { apiBaseUrl } from '@/config/api';

// Add retry mechanism for API operations
export const directVehicleOperation = async (
  endpoint: string,
  method: 'GET' | 'POST',
  params: Record<string, any> = {},
  maxRetries: number = 2
): Promise<any> => {
  let currentRetry = 0;
  let lastError: any = null;
  
  // Track ongoing requests to avoid duplication within a short timeframe
  const requestKey = `${method}-${endpoint}-${JSON.stringify(params)}`;
  const requestTimestampKey = `timestamp-${requestKey}`;
  
  // Check if we've made this exact request recently (within 2 seconds)
  const lastRequestTime = parseInt(sessionStorage.getItem(requestTimestampKey) || '0');
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < 2000) {
    console.log(`Skipping duplicate request to ${endpoint} (last request was ${timeSinceLastRequest}ms ago)`);
    // If the last request was very recent, delay slightly
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Update the timestamp for this request
  sessionStorage.setItem(requestTimestampKey, now.toString());
  
  while (currentRetry <= maxRetries) {
    try {
      const url = apiBaseUrl + endpoint;
      
      // Prepare request options
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      };
      
      // Add request body for POST requests
      if (method === 'POST') {
        options.body = JSON.stringify(params);
      } 
      // Add query parameters for GET requests
      else if (Object.keys(params).length > 0) {
        const queryString = Object.entries(params)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('&');
        
        const separator = url.includes('?') ? '&' : '?';
        const urlWithParams = `${url}${separator}${queryString}`;
        
        const response = await fetch(urlWithParams, options);
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
      }
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      lastError = error;
      currentRetry++;
      
      console.error(`API request to ${endpoint} failed (attempt ${currentRetry}/${maxRetries + 1}):`, error);
      
      // Only delay and retry if we haven't reached max retries yet
      if (currentRetry <= maxRetries) {
        // Exponential backoff - wait longer between each retry
        const delay = Math.pow(2, currentRetry) * 500;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // If we get here, all retries failed
  console.error(`All ${maxRetries + 1} attempts to ${endpoint} failed`);
  throw lastError || new Error(`Failed to complete operation after ${maxRetries + 1} attempts`);
};
