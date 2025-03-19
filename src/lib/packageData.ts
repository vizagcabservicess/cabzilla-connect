
import { HourlyPackage, LocalPackagePriceMatrix } from '@/types/cab';

// Define standard hourly packages
export const hourlyPackages: HourlyPackage[] = [
  {
    id: '8hrs-80km',
    name: '8 Hours / 80 KM',
    hours: 8,
    kilometers: 80,
    basePrice: 2500,
    multiplier: 1
  },
  {
    id: '10hrs-100km',
    name: '10 Hours / 100 KM',
    hours: 10,
    kilometers: 100,
    basePrice: 3000,
    multiplier: 1.2
  }
];

// Extra charges for different cab types
export const extraCharges = {
  sedan: { perHour: 250, perKm: 14 },
  ertiga: { perHour: 300, perKm: 18 },
  innova_crysta: { perHour: 350, perKm: 20 }
};

// Rate per km for one-way trips
export const oneWayRates = {
  sedan: 14,
  ertiga: 18,
  innova_crysta: 20
};

// Local package price matrix to store pricing data for different cab types
const localPackagePriceMatrix: LocalPackagePriceMatrix = {
  '8hrs-80km': {
    'sedan': 2500,
    'ertiga': 3000,
    'innova crysta': 3800,
    'innova': 3800,
    'tempo': 4500,
    'luxury': 5500
  },
  '10hrs-100km': {
    'sedan': 3000,
    'ertiga': 3600,
    'innova crysta': 4500,
    'innova': 4500,
    'tempo': 5500,
    'luxury': 6500
  }
};

/**
 * Get local package price based on package ID and cab type
 */
export function getLocalPackagePrice(packageId: string, cabType: string): number {
  console.log(`Getting local package price for: package=${packageId}, cab=${cabType}`);
  
  // Handle undefined or null cabType
  if (!cabType) {
    console.warn('cabType is undefined or null, using default sedan');
    cabType = 'sedan';
  }
  
  const lowerCabType = cabType.toLowerCase();
  
  // Check if we have a price in the matrix
  if (localPackagePriceMatrix[packageId] && localPackagePriceMatrix[packageId][lowerCabType]) {
    return localPackagePriceMatrix[packageId][lowerCabType];
  }
  
  // If the exact cab type is not found, try to match with similar cab types
  if (lowerCabType.includes('innova') && localPackagePriceMatrix[packageId]['innova']) {
    return localPackagePriceMatrix[packageId]['innova'];
  }
  
  // Fallback - calculate based on base package and apply multiplier for cab types
  const basePackage = hourlyPackages.find(pkg => pkg.id === packageId);
  if (!basePackage) return 2500; // Default fallback
  
  let multiplier = 1;
  if (lowerCabType.includes('ertiga')) multiplier = 1.2;
  if (lowerCabType.includes('innova')) multiplier = 1.5;
  if (lowerCabType.includes('tempo')) multiplier = 1.8;
  if (lowerCabType.includes('luxury')) multiplier = 2.2;
  
  return Math.ceil(basePackage.basePrice * multiplier);
}

// Function to update local package prices
export function updateLocalPackagePrice(packageId: string, cabType: string, price: number): void {
  // Handle undefined or null cabType
  if (!cabType) {
    console.warn('cabType is undefined or null for updateLocalPackagePrice, using default sedan');
    cabType = 'sedan';
  }
  
  const lowerCabType = cabType.toLowerCase();
  
  // Ensure the package exists in the matrix
  if (!localPackagePriceMatrix[packageId]) {
    localPackagePriceMatrix[packageId] = {};
  }
  
  // Update the price for the specified cab type
  localPackagePriceMatrix[packageId][lowerCabType] = price;
  console.log(`Updated local package price: package=${packageId}, cab=${cabType}, price=${price}`);
}

// Function to get all local package prices
export function getAllLocalPackagePrices(): LocalPackagePriceMatrix {
  return localPackagePriceMatrix;
}
