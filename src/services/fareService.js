
// Add a new function to sync vehicle tables
export const syncVehicleTables = async () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  
  // Generate a cache-busting timestamp
  const timestamp = Date.now();
  
  try {
    console.log('Starting vehicle tables sync');
    
    // Try multiple endpoints
    const endpoints = [
      `${apiBaseUrl}/api/admin/sync-vehicle-tables.php?_t=${timestamp}`,
      `/api/admin/sync-vehicle-tables.php?_t=${timestamp}`
    ];
    
    // Try each endpoint until one works
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            ...getBypassHeaders(),
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (!response.ok) {
          console.error(`Failed to sync vehicle tables from ${endpoint}: ${response.status} ${response.statusText}`);
          continue; // Try next endpoint
        }
        
        const data = await response.json();
        console.log(`Vehicle tables sync response from ${endpoint}:`, data);
        
        if (data.status === 'success') {
          // Dispatch an event indicating the vehicle tables were synced
          window.dispatchEvent(new CustomEvent('vehicle-tables-synced', {
            detail: {
              timestamp,
              vehiclesSynced: data.details?.vehicles_synced || 0,
              pricingEntriesCreated: data.details?.pricing_entries_created || 0
            }
          }));
          
          // Clear all caches
          clearFareCache();
          
          console.log('Vehicle tables sync completed successfully');
          return true;
        } else {
          throw new Error(data.message || 'Unknown error');
        }
      } catch (error) {
        console.error(`Error syncing vehicle tables from ${endpoint}:`, error);
        
        // If this is the last endpoint, re-throw the error
        if (endpoint === endpoints[endpoints.length - 1]) {
          throw error;
        }
      }
    }
    
    throw new Error('All endpoints failed');
  } catch (error) {
    console.error('Failed to sync vehicle tables:', error);
    throw error;
  }
};
