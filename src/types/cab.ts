
export interface CabType {
  id: string;
  name: string;
  description: string;
  image: string;
  capacity: number;
  basePrice: number;
  pricePerKm: number;
  amenities: string[];
  luggageCapacity?: number; // Made optional to fix errors
  ac?: boolean; // Made optional to fix errors
}
