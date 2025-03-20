
/**
 * Get all vehicle types for dropdown selection
 */
export const getVehicleTypes = async (includeInactive = false): Promise<{id: string, name: string}[]> => {
  try {
    // Force fresh load
    localStorage.removeItem('cabTypes');
    localStorage.removeItem('vehicleTypes');
    
    // Add cache busting timestamp
    const timestamp = Date.now();
    
    // Try to get vehicle types directly from the pricing endpoint which should have all vehicles
    try {
      // First try the vehicle-pricing.php endpoint
      const endpoint = `${apiBaseUrl}/api/admin/vehicle-pricing.php?_t=${timestamp}`;
      console.log(`Attempting to load vehicles from pricing endpoint: ${endpoint}`);
      
      const response = await axios.get(endpoint, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-API-Version': apiVersion,
          'X-Force-Refresh': 'true'
        },
        timeout: 8000
      });
      
      if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
        console.log(`Loaded ${response.data.length} vehicles from pricing endpoint`);
        
        const vehiclesList = response.data.map((vehicle: any) => ({
          id: vehicle.id || vehicle.vehicleId,
          name: vehicle.name || vehicle.vehicleType || vehicle.id || 'Unknown'
        }));
        
        return vehiclesList;
      }
    } catch (error) {
      console.error("Error loading from pricing endpoint:", error);
    }
    
    // If direct request failed, use the general vehicle data endpoint
    const vehicles = await getVehicleData(includeInactive);
    
    const vehiclesList = vehicles.map(vehicle => ({
      id: vehicle.id || vehicle.vehicleId || '', 
      name: vehicle.name || vehicle.id || 'Unknown'
    }));
    
    console.log('Available vehicle types for selection:', vehiclesList);
    
    return vehiclesList;
  } catch (error) {
    console.error('Error getting vehicle types:', error);
    
    // Return default vehicles as last resort
    return defaultVehicles.map(vehicle => ({
      id: vehicle.id,
      name: vehicle.name || vehicle.id
    }));
  }
};
