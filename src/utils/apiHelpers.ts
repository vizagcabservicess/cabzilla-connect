
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
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.hostname.includes('lovableproject.com');
}

// Helper to get API base URL
export function getApiBaseUrl(): string {
  if (isDevEnvironment()) {
    return 'https://vizagup.com';
  }
  return '';
}
