import axios from 'axios';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/config';

/**
 * Check if we're running in preview mode
 */
export const isPreviewMode = () => {
  // Check if we're in a preview environment or local development
  return (
    window.location.hostname.includes('lovable.app') ||
    window.location.hostname.includes('localhost') ||
    window.location.hostname.includes('127.0.0.1') ||
    window.location.hostname.includes('vercel.app') ||
    (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development')
  );
};

/**
 * Format data for multipart/form-data submission
 * @param data The data object to format
 * @returns FormData object
 */
export const formatDataForMultipart = (data: Record<string, any>): FormData => {
  const formData = new FormData();
  
  // Convert object to FormData
  Object.entries(data).forEach(([key, value]) => {
    // Skip null or undefined values
    if (value === null || value === undefined) {
      return;
    }
    
    // Handle arrays (like amenities)
    if (Array.isArray(value)) {
      // For PHP to parse correctly, we need to use array notation in the key
      value.forEach((item, index) => {
        formData.append(`${key}[${index}]`, item);
      });
    } 
    // Handle objects recursively
    else if (typeof value === 'object' && !(value instanceof File) && !(value instanceof Blob)) {
      Object.entries(value).forEach(([subKey, subValue]) => {
        formData.append(`${key}[${subKey}]`, String(subValue));
      });
    }
    // Handle primitives
    else {
      formData.append(key, String(value));
    }
  });
  
  return formData;
};

/**
 * Check database connection and return details
 */
export interface DatabaseConnectionResponse {
  connection: boolean;
  message?: string;
  version?: string;
  details?: Record<string, any>;
}

export const checkDatabaseConnection = async (): Promise<DatabaseConnectionResponse> => {
  try {
    if (isPreviewMode()) {
      console.log('Preview mode: simulating database connection check');
      return { 
        connection: true, 
        message: 'Database connection simulated in preview mode',
        version: 'PREVIEW'
      };
    }
    
    const timestamp = Date.now();
    const response = await fetch(`${API_BASE_URL}/api/admin/check-connection.php?_t=${timestamp}`, {
      method: 'GET',
      headers: {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      return { 
        connection: false, 
        message: `HTTP error! Status: ${response.status}` 
      };
    }

    const result = await response.json();
    return {
      connection: result.connection || result.status === 'success',
      message: result.message,
      version: result.version,
      details: result.details
    };
  } catch (error) {
    console.error('Error checking database connection:', error);
    
    if (isPreviewMode()) {
      return { 
        connection: true, 
        message: 'Database connection simulated in preview mode after error',
        version: 'PREVIEW'
      };
    }
    
    return { 
      connection: false, 
      message: error instanceof Error ? error.message : 'Unknown error checking connection'
    };
  }
};

/**
 * Direct operation to vehicle API endpoints
 * @param endpoint The API endpoint to call
 * @param method The HTTP method to use
 * @param options Additional options for the request
 * @returns The response data
 */
export const directVehicleOperation = async (endpoint: string, method: string = 'GET', options: any = {}): Promise<any> => {
  try {
    console.log(`Performing ${method} operation to: ${API_BASE_URL}/${endpoint}`);
    
    // In preview mode, return mock vehicle data
    if (isPreviewMode() && endpoint.includes('vehicle')) {
      console.log(`Preview mode detected, returning mock data for ${endpoint}`);
      
      // Basic mock vehicle data
      const mockVehicles = [
        {
          id: 'sedan',
          vehicleId: 'sedan',
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
          vehicleId: 'ertiga',
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
          vehicleId: 'innova_crysta',
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
        },
        {
          id: 'tempo_traveller',
          vehicleId: 'tempo_traveller',
          name: 'Tempo Traveller',
          capacity: 12,
          luggageCapacity: 8,
          price: 5500,
          basePrice: 5500,
          pricePerKm: 25,
          image: '/cars/tempo.png',
          amenities: ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point', 'Pushback Seats'],
          description: 'Large vehicle suitable for groups of up to 12 passengers.',
          ac: true,
          nightHaltCharge: 1200,
          driverAllowance: 300,
          isActive: true
        },
        {
          id: 'mpv',
          vehicleId: 'mpv',
          name: 'Innova Hycross',
          capacity: 6,
          luggageCapacity: 2,
          price: 6000,
          basePrice: 6000,
          pricePerKm: 20,
          image: '/cars/sedan.png',
          amenities: ['AC', 'Water'],
          description: 'The Toyota Innova Hycross is known for its comfort.',
          ac: true,
          nightHaltCharge: 700,
          driverAllowance: 250,
          isActive: true
        }
      ];
      
      // Handle different endpoints
      if (endpoint.includes('direct-vehicle-modify.php')) {
        return {
          status: 'success',
          message: 'Vehicles loaded from mock data',
          source: 'mock',
          count: mockVehicles.length,
          vehicles: mockVehicles,
          timestamp: Date.now()
        };
      }
      
      if (endpoint.includes('vehicles-data.php')) {
        // Extract vehicle ID from endpoint if present
        const idMatch = endpoint.match(/[?&]id=([^&]+)/);
        if (idMatch && idMatch[1]) {
          const vehicleId = decodeURIComponent(idMatch[1]);
          const vehicle = mockVehicles.find(v => 
            v.id === vehicleId || 
            v.vehicleId === vehicleId
          );
          
          if (vehicle) {
            return {
              status: 'success',
              message: 'Vehicle loaded from mock data',
              source: 'mock',
              count: 1,
              vehicles: [vehicle],
              timestamp: Date.now()
            };
          }
        }
        
        // Return all vehicles if no ID or ID not found
        return {
          status: 'success',
          message: 'Vehicles loaded from mock data',
          source: 'mock',
          count: mockVehicles.length,
          vehicles: mockVehicles,
          timestamp: Date.now()
        };
      }
    }
    
    // For real API calls in production
    let fetchBody = undefined;
    if (method !== 'GET') {
      if (options.data) {
        fetchBody = JSON.stringify(options.data);
        console.log('Sending payload to', endpoint, options.data);
      } else if (options.body) {
        fetchBody = JSON.stringify(options.body);
        console.log('Sending payload to', endpoint, options.body);
      }
    }
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: method,
      headers: {
        ...(options.headers || {}),
        'Accept': 'application/json',
        ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {})
      },
      body: fetchBody,
      cache: 'no-store'
    });

    // Check if response is OK
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Parse response
    const text = await response.text();
    
    // Skip empty responses
    if (!text || text.trim().length === 0) {
      return null;
    }
    
    // Skip HTML responses
    if (text.includes('<!DOCTYPE html>') || text.includes('<html>')) {
      throw new Error('Received HTML response instead of JSON');
    }
    
    // Try to parse JSON
    try {
      return JSON.parse(text);
    } catch (jsonError) {
      console.error('Error parsing JSON response:', jsonError);
      
      // Try to find JSON in the response
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const jsonPart = text.substring(jsonStart, jsonEnd + 1);
        try {
          return JSON.parse(jsonPart);
        } catch (nestedError) {
          throw new Error('Failed to parse response as JSON');
        }
      } else {
        throw new Error('Invalid response format');
      }
    }
  } catch (error) {
    console.error('Error in directVehicleOperation:', error);
    
    // In preview mode, still return mock data for vehicle endpoints
    if (isPreviewMode() && endpoint.includes('vehicle')) {
      console.log('Preview mode: returning mock data despite error');
      return {
        status: 'success',
        message: 'Using mock data due to API error',
        source: 'mock',
        count: 5,
        vehicles: [
          { id: 'sedan', vehicleId: 'sedan', name: 'Sedan', isActive: true },
          { id: 'ertiga', vehicleId: 'ertiga', name: 'Ertiga', isActive: true },
          { id: 'innova_crysta', vehicleId: 'innova_crysta', name: 'Innova Crysta', isActive: true },
          { id: 'tempo_traveller', vehicleId: 'tempo_traveller', name: 'Tempo Traveller', isActive: true },
          { id: 'mpv', vehicleId: 'mpv', name: 'Innova Hycross', isActive: true }
        ],
        timestamp: Date.now()
      };
    }
    
    throw error;
  }
};

/**
 * Fix database tables if needed
 */
export const fixDatabaseTables = async (): Promise<boolean> => {
  try {
    if (isPreviewMode()) {
      console.log('Preview mode: simulating database fix');
      return true;
    }
    
    const timestamp = Date.now();
    const response = await fetch(`${API_BASE_URL}/api/admin/fix-database-tables.php?_t=${timestamp}`, {
      method: 'GET',
      headers: {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return result.status === 'success';
  } catch (error) {
    console.error('Error fixing database tables:', error);
    
    if (isPreviewMode()) {
      return true;
    }
    
    return false;
  }
};

/**
 * Force a refresh of vehicle data
 */
export const forceRefreshVehicles = async (): Promise<any> => {
  try {
    if (isPreviewMode()) {
      console.log('Preview mode: simulating vehicle refresh');
      return { 
        status: 'success', 
        message: 'Refreshed vehicles in preview mode',
        count: 5
      };
    }
    
    const timestamp = Date.now();
    const response = await fetch(`${API_BASE_URL}/api/admin/refresh-vehicles.php?_t=${timestamp}`, {
      method: 'GET',
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error forcing vehicle refresh:', error);
    
    if (isPreviewMode()) {
      return { 
        status: 'success', 
        message: 'Refreshed vehicles in preview mode',
        count: 5
      };
    }
    
    throw error;
  }
};
