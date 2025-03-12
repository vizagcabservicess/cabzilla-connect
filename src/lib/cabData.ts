
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
    id: 'hatchback',
    name: 'Hatchback',
    description: 'Economic and fuel-efficient option for city travel',
    image: '/hatchback.png',
    price: 1199,
    pricePerKm: 10,
    capacity: 4,
    luggage: 2,
    ac: true,
    features: ['AC', 'Water Bottle', 'GPS Navigation', 'Clean Hygiene', 'Sanitized']
  },
  {
    id: 'sedan',
    name: 'Sedan',
    description: 'Comfort and space for business travel or longer trips',
    image: '/sedan.png',
    price: 1399,
    pricePerKm: 12,
    capacity: 4,
    luggage: 3,
    ac: true,
    features: ['AC', 'Water Bottle', 'GPS Navigation', 'Clean Hygiene', 'Sanitized', 'WiFi']
  },
  {
    id: 'suv',
    name: 'SUV',
    description: 'Spacious option for groups or travel with more luggage',
    image: '/suv.png',
    price: 1899,
    pricePerKm: 15,
    capacity: 6,
    luggage: 4,
    ac: true,
    features: ['AC', 'Water Bottle', 'GPS Navigation', 'Clean Hygiene', 'Sanitized', 'WiFi', 'Entertainment']
  },
  {
    id: 'luxury',
    name: 'Luxury',
    description: 'Premium vehicles for a sophisticated travel experience',
    image: '/luxury.png',
    price: 2899,
    pricePerKm: 20,
    capacity: 4,
    luggage: 3,
    ac: true,
    features: ['AC', 'Water Bottle', 'GPS Navigation', 'Clean Hygiene', 'Sanitized', 'WiFi', 'Entertainment', 'Premium Service']
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
    code: 'FIRSTRIDE',
    description: 'Save 25% on your first ride',
    discount: 25,
    maxDiscount: 500,
    validUntil: new Date('2023-12-31')
  },
  {
    code: 'WEEKEND10',
    description: 'Flat 10% off on weekend bookings',
    discount: 10,
    minBookingAmount: 1000,
    validUntil: new Date('2023-12-31')
  }
];

export function calculateFare(cabType: CabType, distance: number): number {
  return cabType.price + (distance * cabType.pricePerKm);
}

export function formatPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN')}`;
}
