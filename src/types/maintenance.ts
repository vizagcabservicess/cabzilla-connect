
export interface MaintenanceRecord {
  id: number | string;
  vehicleId: string;
  date: string;
  serviceType: string;
  description: string;
  cost: number;
  vendor: string;
  nextServiceDate?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  
  // Added properties that were being used but not defined
  serviceDate?: string;
  odometer?: number;
  nextServiceOdometer?: number;
  
  // Joined fields from fleet_vehicles
  vehicleNumber?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  make?: string;
  model?: string;
}

export type ServiceType = 
  | 'Oil Change'
  | 'Tire Replacement'
  | 'Battery Replacement'
  | 'Brake Service'
  | 'Air Filter Replacement'
  | 'Major Service'
  | 'AC Service'
  | 'Transmission Service'
  | 'Engine Repair'
  | 'Electrical Repair'
  | 'Suspension Repair'
  | 'Regular Maintenance'
  | 'Other';

export interface MaintenanceFormValues {
  vehicleId: string;
  date: string;
  serviceType: string;
  description: string;
  cost: number;
  vendor: string;
  nextServiceDate?: string;
  notes?: string;
}
