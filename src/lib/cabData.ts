
export interface CabType {
  id: string;
  name: string;
  description: string;
  image: string;
  price: number;
  pricePerKm: number;
  capacity: number;
  luggage: number;
  ac: boolean;
  features: string[];
}

export const cabTypes: CabType[] = [
  {
    id: 'sedan',
    name: 'Sedan',
    description: 'Comfortable sedan for up to 4 people',
    image: '/sedan.png',
    price: 399,
    pricePerKm: 12,
    capacity: 4,
    luggage: 3,
    ac: true,
    features: ['AC', 'Sanitized', 'Door Step Pickup', 'Clean Hygiene']
  },
  {
    id: 'suv',
    name: 'SUV',
    description: 'Spacious SUV for up to 6 people',
    image: '/suv.png',
    price: 599,
    pricePerKm: 15,
    capacity: 6,
    luggage: 4,
    ac: true,
    features: ['AC', 'Sanitized', 'Door Step Pickup', 'Clean Hygiene', 'Entertainment']
  },
  {
    id: 'innova',
    name: 'Innova',
    description: 'Premium Innova for comfortable journey',
    image: '/innova.png',
    price: 799,
    pricePerKm: 18,
    capacity: 6,
    luggage: 4,
    ac: true,
    features: ['AC', 'Sanitized', 'Door Step Pickup', 'Clean Hygiene', 'Entertainment', 'Mineral Water']
  },
  {
    id: 'tempo',
    name: 'Tempo Traveller',
    description: 'Spacious traveller for large groups',
    image: '/tempo.png',
    price: 1299,
    pricePerKm: 22,
    capacity: 12,
    luggage: 8,
    ac: true,
    features: ['AC', 'Sanitized', 'Door Step Pickup', 'Clean Hygiene', 'Entertainment', 'Mineral Water', 'Extra Legroom']
  },
  {
    id: 'luxury',
    name: 'Luxury',
    description: 'Premium vehicles for a sophisticated travel experience',
    image: '/luxury.png',
    price: 1899,
    pricePerKm: 28,
    capacity: 4,
    luggage: 3,
    ac: true,
    features: ['AC', 'Sanitized', 'Door Step Pickup', 'Clean Hygiene', 'Entertainment', 'Premium Service', 'Mineral Water', 'Professional Driver']
  }
];

export interface PromoCode {
  code: string;
  description: string;
  discount: number; // percentage
  maxDiscount?: number;
  minBookingAmount?: number;
  validUntil: Date;
}

export const promoCodes: PromoCode[] = [
  {
    code: 'CABFIRST',
    description: 'Save 15% on your first ride',
    discount: 15,
    maxDiscount: 300,
    validUntil: new Date('2023-12-31')
  },
  {
    code: 'MMTCAB',
    description: 'Flat ₹200 off on weekend bookings',
    discount: 10,
    minBookingAmount: 1000,
    validUntil: new Date('2023-12-31')
  },
  {
    code: 'VIZAG100',
    description: '₹100 off on rides in Visakhapatnam',
    discount: 100,
    minBookingAmount: 500,
    validUntil: new Date('2023-12-31')
  }
];

export type TripType = 'outstation' | 'local' | 'airport';

export function calculateFare(cabType: CabType, distance: number, tripType: TripType = 'outstation'): number {
  let baseFare = cabType.price;
  let pricePerKm = cabType.pricePerKm;
  
  // Adjust pricing based on trip type
  if (tripType === 'local') {
    // Local trips have lower base fare but higher per km rate
    baseFare = Math.round(cabType.price * 0.6);
    pricePerKm = Math.round(cabType.pricePerKm * 1.2);
  } else if (tripType === 'airport') {
    // Airport transfers have higher base fare but standard per km rate
    baseFare = Math.round(cabType.price * 1.2);
  } else if (tripType === 'outstation') {
    // For outstation trips, add surcharge for long distances
    if (distance > 300) {
      pricePerKm = Math.round(cabType.pricePerKm * 1.1); // 10% extra for long distances
    }
  }
  
  // Calculate toll charges for outstation trips (simplified)
  let tollCharges = 0;
  if (tripType === 'outstation' && distance > 100) {
    tollCharges = Math.floor(distance / 100) * 100; // ₹100 per 100km for tolls
  }
  
  const distanceCost = distance * pricePerKm;
  const totalFare = baseFare + distanceCost + tollCharges;
  
  // Round to nearest 10 for cleaner pricing
  return Math.ceil(totalFare / 10) * 10;
}

export function formatPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN')}`;
}
