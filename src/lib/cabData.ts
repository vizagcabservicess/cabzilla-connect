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
    price: 3900,
    pricePerKm: 14,
    capacity: 4,
    luggage: 3,
    ac: true,
    features: ['AC', 'Sanitized', 'Door Step Pickup', 'Clean Hygiene']
  },
  {
    id: 'suv',
    name: 'Ertiga',
    description: 'Spacious SUV for up to 6 people',
    image: '/suv.png',
    price: 4800,
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
    price: 6000,
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
    price: 9000,
    pricePerKm: 13,
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
    price: 10500,
    pricePerKm: 13,
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

export type TripType = 'outstation' | 'local' | 'airport' | 'tour';
export type TripMode = 'one-way' | 'round-trip';
export type LocalTripPurpose = 'business' | 'personal' | 'city-tour';

export interface HourlyPackage {
  id: string;
  name: string;
  hours: number;
  kilometers: number;
  multiplier: number;
  basePrice: number;
}

export const hourlyPackages: HourlyPackage[] = [
  {
    id: '8hrs-80km',
    name: '08 Hours / 80 KM',
    hours: 8,
    kilometers: 80,
    multiplier: 1.0,
    basePrice: 2400
  },
  {
    id: '10hrs-100km',
    name: '10 Hours / 100 KM',
    hours: 10,
    kilometers: 100,
    multiplier: 1.25,
    basePrice: 3000
  }
];

export const extraCharges = {
  sedan: { perHour: 300, perKm: 14 },
  ertiga: { perHour: 350, perKm: 18 },
  innova: { perHour: 400, perKm: 20 }
};

export const getLocalPackagePrice = (packageId: string, cabType: string): number => {
  const pkg = hourlyPackages.find(p => p.id === packageId);
  if (!pkg) return 0;
  
  const cabLower = cabType.toLowerCase();
  
  if (packageId === '8hrs-80km') {
    if (cabLower === 'sedan') return 2400;
    if (cabLower === 'ertiga') return 3000;
    if (cabLower === 'innova crysta') return 3500;
  } 
  else if (packageId === '10hrs-100km') {
    if (cabLower === 'sedan') return 3000;
    if (cabLower === 'ertiga') return 3500;
    if (cabLower === 'innova crysta') return 4000;
  }
  
  return pkg.basePrice; // Fallback
};

export const oneWayRates = {
  sedan: 13,
  ertiga: 16,
  innova: 18,
  tempo: 22,
  luxury: 25
};

export function calculateFare(
  cabType: CabType, 
  distance: number, 
  tripType: TripType = 'outstation',
  tripMode: TripMode = 'one-way',
  hourlyPackageId?: string,
  pickupDate?: Date,
  returnDate?: Date
): number {
  let baseFare = cabType.price;
  let totalFare = 0;
  
  if (tripType === 'local' && hourlyPackageId) {
    const basePackagePrice = getLocalPackagePrice(hourlyPackageId, cabType.name);
    totalFare = basePackagePrice;
    
    const selectedPackage = hourlyPackages.find(pkg => pkg.id === hourlyPackageId);
    
    if (selectedPackage && distance > selectedPackage.kilometers) {
      const extraKm = distance - selectedPackage.kilometers;
      const extraChargeRates = extraCharges[cabType.id as keyof typeof extraCharges];
      if (extraChargeRates) {
        totalFare += extraKm * extraChargeRates.perKm;
      } else {
        totalFare += extraKm * cabType.pricePerKm;
      }
    }
  } 
  else if (tripType === 'airport') {
    const { calculateAirportFare } = require('./locationData');
    totalFare = calculateAirportFare(cabType.name, distance);
  } 
  else if (tripType === 'outstation') {
    const minimumDistance = Math.max(distance, 250);
    
    if (tripMode === 'one-way') {
      const effectiveDistance = minimumDistance * 2;
      const minKm = 300 * 2;
      
      const oneWayRate = oneWayRates[cabType.id as keyof typeof oneWayRates] || 13;
      
      if (effectiveDistance <= minKm) {
        totalFare = baseFare;
      } else {
        const extraKm = effectiveDistance - minKm;
        totalFare = baseFare + (extraKm * oneWayRate);
      }
      
      totalFare += 250;
    } else {
      totalFare = baseFare;
      
      let numberOfDays = 1;
      
      if (pickupDate && returnDate) {
        const pickupTime = new Date(pickupDate).getTime();
        const returnTime = new Date(returnDate).getTime();
        const differenceInMs = returnTime - pickupTime;
        const differenceInDays = Math.ceil(differenceInMs / (1000 * 60 * 60 * 24));
        numberOfDays = Math.max(1, differenceInDays);
      }
      
      totalFare = baseFare * numberOfDays;
      
      const effectiveDistance = minimumDistance * 2;
      
      totalFare += (effectiveDistance * cabType.pricePerKm);
      
      totalFare += 250 * numberOfDays;
    }
    
    if (distance > 100) {
      const tollCharges = Math.floor(distance / 100) * 100;
      totalFare += tollCharges;
    }
  }
  
  return Math.ceil(totalFare / 10) * 10;
}

export function formatPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN')}`;
}
