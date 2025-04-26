
/**
 * Helper functions for API communication
 */

export async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 500) {
  let lastError: Error;
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      
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

// Helper to get API base URL
export function getApiBaseUrl(): string {
  // For development environment, use the production API
  if (isDevEnvironment()) {
    console.log("Using vizagup.com API in development mode");
    return 'https://vizagup.com';
  }
  
  // For production, use relative URLs which will resolve to the current domain
  console.log("Using relative API paths in production mode");
  return '';
}

// Helper function to properly construct API URLs
export function getApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  
  // Log the constructed URL for debugging
  const fullUrl = baseUrl ? 
    `${baseUrl}/${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}` :
    `/${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}`;
  
  console.log(`Constructed API URL: ${fullUrl} from baseUrl: ${baseUrl} and endpoint: ${endpoint}`);
  return fullUrl;
}
