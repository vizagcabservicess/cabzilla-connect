
import axios from 'axios';
import { CabType } from '@/types/cab';

// Default fallback values in case of API failure
const defaultVehicles: CabType[] = [
  {
    id: 'sedan',
    name: 'Sedan',
    capacity: 4,
    luggageCapacity: 2,
    price: 4200,
    pricePerKm: 14,
    image: '/cars/sedan.png',
    amenities: ['AC', 'Bottle Water', 'Music System'],
    description: 'Comfortable sedan suitable for 4 passengers.',
    ac: true,
    nightHaltCharge: 700,
    driverAllowance: 250,
    isActive: true
  },
  {
    id: 'ertiga',
    name: 'Ertiga',
    capacity: 6,
    luggageCapacity: 3,
    price: 5400,
    pricePerKm: 18,
    image: '/cars/ertiga.png',
    amenities: ['AC', 'Bottle Water', 'Music System', 'Extra Legroom'],
    description: 'Spacious SUV suitable for 6 passengers.',
    ac: true,
    nightHaltCharge: 1000,
    driverAllowance: 250,
    isActive: true
  },
  {
    id: 'innova_crysta',
    name: 'Innova Crysta',
    capacity: 7,
    luggageCapacity: 4,
    price: 6000,
    pricePerKm: 20,
    image: '/cars/innova.png',
    amenities: ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point'],
    description: 'Premium SUV with ample space for 7 passengers.',
    ac: true,
    nightHaltCharge: 1000,
    driverAllowance: 250,
    isActive: true
  }
];

// Base API URL and version
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const apiVersion = import.meta.env.VITE_API_VERSION || '1.0.0';

/**
 * Get all vehicle data from API with multiple fallbacks
 */
export const getVehicleData = async (includeInactive: boolean = false): Promise<CabType[]> => {
  console.log('Loading vehicle data from API...');
  
  // Add cache busting timestamp
  const timestamp = Date.now();
  const cacheParam = `_t=${timestamp}`;
  
  // Try multiple API endpoints in sequence
  const endpoints = [
    // Direct API URL (main method)
    `${apiBaseUrl}/api/fares/vehicles-data.php?${cacheParam}`,
    // Alternate path
    `${apiBaseUrl}/api/fares/vehicles-data?${cacheParam}`,
    // Local fallback
    `/api/fares/vehicles-data.php?${cacheParam}`,
    // Alternate local
    `/api/fares/vehicles-data?${cacheParam}`,
    // Direct DB query fallback
    `${apiBaseUrl}/api/admin/vehicles-update.php?action=getAll&${cacheParam}`
  ];
  
  // Try each endpoint until one works
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying to load vehicles from: ${endpoint}`);
      
      const response = await axios.get(endpoint, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-API-Version': apiVersion,
          'X-Force-Refresh': 'true'
        },
        timeout: 8000 // 8 second timeout
      });
      
      if (response.status === 200 && response.data) {
        if (Array.isArray(response.data)) {
          console.log(`Successfully fetched vehicles from ${endpoint}: ${response.data.length}`);
          return response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          console.log(`Successfully fetched vehicles from nested data: ${response.data.data.length}`);
          return response.data.data;
        }
      }
      console.log('Invalid response format, trying next endpoint');
    } catch (error) {
      console.error(`Error fetching from endpoint ${endpoint}:`, error);
    }
  }
  
  console.warn('No vehicles found in any API response, using defaults');
  return defaultVehicles;
};
