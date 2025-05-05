
import { FleetVehicle } from '@/types/cab';
import { fleetAPI } from '@/services/api/fleetAPI';
import { toast } from 'sonner';

// Cache variables
let vehicleCache: FleetVehicle[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Clears the vehicle cache
 */
export const clearVehicleCache = () => {
  console.log("Clearing vehicle cache");
  vehicleCache = null;
  lastFetchTime = 0;
};

/**
 * Get all fleet vehicles with caching
 * @param forceRefresh Force a refresh from the API
 * @param includeInactive Include inactive vehicles
 * @returns Promise with array of fleet vehicles
 */
export const getFleetVehicles = async (
  forceRefresh = false,
  includeInactive = false
): Promise<FleetVehicle[]> => {
  const now = Date.now();
  const cacheExpired = now - lastFetchTime > CACHE_DURATION;
  
  // Use cache if available and not expired and not forcing refresh
  if (!forceRefresh && vehicleCache && !cacheExpired) {
    console.log(`Using cached vehicles (${vehicleCache.length} items)`);
    return includeInactive 
      ? vehicleCache 
      : vehicleCache.filter(v => v.isActive);
  }
  
  try {
    console.log(`Fetching fleet vehicles from API (forceRefresh: ${forceRefresh}, includeInactive: ${includeInactive})`);
    
    const response = await fleetAPI.getVehicles(includeInactive);
    
    if (response && Array.isArray(response.vehicles)) {
      // Update cache with all vehicles
      vehicleCache = response.vehicles;
      lastFetchTime = now;
      
      console.log(`Updated vehicle cache with ${vehicleCache.length} vehicles`);
      
      // Return vehicles based on includeInactive flag
      return includeInactive 
        ? vehicleCache 
        : vehicleCache.filter(v => v.isActive);
    } else {
      console.error("Invalid response format from getVehicles:", response);
      throw new Error("Invalid response from fleet API");
    }
  } catch (error) {
    console.error("Error in getFleetVehicles:", error);
    
    // If we have cached data and this is not a forced refresh, use it as fallback
    if (vehicleCache && !forceRefresh) {
      console.warn("Using cached vehicles as fallback after API error");
      toast.error("Failed to refresh vehicles, using cached data");
      
      return includeInactive 
        ? vehicleCache 
        : vehicleCache.filter(v => v.isActive);
    }
    
    // Handle the case where we have no cache and API failed
    toast.error("Failed to load vehicles. Please try again later.");
    return [];
  }
};

/**
 * Get vehicle by ID from fleet
 * @param vehicleId Vehicle ID to find
 * @param forceRefresh Force a refresh from the API
 * @returns Promise with the vehicle or null if not found
 */
export const getFleetVehicleById = async (
  vehicleId: string,
  forceRefresh = false
): Promise<FleetVehicle | null> => {
  try {
    const vehicles = await getFleetVehicles(forceRefresh, true);
    
    // First try direct match
    let vehicle = vehicles.find(v => v.id === vehicleId);
    
    // If not found, try case-insensitive match
    if (!vehicle) {
      vehicle = vehicles.find(v => v.id.toLowerCase() === vehicleId.toLowerCase());
    }
    
    // If still not found, try matching by vehicleNumber
    if (!vehicle) {
      vehicle = vehicles.find(v => v.vehicleNumber === vehicleId);
    }
    
    return vehicle || null;
  } catch (error) {
    console.error(`Error finding vehicle by ID (${vehicleId}):`, error);
    return null;
  }
};
