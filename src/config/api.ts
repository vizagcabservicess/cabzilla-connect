
// API configuration and helpers

// Base API URL - can be overridden by environment variable
export const apiBaseUrl = '/'; // Default to relative path for API requests

// Default headers to use with API requests
export const defaultHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache'
};

// Force refresh headers for bypassing cache
export const forceRefreshHeaders = {
  'X-Force-Refresh': 'true',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

// Helper function to construct an API URL
export function getApiUrl(path: string): string {
  // If the path is already a full URL, return it
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Ensure the path starts with a slash if necessary
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Combine with API base URL, ensuring no double slashes
  return `${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}${formattedPath}`;
}

// Function to get the authorization header with the token
export function getAuthorizationHeader(): { Authorization?: string } {
  // Try to get token from localStorage
  let token = localStorage.getItem('authToken');
  
  // If token is missing or invalid, try to recover from user object
  if (!token || token === 'null' || token === 'undefined') {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        if (userData && userData.token) {
          // Restore token to localStorage
          localStorage.setItem('authToken', userData.token);
          token = userData.token;
          console.log('Recovered auth token from user data');
        }
      } catch (e) {
        console.error('Error parsing user data for auth token:', e);
      }
    }
  }
  
  if (!token || token === 'null' || token === 'undefined') {
    console.warn('No valid auth token available, returning empty auth header');
    return {};
  }
  
  return { Authorization: `Bearer ${token}` };
}

// Map frontend vehicle IDs to database column names
export const vehicleIdMapping: Record<string, string> = {
  // ID mapping for standard vehicles
  'sedan': 'sedan',
  'ertiga': 'ertiga',
  'innova': 'innova',
  'tempo': 'tempo',
  'luxury': 'luxury',
  
  // Map vehicle display names to database columns
  'Sedan': 'sedan',
  'Ertiga': 'ertiga',
  'Innova': 'innova',
  'Tempo Traveller': 'tempo',
  'Luxury': 'luxury',
  
  // Map specific vehicle models
  'MPV': 'innova',
  'innova_crysta': 'innova',
  'innova_hycross': 'innova',
  'etios': 'sedan',
  'dzire_cng': 'sedan',
  'tempo_traveller': 'tempo',
  'Toyota': 'sedan',
  'Dzire CNG': 'sedan',
  
  // Handle numeric IDs that might come from the vehicles table
  '1': 'sedan',
  '2': 'ertiga',
  '1266': 'innova',
  '1299': 'sedan',
  '1311': 'sedan',
  '1313': 'innova',
  '1314': 'tempo'
};

// Get dynamic vehicle mapping from backend
export async function getDynamicVehicleMapping(): Promise<Record<string, string>> {
  try {
    console.log('Fetching dynamic vehicle mapping from backend...');
    
    // Start with the static mapping
    const mapping = { ...vehicleIdMapping };
    
    // Try to fetch vehicle data to build mapping
    const response = await fetch('/api/admin/vehicles-data.php', {
      method: 'GET',
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        ...getAuthorizationHeader()
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Vehicle data for mapping:', data);
      
      if (data.vehicles && Array.isArray(data.vehicles)) {
        data.vehicles.forEach((vehicle: any) => {
          if (vehicle.id && vehicle.vehicle_id) {
            // Map numeric ID to safe column name
            const safeColumnName = vehicle.vehicle_id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
            mapping[vehicle.id] = safeColumnName;
            
            // Also map the vehicle_id itself
            mapping[vehicle.vehicle_id] = safeColumnName;
          }
        });
      }
    }
    
    console.log('Dynamic vehicle mapping:', mapping);
    return mapping;
  } catch (error) {
    console.error('Error getting dynamic vehicle mapping:', error);
    return vehicleIdMapping; // Fall back to static mapping on error
  }
}
