
import axios from 'axios';
import { toast } from "sonner";
import type { CabType } from '@/types/cab';
import { reloadCabTypes } from '@/lib/cabData';

// Base API URL if available
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Create a new vehicle using all available API endpoints and local storage fallback
 */
export const createVehicle = async (vehicleData: any): Promise<boolean> => {
  try {
    console.log('Creating vehicle with data:', vehicleData);
    
    // Normalize vehicle ID
    const vehicleId = vehicleData.vehicleId || vehicleData.id || 
                      vehicleData.name?.toLowerCase().replace(/\s+/g, '_') || 
                      `vehicle_${Date.now()}`;
    
    // Ensure all required fields are present
    const normalizedData = {
      vehicleId,
      id: vehicleId,
      name: vehicleData.name || 'New Vehicle',
      capacity: Number(vehicleData.capacity) || 4,
      luggageCapacity: Number(vehicleData.luggageCapacity) || 2,
      price: Number(vehicleData.price || vehicleData.basePrice) || 0,
      pricePerKm: Number(vehicleData.pricePerKm) || 0,
      basePrice: Number(vehicleData.price || vehicleData.basePrice) || 0,
      image: vehicleData.image || '/cars/sedan.png',
      isActive: vehicleData.isActive !== false,
      amenities: Array.isArray(vehicleData.amenities) ? vehicleData.amenities : ['AC'],
      description: vehicleData.description || `${vehicleData.name} vehicle`,
      nightHaltCharge: Number(vehicleData.nightHaltCharge) || 700,
      driverAllowance: Number(vehicleData.driverAllowance) || 250,
      ac: vehicleData.ac !== false
    };
    
    // Cache the new vehicle in localStorage first as a fallback
    try {
      let localVehicles = [];
      const storedVehicles = localStorage.getItem('localVehicles');
      
      if (storedVehicles) {
        localVehicles = JSON.parse(storedVehicles);
      }
      
      // Remove any existing vehicle with the same ID
      localVehicles = localVehicles.filter((v: any) => v.id !== vehicleId);
      
      // Add the new vehicle
      localVehicles.push(normalizedData);
      
      localStorage.setItem('localVehicles', JSON.stringify(localVehicles));
      console.log('Saved vehicle to local storage as fallback');
    } catch (e) {
      console.error('Failed to save to local storage:', e);
    }
    
    // Try multiple creation methods
    const endpoints = [
      // Try the new direct endpoint
      `${apiBaseUrl}/api/admin/direct-vehicle-create.php`,
      `/api/admin/direct-vehicle-create.php`,
      // Try the fares/vehicles.php endpoint with PUT method
      `${apiBaseUrl}/api/fares/vehicles.php`,
      `/api/fares/vehicles.php`,
      // Generic admin endpoints
      `${apiBaseUrl}/api/admin/vehicles-update.php`,
      `/api/admin/vehicles-update.php`
    ];
    
    // Create FormData for better PHP compatibility
    const formData = new FormData();
    Object.entries(normalizedData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }
    });
    
    let success = false;
    let errorMessage = '';
    
    // Try PUT method first (create)
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying to create vehicle using PUT to ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'PUT',
          body: formData,
          headers: {
            'X-Force-Refresh': 'true',
            'X-Custom-Timestamp': Date.now().toString()
          }
        });
        
        const responseText = await response.text();
        console.log(`Response from ${endpoint}:`, responseText);
        
        if (response.ok) {
          success = true;
          console.log('Successfully created vehicle via', endpoint);
          break;
        } else {
          errorMessage = `Error ${response.status} from ${endpoint}`;
        }
      } catch (error) {
        console.error(`Error creating vehicle at ${endpoint}:`, error);
      }
    }
    
    // If PUT failed, try POST method as fallback
    if (!success) {
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying to create vehicle using POST to ${endpoint}`);
          
          const response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
            headers: {
              'X-Action': 'create',
              'X-Force-Refresh': 'true',
              'X-Custom-Timestamp': Date.now().toString()
            }
          });
          
          const responseText = await response.text();
          console.log(`Response from ${endpoint}:`, responseText);
          
          if (response.ok) {
            success = true;
            console.log('Successfully created vehicle via POST to', endpoint);
            break;
          }
        } catch (error) {
          console.error(`Error creating vehicle at ${endpoint} with POST:`, error);
        }
      }
    }
    
    // Final fallback - try axios with JSON
    if (!success) {
      try {
        const axiosResponse = await axios.post(`${apiBaseUrl}/api/fares/vehicles.php`, normalizedData, {
          headers: {
            'Content-Type': 'application/json',
            'X-Force-Refresh': 'true'
          }
        });
        
        if (axiosResponse.status === 200) {
          success = true;
          console.log('Successfully created vehicle via axios');
        }
      } catch (error) {
        console.error('Axios error creating vehicle:', error);
      }
    }
    
    // Clear any vehicle caches after creating
    localStorage.removeItem('cachedVehicles');
    sessionStorage.removeItem('cabTypes');
    
    // Trigger refresh event
    window.dispatchEvent(new CustomEvent('vehicle-created', {
      detail: { 
        timestamp: Date.now(),
        vehicleId,
        vehicleData: normalizedData
      }
    }));
    
    // If all API methods failed, we still have the local storage backup
    if (!success) {
      console.warn('All API endpoints failed, but vehicle saved to local storage');
      toast.warning("Created vehicle in offline mode - some features may be limited", {
        duration: 5000
      });
    } else {
      toast.success("Vehicle created successfully");
      
      // Reload cab types to ensure new vehicle appears
      await reloadCabTypes();
    }
    
    // Return true even if API failed since we saved locally
    return true;
    
  } catch (error) {
    console.error('Error in createVehicle:', error);
    toast.error(`Failed to create vehicle: ${(error as Error).message || 'Unknown error'}`);
    return false;
  }
};
