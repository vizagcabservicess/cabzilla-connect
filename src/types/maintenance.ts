
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

export interface MaintenanceRecord {
  id: string | number;
  vehicleId: string;
  date: string;
  serviceType: string;
  description: string;
  cost: number;
  vendor: string;
  nextServiceDate?: string;
  notes?: string;
  odometer?: number;
  nextServiceOdometer?: number;
  vehicleNumber?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  make?: string;
  model?: string;
}
