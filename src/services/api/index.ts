
import { authAPI } from './authAPI';
import { vehicleAPI } from './vehicleAPI';
import { fleetAPI } from './fleetAPI';
import { bookingAPI } from './bookingAPI';
import { fareAPI } from './fareAPI';
import { userAPI } from './userAPI';
import { apiHealthCheck } from './healthCheck';
import { ledgerAPI } from './ledgerAPI';

// Export all API services
export {
  authAPI,
  vehicleAPI,
  fleetAPI,
  bookingAPI,
  fareAPI,
  userAPI,
  apiHealthCheck,
  ledgerAPI
};

// Default export
export default {
  auth: authAPI,
  vehicle: vehicleAPI,
  fleet: fleetAPI,
  booking: bookingAPI,
  fare: fareAPI,
  user: userAPI,
  health: apiHealthCheck,
  ledger: ledgerAPI
};
