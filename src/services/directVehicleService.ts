
/**
 * Direct vehicle service for operations that bypass API layers
 * This ensures consistent behavior for vehicle CRUD operations
 */
import { CabType } from '@/types/cab';
import { apiBaseUrl } from '@/config/api';
import { getBypassHeaders, safeFetch } from '@/config/requestConfig';
import { directVehicleOperation, checkApiHealth, fixDatabaseTables } from '@/utils/apiHelper';
import { toast } from 'sonner';

// Helper function to ensure consistent vehicle ID format
const normalizeVehicleId = (id: string): string => {
  if (!id) return '';
  // Return the ID as-is without any transformations to maintain compatibility with backend
  return id.trim();
};

// Helper function to ensure numeric values are always sent as numbers
const ensureNumericValues = (vehicle: CabType): CabType => {
  // First ensure all fields exist before attempting to parse them
  // Handle capacity and luggageCapacity, ensuring they are numbers
  const capacity = typeof vehicle.capacity === 'string' 
    ? parseInt(vehicle.capacity, 10) 
    : Number(vehicle.capacity || 4);
    
  const luggageCapacity = typeof vehicle.luggageCapacity === 'string' 
    ? parseInt(vehicle.luggageCapacity, 10) 
    : Number(vehicle.luggageCapacity || 2);
  
  // Handle pricing fields, ensuring they are numbers
  const basePrice = typeof vehicle.basePrice === 'string'
    ? parseFloat(vehicle.basePrice)
    : Number(vehicle.basePrice || vehicle.price || 0);
    
  const price = typeof vehicle.price === 'string'
    ? parseFloat(vehicle.price)
    : Number(vehicle.price || vehicle.basePrice || 0);
    
  const pricePerKm = typeof vehicle.pricePerKm === 'string'
    ? parseFloat(vehicle.pricePerKm)
    : Number(vehicle.pricePerKm || 0);
    
  const nightHaltCharge = typeof vehicle.nightHaltCharge === 'string'
    ? parseFloat(vehicle.nightHaltCharge)
    : Number(vehicle.nightHaltCharge || 700);
    
  const driverAllowance = typeof vehicle.driverAllowance === 'string'
    ? parseFloat(vehicle.driverAllowance)
    : Number(vehicle.driverAllowance || 250);
  
  console.log('Normalizing numeric values:');
  console.log('- capacity:', vehicle.capacity, '->', capacity);
  console.log('- luggageCapacity:', vehicle.luggageCapacity, '->', luggageCapacity);
  console.log('- basePrice:', vehicle.basePrice, '->', basePrice);
  console.log('- price:', vehicle.price, '->', price);
  console.log('- pricePerKm:', vehicle.pricePerKm, '->', pricePerKm);
  
  return {
    ...vehicle,
    // Force these to be valid numbers and preserve original values
    capacity: isNaN(capacity) ? 4 : capacity,
    luggageCapacity: isNaN(luggageCapacity) ? 2 : luggageCapacity,
    basePrice: isNaN(basePrice) ? 0 : basePrice,
    price: isNaN(price) ? 0 : price,
    pricePerKm: isNaN(pricePerKm) ? 0 : pricePerKm,
    nightHaltCharge: isNaN(nightHaltCharge) ? 700 : nightHaltCharge,
    driverAllowance: isNaN(driverAllowance) ? 250 : driverAllowance,
  };
};

/**
 * Create a new vehicle
 */
export const createVehicle = async (vehicle: CabType): Promise<CabType> => {
  try {
    console.log('Creating vehicle:', vehicle);
    
    // Normalize vehicle ID and ensure numeric values
    const normalizedVehicle = {
      ...ensureNumericValues(vehicle),
      id: normalizeVehicleId(vehicle.id || vehicle.vehicleId || ''),
      vehicleId: normalizeVehicleId(vehicle.id || vehicle.vehicleId || ''),
    };
    
    console.log('Normalized vehicle for creation:', normalizedVehicle);
    
    // Use FormData instead of JSON for better PHP compatibility
    const formData = new FormData();
    Object.entries(normalizedVehicle).forEach(([key, value]) => {
      if (value === undefined || value === null) return; // Skip undefined values
      
      if (typeof value === 'object' && value !== null) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value || ''));
      }
    });
    
    // Make direct request to create endpoint with FormData
    const url = `${apiBaseUrl}/api/admin/direct-vehicle-create.php?_t=${Date.now()}`;
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: getBypassHeaders(),
      credentials: 'omit',
      mode: 'cors',
      cache: 'no-store'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      // Clear any cached data
      localStorage.removeItem('cachedVehicles');
      
      // Dispatch event to notify other components about the change
      window.dispatchEvent(new CustomEvent('vehicle-data-changed'));
      
      return {
        ...normalizedVehicle,
        id: normalizedVehicle.id,
        vehicleId: normalizedVehicle.id,
      };
    } else {
      throw new Error(result.message || 'Failed to create vehicle');
    }
  } catch (error) {
    console.error('Error creating vehicle:', error);
    // Re-throw to allow the UI to handle the error
    throw error;
  }
};

/**
 * Update an existing vehicle
 */
export const updateVehicle = async (vehicle: CabType): Promise<CabType> => {
  try {
    console.log('Updating vehicle with original data:', vehicle);
    
    // CRITICAL: Preserve isActive status and numeric values correctly
    const isActive = typeof vehicle.isActive === 'boolean' ? vehicle.isActive : true;
    
    // Explicitly get capacity and luggage_capacity as numbers
    const capacity = typeof vehicle.capacity === 'string'
      ? parseInt(vehicle.capacity, 10)
      : Number(vehicle.capacity || 4);
      
    const luggageCapacity = typeof vehicle.luggageCapacity === 'string'
      ? parseInt(vehicle.luggageCapacity, 10)
      : Number(vehicle.luggageCapacity || 2);
    
    console.log(`Original capacity value: ${vehicle.capacity}, type: ${typeof vehicle.capacity}, parsed: ${capacity}`);
    console.log(`Original luggage capacity value: ${vehicle.luggageCapacity}, type: ${typeof vehicle.luggageCapacity}, parsed: ${luggageCapacity}`);
    
    // Normalize vehicle ID before sending and ensure all numeric values are actually numbers
    const normalizedVehicle = {
      ...ensureNumericValues(vehicle),
      id: normalizeVehicleId(vehicle.id || vehicle.vehicleId || ''),
      vehicleId: normalizeVehicleId(vehicle.id || vehicle.vehicleId || ''),
      isActive: isActive,
      is_active: isActive,
      // Force capacity values to be numbers
      capacity: isNaN(capacity) ? 4 : capacity,
      luggageCapacity: isNaN(luggageCapacity) ? 2 : luggageCapacity,
      luggage_capacity: isNaN(luggageCapacity) ? 2 : luggageCapacity,
    };
    
    console.log('Normalized vehicle before update:', normalizedVehicle);
    
    // Use FormData instead of JSON for better PHP compatibility
    const formData = new FormData();
    
    // Add critical fields explicitly first to ensure they're included
    formData.append('id', String(normalizedVehicle.id));
    formData.append('vehicleId', String(normalizedVehicle.id));
    formData.append('vehicle_id', String(normalizedVehicle.id));
    
    // Explicitly add capacity in all forms
    formData.append('capacity', String(normalizedVehicle.capacity));
    formData.append('capacity_value', String(normalizedVehicle.capacity));
    formData.append('capacity_numeric', String(normalizedVehicle.capacity));
    
    // Explicitly add luggage capacity in all forms
    formData.append('luggageCapacity', String(normalizedVehicle.luggageCapacity));
    formData.append('luggage_capacity', String(normalizedVehicle.luggageCapacity));
    formData.append('luggage_capacity_value', String(normalizedVehicle.luggageCapacity));
    formData.append('luggage_capacity_numeric', String(normalizedVehicle.luggageCapacity));
    
    // Add price fields explicitly
    formData.append('basePrice', String(normalizedVehicle.basePrice));
    formData.append('base_price', String(normalizedVehicle.basePrice));
    formData.append('price', String(normalizedVehicle.price));
    formData.append('pricePerKm', String(normalizedVehicle.pricePerKm));
    formData.append('price_per_km', String(normalizedVehicle.pricePerKm));
    
    // Add is_active flags explicitly
    formData.append('isActive', normalizedVehicle.isActive ? '1' : '0');
    formData.append('is_active', normalizedVehicle.isActive ? '1' : '0');
    
    // Add other fields
    Object.entries(normalizedVehicle).forEach(([key, value]) => {
      // Skip undefined or null values and already added critical fields
      if (value === undefined || value === null) return;
      if ([
        'id', 'vehicleId', 'vehicle_id', 
        'capacity', 'luggageCapacity', 'luggage_capacity', 
        'basePrice', 'base_price', 'price', 
        'pricePerKm', 'price_per_km',
        'isActive', 'is_active'
      ].includes(key)) return;
      
      // Handle price fields specially to ensure they're numbers
      if (key === 'nightHaltCharge' || key === 'driverAllowance') {
        const numVal = parseFloat(String(value));
        formData.append(key, String(isNaN(numVal) ? 0 : numVal));
        return;
      }
      
      // Handle amenities array specially
      if (key === 'amenities') {
        if (Array.isArray(value)) {
          formData.append(key, value.join(', '));
        } else {
          formData.append(key, String(value || ''));
        }
        return;
      }
      
      // Handle objects (like amenities array)
      if (typeof value === 'object' && value !== null) {
        formData.append(key, JSON.stringify(value));
      } else {
        // Add everything else as string
        formData.append(key, String(value));
      }
    });
    
    // Log FormData contents for debugging
    console.log('FormData contents for vehicle update:');
    for (const pair of formData.entries()) {
      console.log(`${pair[0]}: ${pair[1]}`);
    }
    
    // Make direct request to update endpoint with FormData
    const url = `${apiBaseUrl}/api/admin/direct-vehicle-update.php?_t=${Date.now()}`;
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: getBypassHeaders(),
      credentials: 'omit',
      mode: 'cors',
      cache: 'no-store'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('API update response:', result);
    
    if (result.status === 'success') {
      // Clear any cached data
      localStorage.removeItem('cachedVehicles');
      
      // Dispatch event to notify other components about the change
      window.dispatchEvent(new CustomEvent('vehicle-data-changed'));
      
      // Return both the original normalized vehicle and the server response
      const updatedVehicle = {
        ...normalizedVehicle,
        ...result.vehicle,
      };
      
      console.log('Final updated vehicle:', updatedVehicle);
      return updatedVehicle;
    } else {
      throw new Error(result.message || 'Failed to update vehicle');
    }
  } catch (error) {
    console.error('Error updating vehicle:', error);
    throw error;
  }
};

/**
 * Delete a vehicle
 */
export const deleteVehicle = async (vehicleId: string): Promise<boolean> => {
  try {
    console.log('Deleting vehicle:', vehicleId);
    
    const normalizedId = normalizeVehicleId(vehicleId);
    
    // Make direct request to delete endpoint with URL parameters
    const url = `${apiBaseUrl}/api/admin/direct-vehicle-delete.php?vehicleId=${encodeURIComponent(normalizedId)}&_t=${Date.now()}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: getBypassHeaders(),
      credentials: 'omit',
      mode: 'cors',
      cache: 'no-store'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      // Clear any cached data
      localStorage.removeItem('cachedVehicles');
      
      // Dispatch event to notify other components about the change
      window.dispatchEvent(new CustomEvent('vehicle-data-changed'));
      
      return true;
    } else {
      throw new Error(result.message || 'Failed to delete vehicle');
    }
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    throw error;
  }
};

/**
 * Update a vehicle's fares
 */
export const updateVehicleFares = async (vehicleId: string, fareData: any): Promise<boolean> => {
  try {
    console.log('Updating vehicle fares:', vehicleId, fareData);
    
    const result = await directVehicleOperation(
      '/api/admin/direct-vehicle-update.php', 
      'POST', 
      {
        vehicleId,
        ...fareData
      }
    );
    
    if (result.status === 'success') {
      // Clear any cached data
      localStorage.removeItem('cachedVehicles');
      
      // Dispatch event to notify other components about the change
      window.dispatchEvent(new CustomEvent('vehicle-data-changed'));
      
      return true;
    } else {
      throw new Error(result.message || 'Failed to update vehicle fares');
    }
  } catch (error) {
    console.error('Error updating vehicle fares:', error);
    throw error;
  }
};

/**
 * Sync vehicle data with server
 * Use this to fix database tables if needed
 */
export const syncVehicleData = async (): Promise<boolean> => {
  try {
    // Start by checking API health
    const isHealthy = await checkApiHealth();
    
    if (!isHealthy) {
      toast.warning("API not responding. Try using Fix Database option.");
      return false;
    }
    
    // Try to fix database tables
    const isFixed = await fixDatabaseTables();
    
    if (!isFixed) {
      toast.error('Failed to fix vehicle tables');
      return false;
    }
    
    toast.success('Successfully synchronized vehicle data across tables');
    
    // Clear any cached data
    localStorage.removeItem('cachedVehicles');
    
    // Dispatch event to notify other components about the change
    window.dispatchEvent(new CustomEvent('vehicle-data-cache-cleared'));
    
    return true;
  } catch (error) {
    console.error('Error syncing vehicle data:', error);
    return false;
  }
};

/**
 * Sync a specific vehicle's data across all tables
 */
export const syncVehicleTables = async (vehicleId: string): Promise<boolean> => {
  try {
    // Call the fix-vehicle-tables endpoint with the specific vehicle ID
    const url = `${apiBaseUrl}/api/admin/fix-vehicle-tables.php?vehicleId=${encodeURIComponent(vehicleId)}&_t=${Date.now()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getBypassHeaders(),
      cache: 'no-store',
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!response.ok) {
      console.error(`Failed to sync vehicle tables: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      console.log(`Vehicle ${vehicleId} synchronized across all tables`);
      return true;
    } else {
      console.error('Failed to sync vehicle tables:', result.message);
      return false;
    }
  } catch (error) {
    console.error('Error syncing vehicle tables:', error);
    return false;
  }
};

/**
 * Get a specific vehicle by ID
 */
export const getVehicleById = async (vehicleId: string): Promise<CabType | null> => {
  try {
    // Check local storage cache first
    const cachedVehiclesString = localStorage.getItem('cachedVehicles');
    if (cachedVehiclesString) {
      const cachedVehicles = JSON.parse(cachedVehiclesString);
      const cachedVehicle = cachedVehicles.find((v: CabType) => 
        v.id === vehicleId || v.vehicleId === vehicleId
      );
      
      if (cachedVehicle) {
        return cachedVehicle;
      }
    }
    
    // If not in cache, try to fetch from server
    const url = `${apiBaseUrl}/api/admin/get-vehicles.php?_t=${Date.now()}`;
    const response = await safeFetch(url);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.vehicles) {
      const vehicle = data.vehicles.find((v: CabType) => 
        v.id === vehicleId || v.vehicleId === vehicleId
      );
      
      return vehicle || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching vehicle by ID:', error);
    return null;
  }
};
