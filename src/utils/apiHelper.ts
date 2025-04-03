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
        'X-Force-Refresh': 'true'
      }
    });
    
    if (!response.ok) {
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
 */
export const directVehicleOperation = async (endpoint: string, method = 'GET', data?: any): Promise<any> => {
  try {
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
        const vehicleId = urlParams.get('id');
        
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
        
        if (!data || (!data.id && !data.vehicleId)) {
          return { 
            status: 'error', 
            message: 'Vehicle ID is required for update' 
          };
        }
        
        const vehicleId = data.id || data.vehicleId;
        console.log(`Updating vehicle ${vehicleId} in preview mode`);
        
        // Store updated vehicle data in localStorage for persistence
        storeVehicleLocally(data);
        
        return {
          status: 'success',
          message: 'Vehicle updated successfully',
          vehicle: data
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
          timestamp: Date.now()
        };
      }
      
      // GET VEHICLES
      if ((endpoint.includes('vehicles-data.php') || endpoint.includes('get-vehicles.php')) && 
          method === 'GET') {
        console.log('Getting vehicle data in preview mode');
        
        const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
        const includeInactive = urlParams.get('includeInactive') === 'true';
        const vehicleId = urlParams.get('id') || urlParams.get('vehicleId');
        
        // Get locally stored vehicles first
        const storedVehicles = getStoredVehicles();
        let vehicles = [];
        
        // Default vehicles
        const defaultVehicles = [
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
            isActive: !includeInactive ? false : true
          }
        ];
        
        // Merge default vehicles with stored vehicles
        vehicles = defaultVehicles.map(defaultVehicle => {
          const storedVehicle = storedVehicles[defaultVehicle.id];
          return storedVehicle ? { ...defaultVehicle, ...storedVehicle } : defaultVehicle;
        });
        
        // Filter by vehicle ID if specified
        if (vehicleId) {
          vehicles = vehicles.filter(v => v.id === vehicleId || v.vehicleId === vehicleId);
        }
        
        // Filter inactive vehicles if needed
        if (!includeInactive) {
          vehicles = vehicles.filter(v => v.isActive !== false);
        }
        
        return {
          status: 'success',
          message: 'Vehicles retrieved successfully',
          vehicles: vehicles
        };
      }
      
      // DIRECT LOCAL FARES
      if (endpoint.includes('direct-local-fares.php') && method === 'GET') {
        const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
        const vehicleId = urlParams.get('vehicle_id') || urlParams.get('vehicleId');
        
        if (!vehicleId) {
          return {
            status: 'error',
            message: 'Vehicle ID is required'
          };
        }
        
        // Check localStorage for stored fares first
        const fareKey = `local_fares_${vehicleId}`;
        const storedFares = localStorage.getItem(fareKey);
        
        if (storedFares) {
          try {
            const parsedFares = JSON.parse(storedFares);
            return {
              status: 'success',
              message: 'Local fares retrieved successfully',
              fares: [parsedFares]
            };
          } catch (e) {
            console.error('Error parsing stored fares:', e);
          }
        }
        
        // Default local package fares
        let defaultFare = {
          vehicleId: vehicleId,
          price4hrs40km: 0,
          price8hrs80km: 0,
          price10hrs100km: 0,
          priceExtraKm: 0,
          priceExtraHour: 0
        };
        
        // Set some default values based on vehicle type
        switch(vehicleId) {
          case 'sedan':
            defaultFare = { ...defaultFare, price4hrs40km: 900, price8hrs80km: 1500, price10hrs100km: 1800, priceExtraKm: 12, priceExtraHour: 150 };
            break;
          case 'ertiga':
            defaultFare = { ...defaultFare, price4hrs40km: 1100, price8hrs80km: 1800, price10hrs100km: 2200, priceExtraKm: 14, priceExtraHour: 200 };
            break;
          case 'innova_crysta':
            defaultFare = { ...defaultFare, price4hrs40km: 1300, price8hrs80km: 2200, price10hrs100km: 2600, priceExtraKm: 16, priceExtraHour: 250 };
            break;
          case 'luxury':
            defaultFare = { ...defaultFare, price4hrs40km: 1500, price8hrs80km: 2500, price10hrs100km: 3000, priceExtraKm: 18, priceExtraHour: 300 };
            break;
          case 'tempo_traveller':
            defaultFare = { ...defaultFare, price4hrs40km: 2000, price8hrs80km: 3500, price10hrs100km: 4000, priceExtraKm: 22, priceExtraHour: 350 };
            break;
        }
        
        return {
          status: 'success',
          message: 'Local fares retrieved successfully',
          fares: [defaultFare]
        };
      }
      
      // DIRECT AIRPORT FARES
      if (endpoint.includes('direct-airport-fares.php') && method === 'GET') {
        const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
        const vehicleId = urlParams.get('vehicle_id') || urlParams.get('vehicleId');
        
        if (!vehicleId) {
          return {
            status: 'error',
            message: 'Vehicle ID is required'
          };
        }
        
        // Check localStorage for stored fares first
        const fareKey = `airport_fares_${vehicleId}`;
        const storedFares = localStorage.getItem(fareKey);
        
        if (storedFares) {
          try {
            const parsedFares = JSON.parse(storedFares);
            return {
              status: 'success',
              message: 'Airport fares retrieved successfully',
              fares: [parsedFares]
            };
          } catch (e) {
            console.error('Error parsing stored fares:', e);
          }
        }
        
        // Default airport fares
        let defaultFare = {
          vehicleId: vehicleId,
          priceOneWay: 0,
          priceRoundTrip: 0,
          nightCharges: 0,
          extraWaitingCharges: 0
        };
        
        // Set some default values based on vehicle type
        switch(vehicleId) {
          case 'sedan':
            defaultFare = { ...defaultFare, priceOneWay: 1500, priceRoundTrip: 2800, nightCharges: 300, extraWaitingCharges: 150 };
            break;
          case 'ertiga':
            defaultFare = { ...defaultFare, priceOneWay: 1800, priceRoundTrip: 3400, nightCharges: 350, extraWaitingCharges: 200 };
            break;
          case 'innova_crysta':
            defaultFare = { ...defaultFare, priceOneWay: 2200, priceRoundTrip: 4000, nightCharges: 400, extraWaitingCharges: 250 };
            break;
          case 'luxury':
            defaultFare = { ...defaultFare, priceOneWay: 2600, priceRoundTrip: 4800, nightCharges: 500, extraWaitingCharges: 300 };
            break;
          case 'tempo_traveller':
            defaultFare = { ...defaultFare, priceOneWay: 3500, priceRoundTrip: 6000, nightCharges: 600, extraWaitingCharges: 350 };
            break;
        }
        
        return {
          status: 'success',
          message: 'Airport fares retrieved successfully',
          fares: [defaultFare]
        };
      }
      
      // LOCAL FARES UPDATE
      if (endpoint.includes('local-fares-update.php') && (method === 'POST' || method === 'PUT')) {
        console.log('Updating local fares in preview mode:', data);
        
        if (!data || (!data.vehicleId && !data.vehicle_id)) {
          return { 
            status: 'error', 
            message: 'Vehicle ID is required for fare update' 
          };
        }
        
        const vehicleId = data.vehicleId || data.vehicle_id;
        
        // Store fares in localStorage for persistence
        try {
          const fareKey = `local_fares_${vehicleId}`;
          localStorage.setItem(fareKey, JSON.stringify(data));
        } catch (e) {
          console.error('Error storing fares locally:', e);
        }
        
        return {
          status: 'success',
          message: 'Local fares updated successfully',
          fare: data
        };
      }
      
      // AIRPORT FARES UPDATE
      if (endpoint.includes('airport-fares-update.php') && (method === 'POST' || method === 'PUT')) {
        console.log('Updating airport fares in preview mode:', data);
        
        if (!data || (!data.vehicleId && !data.vehicle_id)) {
          return { 
            status: 'error', 
            message: 'Vehicle ID is required for fare update' 
          };
        }
        
        const vehicleId = data.vehicleId || data.vehicle_id;
        
        // Store fares in localStorage for persistence
        try {
          const fareKey = `airport_fares_${vehicleId}`;
          localStorage.setItem(fareKey, JSON.stringify(data));
        } catch (e) {
          console.error('Error storing fares locally:', e);
        }
        
        return {
          status: 'success',
          message: 'Airport fares updated successfully',
          fare: data
        };
      }
      
      // Default mock response for unknown endpoints
      return {
        status: 'success',
        message: `Mock response for ${endpoint} in preview mode`,
        data: data || {},
        timestamp: Date.now()
      };
    }
    
    // For non-preview mode, proceed with real API request
    const url = `${apiBaseUrl}/${endpoint.startsWith('/') ? endpoint.slice(1) : endpoint}`;
    console.log(`Making ${method} request to ${url}`);
    
    const headers: HeadersInit = {
      'X-Requested-With': 'XMLHttpRequest'
    };
    
    if (method !== 'GET' && !(data instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    
    const requestOptions: RequestInit = {
      method,
      headers,
      mode: 'cors',
      cache: 'no-store'
    };
    
    if (data && method !== 'GET') {
      if (data instanceof FormData) {
        requestOptions.body = data;
      } else {
        requestOptions.body = JSON.stringify(data);
      }
    }
    
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      throw new Error(`Request failed with status code ${response.status}`);
    }
    
    const responseText = await response.text();
    
    try {
      const result = JSON.parse(responseText);
      return result;
    } catch (e) {
      console.error('Failed to parse JSON response:', e, responseText);
      throw new Error('Invalid JSON response from server');
    }
  } catch (error: any) {
    console.error(`API operation error for ${endpoint}:`, error);
    
    // In preview mode, don't show errors for certain endpoints
    if (isPreviewMode()) {
      console.log(`Preview mode: Suppressing error for ${endpoint}`);
      return {
        status: 'error',
        message: `Operation failed in preview mode: ${error.message}`,
        preview: true,
        error: error.message,
        timestamp: Date.now()
      };
    }
    
    toast.error(`API error: ${error.message}`);
    throw error;
  }
};
