
import { authAPI } from './authAPI';
import { vehicleAPI } from './vehicleAPI';
import { fleetAPI } from './fleetAPI';
import { bookingAPI } from './bookingAPI';
import { fareAPI } from './fareAPI';
import { userAPI } from './userAPI';
import { ledgerAPI } from './ledgerAPI';
import { commissionAPI } from './commissionAPI';
import { apiHealthCheck } from './healthCheck';
import { tourAPI } from './tourAPI';

// Export all API services
export {
  authAPI,
  vehicleAPI,
  fleetAPI,
  bookingAPI,
  fareAPI,
  userAPI,
  ledgerAPI,
  commissionAPI,
  apiHealthCheck,
  tourAPI
};

// Default export
export default {
  auth: authAPI,
  vehicle: vehicleAPI,
  fleet: fleetAPI,
  booking: bookingAPI,
  fare: fareAPI,
  user: userAPI,
  ledger: ledgerAPI,
  commission: commissionAPI,
  health: apiHealthCheck,
  tour: tourAPI
};
