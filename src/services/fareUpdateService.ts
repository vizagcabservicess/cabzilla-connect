
// This file serves as a re-export of the refactored fare service modules

import { normalizeVehicleId, checkVehicleId, STANDARD_VEHICLE_TYPES, NUMERIC_ID_MAPPINGS } from './fare/vehicleIdValidator';
import { getAllOutstationFares, updateOutstationFares } from './fare/outstation';
import { getAllLocalFares, updateLocalFares } from './fare/local';
import { getAllAirportFares, updateAirportFares } from './fare/airport';

export {
  // Vehicle ID validation
  normalizeVehicleId,
  checkVehicleId,
  STANDARD_VEHICLE_TYPES,
  NUMERIC_ID_MAPPINGS,
  
  // Outstation fares
  getAllOutstationFares,
  updateOutstationFares,
  
  // Local fares
  getAllLocalFares,
  updateLocalFares,
  
  // Airport fares
  getAllAirportFares,
  updateAirportFares
};
