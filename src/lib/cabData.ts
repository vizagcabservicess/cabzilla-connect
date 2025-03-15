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

export const oneWayRates = {
  sedan: 13,
  ertiga: 16,
  innova: 18,
  tempo: 22,
  luxury: 25
};

// Available tours for the tours tab
export const availableTours = [
  { id: 'araku', name: 'Araku Day Tour', distance: 250, image: '/araku.jpg' },
  { id: 'vizag', name: 'Vizag City Tour', distance: 120, image: '/vizag.jpg' },
  { id: 'lambasingi', name: 'Lambasingi Tour', distance: 290, image: '/lambasingi.jpg' },
  { id: 'srikakulam', name: 'Srikakulam Pilgrim Tour', distance: 370, image: '/srikakulam.jpg' },
  { id: 'annavaram', name: 'Annavaram Tour', distance: 320, image: '/annavaram.jpg' },
  { id: 'vanajangi', name: 'Vanajangi Tour', distance: 280, image: '/vanajangi.jpg' }
];

// Tour fare matrix for different cab types
export const tourFares = {
  'araku': {
    sedan: 5000,
    ertiga: 6500,
    innova: 8000,
    tempo: 12000,
    luxury: 15000
  },
  'vizag': {
    sedan: 3000,
    ertiga: 4000,
    innova: 5500,
    tempo: 8000,
    luxury: 10000
  },
  'lambasingi': {
    sedan: 5500,
    ertiga: 7000,
    innova: 8500,
    tempo: 12500,
    luxury: 16000
  },
  'srikakulam': {
    sedan: 6500,
    ertiga: 8000,
    innova: 9500,
    tempo: 14000,
    luxury: 18000
  },
  'annavaram': {
    sedan: 6000,
    ertiga: 7500,
    innova: 9000,
    tempo: 13500,
    luxury: 17000
  },
  'vanajangi': {
    sedan: 5500,
    ertiga: 7000,
    innova: 8500,
    tempo: 12500,
    luxury: 16000
  }
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

export function calculateFare(
  cabType: CabType, 
  distance: number, 
  tripType: TripType = 'outstation',
  tripMode: TripMode = 'one-way',
  hourlyPackageId?: string,
  pickupDate?: Date,
  returnDate?: Date,
  tourId?: string
): number {
  let baseFare = cabType.price;
  let totalFare = 0;
  
  if (tripType === 'tour' && tourId) {
    // Use predefined tour fare if available
    const tourFareMatrix = tourFares[tourId as keyof typeof tourFares];
    if (tourFareMatrix) {
      return tourFareMatrix[cabType.id as keyof typeof tourFareMatrix] || baseFare;
    }
    return baseFare;
  }
  else if (tripType === 'local' && hourlyPackageId) {
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
      // For one-way, only use the base fare that covers 300km without extra charges
      totalFare = baseFare;
      totalFare += 250; // Driver allowance
    } else {
      // Calculate round-trip fare with days, distance charges and night halt
      let numberOfDays = 1;
      
      if (pickupDate && returnDate) {
        const pickupTime = new Date(pickupDate).getTime();
        const returnTime = new Date(returnDate).getTime();
        const differenceInMs = returnTime - pickupTime;
        const differenceInDays = Math.ceil(differenceInMs / (1000 * 60 * 60 * 24));
        numberOfDays = Math.max(1, differenceInDays);
      }
      
      // Base fare per day
      totalFare = baseFare * numberOfDays;
      
      // Calculate distance charges for round-trip
      const allocatedKm = 300; // km included in base fare per day
      const totalAllocatedKm = allocatedKm * numberOfDays;
      const effectiveDistance = minimumDistance * 2;
      
      // Add charges for extra kilometers if any
      if (effectiveDistance > totalAllocatedKm) {
        const extraKm = effectiveDistance - totalAllocatedKm;
        totalFare += (extraKm * cabType.pricePerKm);
      }
      
      // Add driver allowance for each day
      totalFare += 250 * numberOfDays;
      
      // Add night halt charges for multi-day trips
      if (numberOfDays > 1) {
        let nightHaltCharge = 700; // Default
        
        // Set night halt charge based on vehicle type
        switch (cabType.name.toLowerCase()) {
          case "sedan":
            nightHaltCharge = 700;
            break;
          case "ertiga":
          case "innova crysta":
            nightHaltCharge = 1000;
            break;
          default:
            nightHaltCharge = 700;
        }
        
        totalFare += (numberOfDays - 1) * nightHaltCharge;
      }
    }
    
    // Add toll charges for both one-way and round-trip
    if (distance > 100) {
      const tollCharges = Math.floor(distance / 100) * 100;
      totalFare += tollCharges;
    }
  }
  
  // Round the fare to the nearest 10
  return Math.ceil(totalFare / 10) * 10;
}

export function formatPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN')}`;
}
