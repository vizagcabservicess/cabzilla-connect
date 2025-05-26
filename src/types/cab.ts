
// Vehicle and Fleet Types

export interface FleetVehicle {
  id: string;
  vehicleNumber: string;
  name: string;
  model: string;
  make: string;
  year: number;
  status: 'Active' | 'Maintenance' | 'Inactive';
  lastService: string;
  nextServiceDue: string;
  lastServiceOdometer?: number;
  nextServiceOdometer?: number;
  fuelType: string;
  vehicleType: string;
  cabTypeId: string;
  capacity?: number;
  luggageCapacity?: number;
  isActive?: boolean;
  commissionPercentage?: number;
}

export interface Vehicle {
  id: string;
  name: string;
  type: string;
  capacity: number;
  pricePerKm: number;
  basePrice: number;
  image?: string;
}
