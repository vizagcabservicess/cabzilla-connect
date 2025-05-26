
import { FleetVehicle } from '@/types/cab';

export const fleetAPI = {
  getVehicles: async (availableOnly?: boolean) => {
    // Mock implementation
    const vehicles: FleetVehicle[] = [
      {
        id: "1",
        vehicleNumber: "MH12AB1234",
        name: "Sedan",
        make: "Honda",
        model: "City",
        year: 2022,
        status: "Active",
        vehicleType: "sedan",
        lastService: "2024-01-01",
        nextServiceDue: "2024-04-01",
        lastServiceOdometer: 15000,
        nextServiceOdometer: 20000,
        fuelType: "Petrol",
        cabTypeId: "sedan",
        capacity: 4,
        luggageCapacity: 2,
        isActive: true
      }
    ];
    
    return Promise.resolve({ vehicles });
  },
  
  addVehicle: async (vehicleData: Partial<FleetVehicle>) => {
    // Mock implementation
    return Promise.resolve({ success: true, id: Date.now() });
  },
  
  assignVehicleToBooking: async (bookingId: string, vehicleId: string, driverId?: string) => {
    // Mock implementation
    return Promise.resolve(true);
  },
  
  getDrivers: async () => {
    // Mock implementation
    return Promise.resolve([
      { id: 1, name: "John Driver" },
      { id: 2, name: "Jane Driver" }
    ]);
  }
};
