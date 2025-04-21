import { HourlyPackage, LocalPackagePriceMatrix } from '@/types/cab';
import { normalizeVehicleId } from '@/utils/safeStringUtils';

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
    id: '04hrs-40km',
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

// Default local package price matrix - will be overridden by localStorage if available
const defaultPackageMatrix: LocalPackagePriceMatrix = {
  '4hrs-40km': {
    'sedan': 1200,
    'ertiga': 1800,
    'innova crysta': 2300,
    'innova': 2300,
    'tempo': 3000,
    'luxury': 3500,
    'luxury sedan': 3500,
    'swift_02': 80,
    'etios': 1200,
    'dzire': 1200,
    'amaze': 1200,
    'dzire cng': 1200,
    'swift': 1200
  },
  '04hrs-40km': {
    'sedan': 1200,
    'ertiga': 1800,
    'innova crysta': 2300,
    'innova': 2300,
    'tempo': 3000,
    'luxury': 3500,
    'luxury sedan': 3500,
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
    'luxury sedan': 5500,
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
    'luxury sedan': 6500,
    'swift_02': 200,
    'etios': 3000,
    'dzire': 3000,
    'amaze': 3000,
    'dzire cng': 3000,
    'swift': 3000
  }
};

// Initialize local package price matrix from default
let localPackagePriceMatrix: LocalPackagePriceMatrix = {...defaultPackageMatrix};

let lastMatrixUpdateTime = Date.now();
let matrixUpdateCount = 0;
const MAX_UPDATES_PER_MINUTE = 3;

// Dictionary of similar cab types to aid in matching
const cabTypeSynonyms: Record<string, string[]> = {
  'sedan': ['sedan', 'dzire', 'etios', 'amaze', 'swift', 'dzire cng', 'swift_02'],
  'ertiga': ['ertiga', 'maruti ertiga', 'ertiga ac'],
  'innova': ['innova', 'innova crysta', 'innova_crysta', 'toyota innova'],
  'luxury': ['luxury', 'luxury sedan', 'premium'],
  'tempo': ['tempo', 'tempo traveller', 'traveller'],
};

// Normalized and lowercased version of the matrix for faster lookups
let normalizedMatrix: Record<string, Record<string, number>> = {};

/**
 * Find the best matching cab type from our pricing matrix
 */
function findMatchingCabType(inputCabType: string): string | null {
  if (!inputCabType) return null;

  const lowerCabType = inputCabType.toLowerCase();

  // Direct match
  for (const packageId in localPackagePriceMatrix) {
    if (localPackagePriceMatrix[packageId][lowerCabType] !== undefined) {
      return lowerCabType;
    }
  }

  // Try to match using synonyms
  for (const [baseCabType, synonyms] of Object.entries(cabTypeSynonyms)) {
    if (synonyms.some(syn => lowerCabType.includes(syn))) {
      // Return the base cab type if we have that
      for (const packageId in localPackagePriceMatrix) {
        if (localPackagePriceMatrix[packageId][baseCabType] !== undefined) {
          return baseCabType;
        }
      }

      // Otherwise return the first synonym that exists in our matrix
      for (const syn of synonyms) {
        for (const packageId in localPackagePriceMatrix) {
          if (localPackagePriceMatrix[packageId][syn] !== undefined) {
            return syn;
          }
        }
      }
    }
  }

  return null;
}

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

  const normalizedCabType = cabType.toLowerCase();
  console.log(`Looking for price with normalized cab type: ${normalizedCabType}`);

  // Normalize packageId to make sure it matches our standard format
  const normalizedPackageId = normalizePackageId(packageId);

  // Check if we have a price in the matrix
  if (localPackagePriceMatrix[normalizedPackageId] && 
      localPackagePriceMatrix[normalizedPackageId][normalizedCabType] !== undefined) {
    console.log(`Found direct price match for ${normalizedPackageId} and ${normalizedCabType}: ${localPackagePriceMatrix[normalizedPackageId][normalizedCabType]}`);
    const price = localPackagePriceMatrix[normalizedPackageId][normalizedCabType];
    return price > 0 ? price : getFallbackPrice(normalizedPackageId, normalizedCabType);
  }

  // Try to find a matching cab type
  const matchedCabType = findMatchingCabType(normalizedCabType);
  if (matchedCabType && localPackagePriceMatrix[normalizedPackageId] && 
      localPackagePriceMatrix[normalizedPackageId][matchedCabType] !== undefined) {
    console.log(`Found price match using synonym lookup for ${normalizedPackageId} and ${matchedCabType}: ${localPackagePriceMatrix[normalizedPackageId][matchedCabType]}`);
    const price = localPackagePriceMatrix[normalizedPackageId][matchedCabType];
    return price > 0 ? price : getFallbackPrice(normalizedPackageId, normalizedCabType);
  }

  // Fallback - calculate based on base package and apply multiplier for cab types
  return getFallbackPrice(normalizedPackageId, normalizedCabType);
}

/**
 * Get fallback price when no direct match is found
 */
function getFallbackPrice(packageId: string, cabType: string): number {
  const basePackage = hourlyPackages.find(pkg => pkg.id === packageId);
  if (!basePackage || basePackage.basePrice === undefined) {
    console.warn(`Package ${packageId} not found or has no basePrice, using default price`);
    return 2500; // Default fallback
  }

  let multiplier = 1;
  if (cabType.includes('ertiga')) multiplier = 1.2;
  if (cabType.includes('innova')) multiplier = 1.5;
  if (cabType.includes('tempo')) multiplier = 1.8;
  if (cabType.includes('luxury')) multiplier = 2.2;

  const calculatedPrice = Math.ceil(basePackage.basePrice * multiplier);
  console.log(`Calculated fallback price for ${packageId} and ${cabType}: ${calculatedPrice}`);

  return calculatedPrice;
}

/**
 * Normalize package ID to ensure it's in our standard format
 */
function normalizePackageId(packageId: string): string {
  // Default to 8hrs-80km if packageId is missing
  if (!packageId) {
    console.warn('Missing packageId, defaulting to 8hrs-80km');
    return '8hrs-80km';
  }

  // Convert to lowercase for more reliable matching
  const lowerPackageId = packageId.toLowerCase();

  // Handle common variations of package IDs
  if (lowerPackageId.includes('8hrs') || lowerPackageId.includes('8hr') || 
      lowerPackageId.includes('8 hr') || lowerPackageId.includes('8 hrs') || 
      lowerPackageId.includes('08hrs') || lowerPackageId.includes('08hr') || 
      lowerPackageId.includes('08 hr') || lowerPackageId.includes('08 hrs') || 
      lowerPackageId.includes('8hours') || lowerPackageId.includes('8 hours') || 
      lowerPackageId === '8hrs-80km' || lowerPackageId === '08hrs-80km' || 
      lowerPackageId === '8hrs80km' || lowerPackageId === '08hrs80km' ||
      lowerPackageId === '8hrs_80km' || lowerPackageId === '08hrs_80km') {
    return '8hrs-80km';
  }

  if (lowerPackageId.includes('4hrs') || lowerPackageId.includes('4hr') || 
      lowerPackageId.includes('4 hr') || lowerPackageId.includes('4 hrs') || 
      lowerPackageId.includes('04hrs') || lowerPackageId.includes('04hr') || 
      lowerPackageId.includes('04 hr') || lowerPackageId.includes('04 hrs') || 
      lowerPackageId.includes('4hours') || lowerPackageId.includes('4 hours') || 
      lowerPackageId === '4hrs-40km' || lowerPackageId === '04hrs-40km' || 
      lowerPackageId === '4hrs40km' || lowerPackageId === '04hrs40km' ||
      lowerPackageId === '4hrs_40km' || lowerPackageId === '04hrs_40km') {
    return '4hrs-40km';
  }

  if (lowerPackageId.includes('10hrs') || lowerPackageId.includes('10hr') || 
      lowerPackageId.includes('10 hr') || lowerPackageId.includes('10 hrs') || 
      lowerPackageId.includes('10hours') || lowerPackageId.includes('10 hours') || 
      lowerPackageId === '10hrs-100km' || lowerPackageId === '10hrs100km' ||
      lowerPackageId === '10hrs_100km') {
    return '10hrs-100km';
  }

  // If we can't determine the package, default to 8hrs-80km
  console.warn(`Unrecognized package ID "${packageId}", defaulting to 8hrs-80km`);
  return '8hrs-80km';
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

        // Also update normalized matrix for quick lookups
        updateNormalizedMatrix();
      }
    } else {
      // If no saved data, initialize with defaults
      console.log('No saved price matrix found, using defaults');
      localPackagePriceMatrix = {...defaultPackageMatrix};
      updateNormalizedMatrix();
    }
  } catch (e) {
    console.error('Failed to load local package price matrix from localStorage:', e);
    // Reset to defaults on error
    localPackagePriceMatrix = {...defaultPackageMatrix};
    updateNormalizedMatrix();
  }
}

/**
 * Create a normalized version of the matrix for faster lookups
 */
function updateNormalizedMatrix(): void {
  normalizedMatrix = {};

  for (const packageId in localPackagePriceMatrix) {
    normalizedMatrix[packageId.toLowerCase()] = {};

    for (const cabType in localPackagePriceMatrix[packageId]) {
      normalizedMatrix[packageId.toLowerCase()][cabType.toLowerCase()] = 
        localPackagePriceMatrix[packageId][cabType];
    }
  }
}

// Function to update local package prices with direct API update
export async function updateLocalPackagePrice(packageId: string, cabType: string, price: number): Promise<void> {
  // Handle undefined or null cabType
  if (!cabType) {
    console.warn('cabType is undefined or null for updateLocalPackagePrice, using default sedan');
    cabType = 'sedan';
  }

  const normalizedCabType = cabType.toLowerCase();

  console.log(`Updating local package price: package=${packageId}, cab=${normalizedCabType}, price=${price}`);

  // Normalize packageId
  const normalizedPackageId = normalizePackageId(packageId);

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
  if (!localPackagePriceMatrix[normalizedPackageId]) {
    localPackagePriceMatrix[normalizedPackageId] = {};
  }

  // Update the price for the specified cab type
  localPackagePriceMatrix[normalizedPackageId][normalizedCabType] = price;

  // Also update the 04hrs-40km entry if we're updating 4hrs-40km
  if (normalizedPackageId === '4hrs-40km') {
    if (!localPackagePriceMatrix['04hrs-40km']) {
      localPackagePriceMatrix['04hrs-40km'] = {};
    }
    localPackagePriceMatrix['04hrs-40km'][normalizedCabType] = price;
    console.log(`Also updated 04hrs-40km variant for ${normalizedCabType} with price ${price}`);
  }

  // Update normalized matrix
  updateNormalizedMatrix();

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
          packageId: normalizedPackageId,
          cabType: normalizedCabType,
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

      // Remove specific caches but not everything
      localStorage.removeItem('fareCache');
      localStorage.removeItem('calculatedFares');

      // Schedule removal of the force refresh flag
      setTimeout(() => {
        localStorage.removeItem('forceCacheRefresh');
      }, 5000);

      // Try to update fares on backend server
      try {
        updateLocalPackagePriceOnServer(normalizedPackageId, normalizedCabType, price)
          .then(result => {
            console.log('Server update result:', result);
          })
          .catch(error => {
            console.error('Error updating server:', error);
          });
      } catch (e) {
        console.error('Failed to update local package price on server:', e);
      }
    }
  } catch (e) {
    console.error('Failed to save local package price matrix to localStorage:', e);
  }
}

// Modified function to update local package prices directly on the server
async function updateLocalPackagePriceOnServer(packageId: string, cabType: string, price: number): Promise<any> {
  try {
    console.log(`Sending local fare update to server for ${cabType}, package ${packageId}, price ${price}`);

    // Prepare the package data to match different server naming conventions
    const packageData: Record<string, any> = {
      vehicleId: cabType,
      vehicle_id: cabType,
      vehicleType: cabType,
      vehicle_type: cabType,
      price4hrs40km: 0,
      price8hrs80km: 0,
      price10hrs100km: 0,
      local_package_4hr: 0,
      local_package_8hr: 0,
      local_package_10hr: 0
    };

    // Set the price for the specific package
    if (packageId === '4hrs-40km' || packageId === '04hrs-40km') {
      packageData.price4hrs40km = price;
      packageData.price_4hrs_40km = price;
      packageData.local_package_4hr = price;
      packageData.package4hr40km = price;
    } else if (packageId === '8hrs-80km') {
      packageData.price8hrs80km = price;
      packageData.price_8hrs_80km = price;
      packageData.local_package_8hr = price;
      packageData.package8hr80km = price;
    } else if (packageId === '10hrs-100km') {
      packageData.price10hrs100km = price;
      packageData.price_10hrs_100km = price;
      packageData.local_package_10hr = price;
      packageData.package10hr100km = price;
    }

    // Add packages object for React-style clients
    packageData.packages = {
      '4hrs-40km': packageId === '4hrs-40km' || packageId === '04hrs-40km' ? price : 0,
      '04hrs-40km': packageId === '4hrs-40km' || packageId === '04hrs-40km' ? price : 0,
      '8hrs-80km': packageId === '8hrs-80km' ? price : 0,
      '10hrs-100km': packageId === '10hrs-100km' ? price : 0
    };

    // Add fares object for alternative format
    packageData.fares = { ...packageData.packages };

    // Try the new direct local package fares endpoint first
    const domain = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    const timestamp = Date.now();

    // Try local-package-fares.php endpoint first
    try {
      console.log('Trying local-package-fares.php endpoint...');
      const localPackageEndpoint = `${domain}/api/local-package-fares.php?_t=${timestamp}`;

      const response = await fetch(localPackageEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify(packageData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`Successfully updated ${packageId} price for ${cabType} to ${price} using local-package-fares.php`);
        return result;
      } else {
        const errorText = await response.text();
        console.error(`Error using local-package-fares.php: ${response.status} ${response.statusText}`, errorText);
      }
    } catch (error) {
      console.error(`Error using local-package-fares.php endpoint:`, error);
    }

    // Try admin/local-fares-update.php endpoint next
    try {
      console.log('Trying admin/local-fares-update.php endpoint...');
      const simplifiedEndpoint = `${domain}/api/admin/local-fares-update.php?_t=${timestamp}`;

      const response = await fetch(simplifiedEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify(packageData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`Successfully updated ${packageId} price for ${cabType} to ${price} using admin/local-fares-update.php`);
        return result;
      } else {
        const errorText = await response.text();
        console.error(`Error using admin/local-fares-update.php: ${response.status} ${response.statusText}`, errorText);
      }
    } catch (error) {
      console.error(`Error using admin/local-fares-update.php endpoint:`, error);
    }

    // Try admin/direct-local-fares.php endpoint next
    try {
      console.log('Trying admin/direct-local-fares.php endpoint...');
      const directLocalEndpoint = `${domain}/api/admin/direct-local-fares.php?_t=${timestamp}`;

      const response = await fetch(directLocalEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify(packageData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`Successfully updated ${packageId} price for ${cabType} to ${price} using admin/direct-local-fares.php`);
        return result;
      } else {
        const errorText = await response.text();
        console.error(`Error using admin/direct-local-fares.php: ${response.status} ${response.statusText}`, errorText);
      }
    } catch (error) {
      console.error(`Error using admin/direct-local-fares.php endpoint:`, error);
    }

    // Try universal fare update endpoint as last resort
    try {
      console.log('Trying admin/direct-fare-update.php as last resort...');
      const universalUrl = `${domain}/api/admin/direct-fare-update.php?tripType=local&_t=${timestamp}`;

      const response = await fetch(universalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({
          ...packageData,
          tripType: 'local',
          trip_type: 'local'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`Successfully updated ${packageId} price for ${cabType} to ${price} on universal endpoint`);
        return result;
      } else {
        const errorText = await response.text();
        console.error(`Error using universal fare update endpoint: ${response.status} ${response.statusText}`, errorText);
      }
    } catch (error) {
      console.error(`Error using universal fare update endpoint:`, error);
    }

    throw new Error('All server update attempts failed');
  } catch (error) {
    console.error('Error updating local package price on server:', error);
    throw error;
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

// End of file