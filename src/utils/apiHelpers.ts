
/**
 * Helper functions for API communication
 */

export async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 500) {
  let lastError: Error;
  
  // Ensure the URL is properly formatted for all environments
  const finalUrl = ensureProperApiUrl(url);
  console.log(`Making API request to: ${finalUrl}`);
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(finalUrl, {
        ...options,
        // Add credentials and mode for proper CORS
        credentials: 'include',
        mode: 'cors'
      });
      
      if (response.ok) {
        // Try to parse as JSON first
        const text = await response.text();
        if (!text) return { status: 'success', message: 'Operation completed successfully' };
        
        try {
          return JSON.parse(text);
        } catch (e) {
          // If it's not JSON, return the text
          return { status: 'success', data: text };
        }
      }
      
      // If we got a response but it's not OK, throw an error
      const errorText = await response.text();
      
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || `Request failed with status ${response.status}`);
      } catch (e) {
        throw new Error(`Request failed with status ${response.status}: ${errorText}`);
      }
      
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (i < retries - 1) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError!;
}

// Generate mock API response for various operations
export function generateMockApiResponse(operation: string, data: any = {}) {
  switch (operation) {
    case 'generate-invoice':
      return {
        status: 'success',
        message: 'Invoice generated successfully (mock)',
        data: {
          id: data.bookingId || Math.floor(Math.random() * 1000),
          invoiceNumber: `INV-${Date.now().toString().slice(-8)}`,
          generatedAt: new Date().toISOString(),
          amount: data.amount || 3000,
        }
      };
      
    case 'cancel-booking':
      return {
        status: 'success',
        message: 'Booking cancelled successfully (mock)',
        data: {
          id: data.bookingId || Math.floor(Math.random() * 1000),
          status: 'cancelled',
          updatedAt: new Date().toISOString(),
        }
      };
      
    case 'update-booking':
      return {
        status: 'success',
        message: 'Booking updated successfully (mock)',
        data: {
          ...data,
          updatedAt: new Date().toISOString(),
        }
      };
      
    case 'assign-driver':
      return {
        status: 'success',
        message: 'Driver assigned successfully (mock)',
        data: {
          id: data.bookingId || Math.floor(Math.random() * 1000),
          status: 'assigned',
          driverName: data.driverName || 'Mock Driver',
          driverPhone: data.driverPhone || '9876543210',
          vehicleNumber: data.vehicleNumber || 'AP 01 XX 1234',
          updatedAt: new Date().toISOString(),
        }
      };
      
    default:
      return {
        status: 'success',
        message: 'Operation completed successfully (mock)',
        data: { ...data },
      };
  }
}

// Helper function to detect if running in dev environment
export function isDevEnvironment(): boolean {
  // Check if we're in development or preview mode
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.hostname.includes('lovable');
}

// IMPROVED: Helper to get API base URL with proper handling for all environments
export function getApiBaseUrl(): string {
  // Always use relative URLs which will resolve to the current domain
  return '';
}

// CRITICAL FUNCTION: Ensures API URL is properly formatted for current environment
function ensureProperApiUrl(endpoint: string): string {
  // Log all API URL construction for debugging
  console.log(`Constructing API URL for endpoint: ${endpoint}`);
  
  // If it's already a full URL, return it
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    console.log(`Using full URL as is: ${endpoint}`);
    return endpoint;
  }
  
  // Clean up the endpoint - remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  
  // Make sure endpoint includes the 'api/' prefix if not already
  let finalEndpoint;
  if (!cleanEndpoint.startsWith('api/')) {
    finalEndpoint = `/api/${cleanEndpoint}`;
  } else {
    // Ensure we have a leading slash
    finalEndpoint = `/${cleanEndpoint}`;
  }
  
  console.log(`Final API URL: ${finalEndpoint}`);
  return finalEndpoint;
}

// Helper function to properly construct API URLs
export function getApiUrl(endpoint: string): string {
  return ensureProperApiUrl(endpoint);
}
