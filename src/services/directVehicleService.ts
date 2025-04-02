
import { apiBaseUrl, getApiUrl } from '@/config/api';
import { CabType } from '@/types/cab';
import { clearVehicleDataCache } from './vehicleDataService';

export async function createVehicle(vehicleData: CabType): Promise<{ status: string; message: string; vehicle?: CabType }> {
  try {
    const url = getApiUrl('/api/admin/direct-vehicle-create.php');
    
    // Ensure numeric values are properly formatted
    const normalizedVehicle = {
      ...vehicleData,
      capacity: Number(vehicleData.capacity),
      luggageCapacity: Number(vehicleData.luggageCapacity),
      price: Number(vehicleData.basePrice || vehicleData.price || 0),
      basePrice: Number(vehicleData.basePrice || vehicleData.price || 0),
      pricePerKm: Number(vehicleData.pricePerKm || 0)
    };
    
    const formData = new FormData();
    
    // Add all vehicle properties to the form data
    Object.entries(normalizedVehicle).forEach(([key, value]) => {
      if (key === 'amenities' && Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    // Clear cache to ensure fresh data on next fetch
    clearVehicleDataCache();
    
    // Dispatch an event to notify components about the vehicle data change
    window.dispatchEvent(new CustomEvent('vehicle-data-changed', { 
      detail: {
        action: 'create',
        vehicle: vehicleData,
        timestamp: Date.now()
      }
    }));

    return data;
  } catch (error) {
    console.error('Error creating vehicle:', error);
    throw error;
  }
}

export async function updateVehicle(vehicleData: CabType): Promise<{ status: string; message: string; vehicle?: CabType }> {
  try {
    const url = getApiUrl('/api/admin/direct-vehicle-update.php');
    
    console.log("Updating vehicle with original data:", vehicleData);
    
    // Ensure capacity is a valid number
    const capacity = Number(vehicleData.capacity);
    console.log("Original capacity value:", vehicleData.capacity, "type:", typeof vehicleData.capacity, "parsed:", capacity);
    
    // Ensure luggage capacity is a valid number
    const luggageCapacity = Number(vehicleData.luggageCapacity);
    console.log("Original luggage capacity value:", vehicleData.luggageCapacity, "type:", typeof vehicleData.luggageCapacity, "parsed:", luggageCapacity);
    
    // Ensure price values are valid numbers
    const basePrice = Number(vehicleData.basePrice || vehicleData.price || 0);
    console.log("Original basePrice value:", vehicleData.basePrice, "type:", typeof vehicleData.basePrice, "parsed:", basePrice);
    
    const pricePerKm = Number(vehicleData.pricePerKm || 0);
    console.log("Original pricePerKm value:", vehicleData.pricePerKm, "type:", typeof vehicleData.pricePerKm, "parsed:", pricePerKm);
    
    // Normalize vehicle data to ensure consistent types for API submission
    const normalizedVehicle = {
      ...vehicleData,
      capacity: capacity,
      luggageCapacity: luggageCapacity,
      price: basePrice,
      basePrice: basePrice,
      pricePerKm: pricePerKm,
      nightHaltCharge: Number(vehicleData.nightHaltCharge || 700),
      driverAllowance: Number(vehicleData.driverAllowance || 250)
    };
    
    console.log("Ensuring numeric values for vehicle:", normalizedVehicle);
    
    console.log("Normalizing numeric values:");
    console.log(`- capacity: ${vehicleData.capacity} -> ${normalizedVehicle.capacity}`);
    console.log(`- luggageCapacity: ${vehicleData.luggageCapacity} -> ${normalizedVehicle.luggageCapacity}`);
    console.log(`- basePrice: ${vehicleData.basePrice} -> ${normalizedVehicle.basePrice}`);
    console.log(`- price: ${vehicleData.price} -> ${normalizedVehicle.price}`);
    console.log(`- pricePerKm: ${vehicleData.pricePerKm} -> ${normalizedVehicle.pricePerKm}`);
    console.log(`- nightHaltCharge: ${vehicleData.nightHaltCharge} -> ${normalizedVehicle.nightHaltCharge}`);
    console.log(`- driverAllowance: ${vehicleData.driverAllowance} -> ${normalizedVehicle.driverAllowance}`);
    
    console.log("Normalized vehicle before update:", normalizedVehicle);
    
    // Create form data for submission
    const formData = new FormData();
    console.log("FormData contents for vehicle update:");
    console.log(`id: ${vehicleData.id}`);
    
    formData.append('id', vehicleData.id || '');
    formData.append('vehicleId', vehicleData.id || '');
    formData.append('name', vehicleData.name || '');
    formData.append('capacity', String(capacity));
    formData.append('luggageCapacity', String(luggageCapacity));
    formData.append('price', String(basePrice));
    formData.append('basePrice', String(basePrice));
    formData.append('pricePerKm', String(pricePerKm));
    formData.append('ac', vehicleData.ac === false ? '0' : '1');
    formData.append('isActive', vehicleData.isActive === false ? '0' : '1');
    
    if (vehicleData.image) {
      formData.append('image', vehicleData.image);
    }
    
    if (vehicleData.description) {
      formData.append('description', vehicleData.description);
    }
    
    if (vehicleData.nightHaltCharge) {
      formData.append('nightHaltCharge', String(normalizedVehicle.nightHaltCharge));
    }
    
    if (vehicleData.driverAllowance) {
      formData.append('driverAllowance', String(normalizedVehicle.driverAllowance));
    }
    
    // Handle amenities properly
    if (Array.isArray(vehicleData.amenities)) {
      formData.append('amenities', JSON.stringify(vehicleData.amenities));
    } else if (typeof vehicleData.amenities === 'string') {
      formData.append('amenities', vehicleData.amenities);
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      cache: 'no-cache'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    // Clear cache to ensure fresh data on next fetch
    clearVehicleDataCache();
    
    // Force dispatching an event to notify components about the vehicle data change
    window.dispatchEvent(new CustomEvent('vehicle-data-updated', { 
      detail: {
        action: 'update',
        vehicle: normalizedVehicle,
        timestamp: Date.now()
      }
    }));
    
    // Dispatch a second event with a slight delay to ensure UI refreshes
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('vehicle-data-changed', { 
        detail: {
          action: 'update',
          vehicle: normalizedVehicle,
          timestamp: Date.now() + 100
        }
      }));
    }, 500);

    return { 
      ...data,
      vehicle: normalizedVehicle 
    };
  } catch (error) {
    console.error('Error updating vehicle:', error);
    throw error;
  }
}

export async function deleteVehicle(id: string): Promise<{ status: string; message: string }> {
  try {
    const url = getApiUrl('/api/admin/direct-vehicle-delete.php');
    
    const formData = new FormData();
    formData.append('id', id);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    // Clear cache to ensure fresh data on next fetch
    clearVehicleDataCache();
    
    // Dispatch an event to notify components about the vehicle data change
    window.dispatchEvent(new CustomEvent('vehicle-data-changed', { 
      detail: {
        action: 'delete',
        vehicleId: id,
        timestamp: Date.now()
      }
    }));

    return data;
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    throw error;
  }
}
