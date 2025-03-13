
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
    pricePerKm: 13,
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
    pricePerKm: 13,
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
    pricePerKm: 13,
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

export type TripType = 'outstation' | 'local' | 'airport';
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
    id: '4hrs-40km',
    name: '04 Hours / 40 KM',
    hours: 4,
    kilometers: 40,
    multiplier: 1.0,
    basePrice: 1200
  },
  {
    id: '6hrs-60km',
    name: '06 Hours / 60 KM',
    hours: 6,
    kilometers: 60,
    multiplier: 1.5,
    basePrice: 1800
  },
  {
    id: '8hrs-80km',
    name: '08 Hours / 80 KM',
    hours: 8,
    kilometers: 80,
    multiplier: 1.7,
    basePrice: 2400
  },
  {
    id: '10hrs-100km',
    name: '10 Hours / 100 KM',
    hours: 10,
    kilometers: 100,
    multiplier: 2.1,
    basePrice: 3000
  }
];

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
    // Local packages based on selected hourly package - no base fare
    const selectedPackage = hourlyPackages.find(pkg => pkg.id === hourlyPackageId);
    
    if (selectedPackage) {
      // For hourly packages, use the package's basePrice directly
      totalFare = selectedPackage.basePrice;
      
      // Additional charge for extra kilometers
      if (distance > selectedPackage.kilometers) {
        totalFare += (distance - selectedPackage.kilometers) * cabType.pricePerKm;
      }
    } else {
      // Fallback to default 4 hours package
      const defaultPackage = hourlyPackages[0];
      totalFare = defaultPackage.basePrice;
      if (distance > defaultPackage.kilometers) {
        totalFare += (distance - defaultPackage.kilometers) * cabType.pricePerKm;
      }
    }
  } else if (tripType === 'airport') {
    // Airport transfers have standard per km rate
    totalFare = Math.round(baseFare * 0.8) + (distance * cabType.pricePerKm);
  } else if (tripType === 'outstation') {
    // Ensure minimum distance of 250 KM for outstation trips
    const minimumDistance = Math.max(distance, 250);
    
    if (tripMode === 'one-way') {
      // One-way trip calculation:
      // Base fare for first 300 km
      if (minimumDistance <= 300) {
        totalFare = baseFare;
      } else {
        // Base fare for first 300 km + additional km at ₹13/km
        totalFare = baseFare + ((minimumDistance - 300) * 13);
      }
    } else {
      // Round-trip calculation with ₹14 per km
      totalFare = baseFare;
      
      // Calculate number of days for round trip
      let numberOfDays = 1;
      
      if (pickupDate && returnDate) {
        const pickupTime = new Date(pickupDate).getTime();
        const returnTime = new Date(returnDate).getTime();
        const differenceInMs = returnTime - pickupTime;
        const differenceInDays = Math.ceil(differenceInMs / (1000 * 60 * 60 * 24));
        numberOfDays = Math.max(1, differenceInDays);
      }
      
      // Multiply base fare by number of days
      totalFare = baseFare * numberOfDays;
      
      // Add distance fare at ₹14/km
      totalFare += (minimumDistance * 14);
    }
    
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
