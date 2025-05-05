import { FleetVehicle } from '@/types/cab';
import { toast } from 'sonner';
import { fleetAPI } from '@/services/api/fleetAPI';
import { getVehicleData } from '@/services/vehicleDataService';

/**
 * Attempts to fetch vehicle data from multiple sources with fallbacks
 * @param includeInactive Whether to include inactive vehicles
 * @returns Promise with array of fleet vehicles
 */
export const fetchVehiclesWithFallback = async (includeInactive = true): Promise<FleetVehicle[]> => {
  try {
    console.log(`Fetching fleet vehicles with fallback strategy, includeInactive: ${includeInactive}`);
    
    // Attempt 1: Try fleetAPI
    try {
      const response = await fleetAPI.getVehicles(includeInactive);
      if (response && response.vehicles && Array.isArray(response.vehicles) && response.vehicles.length > 0) {
        console.log(`Successfully fetched ${response.vehicles.length} vehicles from fleetAPI`);
        return response.vehicles;
      }
    } catch (error) {
      console.warn("fleetAPI.getVehicles failed:", error);
    }
    
    // Attempt 2: Try vehicleDataService
    try {
      const vehicles = await getVehicleData(true, includeInactive);
      if (vehicles && Array.isArray(vehicles) && vehicles.length > 0) {
        console.log(`Successfully fetched ${vehicles.length} vehicles from vehicleDataService`);
        
        // Convert to FleetVehicle format if needed
        const fleetVehicles = vehicles.map(v => {
          if ('id' in v && 'name' in v) {
            // Convert standard vehicle data to FleetVehicle format
            return {
              id: v.id || `v-${Math.random().toString(36).substring(2, 9)}`,
              vehicleId: v.id || v.vehicleId, // Fixed: Use vehicleId instead of vehicle_id
              vehicleNumber: v.vehicleNumber || `VN-${v.id || v.name}`,
              name: v.name,
              make: v.make || v.name.split(' ')[0],
              model: v.model || v.name,
              year: v.year || new Date().getFullYear(),
              vehicleType: v.vehicleType || v.id,
              status: v.status || "Active",
              lastService: v.lastService || new Date().toISOString().split('T')[0],
              nextServiceDue: v.nextServiceDue || '2024-12-31',
              fuelType: v.fuelType || "Petrol",
              capacity: v.capacity || 4,
              cabTypeId: v.cabTypeId || v.id,
              luggageCapacity: v.luggageCapacity || 2,
              isActive: v.isActive !== undefined ? v.isActive : true,
              currentOdometer: v.currentOdometer || 0,
              createdAt: v.createdAt || new Date().toISOString().split('T')[0],
              updatedAt: v.updatedAt || new Date().toISOString().split('T')[0]
            };
          }
          return v as FleetVehicle;
        });
        
        return fleetVehicles;
      }
    } catch (error) {
      console.warn("getVehicleData failed:", error);
    }
    
    // Attempt 3: Try direct fetch from alternate endpoints
    try {
      const response = await fetch('/api/vehicles-data.php?includeInactive=true&_t=' + Date.now(), {
        headers: {
          'Cache-Control': 'no-cache',
          'X-Force-Refresh': 'true',
          'X-Admin-Mode': 'true'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.vehicles && Array.isArray(data.vehicles) && data.vehicles.length > 0) {
          console.log(`Successfully fetched ${data.vehicles.length} vehicles from direct API call`);
          
          // Convert to FleetVehicle format
          const fleetVehicles = data.vehicles.map(v => ({
            id: v.id || v.vehicleId || `v-${Math.random().toString(36).substring(2, 9)}`,
            vehicleNumber: v.vehicleNumber || `VN-${v.id}`,
            name: v.name,
            make: v.make || v.name.split(' ')[0],
            model: v.model || v.name,
            year: v.year || new Date().getFullYear(),
            vehicleType: v.vehicleType || v.id,
            status: v.status || "Active",
            lastService: v.lastService || new Date().toISOString().split('T')[0],
            nextServiceDue: v.nextServiceDue || '2024-12-31',
            fuelType: v.fuelType || "Petrol",
            capacity: v.capacity || 4,
            cabTypeId: v.cabTypeId || v.id,
            luggageCapacity: v.luggageCapacity || 2,
            isActive: v.isActive !== undefined ? v.isActive : true,
            currentOdometer: v.currentOdometer || 0,
            createdAt: v.createdAt || new Date().toISOString().split('T')[0],
            updatedAt: v.updatedAt || new Date().toISOString().split('T')[0]
          }));
          
          return fleetVehicles;
        }
      }
    } catch (error) {
      console.warn("Direct API call failed:", error);
    }
    
    // Attempt 4: Try fetching from static JSON file
    try {
      const jsonResponse = await fetch(`/data/vehicles.json?_t=${Date.now()}`);
      if (jsonResponse.ok) {
        const jsonData = await jsonResponse.json();
        console.log("Fetched vehicles from JSON file:", jsonData);
        
        if (Array.isArray(jsonData) && jsonData.length > 0) {
          // Map the JSON data to match FleetVehicle type
          const fleetVehicles = jsonData.map((v: any) => ({
            id: v.id || v.vehicleId || `v-${Math.random().toString(36).substring(2, 9)}`,
            vehicleNumber: v.vehicleNumber || `VN-${v.id || v.name}`,
            name: v.name,
            make: v.make || v.name.split(' ')[0],
            model: v.model || v.name,
            year: v.year || new Date().getFullYear(),
            vehicleType: v.vehicleType || v.id,
            status: v.status || "Active",
            lastService: v.lastService || new Date().toISOString().split('T')[0],
            nextServiceDue: v.nextServiceDue || '2024-12-31',
            fuelType: v.fuelType || "Petrol",
            capacity: v.capacity || 4,
            cabTypeId: v.cabTypeId || v.id,
            luggageCapacity: v.luggageCapacity || 2,
            isActive: v.isActive !== undefined ? v.isActive : true,
            currentOdometer: v.currentOdometer || 0,
            createdAt: v.createdAt || new Date().toISOString().split('T')[0],
            updatedAt: v.updatedAt || new Date().toISOString().split('T')[0]
          }));
          
          return fleetVehicles;
        }
      }
    } catch (jsonError) {
      console.error("JSON fetch error:", jsonError);
    }
    
    // If all attempts fail, return mock data as last resort
    console.warn("All vehicle fetching attempts failed. Using mock data.");
    
    // Use mock data as last resort
    return [
      {
        id: "v-mock-001",
        vehicleNumber: "KA01AB1234",
        name: "Toyota Innova Crysta",
        make: "Toyota",
        model: "Innova Crysta",
        year: 2022,
        vehicleType: "innova_crysta",
        status: "Active",
        lastService: "2023-01-15",
        nextServiceDue: "2023-07-15",
        fuelType: "Diesel",
        capacity: 7,
        cabTypeId: "innova_crysta",
        luggageCapacity: 3,
        isActive: true,
        currentOdometer: 25000,
        createdAt: "2023-01-01",
        updatedAt: "2023-01-15"
      },
      {
        id: "v-mock-002",
        vehicleNumber: "KA02CD5678",
        name: "Maruti Suzuki Swift Dzire",
        make: "Maruti Suzuki",
        model: "Swift Dzire",
        year: 2021,
        vehicleType: "sedan",
        status: "Active",
        lastService: "2023-02-20",
        nextServiceDue: "2023-08-20",
        fuelType: "Petrol",
        capacity: 5,
        cabTypeId: "sedan",
        luggageCapacity: 2,
        isActive: true,
        currentOdometer: 15000,
        createdAt: "2022-12-01",
        updatedAt: "2023-02-20"
      },
      {
        id: "v-mock-003",
        vehicleNumber: "KA03EF9012",
        name: "Mahindra Xylo",
        make: "Mahindra",
        model: "Xylo",
        year: 2020,
        vehicleType: "suv",
        status: "Active",
        lastService: "2023-03-10",
        nextServiceDue: "2023-09-10",
        fuelType: "Diesel",
        capacity: 8,
        cabTypeId: "suv",
        luggageCapacity: 4,
        isActive: true,
        currentOdometer: 30000,
        createdAt: "2022-10-01",
        updatedAt: "2023-03-10"
      }
    ];
  } catch (error) {
    console.error("Error in fetchVehiclesWithFallback:", error);
    toast.error("Failed to load vehicle data");
    throw error;
  }
};

/**
 * Cache for vehicle data to reduce API calls
 */
let vehicleDataCache: {
  vehicles: FleetVehicle[];
  timestamp: number;
} | null = null;

/**
 * Get cached vehicle data with auto-refresh if stale
 * @param forceRefresh Force refresh of data
 * @param includeInactive Include inactive vehicles
 * @returns Promise with array of fleet vehicles
 */
export const getFleetVehicles = async (forceRefresh = false, includeInactive = true): Promise<FleetVehicle[]> => {
  // Check if cache is valid (less than 5 minutes old)
  const now = Date.now();
  const cacheValid = vehicleDataCache && (now - vehicleDataCache.timestamp < 5 * 60 * 1000);
  
  if (!forceRefresh && cacheValid) {
    return vehicleDataCache!.vehicles;
  }
  
  try {
    const vehicles = await fetchVehiclesWithFallback(includeInactive);
    
    // Update cache
    vehicleDataCache = {
      vehicles,
      timestamp: Date.now()
    };
    
    return vehicles;
  } catch (error) {
    console.error("Error in getFleetVehicles:", error);
    
    // If cache exists, return it even if stale on error
    if (vehicleDataCache) {
      return vehicleDataCache.vehicles;
    }
    
    throw error;
  }
};

/**
 * Clear the vehicle data cache to force refresh on next request
 */
export const clearVehicleCache = () => {
  vehicleDataCache = null;
  console.log("Vehicle data cache cleared");
};
