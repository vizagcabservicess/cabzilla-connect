
import { authAPI } from './authAPI';
import { vehicleAPI } from './vehicleAPI';
import { fleetAPI } from './fleetAPI';
import { bookingAPI } from './bookingAPI';
import { fareAPI } from './fareAPI';

// Export all API services
export {
  authAPI,
  vehicleAPI,
  fleetAPI,
  bookingAPI,
  fareAPI
};

// Default export
export default {
  auth: authAPI,
  vehicle: vehicleAPI,
  fleet: fleetAPI,
  booking: bookingAPI,
  fare: fareAPI
};
