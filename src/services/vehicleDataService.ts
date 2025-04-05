
import { CabType } from '@/types/cab';
import axios from 'axios';

let vehicleDataCache: CabType[] = [];
let cacheExpirationTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Mock data for development
const mockVehicles: CabType[] = [
  {
    id: 'sedan',
    name: 'Sedan',
    description: 'Comfortable sedan with AC',
    image: '/vehicles/sedan.jpg',
    capacity: 4,
    active: true,
    basePrice: 1500,
    pricePerKm: 14,
    airportFares: {
      basePrice: 800,
      pricePerKm: 14,
      airportFee: 150,
      dropPrice: 1200,
      pickupPrice: 1500,
      tier1Price: 800,
      tier2Price: 1200,
      tier3Price: 1800,
      tier4Price: 2500,
      extraKmCharge: 14
    },
    outstationFares: {
      basePrice: 4200,
      pricePerKm: 14,
      roundTripPricePerKm: 12,
      roundTripBasePrice: 3780,
      driverAllowance: 250,
      nightHaltCharge: 700
    },
    localPackageFares: {
      price4hrs40km: 800,
      price8hrs80km: 1500,
      price10hrs100km: 1800,
      extraHourPrice: 150,
      extraKmPrice: 14
    }
  },
  {
    id: 'ertiga',
    name: 'Ertiga',
    description: 'Spacious SUV for family',
    image: '/vehicles/ertiga.jpg',
    capacity: 6,
    active: true,
    basePrice: 1800,
    pricePerKm: 18,
    airportFares: {
      basePrice: 1000,
      pricePerKm: 18,
      airportFee: 150,
      dropPrice: 1500,
      pickupPrice: 1800,
      tier1Price: 1000,
      tier2Price: 1500,
      tier3Price: 2200,
      tier4Price: 3000,
      extraKmCharge: 18
    },
    outstationFares: {
      basePrice: 5400,
      pricePerKm: 18,
      roundTripPricePerKm: 15,
      roundTripBasePrice: 4860,
      driverAllowance: 250,
      nightHaltCharge: 1000
    },
    localPackageFares: {
      price4hrs40km: 1000,
      price8hrs80km: 1800,
      price10hrs100km: 2200,
      extraHourPrice: 200,
      extraKmPrice: 18
    }
  },
  {
    id: 'innova',
    name: 'Innova',
    description: 'Premium SUV for comfort',
    image: '/vehicles/innova.jpg',
    capacity: 7,
    active: true,
    basePrice: 2200,
    pricePerKm: 20,
    airportFares: {
      basePrice: 1200,
      pricePerKm: 20,
      airportFee: 150,
      dropPrice: 1800,
      pickupPrice: 2100,
      tier1Price: 1200,
      tier2Price: 1800,
      tier3Price: 2600,
      tier4Price: 3600,
      extraKmCharge: 20
    },
    outstationFares: {
      basePrice: 6000,
      pricePerKm: 20,
      roundTripPricePerKm: 17,
      roundTripBasePrice: 5400,
      driverAllowance: 250,
      nightHaltCharge: 1000
    },
    localPackageFares: {
      price4hrs40km: 1200,
      price8hrs80km: 2200,
      price10hrs100km: 2600,
      extraHourPrice: 250,
      extraKmPrice: 20
    }
  }
];

// Function to fetch vehicle data
export const fetchVehicles = async (): Promise<CabType[]> => {
  // If we have cached data and it's not expired, return it
  const now = Date.now();
  if (vehicleDataCache.length > 0 && now < cacheExpirationTime) {
    console.log('Using cached vehicle data');
    return vehicleDataCache;
  }

  try {
    console.log('Fetching vehicle data from API');
    const response = await axios.get('/api/vehicles-data.php');
    
    // Check if response is valid
    if (response.data && Array.isArray(response.data.vehicles)) {
      vehicleDataCache = response.data.vehicles;
      cacheExpirationTime = now + CACHE_DURATION;
      console.log('Fetched vehicles:', vehicleDataCache);
      return vehicleDataCache;
    }
    
    // Fall back to mock data if response is invalid
    console.warn('Invalid vehicle data from API, using mock data');
    vehicleDataCache = mockVehicles;
    cacheExpirationTime = now + CACHE_DURATION;
    return vehicleDataCache;
  } catch (error) {
    console.error('Error fetching vehicle data:', error);
    
    // Fall back to mock data if API fails
    console.warn('Using mock vehicle data due to API error');
    vehicleDataCache = mockVehicles;
    cacheExpirationTime = now + CACHE_DURATION;
    return vehicleDataCache;
  }
};

// Alias for backward compatibility
export const getVehicleData = fetchVehicles;

// Function to clear vehicle data cache
export const clearVehicleDataCache = () => {
  vehicleDataCache = [];
  cacheExpirationTime = 0;
  console.log('Vehicle data cache cleared');
};

// Function to get vehicle types
export const getVehicleTypes = async (): Promise<string[]> => {
  const vehicles = await fetchVehicles();
  const types = [...new Set(vehicles.map(vehicle => vehicle.name))];
  return types;
};
