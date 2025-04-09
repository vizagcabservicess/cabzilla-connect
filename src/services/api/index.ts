
import { bookingAPI } from './bookingAPI';
import { authAPI } from './authAPI';
import { vehicleAPI } from './vehicleAPI';
import { fareAPI } from './fareAPI';

// Re-export all APIs
export { bookingAPI, authAPI, vehicleAPI, fareAPI };

// Export a default object with all APIs
export default {
  booking: bookingAPI,
  auth: authAPI,
  vehicle: vehicleAPI,
  fare: fareAPI
};
