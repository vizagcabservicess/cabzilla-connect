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

// Updated hourly packages with new pricing structure
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

// Extra charges per hour and km for different cab types
export const extraCharges = {
  sedan: { perHour: 300, perKm: 14 },
  ertiga: { perHour: 350, perKm: 18 },
  innova: { perHour: 400, perKm: 20 }
};

// Get base price for a local package based on cab type
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
  
  // Calculate based on trip type
  if (tripType === 'local' && hourlyPackageId) {
    // Get base package price for selected cab
    const basePackagePrice = getLocalPackagePrice(hourlyPackageId, cabType.name);
    totalFare = basePackagePrice;
    
    // Find package details
    const selectedPackage = hourlyPackages.find(pkg => pkg.id === hourlyPackageId);
    
    if (selectedPackage && distance > selectedPackage.kilometers) {
      // Calculate extra km charges
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
    // Use the new airport fare calculation function from locationData
    const { calculateAirportFare } = require('./locationData');
    totalFare = calculateAirportFare(cabType.name, distance);
  } 
  else if (tripType === 'outstation') {
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
