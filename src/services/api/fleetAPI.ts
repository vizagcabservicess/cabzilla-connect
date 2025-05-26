
export const fleetAPI = {
  getVehicles: async (availableOnly?: boolean) => {
    // Mock implementation
    return Promise.resolve({
      vehicles: [
        {
          id: "1",
          vehicleNumber: "MH12AB1234",
          name: "Sedan",
          make: "Honda",
          model: "City",
          year: 2022,
          status: "Available",
          vehicleType: "sedan"
        }
      ]
    });
  },
  
  addVehicle: async (vehicleData: any) => {
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
