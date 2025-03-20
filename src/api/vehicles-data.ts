
import axios from 'axios';
import { toast } from 'sonner';

// API endpoints for vehicle data
const VEHICLE_DATA_ENDPOINTS = [
  '/api/vehicles',
  '/api/vehicles/list',
  '/api/fares/vehicles.php',
  '/api/fares/vehicles',
  '/api/cabs/vehicles.php',
  '/api/cabs/vehicles'
];

// Cache key for vehicle data
const VEHICLE_CACHE_KEY = 'cached_vehicle_data';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Fetch vehicle data from multiple endpoints with fallbacks
 */
export async function fetchVehicleData(forceRefresh = false) {
  // Check cache if not forcing refresh
  if (!forceRefresh) {
    const cachedData = getCachedVehicleData();
    if (cachedData) {
      console.log("Using cached vehicle data");
      return cachedData;
    }
  }

  // Try each endpoint in sequence
  let lastError = null;
  
  for (let i = 0; i < VEHICLE_DATA_ENDPOINTS.length; i++) {
    const endpoint = VEHICLE_DATA_ENDPOINTS[i];
    try {
      console.log(`Attempting to fetch vehicles from endpoint ${i+1}/${VEHICLE_DATA_ENDPOINTS.length}: ${endpoint}`);
      
      // Add cache-busting parameter and headers
      const url = `${endpoint}?_t=${Date.now()}`;
      const response = await axios.get(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-API-Version': '1.0.52',
          'X-Force-Refresh': 'true'
        },
        allowAbsoluteUrls: true,
        timeout: 15000 // 15 seconds timeout
      });
      
      if (response.data && response.status === 200) {
        let vehicleData = response.data;
        
        // Handle different response formats
        if (Array.isArray(vehicleData.vehicles)) {
          vehicleData = vehicleData.vehicles;
        } else if (Array.isArray(vehicleData.data)) {
          vehicleData = vehicleData.data;
        } else if (vehicleData.success && Array.isArray(vehicleData.data)) {
          vehicleData = vehicleData.data;
        } else if (vehicleData.results && Array.isArray(vehicleData.results)) {
          vehicleData = vehicleData.results;
        }
        
        // Validate vehicle data
        if (Array.isArray(vehicleData) && vehicleData.length > 0) {
          console.log(`Successfully fetched vehicles from primary endpoint: ${vehicleData.length}`);
          
          // Update cache
          setVehicleDataCache(vehicleData);
          
          return vehicleData;
        }
      }
    } catch (error) {
      console.warn(`Error fetching from endpoint ${i+1}: ${endpoint}`, error);
      lastError = error;
      // Continue to next endpoint
    }
  }
  
  // All endpoints failed
  console.error("All endpoints failed for vehicle data:", lastError);
  
  // Fall back to cache even if we were trying to refresh
  const cachedData = getCachedVehicleData();
  if (cachedData) {
    console.log("Falling back to cached vehicle data after failed refresh");
    return cachedData;
  }
  
  // Return default vehicles if everything failed
  console.warn("Received invalid vehicle data format or empty data, using defaults");
  const defaultVehicles = getDefaultVehicles();
  setVehicleDataCache(defaultVehicles);
  return defaultVehicles;
}

/**
 * Update vehicle data via API
 */
export async function updateVehicleData(vehicleData: any) {
  // Try each endpoint in sequence for update
  let lastError = null;
  
  // Prepare update data in both camelCase and snake_case formats for compatibility
  const updateData = {
    vehicles: vehicleData,
    data: vehicleData,
    vehicle_data: vehicleData,
    results: vehicleData
  };
  
  for (let i = 0; i < VEHICLE_DATA_ENDPOINTS.length; i++) {
    const endpoint = VEHICLE_DATA_ENDPOINTS[i];
    try {
      console.log(`Attempting to update vehicles at endpoint ${i+1}/${VEHICLE_DATA_ENDPOINTS.length}`);
      
      const response = await axios.post(endpoint, updateData, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Version': '1.0.52',
          'X-Update-Type': 'vehicle-pricing'
        },
        timeout: 20000 // 20 seconds timeout for updates
      });
      
      if (response.status >= 200 && response.status < 300) {
        console.log(`Successfully updated vehicle data at ${endpoint}`);
        
        // Update local cache with the new data
        setVehicleDataCache(vehicleData);
        
        // Clear fare cache after vehicle update
        localStorage.removeItem('fare_cache');
        
        return { success: true, message: "Vehicle data updated successfully" };
      }
    } catch (error) {
      console.warn(`Error updating vehicles at endpoint ${i+1}:`, error);
      lastError = error;
      // Continue to next endpoint
    }
  }
  
  // All endpoints failed
  console.error("All endpoints failed for vehicle data update:", lastError);
  
  return { 
    success: false, 
    message: "Failed to update vehicle data. Please try again.",
    error: lastError
  };
}

// Helper functions for caching

function getCachedVehicleData() {
  try {
    const cachedData = localStorage.getItem(VEHICLE_CACHE_KEY);
    if (!cachedData) return null;
    
    const { data, timestamp } = JSON.parse(cachedData);
    const now = Date.now();
    
    // Check if cache is expired
    if (now - timestamp > CACHE_EXPIRY) {
      console.log("Vehicle data cache expired");
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error reading vehicle data cache:", error);
    return null;
  }
}

function setVehicleDataCache(data) {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(VEHICLE_CACHE_KEY, JSON.stringify(cacheData));
    console.log(`Refreshed and cached ${data.length} vehicles`);
  } catch (error) {
    console.error("Error caching vehicle data:", error);
  }
}

function getDefaultVehicles() {
  return [
    {
      id: "sedan",
      name: "Sedan",
      description: "Comfortable 4-seater sedan",
      image: "/images/cars/sedan.png",
      basePrice: 800,
      pricePerKm: 12,
      price: 800,
      capacity: 4,
      luggage: 2,
      acAvailable: true,
      hr8km80Price: 1200,
      hr10km100Price: 1500,
      driverAllowance: 300,
      nightHaltCharge: 300
    },
    {
      id: "ertiga",
      name: "Ertiga",
      description: "Spacious 6-seater MUV",
      image: "/images/cars/ertiga.png",
      basePrice: 1200,
      pricePerKm: 15,
      price: 1200,
      capacity: 6,
      luggage: 3,
      acAvailable: true,
      hr8km80Price: 1800,
      hr10km100Price: 2100,
      driverAllowance: 350,
      nightHaltCharge: 350
    },
    {
      id: "innovacrys",
      name: "Innova Crysta",
      description: "Premium 6-seater SUV",
      image: "/images/cars/innova.png",
      basePrice: 1500,
      pricePerKm: 18,
      price: 1500,
      capacity: 6,
      luggage: 4,
      acAvailable: true,
      hr8km80Price: 2100,
      hr10km100Price: 2400,
      driverAllowance: 400,
      nightHaltCharge: 400
    }
  ];
}
