
import { apiBaseUrl } from '@/config/api';
import { toast } from 'sonner';

/**
 * Helper function to determine if we're in preview mode
 */
export const isPreviewMode = (): boolean => {
  return typeof window !== 'undefined' && (
    window.location.hostname.includes('lovable.app') || 
    window.location.hostname.includes('localhost')
  );
};

/**
 * Helper function to fix database tables
 */
export const fixDatabaseTables = async (): Promise<boolean> => {
  try {
    // In preview mode, simulate success
    if (isPreviewMode()) {
      console.log('Preview mode: Simulating database fix');
      return true;
    }

    const response = await fetch(`${apiBaseUrl}/api/admin/fix-database.php?_t=${Date.now()}`, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Force-Refresh': 'true',
        'X-Admin-Mode': 'true',
        'X-Debug': 'true'
      }
    });
    
    if (!response.ok) {
      console.error(`Database fix HTTP error: ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    return data.status === 'success';
  } catch (error) {
    console.error('Error fixing database tables:', error);
    return false;
  }
};

/**
 * Format data for multipart form data
 */
export const formatDataForMultipart = (data: any): FormData => {
  const formData = new FormData();
  
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }
    }
  }
  
  return formData;
};

/**
 * Performs direct vehicle operation with enhanced error handling
 * and support for preview environment
 * @param endpoint API endpoint to call
 * @param method HTTP method to use (default: 'GET')
 * @param options Optional object containing headers and/or data
 */
export const directVehicleOperation = async (
  endpoint: string, 
  method: string = 'GET', 
  options?: {
    headers?: Record<string, string>,
    data?: any
  }
): Promise<any> => {
  try {
    const headers = options?.headers || {};
    const data = options?.data;
    
    // Store locally for preview mode
    const storeVehicleLocally = (vehicleData: any) => {
      try {
        if (!vehicleData || !vehicleData.id) return;
        
        // Get existing stored vehicles
        const storedVehiclesStr = localStorage.getItem('stored_vehicles') || '{}';
        const storedVehicles = JSON.parse(storedVehiclesStr);
        
        // Update or add this vehicle
        storedVehicles[vehicleData.id] = {
          ...vehicleData,
          timestamp: Date.now()
        };
        
        // Save back to localStorage
        localStorage.setItem('stored_vehicles', JSON.stringify(storedVehicles));
        console.log(`Stored vehicle ${vehicleData.id} locally`);
      } catch (e) {
        console.error('Error storing vehicle locally:', e);
      }
    };
    
    // Retrieve locally stored vehicles
    const getStoredVehicles = () => {
      try {
        const storedVehiclesStr = localStorage.getItem('stored_vehicles') || '{}';
        return JSON.parse(storedVehiclesStr);
      } catch (e) {
        console.error('Error retrieving stored vehicles:', e);
        return {};
      }
    };
    
    // Check if we're in preview mode
    if (isPreviewMode()) {
      console.log(`Preview mode: Simulating ${method} operation for ${endpoint}`);
      
      // Handle various endpoints in preview mode with mock responses
      
      // VEHICLE CHECK
      if (endpoint.includes('check-vehicle.php') && method === 'GET') {
        const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
        const vehicleId = urlParams.get('id') || urlParams.get('vehicle_id');
        
        if (!vehicleId) {
          return { 
            status: 'error', 
            message: 'Vehicle ID is required' 
          };
        }
        
        const storedVehicles = getStoredVehicles();
        const storedVehicle = storedVehicles[vehicleId];
        
        if (storedVehicle) {
          return {
            status: 'success',
            message: 'Vehicle exists',
            vehicle: storedVehicle
          };
        }
        
        // Default vehicles if not found in localStorage
        const defaultVehicles = {
          'sedan': { id: 'sedan', name: 'Sedan', exists: true },
          'ertiga': { id: 'ertiga', name: 'Ertiga', exists: true },
          'innova_crysta': { id: 'innova_crysta', name: 'Innova Crysta', exists: true },
          'tempo_traveller': { id: 'tempo_traveller', name: 'Tempo Traveller', exists: true },
          'luxury': { id: 'luxury', name: 'Luxury Sedan', exists: true }
        };
        
        if (defaultVehicles[vehicleId]) {
          return {
            status: 'success',
            message: 'Vehicle exists',
            vehicle: defaultVehicles[vehicleId]
          };
        }
        
        return {
          status: 'error',
          message: 'Vehicle not found',
          vehicle: { id: vehicleId, exists: false }
        };
      }
      
      // VEHICLE UPDATE
      if ((endpoint.includes('update-vehicle.php') || endpoint.includes('vehicle-update.php')) && 
          (method === 'POST' || method === 'PUT')) {
        
        let vehicleData = data;
        if (!vehicleData && typeof vehicleData !== 'object') {
          vehicleData = {};
        }
        
        // Extract vehicle ID from data object (which could be nested)
        let vehicleId = '';
        if (vehicleData.id) {
          vehicleId = vehicleData.id;
        } else if (vehicleData.vehicleId) {
          vehicleId = vehicleData.vehicleId;
        } else if (vehicleData.vehicle_id) {
          vehicleId = vehicleData.vehicle_id;
        } else if (vehicleData.__data && vehicleData.__data.id) {
          vehicleId = vehicleData.__data.id;
        } else if (vehicleData.__data && vehicleData.__data.vehicleId) {
          vehicleId = vehicleData.__data.vehicleId;
        } else if (vehicleData.__data && vehicleData.__data.vehicle_id) {
          vehicleId = vehicleData.__data.vehicle_id;
        }
        
        if (!vehicleId) {
          console.error('Vehicle ID is missing in update data:', vehicleData);
          return { 
            status: 'error', 
            message: 'Vehicle ID is required for update' 
          };
        }
        
        console.log(`Updating vehicle ${vehicleId} in preview mode`);
        
        // If data is nested in __data, extract it
        if (vehicleData.__data) {
          vehicleData = vehicleData.__data;
        }
        
        // Store updated vehicle data in localStorage for persistence
        storeVehicleLocally({
          ...vehicleData,
          id: vehicleId
        });
        
        // Create a success event to ensure other components are aware of the update
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('vehicle-data-updated', {
            detail: { 
              vehicleId: vehicleId,
              timestamp: Date.now()
            }
          }));
        }, 500);
        
        return {
          status: 'success',
          message: 'Vehicle updated successfully',
          vehicle: vehicleData
        };
      }
      
      // FARE UPDATES
      if ((endpoint.includes('local-fares-update.php') || 
           endpoint.includes('airport-fares-update.php')) && 
          method === 'POST') {
          
        let fareData = data;
        if (!fareData && typeof fareData !== 'object') {
          fareData = {};
        }
        
        // Extract vehicle ID from data object (which could be nested)
        let vehicleId = '';
        if (fareData.vehicleId) {
          vehicleId = fareData.vehicleId;
        } else if (fareData.vehicle_id) {
          vehicleId = fareData.vehicle_id;
        } else if (fareData.__data && fareData.__data.vehicleId) {
          vehicleId = fareData.__data.vehicleId;
        } else if (fareData.__data && fareData.__data.vehicle_id) {
          vehicleId = fareData.__data.vehicle_id;
        }
        
        if (!vehicleId) {
          console.error('Vehicle ID is missing in fare update data:', fareData);
          return { 
            status: 'error', 
            message: 'Vehicle ID is required for fare update' 
          };
        }
        
        console.log(`Updating fares for vehicle ${vehicleId} in preview mode:`, fareData);
        
        // If data is nested in __data, extract it
        if (fareData.__data) {
          fareData = fareData.__data;
        }
        
        // Store fares in localStorage
        const fareType = endpoint.includes('airport') ? 'airport' : 'local';
        const faresKey = `${fareType}_fares_${vehicleId}`;
        localStorage.setItem(faresKey, JSON.stringify({
          ...fareData,
          vehicleId: vehicleId,
          vehicle_id: vehicleId,
          timestamp: Date.now()
        }));
        
        // Dispatch an event to notify components
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('fare-data-updated', {
            detail: { 
              fareType: fareType,
              vehicleId: vehicleId,
              timestamp: Date.now()
            }
          }));
        }, 500);
        
        return {
          status: 'success',
          message: `${fareType.charAt(0).toUpperCase() + fareType.slice(1)} fares updated successfully`,
          vehicleId: vehicleId,
          timestamp: Date.now()
        };
      }
      
      // SYNC LOCAL FARES
      if (endpoint.includes('sync-local-fares.php')) {
        return {
          status: 'success',
          message: 'Local fares synced successfully',
          synced: 5,
          vehicles: ['sedan', 'ertiga', 'innova_crysta', 'tempo_traveller', 'luxury'],
          timestamp: Date.now()
        };
      }

      // SYNC AIRPORT FARES
      if (endpoint.includes('sync-airport-fares.php')) {
        return {
          status: 'success',
          message: 'Airport fares synced successfully',
          synced: 5,
          vehicles: ['sedan', 'ertiga', 'innova_crysta', 'tempo_traveller', 'luxury'],
          timestamp: Date.now()
        };
      }
      
      // DIRECT AIRPORT FARES
      if (endpoint.includes('direct-airport-fares.php')) {
        const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
        const vehicleId = urlParams.get('id') || urlParams.get('vehicle_id');
        
        if (!vehicleId) {
          return { 
            status: 'error', 
            message: 'Vehicle ID is required' 
          };
        }
        
        // Try to get locally stored fares first
        const storedFaresKey = `airport_fares_${vehicleId}`;
        const storedFaresStr = localStorage.getItem(storedFaresKey);
        let fares = [];
        
        if (storedFaresStr) {
          try {
            const storedFares = JSON.parse(storedFaresStr);
            fares = [storedFares];
          } catch (e) {
            console.error('Error parsing stored fares:', e);
          }
        }
        
        // If no stored fares, use defaults
        if (fares.length === 0) {
          const defaultFares = {
            vehicleId: vehicleId,
            vehicle_id: vehicleId,
            priceOneWay: 1500,
            priceRoundTrip: 2800,
            nightCharges: 250,
            extraWaitingCharges: 200
          };
          
          if (vehicleId === 'ertiga') {
            defaultFares.priceOneWay = 1800;
            defaultFares.priceRoundTrip = 3200;
          } else if (vehicleId === 'innova_crysta') {
            defaultFares.priceOneWay = 2200;
            defaultFares.priceRoundTrip = 4000;
          } else if (vehicleId === 'luxury') {
            defaultFares.priceOneWay = 3000;
            defaultFares.priceRoundTrip = 5500;
          } else if (vehicleId === 'tempo_traveller') {
            defaultFares.priceOneWay = 3500;
            defaultFares.priceRoundTrip = 6500;
          }
          
          fares = [defaultFares];
        }
        
        return {
          status: 'success',
          message: 'Airport fares retrieved successfully',
          vehicleId: vehicleId,
          fares: fares,
          timestamp: Date.now()
        };
      }
      
      // DIRECT LOCAL FARES
      if (endpoint.includes('direct-local-fares.php')) {
        const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
        const vehicleId = urlParams.get('id') || urlParams.get('vehicle_id');
        
        if (!vehicleId) {
          return { 
            status: 'error', 
            message: 'Vehicle ID is required' 
          };
        }
        
        // Try to get locally stored fares first
        const storedFaresKey = `local_fares_${vehicleId}`;
        const storedFaresStr = localStorage.getItem(storedFaresKey);
        let fares = [];
        
        if (storedFaresStr) {
          try {
            const storedFares = JSON.parse(storedFaresStr);
            fares = [storedFares];
          } catch (e) {
            console.error('Error parsing stored fares:', e);
          }
        }
        
        // If no stored fares, use defaults
        if (fares.length === 0) {
          const defaultFares = {
            vehicleId: vehicleId,
            vehicle_id: vehicleId,
            price4hrs40km: 1200,
            price8hrs80km: 2200,
            price10hrs100km: 2600,
            priceExtraKm: 12,
            priceExtraHour: 200
          };
          
          if (vehicleId === 'ertiga') {
            defaultFares.price4hrs40km = 1500;
            defaultFares.price8hrs80km = 2600;
            defaultFares.price10hrs100km = 3200;
            defaultFares.priceExtraKm = 15;
            defaultFares.priceExtraHour = 250;
          } else if (vehicleId === 'innova_crysta') {
            defaultFares.price4hrs40km = 1800;
            defaultFares.price8hrs80km = 3200;
            defaultFares.price10hrs100km = 3800;
            defaultFares.priceExtraKm = 18;
            defaultFares.priceExtraHour = 300;
          } else if (vehicleId === 'luxury') {
            defaultFares.price4hrs40km = 2500;
            defaultFares.price8hrs80km = 4000;
            defaultFares.price10hrs100km = 4800;
            defaultFares.priceExtraKm = 22;
            defaultFares.priceExtraHour = 350;
          } else if (vehicleId === 'tempo_traveller') {
            defaultFares.price4hrs40km = 3000;
            defaultFares.price8hrs80km = 5000;
            defaultFares.price10hrs100km = 6000;
            defaultFares.priceExtraKm = 25;
            defaultFares.priceExtraHour = 400;
          }
          
          fares = [defaultFares];
        }
        
        return {
          status: 'success',
          message: 'Local fares retrieved successfully',
          vehicleId: vehicleId,
          fares: fares,
          timestamp: Date.now()
        };
      }
      
      // Fix DATABASE
      if (endpoint.includes('fix-database.php') || endpoint.includes('fix-vehicle-tables.php')) {
        return {
          status: 'success',
          message: 'Database tables fixed successfully',
          timestamp: Date.now()
        };
      }
      
      // Default mock response if no specific handler
      return {
        status: 'success',
        message: `Operation on ${endpoint} completed successfully`,
        timestamp: Date.now(),
        _mock: true
      };
    }
    
    // Not in preview mode - make the actual API call
    const url = apiBaseUrl ? `${apiBaseUrl}/${endpoint.replace(/^\//, '')}` : endpoint;
    
    console.log(`Making ${method} request to ${url}`);
    
    const fetchOptions: RequestInit = {
      method: method,
      headers: {
        ...headers
      }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      if (typeof data === 'object' && !(data instanceof FormData)) {
        if (headers['Content-Type'] === 'application/x-www-form-urlencoded') {
          const params = new URLSearchParams();
          for (const key in data) {
            if (data[key] !== undefined && data[key] !== null) {
              params.append(key, String(data[key]));
            }
          }
          fetchOptions.body = params.toString();
        } else if (headers['Content-Type']?.includes('multipart/form-data')) {
          // Use FormData for multipart/form-data
          const formData = new FormData();
          for (const key in data) {
            if (data[key] !== undefined && data[key] !== null) {
              if (typeof data[key] === 'object' && !(data[key] instanceof File)) {
                formData.append(key, JSON.stringify(data[key]));
              } else {
                formData.append(key, data[key]);
              }
            }
          }
          // Remove Content-Type header to let the browser set it with boundary
          delete fetchOptions.headers['Content-Type'];
          fetchOptions.body = formData;
        } else {
          // Default to JSON
          fetchOptions.headers['Content-Type'] = 'application/json';
          fetchOptions.body = JSON.stringify(data);
        }
      } else if (data instanceof FormData) {
        // FormData object was passed directly
        delete fetchOptions.headers['Content-Type'];
        fetchOptions.body = data;
      } else {
        // String or other body types
        fetchOptions.body = data;
      }
    }
    
    try {
      const response = await fetch(url, fetchOptions);
      
      // Check for HTTP errors
      if (!response.ok) {
        console.error(`HTTP error ${response.status}: ${response.statusText}`);
        const errorData = {
          status: 'error',
          message: `HTTP error ${response.status}: ${response.statusText}`,
          httpStatus: response.status
        };
        
        // Try to parse error response
        try {
          const errorBody = await response.json();
          return {
            ...errorData,
            ...errorBody
          };
        } catch (parseError) {
          // Return basic error if response can't be parsed
          return errorData;
        }
      }
      
      // Parse response as JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        // Return text response for non-JSON content types
        const text = await response.text();
        try {
          // Try to parse as JSON anyway if it looks like JSON
          if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
            return JSON.parse(text);
          }
        } catch (e) {
          // Not JSON, return as text
        }
        return { status: 'success', text, _raw: true };
      }
      
    } catch (error) {
      console.error(`Network error for ${url}:`, error);
      return {
        status: 'error',
        message: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        _network_error: true
      };
    }
  } catch (error) {
    console.error('Error in directVehicleOperation:', error);
    return {
      status: 'error',
      message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      _unexpected_error: true
    };
  }
};
