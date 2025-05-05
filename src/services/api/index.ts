
import { authAPI } from './authAPI';
import { vehicleAPI } from './vehicleAPI';
import { fleetAPI } from './fleetAPI';
import { bookingAPI } from './bookingAPI';

// Export all API services
export {
  authAPI,
  vehicleAPI,
  fleetAPI,
  bookingAPI
};

// Default export
export default {
  auth: authAPI,
  vehicle: vehicleAPI,
  fleet: fleetAPI,
  booking: bookingAPI
};
