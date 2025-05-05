
import { CabType, FleetVehicle } from '@/types/cab';

/**
 * Converts FleetVehicle to CabType for compatibility with components expecting CabType
 */
export const fleetVehicleToCabType = (vehicle: FleetVehicle): CabType => {
  return {
    id: vehicle.id,
    name: vehicle.name,
    capacity: vehicle.capacity,
    luggageCapacity: vehicle.luggageCapacity,
    price: vehicle.price || 0,
    pricePerKm: vehicle.pricePerKm || 0,
    image: vehicle.image || `/cars/${vehicle.vehicleType || 'sedan'}.png`,
    amenities: vehicle.amenities || ['AC'],
    description: vehicle.description || `${vehicle.make} ${vehicle.model} (${vehicle.year})`,
    ac: vehicle.ac !== undefined ? vehicle.ac : true,
    nightHaltCharge: vehicle.nightHaltCharge || 0,
    driverAllowance: vehicle.driverAllowance || 0,
    isActive: vehicle.isActive,
    basePrice: vehicle.basePrice || 0,
    vehicleId: vehicle.id,
    vehicleType: vehicle.vehicleType,
    year: vehicle.year,
    lastService: vehicle.lastService,
    vehicleNumber: vehicle.vehicleNumber,
    model: vehicle.model,
    make: vehicle.make,
    status: vehicle.status,
    outstationFares: vehicle.outstationFares,
    localPackageFares: vehicle.localPackageFares,
    airportFares: vehicle.airportFares
  };
};

/**
 * Converts an array of FleetVehicle to an array of CabType
 */
export const convertFleetVehiclesToCabTypes = (vehicles: FleetVehicle[]): CabType[] => {
  return vehicles.map(fleetVehicleToCabType);
};
