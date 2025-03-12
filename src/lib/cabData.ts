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
    price: 1400,
    pricePerKm: 14,
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
    price: 2000,
    pricePerKm: 18,
    capacity: 6,
    luggage: 4,
    ac: true,
    features: ['AC', 'Sanitized', 'Door Step Pickup', 'Clean Hygiene', 'Entertainment']
  },
  {
    id: 'innova',
    name: 'Innova Crysta',
    description: 'Premium Innova for comfortable journey',
    image: '/innova.png',
    price: 3000,
    pricePerKm: 20,
    capacity: 7,
    luggage: 4,
    ac: true,
    features: ['AC', 'Sanitized', 'Door Step Pickup', 'Clean Hygiene', 'Entertainment', 'Mineral Water']
  },
  {
    id: 'tempo',
    name: 'Tempo Traveller (12 Seater)',
    description: 'Spacious traveller for large groups',
    image: '/tempo.png',
    price: 4000,
    pricePerKm: 30,
    capacity: 12,
    luggage: 8,
    ac: true,
    features: ['AC', 'Sanitized', 'Door Step Pickup', 'Clean Hygiene', 'Entertainment', 'Mineral Water', 'Extra Legroom']
  },
  {
    id: 'luxury',
    name: 'Tempo Traveller (17 Seater)',
    description: 'Premium vehicles for large groups',
    image: '/luxury.png',
    price: 4500,
    pricePerKm: 35,
    capacity: 17,
    luggage: 10,
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
  let totalFare = 0;
  
  if (tripType === 'local') {
    // Local packages based on hours/km
    if (distance <= 40) {
      // 4 hours / 40 KM package
      totalFare = baseFare;
      if (distance > 40) {
        totalFare += (distance - 40) * pricePerKm;
      }
    } else if (distance <= 60) {
      // 6 hours / 60 KM package
      totalFare = Math.round(baseFare * 1.5); // 1.5x of 4 hours package
      if (distance > 60) {
        totalFare += (distance - 60) * pricePerKm;
      }
    } else if (distance <= 80) {
      // 8 hours / 80 KM package
      totalFare = Math.round(baseFare * 1.7); // 1.7x of 4 hours package
      if (distance > 80) {
        totalFare += (distance - 80) * pricePerKm;
      }
    } else {
      // 10 hours / 100 KM package
      totalFare = Math.round(baseFare * 2.1); // 2.1x of 4 hours package
      if (distance > 100) {
        totalFare += (distance - 100) * pricePerKm;
      }
    }
  } else if (tripType === 'airport') {
    // Airport transfers have standard per km rate
    totalFare = Math.round(baseFare * 0.8) + (distance * pricePerKm);
  } else if (tripType === 'outstation') {
    // Outstation trips require minimum 300 km per day
    const minimumDistance = Math.max(distance, 300);
    totalFare = minimumDistance * pricePerKm;
    
    // Add driver allowance for outstation
    totalFare += 250; // Driver allowance after 10 PM
    
    // Add toll charges (simplified calculation)
    if (distance > 100) {
      const tollCharges = Math.floor(distance / 100) * 100;
      totalFare += tollCharges;
    }
  }
  
  // Round to nearest 10 for cleaner pricing
  return Math.ceil(totalFare / 10) * 10;
}

export function formatPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN')}`;
}
