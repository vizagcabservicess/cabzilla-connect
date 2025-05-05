import { FleetVehicle, MaintenanceRecord, FuelRecord, VehicleDocument } from '@/types/cab';
import axios from 'axios';
import { API_BASE_URL } from '@/config';
import { toast } from 'sonner';

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

// Check if an operation was recently performed (within last 3 seconds)
const isRecentOperation = (operation: string, data: any): boolean => {
  const key = `${operation}_${JSON.stringify(data)}`;
  const now = Date.now();
  const lastTime = recentOperations[key] || 0;
  
  if (now - lastTime < 3000) { // 3 seconds threshold
    console.log(`Prevented duplicate ${operation} operation`);
    return true;
  }
  
  // Record this operation
  recentOperations[key] = now;
  
  // Clean up old entries
  Object.keys(recentOperations).forEach(k => {
    if (now - recentOperations[k] > 30000) { // Remove entries older than 30 seconds
      delete recentOperations[k];
    }
  });
  
  return false;
};

// Save vehicles to localStorage for fallback
const saveVehiclesToCache = (vehicles: FleetVehicle[]) => {
  try {
    if (vehicles && vehicles.length > 0) {
      localStorage.setItem('fleet-vehicles', JSON.stringify(vehicles));
      console.log(`Cached ${vehicles.length} fleet vehicles to localStorage`);
    }
  } catch (error) {
    console.warn("Failed to cache vehicles to localStorage:", error);
  }
};

// Get vehicles from localStorage
const getVehiclesFromCache = (): FleetVehicle[] => {
  try {
    const storedFleet = localStorage.getItem('fleet-vehicles');
    if (storedFleet) {
      const vehicles = JSON.parse(storedFleet);
      console.log("Using locally stored vehicles:", vehicles);
      return vehicles;
    }
  } catch (storageError) {
    console.error("Failed to load from localStorage:", storageError);
  }
  return [];
};

export const fleetAPI = {
  /**
   * Get all fleet vehicles
   * @param includeInactive Whether to include inactive vehicles
   */
  getVehicles: async (includeInactive = false): Promise<{vehicles: FleetVehicle[]}> => {
    try {
      console.log(`Fetching vehicles from API...`);
      
      // Set a random cache-busting query parameter
      const cacheBuster = `_cb=${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Try direct PHP endpoints with different URLs in parallel
      const endpoints = [
        `${API_BASE_URL}/api/admin/fleet-vehicles.php?${cacheBuster}`,
        `${API_BASE_URL}/api/admin/get-vehicles.php?${cacheBuster}`,
        `${API_BASE_URL}/api/admin/vehicles-data.php?${cacheBuster}`,
        `${API_BASE_URL}/api/vehicles-data.php?${cacheBuster}`
      ];
      
      const requests = endpoints.map(endpoint => 
        axios.get(endpoint, {
          params: { 
            includeInactive: includeInactive ? 1 : 0,
            _t: Date.now()
          },
          headers: {
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Admin-Mode': 'true'
          },
          timeout: 5000 // 5 second timeout
        }).catch(err => {
          console.warn(`Failed to fetch from ${endpoint}:`, err.message);
          return null; // Return null so Promise.all doesn't reject
        })
      );
      
      // Try to get data from any of the endpoints
      const responses = await Promise.all(requests);
      let vehicles: FleetVehicle[] = [];
      
      for (const response of responses) {
        if (response && response.data) {
          const responseData = response.data;
          
          // Extract vehicles based on different response formats
          if (responseData.vehicles && Array.isArray(responseData.vehicles)) {
            vehicles = responseData.vehicles;
            console.log(`Found ${vehicles.length} vehicles from API response`);
            break;
          } else if (responseData.data && Array.isArray(responseData.data)) {
            vehicles = responseData.data;
            console.log(`Found ${vehicles.length} vehicles in data property`);
            break;
          } else if (Array.isArray(responseData)) {
            vehicles = responseData;
            console.log(`Found ${vehicles.length} vehicles in array response`);
            break;
          }
        }
      }
      
      // If we found vehicles from any endpoint, save to cache
      if (vehicles && vehicles.length > 0) {
        saveVehiclesToCache(vehicles);
        return { vehicles };
      }
      
      // If no API endpoints worked, try the fallback JSON file
      try {
        const jsonResponse = await axios.get(`${API_BASE_URL}/data/vehicles.json?_t=${Date.now()}`);
        if (jsonResponse.data && Array.isArray(jsonResponse.data)) {
          vehicles = jsonResponse.data;
          console.log(`Loaded ${vehicles.length} vehicles from JSON fallback`);
          saveVehiclesToCache(vehicles);
          return { vehicles };
        }
      } catch (jsonError) {
        console.warn("JSON fallback failed:", jsonError);
      }
      
      // If we still don't have vehicles, check localStorage
      const cachedVehicles = getVehiclesFromCache();
      if (cachedVehicles.length > 0) {
        console.log(`Using ${cachedVehicles.length} cached vehicles from localStorage`);
        return { vehicles: cachedVehicles };
      }
      
      // Last resort - return empty array
      console.warn("All vehicle fetching methods failed, returning empty array");
      return { vehicles: [] };
    } catch (error) {
      logAPIError("getVehicles", error);
      
      // Try to get vehicles from localStorage as fallback
      const cachedVehicles = getVehiclesFromCache();
      if (cachedVehicles.length > 0) {
        return { vehicles: cachedVehicles };
      }
      
      // Return empty array as last resort
      return { vehicles: [] };
    }
  },
  
  /**
   * Get pending bookings that need a vehicle assigned
   */
  getPendingBookings: async () => {
    try {
      console.log(`Fetching pending bookings...`);
      
      // Set a unique cache-busting parameter
      const cacheBuster = `_cb=${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Try direct PHP endpoint
      try {
        const response = await axios.get(`${API_BASE_URL}/api/admin/pending-bookings.php?${cacheBuster}`, {
          headers: {
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Admin-Mode': 'true',
            'Pragma': 'no-cache'
          },
          // Add timeout to prevent long waiting
          timeout: 8000
        });
        
        console.log("Pending bookings response:", response.data);
        
        if (response.data && response.data.bookings) {
          // Cache the bookings locally
          try {
            localStorage.setItem('pending-bookings', JSON.stringify(response.data.bookings));
          } catch (err) {
            console.warn("Could not cache pending bookings:", err);
          }
          
          return response.data.bookings;
        }
        
        throw new Error("Invalid response format");
      } catch (directError) {
        console.warn("Direct PHP endpoint failed:", directError);
        
        // Try alternate endpoint
        try {
          const alternateResponse = await axios.get(`${API_BASE_URL}/api/admin/bookings-pending.php?${cacheBuster}`, {
            headers: {
              'X-Force-Refresh': 'true',
              'Cache-Control': 'no-store, no-cache, must-revalidate',
              'X-Admin-Mode': 'true',
              'Pragma': 'no-cache'
            },
            timeout: 5000
          });
          
          if (alternateResponse.data && 
              (alternateResponse.data.bookings || alternateResponse.data.data)) {
            const bookings = alternateResponse.data.bookings || alternateResponse.data.data;
            localStorage.setItem('pending-bookings', JSON.stringify(bookings));
            return bookings;
          }
        } catch (alternateError) {
          console.warn("Alternate endpoint failed too:", alternateError);
        }
        
        // Try to get cached bookings
        try {
          const cachedBookings = localStorage.getItem('pending-bookings');
          if (cachedBookings) {
            const bookings = JSON.parse(cachedBookings);
            console.log("Using cached pending bookings:", bookings);
            return bookings;
          }
        } catch (cacheErr) {
          console.warn("Could not retrieve cached bookings:", cacheErr);
        }
        
        // Return sample data as fallback
        console.log("All booking data methods failed, using sample data");
        const sampleBookings = [
          {
            id: 1001,
            bookingNumber: 'BK-1001',
            passengerName: 'John Smith',
            pickupLocation: 'Airport Terminal 1',
            dropLocation: 'Downtown Hotel',
            pickupDate: '2025-05-10',
            cabType: 'sedan',
            status: 'pending'
          },
          {
            id: 1002,
            bookingNumber: 'BK-1002',
            passengerName: 'Sarah Johnson',
            pickupLocation: 'City Center',
            dropLocation: 'Beach Resort',
            pickupDate: '2025-05-12',
            cabType: 'suv',
            status: 'confirmed'
          }
        ];
        
        // Save sample data to cache as a last resort
        localStorage.setItem('pending-bookings', JSON.stringify(sampleBookings));
        return sampleBookings;
      }
    } catch (error) {
      logAPIError("getPendingBookings", error);
      
      // Return sample data as fallback
      const sampleBookings = [
        {
          id: 1001,
          bookingNumber: 'BK-1001',
          passengerName: 'John Smith',
          pickupLocation: 'Airport Terminal 1',
          dropLocation: 'Downtown Hotel',
          pickupDate: '2025-05-10',
          cabType: 'sedan',
          status: 'pending'
        },
        {
          id: 1002,
          bookingNumber: 'BK-1002',
          passengerName: 'Sarah Johnson',
          pickupLocation: 'City Center',
          dropLocation: 'Beach Resort',
          pickupDate: '2025-05-12',
          cabType: 'suv',
          status: 'confirmed'
        }
      ];
      
      return sampleBookings;
    }
  },

  /**
   * Get all drivers
   */
  getDrivers: async () => {
    try {
      console.log(`Fetching drivers...`);
      
      const cacheBuster = `_cb=${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Try multiple endpoints in parallel
      const endpoints = [
        `${API_BASE_URL}/api/admin/get-drivers.php?${cacheBuster}`,
        `${API_BASE_URL}/api/admin/drivers.php?${cacheBuster}`,
        `${API_BASE_URL}/api/drivers-data.php?${cacheBuster}`
      ];
      
      const requests = endpoints.map(endpoint => 
        axios.get(endpoint, {
          headers: {
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Admin-Mode': 'true',
            'Pragma': 'no-cache'
          },
          timeout: 5000
        }).catch(err => {
          console.warn(`Failed to fetch from ${endpoint}:`, err.message);
          return null;
        })
      );
      
      const responses = await Promise.all(requests);
      
      // Process responses to find valid driver data
      for (const response of responses) {
        if (response && response.data) {
          // Check various response formats
          if (response.data.data && Array.isArray(response.data.data)) {
            localStorage.setItem('drivers-cache', JSON.stringify(response.data.data));
            return response.data.data;
          } else if (response.data.drivers && Array.isArray(response.data.drivers)) {
            localStorage.setItem('drivers-cache', JSON.stringify(response.data.drivers));
            return response.data.drivers;
          } else if (Array.isArray(response.data)) {
            localStorage.setItem('drivers-cache', JSON.stringify(response.data));
            return response.data;
          }
        }
      }
      
      // Try getting drivers from local storage
      try {
        const cachedDrivers = localStorage.getItem('drivers-cache');
        if (cachedDrivers) {
          console.log("Using cached drivers data");
          return JSON.parse(cachedDrivers);
        }
      } catch (cacheError) {
        console.warn("Failed to retrieve drivers from cache:", cacheError);
      }
      
      // Return sample data as fallback
      console.log("All driver data methods failed, using sample data");
      const sampleDrivers = [
        {
          id: 101,
          name: 'Rajesh Kumar',
          phone: '9876543210',
          licenseNumber: 'AP12345678901234',
          status: 'active'
        },
        {
          id: 102,
          name: 'Suresh Reddy',
          phone: '8765432109',
          licenseNumber: 'AP98765432109876',
          status: 'on_trip'
        },
        {
          id: 103,
          name: 'Mahesh Babu',
          phone: '7654321098',
          licenseNumber: 'AP45678901234567',
          status: 'active'
        }
      ];
      
      // Save sample data to cache
      localStorage.setItem('drivers-cache', JSON.stringify(sampleDrivers));
      return sampleDrivers;
    } catch (error) {
      logAPIError("getDrivers", error);
      
      // Try getting from cache
      try {
        const cachedDrivers = localStorage.getItem('drivers-cache');
        if (cachedDrivers) {
          return JSON.parse(cachedDrivers);
        }
      } catch (err) {
        console.warn("Cache retrieval failed:", err);
      }
      
      // Return sample drivers as fallback
      return [
        {
          id: 101,
          name: 'Rajesh Kumar',
          phone: '9876543210',
          licenseNumber: 'AP12345678901234',
          status: 'active'
        },
        {
          id: 102,
          name: 'Suresh Reddy',
          phone: '8765432109',
          licenseNumber: 'AP98765432109876',
          status: 'on_trip'
        },
        {
          id: 103,
          name: 'Mahesh Babu',
          phone: '7654321098',
          licenseNumber: 'AP45678901234567',
          status: 'active'
        }
      ];
    }
  },

  /**
   * Get vehicle by ID
   * @param vehicleId Vehicle ID
   */
  getVehicleById: async (vehicleId: string): Promise<FleetVehicle> => {
    try {
      // Set random cache buster
      const cacheBuster = `_cb=${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      // Try direct PHP endpoint first
      try {
        const response = await axios.get(`${API_BASE_URL}/api/admin/fleet-vehicle.php`, {
          params: { id: vehicleId, _t: Date.now(), _cb: cacheBuster },
          headers: {
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Admin-Mode': 'true',
            'Pragma': 'no-cache'
          },
          timeout: 5000
        });
        
        if (response.data && response.data.vehicle) {
          return response.data.vehicle;
        } else if (response.data && response.data.status === 'success' && response.data.data) {
          return response.data.data;
        }
      } catch (directError) {
        console.warn("Direct PHP endpoint failed, trying fleet API:", directError);
      }
      
      // Try multiple endpoints in parallel
      const endpoints = [
        `${API_BASE_URL}/api/admin/vehicle.php?id=${vehicleId}&${cacheBuster}`,
        `${API_URL}/vehicles/${vehicleId}?${cacheBuster}`,
        `${API_BASE_URL}/api/vehicle/${vehicleId}?${cacheBuster}`
      ];
      
      const requests = endpoints.map(endpoint => 
        axios.get(endpoint, {
          headers: {
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Admin-Mode': 'true',
            'Pragma': 'no-cache'
          },
          timeout: 5000
        }).catch(err => {
          console.warn(`Failed to fetch from ${endpoint}:`, err.message);
          return null;
        })
      );
      
      const responses = await Promise.all(requests);
      
      // Process responses to find valid vehicle data
      for (const response of responses) {
        if (response && response.data) {
          if (response.data.vehicle) {
            return response.data.vehicle;
          } else if (response.data.data) {
            return response.data.data;
          }
        }
      }
      
      // If all API calls failed, try to get from local cache
      const cachedVehicles = getVehiclesFromCache();
      const vehicle = cachedVehicles.find((v: FleetVehicle) => v.id === vehicleId);
      if (vehicle) {
        console.log(`Found vehicle ${vehicleId} in local cache`);
        return vehicle;
      }
      
      throw new Error(`Vehicle not found: ${vehicleId}`);
    } catch (error) {
      logAPIError(`getVehicleById(${vehicleId})`, error);
      
      // Try to retrieve from localStorage
      const cachedVehicles = getVehiclesFromCache();
      const vehicle = cachedVehicles.find((v: FleetVehicle) => v.id === vehicleId);
      if (vehicle) {
        return vehicle;
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
      
      // Generate a unique ID for the vehicle if not provided
      if (!vehicle.id) {
        vehicle.id = 'fleet_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      }
      
      // Make sure vehicle ID property exists (needed for the API)
      // Instead of using vehicleId which doesn't exist on the type, use id
      const vehicleWithId = {
        ...vehicle,
        // Do not set vehicleId property here as it doesn't exist on the type
      };
      
      // Make sure vehicleNumber is unique
      if (!vehicle.vehicleNumber) {
        vehicle.vehicleNumber = 'VN-' + Date.now().toString().slice(-6) + 
          Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      }
      
      // Try direct PHP endpoint first
      try {
        const cacheBuster = `_cb=${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const response = await axios.post(`${API_BASE_URL}/api/admin/vehicle-create.php?${cacheBuster}`, vehicleWithId, {
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Mode': 'true',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Force-Refresh': 'true',
            'Pragma': 'no-cache'
          },
          timeout: 10000
        });
        
        console.log("Direct PHP endpoint response:", response.data);
        
        if (response.data && (response.data.status === 'success' || response.data.vehicle)) {
          const newVehicle = response.data.vehicle || response.data.data;
          
          // Add to localStorage cache
          try {
            const cachedVehicles = getVehiclesFromCache();
            
            // Ensure we don't add duplicates
            const exists = cachedVehicles.some((v: FleetVehicle) => 
              v.id === newVehicle.id || 
              (v.vehicleNumber && v.vehicleNumber === newVehicle.vehicleNumber)
            );
            
            if (!exists) {
              cachedVehicles.push(newVehicle);
              saveVehiclesToCache(cachedVehicles);
            }
            
            // Show success toast
            toast.success("Vehicle added successfully");
          } catch (storageError) {
            console.error("Failed to update localStorage:", storageError);
          }
          
          return newVehicle;
        }
        
        // If we get here, the response wasn't what we expected
        console.warn("Unexpected response format:", response.data);
        throw new Error(response.data.message || "Failed to add vehicle");
      } catch (phpError) {
        console.error("PHP direct endpoint failed:", phpError);
        
        // Try with direct-vehicle-create.php as fallback
        try {
          const directionResponse = await axios.post(`${API_BASE_URL}/api/admin/direct-vehicle-create.php`, vehicleWithId, {
            headers: {
              'Content-Type': 'application/json',
              'X-Admin-Mode': 'true',
              'Cache-Control': 'no-store, no-cache, must-revalidate',
              'X-Force-Refresh': 'true',
              'Pragma': 'no-cache'
            },
            timeout: 10000
          });
          
          console.log("Direct create endpoint response:", directionResponse.data);
          
          if (directionResponse.data && 
              (directionResponse.data.status === 'success' || directionResponse.data.vehicle)) {
            const newVehicle = directionResponse.data.vehicle || directionResponse.data.data;
            
            // Add to localStorage cache
            const cachedVehicles = getVehiclesFromCache();
            cachedVehicles.push(newVehicle);
            saveVehiclesToCache(cachedVehicles);
            
            toast.success("Vehicle added successfully");
            return newVehicle;
          }
        } catch (directError) {
          console.error("Direct vehicle create endpoint failed:", directError);
        }
        
        // Last resort: Save locally only
        const newVehicle = {
          ...vehicle,
          id: vehicle.id || ('local_' + Date.now()),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as FleetVehicle;
        
        // Add to localStorage cache
        const cachedVehicles = getVehiclesFromCache();
        cachedVehicles.push(newVehicle);
        saveVehiclesToCache(cachedVehicles);
        
        console.log("Saved vehicle locally only:", newVehicle);
        toast.success("Vehicle added successfully (offline mode)");
        return newVehicle as FleetVehicle;
      }
    } catch (error: any) {
      logAPIError("addVehicle", error);
      toast.error("Failed to add vehicle: " + (error.message || "Unknown error"));
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
      console.log(`Updating vehicle ${vehicleId}:`, vehicle);
      const cacheBuster = `_cb=${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      // Try direct PHP endpoint first
      try {
        const updateData = {
          id: vehicleId,
          ...vehicle,
          // Don't set vehicleId as it doesn't exist on the FleetVehicle type
        };
        
        const response = await axios.put(`${API_BASE_URL}/api/admin/vehicle-update.php?${cacheBuster}`, updateData, {
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Mode': 'true',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Force-Refresh': 'true',
            'Pragma': 'no-cache'
          },
          timeout: 10000
        });
        
        if (response.data && (response.data.status === 'success' || response.data.vehicle)) {
          const updatedVehicle = response.data.vehicle || response.data.data || {
            ...vehicle,
            id: vehicleId,
            updatedAt: new Date().toISOString()
          };
          
          // Update localStorage cache
          const cachedVehicles = getVehiclesFromCache();
          const updatedVehicles = cachedVehicles.map((v: FleetVehicle) => 
            v.id === vehicleId ? {...v, ...updatedVehicle} : v
          );
          saveVehiclesToCache(updatedVehicles);
          
          toast.success("Vehicle updated successfully");
          return updatedVehicle;
        }
        
        throw new Error(response.data.message || "Failed to update vehicle");
      } catch (phpError) {
        console.warn("Direct PHP update endpoint failed:", phpError);
        
        // Last resort: Update locally only
        const cachedVehicles = getVehiclesFromCache();
        const vehicleToUpdate = cachedVehicles.find((v: FleetVehicle) => v.id === vehicleId);
        
        if (!vehicleToUpdate) {
          throw new Error("Vehicle not found in local cache");
        }
        
        const updatedVehicle = {
          ...vehicleToUpdate, 
          ...vehicle,
          updatedAt: new Date().toISOString()
        };
        
        const updatedVehicles = cachedVehicles.map((v: FleetVehicle) => 
          v.id === vehicleId ? updatedVehicle : v
        );
        
        saveVehiclesToCache(updatedVehicles);
        
        console.log("Updated vehicle locally only:", updatedVehicle);
        toast.success("Vehicle updated successfully (offline mode)");
        return updatedVehicle;
      }
    } catch (error: any) {
      logAPIError(`updateVehicle(${vehicleId})`, error);
      toast.error("Failed to update vehicle: " + (error.message || "Unknown error"));
      throw error;
    }
  },
  
  /**
   * Assign vehicle to booking
   * @param bookingId Booking ID
   * @param vehicleId Vehicle ID
   * @param driverId Optional driver ID
   */
  assignVehicleToBooking: async (bookingId: number | string, vehicleId: string, driverId?: string | number | null): Promise<any> => {
    // Prevent duplicate submissions
    if (isRecentOperation('assignVehicleToBooking', {bookingId, vehicleId, driverId})) {
      throw new Error("Duplicate submission prevented");
    }
    
    try {
      console.log(`Assigning vehicle ${vehicleId} to booking ${bookingId}`);
      const cacheBuster = `_cb=${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      // Try direct PHP endpoint
      try {
        const response = await axios.post(`${API_BASE_URL}/api/admin/booking-assign-vehicle.php?${cacheBuster}`, {
          bookingId,
          vehicleId,
          driverId: driverId || null
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Mode': 'true',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Force-Refresh': 'true',
            'Pragma': 'no-cache'
          },
          timeout: 10000
        });
        
        console.log("Assignment response:", response.data);
        
        if (response.data && response.data.status === 'success') {
          toast.success("Vehicle assigned successfully");
          return response.data;
        }
        
        throw new Error(response.data?.message || "Failed to assign vehicle to booking");
      } catch (phpError) {
        console.warn("Direct PHP endpoint failed:", phpError);
        
        // Create a local assignment record for offline mode
        const assignment = {
          assignmentId: `local_${Date.now()}`,
          bookingId,
          vehicleId,
          driverId: driverId || null,
          status: 'success',
          message: 'Vehicle assigned to booking (offline mode)',
          timestamp: Date.now(),
          assignedAt: new Date().toISOString()
        };
        
        // Save to localStorage
        try {
          const storedAssignments = localStorage.getItem('vehicle-assignments') || '[]';
          const assignments = JSON.parse(storedAssignments);
          assignments.push(assignment);
          localStorage.setItem('vehicle-assignments', JSON.stringify(assignments));
        } catch (e) {
          console.warn("Failed to save assignment to local storage:", e);
        }
        
        toast.success("Vehicle assigned successfully (offline mode)");
        return assignment;
      }
    } catch (error) {
      logAPIError("assignVehicleToBooking", error);
      toast.error("Failed to assign vehicle: " + (error.message || "Unknown error"));
      throw error;
    }
  }
};
