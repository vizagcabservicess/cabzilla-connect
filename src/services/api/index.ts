
import { authAPI } from './authAPI';
import { vehicleAPI } from './vehicleAPI';

// Export all API services
export {
  authAPI,
  vehicleAPI
};

// Default export
export default {
  auth: authAPI,
  vehicle: vehicleAPI
};
