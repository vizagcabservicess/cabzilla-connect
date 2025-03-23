import { HourlyPackage, LocalPackagePriceMatrix } from '@/types/cab';

// Define standard hourly packages
export const hourlyPackages: HourlyPackage[] = [
  {
    id: '4hrs-40km',
    name: '4 Hours / 40 KM',
    hours: 4,
    kilometers: 40,
    basePrice: 1200,
    multiplier: 0.6
  },
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

// Initialize local package price matrix
let localPackagePriceMatrix: LocalPackagePriceMatrix = {
  '4hrs-40km': {
    'sedan': 1200,
    'ertiga': 1800,
    'innova crysta': 2300,
    'innova': 2300,
    'tempo': 3000,
    'luxury': 3500,
    'swift_02': 80,
    'etios': 1200,
    'dzire': 1200,
    'amaze': 1200,
    'dzire cng': 1200,
    'swift': 1200
  },
  '8hrs-80km': {
    'sedan': 2500,
    'ertiga': 3000,
    'innova crysta': 3800,
    'innova': 3800,
    'tempo': 4500,
    'luxury': 5500,
    'swift_02': 100,
    'etios': 2500,
    'dzire': 2500,
    'amaze': 2500,
    'dzire cng': 2500,
    'swift': 2500
  },
  '10hrs-100km': {
    'sedan': 3000,
    'ertiga': 3600,
    'innova crysta': 4500,
    'innova': 4500,
    'tempo': 5500,
    'luxury': 6500,
    'swift_02': 200,
    'etios': 3000,
    'dzire': 3000,
    'amaze': 3000,
    'dzire cng': 3000,
    'swift': 3000
  }
};

let lastMatrixUpdateTime = Date.now();
let matrixUpdateCount = 0;
const MAX_UPDATES_PER_MINUTE = 3;

/**
 * Get local package price based on package ID and cab type
 */
export function getLocalPackagePrice(packageId: string, cabType: string): number {
  console.log(`Getting local package price for: package=${packageId}, cab=${cabType}`);
  
  // Load most recent prices from localStorage
  tryLoadFromLocalStorage();
  
  // Handle undefined or null cabType
  if (!cabType) {
    console.warn('cabType is undefined or null, using default sedan');
    cabType = 'sedan';
  }
  
  const lowerCabType = cabType.toLowerCase();
  console.log(`Looking for price with lowercase cab type: ${lowerCabType}`);
  
  // Check if we have a price in the matrix
  if (localPackagePriceMatrix[packageId] && localPackagePriceMatrix[packageId][lowerCabType] !== undefined) {
    console.log(`Found direct price match for ${packageId} and ${lowerCabType}: ${localPackagePriceMatrix[packageId][lowerCabType]}`);
    return localPackagePriceMatrix[packageId][lowerCabType];
  }
  
  // If the exact cab type is not found, try to match with similar cab types
  // For sedan-like vehicles
  if ((lowerCabType.includes('sedan') || lowerCabType.includes('dzire') || 
       lowerCabType.includes('etios') || lowerCabType.includes('amaze') || 
       lowerCabType.includes('swift')) && 
      localPackagePriceMatrix[packageId]['sedan']) {
    console.log(`Using sedan price for ${lowerCabType}: ${localPackagePriceMatrix[packageId]['sedan']}`);
    return localPackagePriceMatrix[packageId]['sedan'];
  }
  
  // For dzire-like vehicles
  if (lowerCabType.includes('dzire') && localPackagePriceMatrix[packageId]['dzire']) {
    console.log(`Using dzire price for ${lowerCabType}: ${localPackagePriceMatrix[packageId]['dzire']}`);
    return localPackagePriceMatrix[packageId]['dzire'];
  }
  
  // For amaze-like vehicles
  if (lowerCabType.includes('amaze') && localPackagePriceMatrix[packageId]['amaze']) {
    console.log(`Using amaze price for ${lowerCabType}: ${localPackagePriceMatrix[packageId]['amaze']}`);
    return localPackagePriceMatrix[packageId]['amaze'];
  }
  
  // For innova-like vehicles
  if (lowerCabType.includes('innova') && localPackagePriceMatrix[packageId]['innova']) {
    console.log(`Using innova price for ${lowerCabType}: ${localPackagePriceMatrix[packageId]['innova']}`);
    return localPackagePriceMatrix[packageId]['innova'];
  }
  
  // Fallback - calculate based on base package and apply multiplier for cab types
  const basePackage = hourlyPackages.find(pkg => pkg.id === packageId);
  if (!basePackage || basePackage.basePrice === undefined) {
    console.warn(`Package ${packageId} not found or has no basePrice, using default price`);
    return 2500; // Default fallback
  }
  
  let multiplier = 1;
  if (lowerCabType.includes('ertiga')) multiplier = 1.2;
  if (lowerCabType.includes('innova')) multiplier = 1.5;
  if (lowerCabType.includes('tempo')) multiplier = 1.8;
  if (lowerCabType.includes('luxury')) multiplier = 2.2;
  
  const calculatedPrice = Math.ceil(basePackage.basePrice * multiplier);
  console.log(`Calculated fallback price for ${packageId} and ${lowerCabType}: ${calculatedPrice}`);
  
  return calculatedPrice;
}

/**
 * Try to load local package prices from localStorage
 */
function tryLoadFromLocalStorage(): void {
  try {
    const savedMatrix = localStorage.getItem('localPackagePriceMatrix');
    if (savedMatrix) {
      console.log('Loading local package price matrix from localStorage');
      const parsed = JSON.parse(savedMatrix);
      
      // Only update if we have valid data
      if (parsed && typeof parsed === 'object') {
        localPackagePriceMatrix = parsed;
        console.log('Successfully loaded price matrix from localStorage');
      }
    }
  } catch (e) {
    console.error('Failed to load local package price matrix from localStorage:', e);
  }
}

// Function to update local package prices
export function updateLocalPackagePrice(packageId: string, cabType: string, price: number): void {
  // Handle undefined or null cabType
  if (!cabType) {
    console.warn('cabType is undefined or null for updateLocalPackagePrice, using default sedan');
    cabType = 'sedan';
  }
  
  const lowerCabType = cabType.toLowerCase();
  
  console.log(`Updating local package price: package=${packageId}, cab=${lowerCabType}, price=${price}`);
  
  // Throttle updates to prevent event cascade
  const now = Date.now();
  
  // Reset counter if it's been more than a minute
  if (now - lastMatrixUpdateTime > 60000) {
    matrixUpdateCount = 0;
    lastMatrixUpdateTime = now;
  }
  
  // Increment the counter
  matrixUpdateCount++;
  
  // Ensure the package exists in the matrix
  if (!localPackagePriceMatrix[packageId]) {
    localPackagePriceMatrix[packageId] = {};
  }
  
  // Normalize some common cab type variations to match what the frontend expects
  let normalizedCabType = lowerCabType;
  if (normalizedCabType === 'swift_02') normalizedCabType = 'swift';
  if (normalizedCabType === 'dzire_cng') normalizedCabType = 'dzire cng';
  if (normalizedCabType === 'innova_crysta') normalizedCabType = 'innova crysta';
  
  // Update the price for the specified cab type
  localPackagePriceMatrix[packageId][lowerCabType] = price;
  
  // Also update normalized version if different
  if (normalizedCabType !== lowerCabType) {
    localPackagePriceMatrix[packageId][normalizedCabType] = price;
    console.log(`Also updated normalized cab type ${normalizedCabType} with the same price`);
  }
  
  // Save to localStorage for persistence
  try {
    const savedMatrix = JSON.stringify(localPackagePriceMatrix);
    localStorage.setItem('localPackagePriceMatrix', savedMatrix);
    localStorage.setItem('localPackagePriceMatrixUpdated', Date.now().toString());
    console.log(`Updated and saved local price matrix to localStorage`);
    
    // Only dispatch events if we haven't exceeded the throttle limit
    if (matrixUpdateCount <= MAX_UPDATES_PER_MINUTE) {
      // Dispatch an event to notify other components
      window.dispatchEvent(new CustomEvent('local-fares-updated', {
        detail: { 
          timestamp: Date.now(),
          packageId,
          cabType: lowerCabType,
          price
        }
      }));
      
      console.log('Dispatched local-fares-updated event');
    } else {
      console.log(`Skipped local-fares-updated event (throttled: ${matrixUpdateCount}/${MAX_UPDATES_PER_MINUTE})`);
    }
    
    // Avoid dispatching multiple cache clear events - this causes infinite loops
    if (matrixUpdateCount <= 1) {
      // Only clear cache on the first update within a time window
      localStorage.setItem('forceCacheRefresh', 'true');
      localStorage.removeItem('fareCache');
      localStorage.removeItem('calculatedFares');
      
      // Schedule removal of the force refresh flag
      setTimeout(() => {
        localStorage.removeItem('forceCacheRefresh');
      }, 5000);
    }
  } catch (e) {
    console.error('Failed to save local package price matrix to localStorage:', e);
  }
}

// Function to get all local package prices
export function getAllLocalPackagePrices(): LocalPackagePriceMatrix {
  // Try to load from localStorage first
  tryLoadFromLocalStorage();
  
  return localPackagePriceMatrix;
}

// Load any saved pricing data from localStorage when the module initializes
(function initializePackageData() {
  tryLoadFromLocalStorage();
})();

