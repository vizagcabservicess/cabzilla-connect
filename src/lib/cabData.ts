
import { differenceInCalendarDays } from 'date-fns';
import { fareAPI } from '@/services/api';
import { toast } from 'sonner';
import { CabType, HourlyPackage, LocalPackagePriceMatrix, FareCache } from '@/types/cab';
import { TripType, TripMode } from './tripTypes';
import { fareService } from '@/services/fareService';

// Track ongoing vehicle pricing fetch operations
let isFetchingVehiclePricing = false;
let lastLoadAttempt = 0;
const THROTTLE_TIME = 5000; // 5 seconds minimum between load attempts

// Default cab types (used as fallback if API fails)
export const cabTypes: CabType[] = [
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
    isActive: true,
    vehicleId: 'sedan',
    basePrice: 4200
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
    isActive: true,
    vehicleId: 'ertiga',
    basePrice: 5400
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
    isActive: true,
    vehicleId: 'innova_crysta',
    basePrice: 6000
  }
];

// Cache to store loaded cab types
let cachedCabTypes: CabType[] | null = null;
let lastCacheTime = 0;
// Set to 1 minute for better reliability
const CACHE_DURATION = 60 * 1000; 
let isCurrentlyFetchingCabs = false; // Flag to prevent concurrent fetch requests

// Function to load cab types dynamically
export const loadCabTypes = async (): Promise<CabType[]> => {
  try {
    const now = Date.now();
    
    // Prevent too many requests in quick succession
    if (now - lastLoadAttempt < THROTTLE_TIME) {
      console.log('Throttling loadCabTypes call, using cached or default data');
      return cachedCabTypes || cabTypes;
    }
    
    lastLoadAttempt = now;
    
    // Use cache if available and not expired
    if (cachedCabTypes && cachedCabTypes.length > 0 && now - lastCacheTime < CACHE_DURATION) {
      console.log('Using cached cab types, cache age:', (now - lastCacheTime) / 1000, 'seconds');
      return cachedCabTypes;
    }
    
    // If already fetching, don't start another fetch
    if (isCurrentlyFetchingCabs) {
      console.log('Another fetch operation is in progress, using default cab types');
      return cabTypes;
    }
    
    isCurrentlyFetchingCabs = true;
    console.log('Fetching new cab types from API');
    
    try {
      // Try multiple endpoints for more reliable data fetching
      let vehicleData: CabType[] = [];
      let fetchSuccessful = false;
      
      // First try the primary endpoint
      try {
        vehicleData = await fareService.refreshCabTypes();
        if (Array.isArray(vehicleData) && vehicleData.length > 0) {
          fetchSuccessful = true;
          console.log('Successfully fetched vehicles from primary endpoint:', vehicleData.length);
        }
      } catch (primaryError) {
        console.error('Primary vehicle API call failed:', primaryError);
        fetchSuccessful = false;
      }
      
      // If primary endpoint failed, try first backup endpoint
      if (!fetchSuccessful) {
        try {
          console.log('Trying vehicles API endpoint directly...');
          const backupData = await fareAPI.getVehicles();
          
          if (Array.isArray(backupData) && backupData.length > 0) {
            vehicleData = mapVehicleData(backupData);
            fetchSuccessful = true;
            console.log('Successfully fetched vehicles from backup endpoint 1:', vehicleData.length);
          } else if (backupData && typeof backupData === 'object' && !Array.isArray(backupData)) {
            // Try to extract vehicles from nested structure
            if (backupData.vehicles && Array.isArray(backupData.vehicles)) {
              vehicleData = mapVehicleData(backupData.vehicles);
              fetchSuccessful = true;
              console.log('Successfully extracted vehicles from nested data structure:', vehicleData.length);
            } else if (backupData.data && Array.isArray(backupData.data)) {
              vehicleData = mapVehicleData(backupData.data);
              fetchSuccessful = true;
              console.log('Successfully extracted vehicles from data property:', vehicleData.length);
            }
          }
        } catch (backup1Error) {
          console.error('First backup vehicle API call failed:', backup1Error);
        }
      }
      
      // If both previous attempts failed, try second backup endpoint
      if (!fetchSuccessful) {
        try {
          console.log('Trying getAllVehicleData endpoint...');
          const backupData = await fareAPI.getAllVehicleData();
          
          if (Array.isArray(backupData) && backupData.length > 0) {
            vehicleData = mapVehicleData(backupData);
            fetchSuccessful = true;
            console.log('Successfully fetched vehicles from backup endpoint 2:', vehicleData.length);
          } else if (backupData && typeof backupData === 'object' && !Array.isArray(backupData)) {
            // Try to extract vehicles from nested structure
            if (backupData.vehicles && Array.isArray(backupData.vehicles)) {
              vehicleData = mapVehicleData(backupData.vehicles);
              fetchSuccessful = true;
              console.log('Successfully extracted vehicles from nested data structure:', vehicleData.length);
            } else if (backupData.data && Array.isArray(backupData.data)) {
              vehicleData = mapVehicleData(backupData.data);
              fetchSuccessful = true;
              console.log('Successfully extracted vehicles from data property:', vehicleData.length);
            }
          }
        } catch (backup2Error) {
          console.error('Second backup vehicle API call failed:', backup2Error);
        }
      }
      
      if (Array.isArray(vehicleData) && vehicleData.length > 0) {
        // Filter out any invalid entries and ensure they have unique IDs
        const validVehicles = vehicleData
          .filter(v => v && (v.id || v?.vehicleId) && (v.isActive !== false))
          .map(vehicle => ({
            ...vehicle,
            // Ensure ID is always set
            id: vehicle.id || vehicle.vehicleId || String(Math.random()).substring(2, 10),
            // Ensure all required properties exist with defaults if missing
            name: vehicle.name || 'Unnamed Vehicle',
            capacity: typeof vehicle.capacity === 'number' ? vehicle.capacity : 4,
            luggageCapacity: typeof vehicle.luggageCapacity === 'number' ? vehicle.luggageCapacity : 2,
            price: typeof vehicle.price === 'number' ? vehicle.price : 
                   (typeof vehicle.basePrice === 'number' ? vehicle.basePrice : 4200),
            basePrice: typeof vehicle.basePrice === 'number' ? vehicle.basePrice : 
                      (typeof vehicle.price === 'number' ? vehicle.price : 4200),
            pricePerKm: typeof vehicle.pricePerKm === 'number' ? vehicle.pricePerKm : 14,
            nightHaltCharge: typeof vehicle.nightHaltCharge === 'number' ? vehicle.nightHaltCharge : 700,
            driverAllowance: typeof vehicle.driverAllowance === 'number' ? vehicle.driverAllowance : 250,
            image: vehicle.image || '/cars/sedan.png',
            amenities: Array.isArray(vehicle.amenities) ? vehicle.amenities : ['AC'],
            description: vehicle.description || '',
            ac: vehicle.ac !== false,
            isActive: vehicle.isActive !== false,
            vehicleId: vehicle.vehicleId || vehicle.id || String(Math.random()).substring(2, 10)
          }));
        
        // Log active vehicle count
        console.log(`Retrieved ${validVehicles.length} active vehicle types`);
        
        if (validVehicles.length > 0) {
          // Update cache
          cachedCabTypes = validVehicles;
          lastCacheTime = now;
          
          isCurrentlyFetchingCabs = false;
          return validVehicles;
        }
      }
    } catch (error) {
      console.error('Error fetching vehicle data:', error);
    }
    
    isCurrentlyFetchingCabs = false;
    
    // If API returns empty data, use default and log warning
    console.warn('API returned empty vehicle data, using defaults');
    return cabTypes;
  } catch (error) {
    console.error('Error loading cab types:', error);
    isCurrentlyFetchingCabs = false;
    // Fallback to default cab types if API call fails
    return cabTypes;
  }
};

// Helper function to map vehicle data from different API response formats
const mapVehicleData = (data: any[]): CabType[] => {
  if (!Array.isArray(data)) {
    console.warn('Invalid data passed to mapVehicleData, expected array but got:', typeof data);
    return [];
  }
  
  return data
    .filter(v => v && typeof v === 'object') // Filter out null or non-object items
    .map(v => ({
      id: String(v.id || v.vehicleId || v.vehicle_id || ''),
      name: String(v.name || 'Unnamed Vehicle'),
      capacity: Number(v.capacity) || 4,
      luggageCapacity: Number(v.luggageCapacity || v.luggage_capacity) || 2,
      price: Number(v.basePrice || v.price || v.base_price) || 4200,
      pricePerKm: Number(v.pricePerKm || v.price_per_km) || 14,
      image: v.image || '/cars/sedan.png',
      amenities: Array.isArray(v.amenities) ? v.amenities : ['AC'],
      description: v.description || '',
      ac: v.ac !== undefined ? Boolean(v.ac) : true,
      nightHaltCharge: Number(v.nightHaltCharge || v.night_halt_charge) || 700,
      driverAllowance: Number(v.driverAllowance || v.driver_allowance) || 250,
      isActive: v.isActive !== undefined ? Boolean(v.isActive) : 
              (v.is_active !== undefined ? Boolean(v.is_active) : true),
      vehicleId: String(v.id || v.vehicleId || v.vehicle_id || ''),
      basePrice: Number(v.basePrice || v.price || v.base_price) || 4200
    }));
};

// Track ongoing reload operations
let isReloadingCabTypes = false;

// Function to reload cab types and clear cache
export const reloadCabTypes = async (): Promise<CabType[]> => {
  if (isReloadingCabTypes) {
    console.log('Reload operation already in progress, skipping redundant request');
    toast.info("Vehicle data refresh already in progress", {
      id: "fare-refresh-in-progress"
    });
    return cachedCabTypes || cabTypes;
  }
  
  isReloadingCabTypes = true;
  console.log('Forcing reload of cab types by clearing cache');
  
  // Clear all caches that might contain vehicle data
  cachedCabTypes = null;
  lastCacheTime = 0;
  
  // Clear any fare calculation caches
  clearFareCache();
  
  // Clear any cached fare data in session/local storage
  sessionStorage.removeItem('cabFares');
  sessionStorage.removeItem('calculatedFares');
  localStorage.removeItem('cabFares');
  
  try {
    // Add a toast notification to show the user that fares are being refreshed
    toast.info("Refreshing cab fare data...", {
      id: "fare-refresh",
      duration: 2000
    });
    
    // Use standard load function but with fresh cache
    const reloadedTypes = await loadCabTypes();
    
    // Show success message when fares are reloaded
    toast.success("Cab fare data refreshed", {
      id: "fare-refresh",
      duration: 2000
    });
    
    isReloadingCabTypes = false;
    return reloadedTypes;
  } catch (error) {
    console.error('Error reloading cab types:', error);
    
    // Show error message if refresh failed
    toast.error("Failed to refresh fare data. Using cached values.", {
      id: "fare-refresh",
      duration: 3000
    });
    
    isReloadingCabTypes = false;
    return cabTypes;
  }
};

// Function to clear fare cache
export const clearFareCache = () => {
  // Use the fareService to clear the cache
  fareService.clearCache();
};

// Helper function to format price
export const formatPrice = (price: number): string => {
  if (!price || isNaN(price)) {
    return "₹0"; // Return ₹0 instead of "Price unavailable" for better UI
  }
  return `₹${price.toLocaleString('en-IN')}`;
};
