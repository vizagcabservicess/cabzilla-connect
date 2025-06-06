// Configuration constants for the application
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://www.vizagup.com';

// Application settings
export const APP_CONFIG = {
  // Pooling settings
  pooling: {
    maxPassengers: 8,
    maxSearchResults: 50,
    bookingTimeout: 15 * 60 * 1000, // 15 minutes
  },
  
  // Mock API settings
  useMockAPI: false, // Use real API
  
  // Default fare settings
  defaultFares: {
    local: {
      baseFare: 100,
      perKmRate: 12,
      waitingCharges: 2
    },
    outstation: {
      baseFare: 2000,
      perKmRate: 15,
      nightHalt: 300
    }
  }
};

export default {
  API_BASE_URL,
  APP_CONFIG
};
