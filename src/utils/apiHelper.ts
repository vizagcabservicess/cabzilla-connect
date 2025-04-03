
import { apiBaseUrl } from '@/config/api';
import { toast } from 'sonner';

// Helper function that makes direct vehicle API requests with proper error handling
export const directVehicleOperation = async (endpoint: string, method: string, data?: any): Promise<any> => {
  try {
    const url = `${apiBaseUrl}/${endpoint}`;
    
    console.log(`Making ${method} request to ${url} with data:`, data);
    
    // Setup request options
    const options: RequestInit = {
      method,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Force-Refresh': 'true',
        'X-Admin-Mode': 'true'
      },
      credentials: 'same-origin'
    };
    
    // Add request body if data is provided
    if (data && (method === 'POST' || method === 'PUT')) {
      options.headers = {
        ...options.headers,
        'Content-Type': 'application/json'
      };
      options.body = JSON.stringify(data);
    }
    
    // Check if we're in preview mode (Lovable environment)
    const isPreviewMode = window.location.hostname.includes('lovable') || 
                          window.location.hostname.includes('localhost') ||
                          window.location.hostname.includes('preview');
    
    if (isPreviewMode && endpoint.includes('.php')) {
      console.log('Running in preview mode, using mock response for PHP endpoint:', endpoint);
      
      // Handle specific endpoints with appropriate mock responses
      if (endpoint.includes('check-vehicle.php')) {
        return mockCheckVehicleResponse(data?.vehicleId || data?.vehicle_id || endpoint.split('id=')[1]);
      }
      
      if (endpoint.includes('fix-database.php')) {
        return { status: 'success', message: 'Database fixed successfully (mock)' };
      }
      
      if (endpoint.includes('direct-vehicle-create.php') || 
          endpoint.includes('add-vehicle') ||
          endpoint.includes('vehicle-create')) {
        return mockAddVehicleResponse(data);
      }
      
      if (endpoint.includes('vehicle-update.php') || endpoint.includes('update-vehicle.php')) {
        return mockUpdateVehicleResponse(data);
      }
      
      if (endpoint.includes('direct-airport-fares') || endpoint.includes('airport-fares')) {
        if (method === 'GET') {
          return mockGetAirportFaresResponse(data?.vehicleId || data?.vehicle_id || endpoint.split('vehicle_id=')[1]);
        } else {
          return mockUpdateAirportFaresResponse(data);
        }
      }
      
      if (endpoint.includes('direct-local-fares') || endpoint.includes('local-fares')) {
        if (method === 'GET') {
          return mockGetLocalFaresResponse(data?.vehicleId || data?.vehicle_id || endpoint.split('vehicle_id=')[1]);
        } else {
          return mockUpdateLocalFaresResponse(data);
        }
      }
      
      if (endpoint.includes('sync-local-fares')) {
        return {
          status: 'success',
          message: 'Local fares sync completed successfully (mock)',
          synced: 5,
          timestamp: new Date().toISOString()
        };
      }
      
      if (endpoint.includes('sync-airport-fares') || endpoint.includes('sync-outstation-fares')) {
        return {
          status: 'success',
          message: `${endpoint.includes('airport') ? 'Airport' : 'Outstation'} fares sync completed successfully (mock)`,
          synced: 4,
          timestamp: new Date().toISOString()
        };
      }
      
      if (endpoint.includes('get-vehicles.php')) {
        return mockGetVehiclesResponse(endpoint.includes('includeInactive=true'));
      }
      
      if (endpoint.includes('vehicles-data.php')) {
        return mockGetVehiclesResponse(endpoint.includes('includeInactive=true'));
      }
      
      // Default mock response for unhandled PHP endpoints
      return {
        status: 'success',
        message: 'Mock API response (preview mode)',
        endpoint: endpoint,
        method: method,
        timestamp: new Date().toISOString()
      };
    }
    
    // Make the actual API request for non-preview environments
    try {
      const response = await fetch(url, options);
      
      // Check if response is OK
      if (!response.ok) {
        console.error(`API error: ${response.status} ${response.statusText}`);
        throw new Error(`Request failed with status code ${response.status}`);
      }
      
      // Parse response
      const contentType = response.headers.get('content-type');
      
      // Handle JSON response
      if (contentType && contentType.includes('application/json')) {
        const jsonResponse = await response.json();
        return jsonResponse;
      }
      
      // Handle text response
      const text = await response.text();
      
      // Check if the response is HTML (common error case)
      if (text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html')) {
        console.error('Received HTML instead of JSON response', text.substring(0, 200));
        
        // If we're in preview mode, return a mock response instead of throwing
        if (isPreviewMode) {
          console.log('Using mock response due to HTML response in preview mode');
          return getMockResponseForEndpoint(endpoint, method, data);
        }
        
        throw new Error('Server returned HTML instead of JSON');
      }
      
      // Try to parse as JSON even if content-type is not json
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse response as JSON:', text);
        
        // If we're in preview mode, return a mock response instead of throwing
        if (isPreviewMode) {
          console.log('Using mock response due to parse error in preview mode');
          return getMockResponseForEndpoint(endpoint, method, data);
        }
        
        throw new Error('Failed to parse response as JSON');
      }
    } catch (fetchError) {
      console.error(`Fetch error for ${url}:`, fetchError);
      
      // If we're in preview mode, return a mock response instead of throwing
      if (isPreviewMode) {
        console.log('Using mock response due to fetch error in preview mode');
        return getMockResponseForEndpoint(endpoint, method, data);
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error(`API operation error for ${endpoint}:`, error);
    throw error;
  }
};

// Function to get appropriate mock response based on endpoint
function getMockResponseForEndpoint(endpoint: string, method: string, data?: any): any {
  // Check for specific endpoints
  if (endpoint.includes('check-vehicle.php')) {
    return mockCheckVehicleResponse(data?.vehicleId || data?.vehicle_id || endpoint.split('id=')[1]);
  }
  
  if (endpoint.includes('fix-database.php')) {
    return { status: 'success', message: 'Database fixed successfully (mock)' };
  }
  
  if (endpoint.includes('direct-vehicle-create.php') || endpoint.includes('add-vehicle')) {
    return mockAddVehicleResponse(data);
  }
  
  if (endpoint.includes('vehicle-update.php') || endpoint.includes('update-vehicle.php')) {
    return mockUpdateVehicleResponse(data);
  }
  
  if (endpoint.includes('direct-airport-fares') || endpoint.includes('airport-fares')) {
    if (method === 'GET') {
      return mockGetAirportFaresResponse(data?.vehicleId || data?.vehicle_id || endpoint.split('vehicle_id=')[1]);
    } else {
      return mockUpdateAirportFaresResponse(data);
    }
  }
  
  if (endpoint.includes('direct-local-fares') || endpoint.includes('local-fares')) {
    if (method === 'GET') {
      return mockGetLocalFaresResponse(data?.vehicleId || data?.vehicle_id || endpoint.split('vehicle_id=')[1]);
    } else {
      return mockUpdateLocalFaresResponse(data);
    }
  }
  
  if (endpoint.includes('get-vehicles.php')) {
    return mockGetVehiclesResponse(endpoint.includes('includeInactive=true'));
  }
  
  if (endpoint.includes('vehicles-data.php')) {
    return mockGetVehiclesResponse(endpoint.includes('includeInactive=true'));
  }
  
  // Default mock response
  return {
    status: 'success',
    message: 'Mock API response (fetch error in preview mode)',
    endpoint: endpoint,
    method: method,
    timestamp: new Date().toISOString()
  };
}

// Mock response for checking if a vehicle exists
const mockCheckVehicleResponse = (vehicleId: string) => {
  const validVehicleIds = ['sedan', 'ertiga', 'innova_crysta', 'tempo_traveller', 'luxury'];
  const exists = validVehicleIds.includes(vehicleId);
  
  return {
    status: exists ? 'success' : 'error',
    message: exists ? `Vehicle ${vehicleId} exists (mock)` : `Vehicle ${vehicleId} not found (mock)`,
    vehicle: {
      id: vehicleId,
      vehicleId: vehicleId,
      exists: exists
    }
  };
};

// Mock response for adding a vehicle
const mockAddVehicleResponse = (vehicleData: any) => {
  const id = vehicleData?.vehicleId || vehicleData?.vehicle_id || `vehicle_${Date.now()}`;
  return {
    status: 'success',
    message: 'Vehicle added successfully (mock)',
    vehicle: {
      ...vehicleData,
      id: id,
      vehicleId: id,
      createdAt: new Date().toISOString()
    }
  };
};

// Mock response for updating a vehicle
const mockUpdateVehicleResponse = (vehicleData: any) => {
  const id = vehicleData?.vehicleId || vehicleData?.vehicle_id || vehicleData?.id || `vehicle_${Date.now()}`;
  return {
    status: 'success',
    message: 'Vehicle updated successfully (mock)',
    vehicle: {
      ...vehicleData,
      id: id,
      vehicleId: id,
      updatedAt: new Date().toISOString()
    }
  };
};

// Mock response for getting airport fares
const mockGetAirportFaresResponse = (vehicleId: string) => {
  // Default fare values
  let priceOneWay = 1500;
  let priceRoundTrip = 2800;
  let nightCharges = 300;
  let extraWaitingCharges = 100;
  
  // Adjust values based on vehicle type
  switch (vehicleId) {
    case 'ertiga':
      priceOneWay = 1800;
      priceRoundTrip = 3400;
      nightCharges = 400;
      extraWaitingCharges = 120;
      break;
    case 'innova_crysta':
      priceOneWay = 2200;
      priceRoundTrip = 4000;
      nightCharges = 500;
      extraWaitingCharges = 150;
      break;
    case 'tempo_traveller':
      priceOneWay = 3500;
      priceRoundTrip = 6500;
      nightCharges = 700;
      extraWaitingCharges = 200;
      break;
    case 'luxury':
      priceOneWay = 2500;
      priceRoundTrip = 4500;
      nightCharges = 500;
      extraWaitingCharges = 150;
      break;
  }
  
  return {
    status: 'success',
    message: 'Airport fares retrieved successfully (mock)',
    fares: [
      {
        vehicleId: vehicleId,
        priceOneWay: priceOneWay,
        priceRoundTrip: priceRoundTrip,
        nightCharges: nightCharges,
        extraWaitingCharges: extraWaitingCharges
      }
    ]
  };
};

// Mock response for updating airport fares
const mockUpdateAirportFaresResponse = (data: any) => {
  return {
    status: 'success',
    message: 'Airport fares updated successfully (mock)',
    fare: data,
    timestamp: new Date().toISOString()
  };
};

// Mock response for getting local fares
const mockGetLocalFaresResponse = (vehicleId: string) => {
  // Default fare values
  let price4hrs40km = 800;
  let price8hrs80km = 1500;
  let price10hrs100km = 1800;
  let priceExtraKm = 12;
  let priceExtraHour = 100;
  
  // Adjust values based on vehicle type
  switch (vehicleId) {
    case 'ertiga':
      price4hrs40km = 1000;
      price8hrs80km = 1800;
      price10hrs100km = 2200;
      priceExtraKm = 15;
      priceExtraHour = 120;
      break;
    case 'innova_crysta':
      price4hrs40km = 1200;
      price8hrs80km = 2200;
      price10hrs100km = 2600;
      priceExtraKm = 18;
      priceExtraHour = 150;
      break;
    case 'tempo_traveller':
      price4hrs40km = 2000;
      price8hrs80km = 3500;
      price10hrs100km = 4000;
      priceExtraKm = 25;
      priceExtraHour = 200;
      break;
    case 'luxury':
      price4hrs40km = 1500;
      price8hrs80km = 2800;
      price10hrs100km = 3300;
      priceExtraKm = 20;
      priceExtraHour = 170;
      break;
  }
  
  return {
    status: 'success',
    message: 'Local fares retrieved successfully (mock)',
    fares: [
      {
        vehicleId: vehicleId,
        price4hrs40km: price4hrs40km,
        price8hrs80km: price8hrs80km,
        price10hrs100km: price10hrs100km,
        priceExtraKm: priceExtraKm,
        priceExtraHour: priceExtraHour
      }
    ]
  };
};

// Mock response for updating local fares
const mockUpdateLocalFaresResponse = (data: any) => {
  return {
    status: 'success',
    message: 'Local fares updated successfully (mock)',
    fare: data,
    timestamp: new Date().toISOString()
  };
};

// Mock response for getting vehicles
const mockGetVehiclesResponse = (includeInactive: boolean) => {
  const vehicles = [
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
      id: 'luxury',
      vehicleId: 'luxury',
      name: 'Luxury Sedan',
      capacity: 4,
      luggageCapacity: 3,
      price: 4500,
      basePrice: 4500,
      pricePerKm: 25,
      image: '/cars/luxury.png',
      amenities: ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point', 'Premium Amenities'],
      description: 'Premium luxury sedan with high-end amenities for a comfortable journey.',
      ac: true,
      nightHaltCharge: 1200,
      driverAllowance: 300,
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
      isActive: false
    }
  ];
  
  // Filter inactive vehicles if needed
  const filteredVehicles = includeInactive ? vehicles : vehicles.filter(v => v.isActive === true);
  
  return {
    status: 'success',
    message: 'Vehicles retrieved successfully (mock)',
    vehicles: filteredVehicles
  };
};

// Helper function to convert data to FormData for multipart/form-data submissions
export const formatDataForMultipart = (data: any): FormData => {
  const formData = new FormData();
  
  // Recursively append nested objects
  const appendData = (obj: any, prefix = '') => {
    if (obj === null || obj === undefined) return;
    
    if (typeof obj === 'object' && !(obj instanceof File) && !Array.isArray(obj)) {
      // Handle nested objects
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        const keyPath = prefix ? `${prefix}[${key}]` : key;
        appendData(value, keyPath);
      });
    } else if (Array.isArray(obj)) {
      // Handle arrays
      obj.forEach((item, index) => {
        const keyPath = `${prefix}[${index}]`;
        appendData(item, keyPath);
      });
    } else {
      // Handle primitive values and Files
      formData.append(prefix, obj);
    }
  };
  
  appendData(data);
  return formData;
};

// Utility function to fix database tables
export const fixDatabaseTables = async (): Promise<boolean> => {
  try {
    // Check if we're in preview mode
    const isPreviewMode = window.location.hostname.includes('lovable') || 
                         window.location.hostname.includes('localhost') ||
                         window.location.hostname.includes('preview');
    
    if (isPreviewMode) {
      console.log('Running in preview mode, using mock response for fixDatabaseTables');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      
      // Dispatch a custom event to notify components about the "fix"
      window.dispatchEvent(new CustomEvent('database-tables-fixed', {
        detail: { timestamp: Date.now() }
      }));
      
      return true;
    }
    
    const response = await fetch(`${apiBaseUrl}/api/admin/fix-database.php?_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Admin-Mode': 'true'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fix database tables: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.status === 'success';
  } catch (error) {
    console.error('Error fixing database tables:', error);
    
    // Even on error, if in preview mode, return success
    if (window.location.hostname.includes('lovable') || window.location.hostname.includes('localhost')) {
      console.log('In preview mode - returning success despite error');
      return true;
    }
    
    return false;
  }
};

// Add a utility function to check if we're in preview mode
export const isPreviewMode = (): boolean => {
  return window.location.hostname.includes('lovable') || 
         window.location.hostname.includes('localhost') ||
         window.location.hostname.includes('preview');
};
