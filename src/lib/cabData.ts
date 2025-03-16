
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

// FIXED: Extra charges per cab type with consistent pricing
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

// FIXED: Improved local package pricing with caching support
const localPackagePrices = {
  '8hrs-80km': {
    sedan: 2400,
    suv: 3000,
    ertiga: 3000,
    innova: 3500,
    tempo: 5000,
    luxury: 6000
  },
  '10hrs-100km': {
    sedan: 3000,
    suv: 3500,
    ertiga: 3500,
    innova: 4000,
    tempo: 6000,
    luxury: 7000
  }
};

// FIXED: Cache for package prices to improve performance
const packagePriceCache = new Map();

export const getLocalPackagePrice = (packageId: string, cabType: string): number => {
  const cacheKey = `${packageId}_${cabType.toLowerCase()}`;
  
  // Check if we have a cached price
  if (packagePriceCache.has(cacheKey)) {
    return packagePriceCache.get(cacheKey);
  }
  
  const pkg = hourlyPackages.find(p => p.id === packageId);
  if (!pkg) return 0;
  
  const cabLower = cabType.toLowerCase();
  let price = 0;
  
  // First check if we have a direct price in our price matrix
  if (packageId in localPackagePrices && cabLower in localPackagePrices[packageId as keyof typeof localPackagePrices]) {
    price = localPackagePrices[packageId as keyof typeof localPackagePrices][cabLower as keyof typeof localPackagePrices[keyof typeof localPackagePrices]];
  } 
  // Fallback to standard calculation
  else {
    if (cabLower === 'sedan') price = 2400;
    else if (cabLower === 'ertiga' || cabLower === 'suv') price = 3000;
    else if (cabLower === 'innova' || cabLower === 'innova crysta') price = 3500;
    else if (cabLower.includes('tempo')) price = 5000;
    else price = pkg.basePrice; // Fallback to package base price
  }
  
  // Cache the result
  packagePriceCache.set(cacheKey, price);
  
  return price;
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
    // Use predefined tour fare if available
    const tourFareMatrix = tourFares[tourId as keyof typeof tourFares];
    if (tourFareMatrix) {
      return tourFareMatrix[cabType.id as keyof typeof tourFareMatrix] || baseFare;
    }
    return baseFare;
  }
  else if (tripType === 'local' && hourlyPackageId) {
    // FIXED: For local packages, get the specific package price based on cab type
    const basePackagePrice = getLocalPackagePrice(hourlyPackageId, cabType.id);
    totalFare = basePackagePrice;
    
    console.log(`Local package base price for ${cabType.name}: ${basePackagePrice}`);
    
    const selectedPackage = hourlyPackages.find(pkg => pkg.id === hourlyPackageId);
    
    if (selectedPackage && distance > selectedPackage.kilometers) {
      const extraKm = distance - selectedPackage.kilometers;
      
      // FIXED: Get correct extra charge rates for the cab type
      let extraChargeRate = cabType.pricePerKm; // Default fallback
      
      // Get the extra charge rate for this cab type
      const extraChargeRates = extraCharges[cabType.id as keyof typeof extraCharges];
      if (extraChargeRates) {
        extraChargeRate = extraChargeRates.perKm;
      }
      
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
    // Set minimum distance
    const minimumDistance = Math.max(distance, 250);
    
    // Get pricing factors based on cab type
    let basePrice = 0, perKmRate = 0, driverAllowance = 250, nightHaltCharge = 0;
    
    // FIXED: More consistent cab type handling with fallback
    const cabId = cabType.id.toLowerCase();
    const cabName = cabType.name.toLowerCase();
    
    if (cabId === 'sedan') {
      basePrice = 4200;
      perKmRate = 14;
      nightHaltCharge = 700;
    } 
    else if (cabId === 'suv' || cabId === 'ertiga' || cabName.includes('ertiga')) {
      basePrice = 5400;
      perKmRate = 18;
      nightHaltCharge = 1000;
    } 
    else if (cabId === 'innova' || cabName.includes('innova')) {
      basePrice = 6000;
      perKmRate = 20;
      nightHaltCharge = 1000;
    } 
    else if (cabId === 'tempo' || cabName.includes('tempo')) {
      basePrice = 9000;
      perKmRate = 22;
      nightHaltCharge = 1200;
    } 
    else if (cabId === 'luxury') {
      basePrice = 10500;
      perKmRate = 25;
      nightHaltCharge = 1500;
    } 
    else {
      // Default fallback
      basePrice = cabType.price;
      perKmRate = cabType.pricePerKm;
      nightHaltCharge = 700;
    }
    
    if (tripMode === 'one-way') {
      // Consider both ways distance for one-way trips
      const effectiveDistance = minimumDistance * 2;
      
      // Base fare for one-way
      totalFare = basePrice;
      
      // Calculate base included kilometers
      const allocatedKm = 300;
      
      // Calculate extra kilometers if any
      if (effectiveDistance > allocatedKm) {
        const extraKm = effectiveDistance - allocatedKm;
        totalFare += extraKm * perKmRate;
      }
      
      // Add driver allowance
      totalFare += driverAllowance;
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
      totalFare = basePrice * numberOfDays;
      
      // Calculate distance charges for round-trip
      const allocatedKm = 300; // km included in base fare per day
      const totalAllocatedKm = allocatedKm * numberOfDays;
      const effectiveDistance = minimumDistance * 2;
      
      // Add charges for extra kilometers if any
      if (effectiveDistance > totalAllocatedKm) {
        const extraKm = effectiveDistance - totalAllocatedKm;
        totalFare += (extraKm * perKmRate);
      }
      
      // Add driver allowance for each day
      totalFare += driverAllowance * numberOfDays;
      
      // Add night halt charges for multi-day trips
      if (numberOfDays > 1) {
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

// FIXED: Add a cache clearing function to reset caches
export function clearFareCaches() {
  packagePriceCache.clear();
  console.log("Fare caches cleared");
}
