
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
export type TripMode = 'one-way' | 'round-trip';
export type LocalTripPurpose = 'business' | 'personal' | 'city-tour';

export interface HourlyPackage {
  id: string;
  name: string;
  hours: number;
  kilometers: number;
  multiplier: number;
}

export const hourlyPackages: HourlyPackage[] = [
  {
    id: '4hrs-40km',
    name: '04 Hours / 40 KM',
    hours: 4,
    kilometers: 40,
    multiplier: 1.0
  },
  {
    id: '6hrs-60km',
    name: '06 Hours / 60 KM',
    hours: 6,
    kilometers: 60,
    multiplier: 1.5
  },
  {
    id: '8hrs-80km',
    name: '08 Hours / 80 KM',
    hours: 8,
    kilometers: 80,
    multiplier: 1.7
  },
  {
    id: '10hrs-100km',
    name: '10 Hours / 100 KM',
    hours: 10,
    kilometers: 100,
    multiplier: 2.1
  }
];

export function calculateFare(
  cabType: CabType, 
  distance: number, 
  tripType: TripType = 'outstation',
  tripMode: TripMode = 'one-way',
  hourlyPackageId?: string
): number {
  let baseFare = cabType.price;
  let pricePerKm = cabType.pricePerKm;
  let totalFare = 0;
  
  if (tripType === 'local' && hourlyPackageId) {
    // Local packages based on selected hourly package
    const selectedPackage = hourlyPackages.find(pkg => pkg.id === hourlyPackageId);
    
    if (selectedPackage) {
      // Apply the package multiplier to the base fare
      totalFare = Math.round(baseFare * selectedPackage.multiplier);
      
      // Additional charge for extra kilometers
      if (distance > selectedPackage.kilometers) {
        totalFare += (distance - selectedPackage.kilometers) * pricePerKm;
      }
    } else {
      // Fallback to default 4 hours package
      totalFare = baseFare;
      if (distance > 40) {
        totalFare += (distance - 40) * pricePerKm;
      }
    }
  } else if (tripType === 'airport') {
    // Airport transfers have standard per km rate
    totalFare = Math.round(baseFare * 0.8) + (distance * pricePerKm);
  } else if (tripType === 'outstation') {
    // Ensure minimum distance of 250 KM for outstation trips
    const minimumDistance = Math.max(distance, 250);
    totalFare = minimumDistance * pricePerKm;
    
    // Add driver allowance for outstation
    totalFare += 250; // Driver allowance after 10 PM
    
    // Add toll charges (simplified calculation)
    if (distance > 100) {
      const tollCharges = Math.floor(distance / 100) * 100;
      totalFare += tollCharges;
    }
    
    // For round trips, we don't change the pricing logic as per requirement
    // Just ensure the minimum distance is applied
  }
  
  // Round to nearest 10 for cleaner pricing
  return Math.ceil(totalFare / 10) * 10;
}

export function formatPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN')}`;
}
