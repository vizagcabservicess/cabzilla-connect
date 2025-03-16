
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

// These are the official package prices - not using caching anymore
// to prevent hardcoded values from persisting
export const getBaseLocalPackagePrices = (packageId: string, cabId: string): number => {
  // Direct calculation without caching
  if (packageId === '8hrs-80km') {
    switch (cabId.toLowerCase()) {
      case 'sedan': return 5160;
      case 'ertiga': 
      case 'suv': return 6550;
      case 'innova': return 7440;
      case 'tempo': return 11500;
      case 'luxury': return 14000;
      default: return 5160;
    }
  } else if (packageId === '10hrs-100km') {
    switch (cabId.toLowerCase()) {
      case 'sedan': return 5800;
      case 'ertiga': 
      case 'suv': return 7200;
      case 'innova': return 8500;
      case 'tempo': return 13000;
      case 'luxury': return 15500;
      default: return 5800;
    }
  }
  
  // Default fallback
  return 5000;
};

export const extraCharges = {
  sedan: { perHour: 300, perKm: 14 },
  suv: { perHour: 350, perKm: 18 },
  ertiga: { perHour: 350, perKm: 18 },
  innova: { perHour: 400, perKm: 20 },
  tempo: { perHour: 500, perKm: 22 },
  luxury: { perHour: 600, perKm: 25 }
};

export const oneWayRates = {
  sedan: 13,
  ertiga: 16,
  suv: 16,
  innova: 18,
  tempo: 22,
  luxury: 25
};

export const availableTours = [
  { id: 'araku', name: 'Araku Day Tour', distance: 250, image: '/araku.jpg' },
  { id: 'vizag', name: 'Vizag City Tour', distance: 120, image: '/vizag.jpg' },
  { id: 'lambasingi', name: 'Lambasingi Tour', distance: 290, image: '/lambasingi.jpg' },
  { id: 'srikakulam', name: 'Srikakulam Pilgrim Tour', distance: 370, image: '/srikakulam.jpg' },
  { id: 'annavaram', name: 'Annavaram Tour', distance: 320, image: '/annavaram.jpg' },
  { id: 'vanajangi', name: 'Vanajangi Tour', distance: 280, image: '/vanajangi.jpg' }
];

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

const normalizeCabType = (cabType: string): string => {
  const cabLower = cabType.toLowerCase();
  
  if (cabLower.includes('sedan')) return 'sedan';
  if (cabLower.includes('ertiga') || cabLower === 'suv') return 'ertiga';
  if (cabLower.includes('innova') || cabLower.includes('crysta')) return 'innova';
  if (cabLower.includes('tempo') && cabLower.includes('12')) return 'tempo';
  if (cabLower.includes('tempo') && cabLower.includes('17')) return 'luxury';
  if (cabLower.includes('luxury')) return 'luxury';
  
  // Default fallback to sedan if unknown
  return 'sedan';
};

// NO MORE CACHING - Recalculate every time to prevent hardcoded values
export const getLocalPackagePrice = (packageId: string, cabType: string): number => {
  const normalizedCabType = normalizeCabType(cabType);
  
  console.log(`Calculating price for ${packageId}_${normalizedCabType}`);
  
  // Direct calculation without caching
  const basePrice = getBaseLocalPackagePrices(packageId, normalizedCabType);
  console.log(`Calculated base price for ${packageId}/${normalizedCabType}: ${basePrice}`);
  
  return basePrice;
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
  console.log(`Calculating fare for: ${cabType.name}, distance: ${distance}, tripType: ${tripType}, tripMode: ${tripMode}, package: ${hourlyPackageId}`);
  
  let baseFare = cabType.price;
  let totalFare = 0;
  
  if (tripType === 'tour' && tourId) {
    const tourFareMatrix = tourFares[tourId as keyof typeof tourFares];
    if (tourFareMatrix) {
      const normalizedCabType = normalizeCabType(cabType.id);
      return tourFareMatrix[normalizedCabType as keyof typeof tourFareMatrix] || baseFare;
    }
    return baseFare;
  }
  else if (tripType === 'local' && hourlyPackageId) {
    // Calculate base package price directly
    const normalizedCabType = normalizeCabType(cabType.id);
    
    // Get the base price for this package
    const basePackagePrice = getLocalPackagePrice(hourlyPackageId, normalizedCabType);
    totalFare = basePackagePrice;
    
    console.log(`Local package base price for ${cabType.name}: ${basePackagePrice}`);
    
    const selectedPackage = hourlyPackages.find(pkg => pkg.id === hourlyPackageId);
    
    // Calculate any extra km charges
    if (selectedPackage && distance > selectedPackage.kilometers) {
      const extraKm = distance - selectedPackage.kilometers;
      
      // Get the per-km rate for this cab type
      const extraChargeRates = extraCharges[normalizedCabType as keyof typeof extraCharges];
      const extraChargeRate = extraChargeRates?.perKm || cabType.pricePerKm;
      
      const extraCost = extraKm * extraChargeRate;
      console.log(`Extra ${extraKm}km at rate ${extraChargeRate}: ${extraCost}`);
      totalFare += extraCost;
    }
    
    console.log(`Final local package fare: ${totalFare}`);
  } 
  else if (tripType === 'airport') {
    const { calculateAirportFare } = require('./locationData');
    totalFare = calculateAirportFare(cabType.name, distance);
  } 
  else if (tripType === 'outstation') {
    const minimumDistance = Math.max(distance, 250);
    
    let basePrice = 0, perKmRate = 0, driverAllowance = 250, nightHaltCharge = 0;
    
    const normalizedCabType = normalizeCabType(cabType.id);
    
    if (normalizedCabType === 'sedan') {
      basePrice = 4200;
      perKmRate = 14;
      nightHaltCharge = 700;
    } 
    else if (normalizedCabType === 'ertiga') {
      basePrice = 5400;
      perKmRate = 18;
      nightHaltCharge = 1000;
    } 
    else if (normalizedCabType === 'innova') {
      basePrice = 6000;
      perKmRate = 20;
      nightHaltCharge = 1000;
    } 
    else if (normalizedCabType === 'tempo') {
      basePrice = 9000;
      perKmRate = 22;
      nightHaltCharge = 1200;
    } 
    else if (normalizedCabType === 'luxury') {
      basePrice = 10500;
      perKmRate = 25;
      nightHaltCharge = 1500;
    } 
    else {
      basePrice = cabType.price;
      perKmRate = cabType.pricePerKm;
      nightHaltCharge = 700;
    }
    
    if (tripMode === 'one-way') {
      const effectiveDistance = minimumDistance * 2;
      
      totalFare = basePrice;
      
      const allocatedKm = 300;
      
      if (effectiveDistance > allocatedKm) {
        const extraKm = effectiveDistance - allocatedKm;
        totalFare += extraKm * perKmRate;
      }
      
      totalFare += driverAllowance;
    } else {
      let numberOfDays = 1;
      
      if (pickupDate && returnDate) {
        const pickupTime = new Date(pickupDate).getTime();
        const returnTime = new Date(returnDate).getTime();
        const differenceInMs = returnTime - pickupTime;
        const differenceInDays = Math.ceil(differenceInMs / (1000 * 60 * 60 * 24));
        numberOfDays = Math.max(1, differenceInDays);
      }
      
      totalFare = basePrice * numberOfDays;
      
      const allocatedKm = 300;
      const totalAllocatedKm = allocatedKm * numberOfDays;
      const effectiveDistance = minimumDistance * 2;
      
      if (effectiveDistance > totalAllocatedKm) {
        const extraKm = effectiveDistance - totalAllocatedKm;
        totalFare += (extraKm * perKmRate);
      }
      
      totalFare += driverAllowance * numberOfDays;
      
      if (numberOfDays > 1) {
        totalFare += (numberOfDays - 1) * nightHaltCharge;
      }
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

export function clearFareCaches() {
  console.log("Clearing fare caches...");
  // Clear all fare-related cache items from sessionStorage
  Object.keys(sessionStorage).forEach(key => {
    if (key.includes('fare_') || key.includes('price_') || key.includes('_price') || key.includes('_fare') || key.includes('_sedan') || key.includes('_ertiga') || key.includes('_innova') || key.includes('_tempo') || key.includes('_luxury')) {
      console.log(`Clearing cache for ${key}`);
      sessionStorage.removeItem(key);
    }
  });
  
  // Clear selected cab which may have stale fare data
  sessionStorage.removeItem('selectedCab');
  
  // Clear specific package price caches
  hourlyPackages.forEach(pkg => {
    cabTypes.forEach(cab => {
      const cacheKey = `${pkg.id}_${cab.id.toLowerCase()}`;
      console.log(`Clearing cache for ${cacheKey}`);
      sessionStorage.removeItem(cacheKey);
    });
  });
  
  // Also clear localStorage items that might be caching data
  Object.keys(localStorage).forEach(key => {
    if (key.includes('fare_') || key.includes('price_') || key.includes('_price') || key.includes('_fare') || key.includes('cached')) {
      console.log(`Clearing localStorage cache for ${key}`);
      localStorage.removeItem(key);
    }
  });
}
