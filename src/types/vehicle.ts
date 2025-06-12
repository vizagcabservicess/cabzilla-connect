
export interface Vehicle {
  id: string;
  vehicle_id: string;
  name: string;
  type: string;
  capacity: number;
  image?: string;
  features: string[];
  isActive: boolean;
}

export interface VehicleWithPricing extends Vehicle {
  price: number;
  originalPrice?: number;
  discount?: number;
}
