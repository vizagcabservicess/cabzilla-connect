
import { FleetVehicle, MaintenanceRecord, FuelRecord, VehicleDocument } from '@/types/cab';
import axios from 'axios';
import { API_BASE_URL } from '@/config';

const API_URL = `${API_BASE_URL}/api/admin/fleet`;

// Helper function to log API errors
const logAPIError = (functionName: string, error: any) => {
  console.error(`Error in fleetAPI.${functionName}:`, error);
  if (error.response) {
    console.error(`Response status: ${error.response.status}`);
    console.error(`Response data:`, error.response.data);
  }
};

// Small cache for preventing duplicate submissions
const recentOperations: Record<string, number> = {};

// Check if an operation was recently performed (within last 5 seconds)
const isRecentOperation = (operation: string, data: any): boolean => {
  const key = `${operation}_${JSON.stringify(data)}`;
  const now = Date.now();
  const lastTime = recentOperations[key] || 0;
  
  if (now - lastTime < 5000) { // 5 seconds threshold
    console.log(`Prevented duplicate ${operation} operation`);
    return true;
  }
  
  // Record this operation
  recentOperations[key] = now;
  
  // Clean up old entries
  Object.keys(recentOperations).forEach(k => {
    if (now - recentOperations[k] > 60000) { // Remove entries older than 1 minute
      delete recentOperations[k];
    }
  });
  
  return false;
};

export const fleetAPI = {
  /**
   * Get all fleet vehicles
   * @param includeInactive Whether to include inactive vehicles
   */
  getVehicles: async (includeInactive = false): Promise<{vehicles: FleetVehicle[]}> => {
    try {
      console.log(`Fetching vehicles from ${API_URL}/vehicles`);
      
      // Try direct PHP endpoint first
      try {
        const directResponse = await axios.get(`${API_BASE_URL}/api/admin/fleet-vehicles.php`, {
          params: { includeInactive },
          headers: {
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-store, no-cache, must-revalidate'
          }
        });
        
        if (directResponse.data && (directResponse.data.vehicles || directResponse.data.data)) {
          console.log("Got response from direct PHP endpoint:", directResponse.data);
          return { 
            vehicles: directResponse.data.vehicles || directResponse.data.data || [] 
          };
        }
      } catch (directError) {
        console.warn("Direct PHP endpoint failed, trying fleet API:", directError);
      }
      
      // Fall back to standard fleet API
      const response = await axios.get(`${API_URL}/vehicles`, {
        params: { includeInactive },
        headers: {
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      });
      
      console.log("API response:", response.data);
      
      // Make sure we're returning in the expected format
      if (response.data && !response.data.vehicles && Array.isArray(response.data)) {
        return { vehicles: response.data };
      }
      
      return response.data;
    } catch (error) {
      logAPIError("getVehicles", error);
      
      // Try to get vehicles from localStorage first
      try {
        const storedFleet = localStorage.getItem('fleet-vehicles');
        if (storedFleet) {
          const vehicles = JSON.parse(storedFleet);
          console.log("Using locally stored vehicles:", vehicles);
          return { vehicles };
        }
      } catch (storageError) {
        console.error("Failed to load from localStorage:", storageError);
      }
      
      // Return empty array as last resort instead of mock data
      return { vehicles: [] };
    }
  },
  
  /**
   * Get pending bookings that need a vehicle assigned
   */
  getPendingBookings: async () => {
    try {
      console.log(`Fetching pending bookings from ${API_BASE_URL}/api/admin/pending-bookings.php`);
      
      // Try direct PHP endpoint first
      try {
        const response = await axios.get(`${API_BASE_URL}/api/admin/pending-bookings.php`, {
          headers: {
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-store, no-cache, must-revalidate'
          }
        });
        
        console.log("Pending bookings response:", response.data);
        return response.data;
      } catch (directError) {
        console.warn("Direct PHP endpoint failed:", directError);
        throw directError;
      }
    } catch (error) {
      logAPIError("getPendingBookings", error);
      throw error;
    }
  },

  /**
   * Get vehicle by ID
   * @param vehicleId Vehicle ID
   */
  getVehicleById: async (vehicleId: string): Promise<FleetVehicle> => {
    try {
      // Try direct PHP endpoint first
      try {
        const response = await axios.get(`${API_BASE_URL}/api/admin/fleet-vehicle.php`, {
          params: { id: vehicleId },
          headers: {
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-store, no-cache, must-revalidate'
          }
        });
        
        if (response.data && response.data.vehicle) {
          return response.data.vehicle;
        }
      } catch (directError) {
        console.warn("Direct PHP endpoint failed, trying fleet API:", directError);
      }
      
      // Fall back to fleet API
      const response = await axios.get(`${API_URL}/vehicles/${vehicleId}`);
      return response.data.vehicle;
    } catch (error) {
      logAPIError(`getVehicleById(${vehicleId})`, error);
      
      // Try to retrieve from localStorage
      try {
        const storedFleet = localStorage.getItem('fleet-vehicles');
        if (storedFleet) {
          const vehicles = JSON.parse(storedFleet);
          const vehicle = vehicles.find((v: FleetVehicle) => v.id === vehicleId);
          if (vehicle) return vehicle;
        }
      } catch (storageError) {
        console.error("Failed to load from localStorage:", storageError);
      }
      
      throw error;
    }
  },

  /**
   * Add new vehicle
   * @param vehicle Vehicle data
   */
  addVehicle: async (vehicle: Partial<FleetVehicle>): Promise<FleetVehicle> => {
    // Prevent duplicate submissions
    if (isRecentOperation('addVehicle', vehicle)) {
      throw new Error("Duplicate submission prevented");
    }
    
    try {
      console.log("Sending vehicle data to API:", vehicle);
      
      // Adjust request for backend PHP API
      const requestData = {
        ...vehicle,
        vehicleNumber: vehicle.vehicleNumber,
        name: vehicle.name,
        model: vehicle.model,
        make: vehicle.make,
        year: vehicle.year,
        status: vehicle.status,
        lastService: vehicle.lastService,
        nextServiceDue: vehicle.nextServiceDue,
        fuelType: vehicle.fuelType,
        vehicleType: vehicle.vehicleType,
        cabTypeId: vehicle.cabTypeId,
        capacity: vehicle.capacity,
        luggageCapacity: vehicle.luggageCapacity,
        isActive: vehicle.isActive
      };
      
      // Try direct PHP endpoint first
      try {
        const response = await axios.post(`${API_BASE_URL}/api/admin/vehicle-create.php`, requestData, {
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Mode': 'true'
          }
        });
        
        console.log("Direct PHP endpoint response:", response.data);
        
        if (response.data && response.data.status === 'success') {
          // Add to localStorage cache
          try {
            const storedFleet = localStorage.getItem('fleet-vehicles');
            const vehicles = storedFleet ? JSON.parse(storedFleet) : [];
            
            // Ensure we don't add duplicates
            const exists = vehicles.some((v: FleetVehicle) => 
              v.id === response.data.vehicle.id || 
              (v.vehicleNumber && v.vehicleNumber === response.data.vehicle.vehicleNumber)
            );
            
            if (!exists) {
              vehicles.push(response.data.vehicle);
              localStorage.setItem('fleet-vehicles', JSON.stringify(vehicles));
            }
          } catch (storageError) {
            console.error("Failed to update localStorage:", storageError);
          }
          
          return response.data.vehicle;
        }
        
        throw new Error("Invalid response format from direct PHP endpoint");
      } catch (phpError) {
        console.error("PHP direct endpoint failed:", phpError);
        
        // Fall back to fleet API endpoint
        const response = await axios.post(`${API_URL}/vehicles`, vehicle);
        
        if (!response.data || !response.data.vehicle) {
          throw new Error("Invalid response format from API");
        }
        
        return response.data.vehicle;
      }
    } catch (error) {
      logAPIError("addVehicle", error);
      throw error;
    }
  },

  /**
   * Update vehicle
   * @param vehicleId Vehicle ID
   * @param vehicle Vehicle data
   */
  updateVehicle: async (vehicleId: string, vehicle: Partial<FleetVehicle>): Promise<FleetVehicle> => {
    // Prevent duplicate submissions
    if (isRecentOperation('updateVehicle', {id: vehicleId, ...vehicle})) {
      throw new Error("Duplicate submission prevented");
    }
    
    try {
      // Try direct PHP endpoint first
      try {
        const response = await axios.put(`${API_BASE_URL}/api/admin/vehicle-update.php`, {
          id: vehicleId,
          ...vehicle
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Mode': 'true'
          }
        });
        
        if (response.data && response.data.status === 'success') {
          // Update localStorage cache
          try {
            const storedFleet = localStorage.getItem('fleet-vehicles');
            if (storedFleet) {
              let vehicles = JSON.parse(storedFleet);
              vehicles = vehicles.map((v: FleetVehicle) => 
                v.id === vehicleId ? {...v, ...vehicle, updatedAt: new Date().toISOString()} : v
              );
              localStorage.setItem('fleet-vehicles', JSON.stringify(vehicles));
            }
          } catch (storageError) {
            console.error("Failed to update localStorage:", storageError);
          }
          
          return response.data.vehicle;
        }
      } catch (phpError) {
        console.warn("Direct PHP endpoint failed, trying fleet API:", phpError);
      }
      
      // Fall back to fleet API
      const response = await axios.put(`${API_URL}/vehicles/${vehicleId}`, vehicle);
      return response.data.vehicle;
    } catch (error) {
      logAPIError(`updateVehicle(${vehicleId})`, error);
      throw error;
    }
  },
  
  /**
   * Assign vehicle to booking
   * @param bookingId Booking ID
   * @param vehicleId Vehicle ID
   * @param driverId Optional driver ID
   */
  assignVehicleToBooking: async (bookingId: number | string, vehicleId: string, driverId?: string | null): Promise<any> => {
    // Prevent duplicate submissions
    if (isRecentOperation('assignVehicleToBooking', {bookingId, vehicleId, driverId})) {
      throw new Error("Duplicate submission prevented");
    }
    
    try {
      console.log(`Assigning vehicle ${vehicleId} to booking ${bookingId}`);
      
      // Try direct PHP endpoint first
      try {
        const response = await axios.post(`${API_BASE_URL}/api/admin/booking-assign-vehicle.php`, {
          bookingId,
          vehicleId,
          driverId
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Mode': 'true'
          }
        });
        
        console.log("Direct PHP endpoint response:", response.data);
        
        if (response.data && response.data.status === 'success') {
          return response.data;
        }
      } catch (phpError) {
        console.warn("Direct PHP endpoint failed, trying fleet API:", phpError);
      }
      
      // Fall back to fleet API
      const response = await axios.post(`${API_URL}/bookings/assign`, {
        bookingId,
        vehicleId,
        driverId
      });
      
      return response.data;
    } catch (error) {
      logAPIError("assignVehicleToBooking", error);
      throw error;
    }
  }
};
