
import { apiBaseUrl } from '@/config/api';
import { isPreviewMode } from './apiHelper';

/**
 * Extended RequestInit that includes data property for convenience
 */
export interface ExtendedRequestInit extends RequestInit {
  data?: any;
  body?: any;
}

/**
 * Process request options and convert data to body if needed
 * @param options Request options
 * @returns Processed options
 */
function processRequestOptions(options?: ExtendedRequestInit): RequestInit {
  if (!options) return {};
  
  const { data, ...restOptions } = options;
  
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
 * Get mock data for specific endpoints to use in preview mode
 */
function getMockDataForEndpoint(endpoint: string): any {
  // Strip any URL parameters
  const baseEndpoint = endpoint.split('?')[0];
  
  // Check for specific endpoints
  if (baseEndpoint.includes('vehicles') || baseEndpoint.includes('vehicle-data')) {
    return {
      status: 'success',
      message: 'Mock vehicles retrieved successfully',
      vehicles: [
        {
          id: 'sedan',
          vehicle_id: 'sedan',
          name: 'Sedan',
          capacity: 4,
          luggageCapacity: 2,
          price: 2500,
          basePrice: 2500,
          pricePerKm: 14,
          image: '/cars/sedan.png',
          amenities: ['AC', 'Bottle Water', 'Music System'],
          description: 'Comfortable sedan suitable for 4 passengers.',
          ac: true,
          nightHaltCharge: 700,
          driverAllowance: 250,
          isActive: true
        },
        {
          id: 'ertiga',
          vehicle_id: 'ertiga',
          name: 'Ertiga',
          capacity: 6,
          luggageCapacity: 3,
          price: 3200,
          basePrice: 3200,
          pricePerKm: 18,
          image: '/cars/ertiga.png',
          amenities: ['AC', 'Bottle Water', 'Music System', 'Extra Legroom'],
          description: 'Spacious SUV suitable for 6 passengers.',
          ac: true,
          nightHaltCharge: 1000,
          driverAllowance: 250,
          isActive: true
        },
        {
          id: 'innova_crysta',
          vehicle_id: 'innova_crysta',
          name: 'Innova Crysta',
          capacity: 7,
          luggageCapacity: 4,
          price: 3800,
          basePrice: 3800,
          pricePerKm: 20,
          image: '/cars/innova.png',
          amenities: ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point'],
          description: 'Premium SUV with ample space for 7 passengers.',
          ac: true,
          nightHaltCharge: 1000,
          driverAllowance: 250,
          isActive: true
        }
      ]
    };
  } else if (baseEndpoint.includes('fix-database') || baseEndpoint.includes('reload')) {
    return {
      status: 'success',
      message: 'Operation completed successfully',
      timestamp: new Date().toISOString()
    };
  } else if (baseEndpoint.includes('airport-fares')) {
    return {
      status: 'success',
      message: 'Mock airport fares retrieved successfully',
      fares: {
        basePrice: 1500,
        pricePerKm: 12,
        pickupPrice: 200,
        dropPrice: 200,
        tier1Price: 300,
        tier2Price: 500,
        tier3Price: 700,
        tier4Price: 900,
        extraKmCharge: 15,
        nightCharges: 200,
        extraWaitingCharges: 100
      }
    };
  }
  
  // Default mock data for unknown endpoints
  return {
    status: 'success',
    message: 'Mock data for preview mode',
    data: {},
    timestamp: new Date().toISOString()
  };
}

/**
 * Direct API call helper
 * @param endpoint API endpoint path
 * @param options Optional fetch options
 * @returns Response data
 */
export async function directApiCall(endpoint: string, options?: ExtendedRequestInit): Promise<any> {
  try {
    const url = endpoint.startsWith('/') 
      ? `${apiBaseUrl}${endpoint}` 
      : `${apiBaseUrl}/${endpoint}`;
    
    const processedOptions = processRequestOptions(options);
    console.log(`Making direct API call to ${url}`);
    
    const response = await fetch(url, processedOptions);
    
    if (!response.ok) {
      // If we're in preview mode and get a 404, return mock data if available
      if (response.status === 404 && isPreviewMode()) {
        console.log(`API endpoint ${url} not found in preview mode. Using mock data.`);
        const mockData = getMockDataForEndpoint(endpoint);
        if (mockData) {
          console.log(`Returning mock data for ${endpoint}`);
          return mockData;
        }
      }
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in direct API call:', error);
    
    // In preview mode, return mock data if available
    if (isPreviewMode()) {
      const mockData = getMockDataForEndpoint(endpoint);
      if (mockData) {
        console.log(`Returning mock data for failed call to ${endpoint}`);
        return mockData;
      }
    }
    
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
      // If we're in preview mode and get a 404, return mock data if available
      if (response.status === 404 && isPreviewMode()) {
        console.log(`API endpoint ${url} not found in preview mode. Using mock data.`);
        const mockData = getMockDataForEndpoint(endpoint);
        if (mockData) {
          console.log(`Returning mock data for POST to ${endpoint}`);
          return mockData;
        }
      }
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in direct API POST:', error);
    
    // In preview mode, return mock data if available
    if (isPreviewMode()) {
      const mockData = getMockDataForEndpoint(endpoint);
      if (mockData) {
        console.log(`Returning mock data for failed POST to ${endpoint}`);
        return mockData;
      }
    }
    
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
export async function directApiCallWithFallback(primaryEndpoint: string, fallbackEndpoint: string, options?: ExtendedRequestInit): Promise<any> {
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
