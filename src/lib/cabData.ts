import { differenceInCalendarDays } from 'date-fns';
import { fareAPI } from '@/services/api';
import { toast } from 'sonner';
import { CabType, HourlyPackage, LocalPackagePriceMatrix, FareCache } from '@/types/cab';
import { TripType, TripMode } from './tripTypes';
import { fareService } from '@/services/fareService';

// Track ongoing vehicle pricing fetch operations
let isFetchingVehiclePricing = false;

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

// Cache to store loaded cab types
let cachedCabTypes: CabType[] | null = null;
let lastCacheTime = 0;
// Set to 2 minutes for better reliability
const CACHE_DURATION = 2 * 60 * 1000; 
let isCurrentlyFetchingCabs = false; // Flag to prevent concurrent fetch requests

// Function to load cab types dynamically
export const loadCabTypes = async (): Promise<CabType[]> => {
  try {
    const now = Date.now();
    
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
      // Try both endpoints for more reliable data fetching
      let vehicleData: CabType[] = [];
      
      try {
        // Try primary endpoint first
        vehicleData = await fareService.refreshCabTypes();
      } catch (primaryError) {
        console.error('Primary vehicle API call failed:', primaryError);
        
        // Try backup endpoint
        try {
          // Use getAllVehicleData instead of getVehiclesData
          const backupData = await fareAPI.getAllVehicleData();
          if (Array.isArray(backupData) && backupData.length > 0) {
            vehicleData = backupData.map(v => ({
              id: v.id || v.vehicleId || '',
              name: v.name || '',
              capacity: v.capacity || 4,
              luggageCapacity: v.luggageCapacity || v.luggage_capacity || 2,
              price: v.basePrice || v.price || v.base_price || 0,
              pricePerKm: v.pricePerKm || v.price_per_km || 0,
              image: v.image || '/cars/sedan.png',
              amenities: Array.isArray(v.amenities) ? v.amenities : ['AC'],
              description: v.description || '',
              ac: v.ac !== undefined ? v.ac : true,
              nightHaltCharge: v.nightHaltCharge || v.night_halt_charge || 0,
              driverAllowance: v.driverAllowance || v.driver_allowance || 0,
              isActive: v.isActive !== undefined ? v.isActive : 
                         (v.is_active !== undefined ? v.is_active : true)
            }));
          }
        } catch (backupError) {
          console.error('Backup vehicle API call failed too:', backupError);
          throw primaryError; // Re-throw primary error
        }
      }
      
      if (Array.isArray(vehicleData) && vehicleData.length > 0) {
        // Filter out any invalid entries
        const validVehicles = vehicleData.filter(v => v && v.id && (v.isActive !== false));
        
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

// Track ongoing reload operations
let isReloadingCabTypes = false;

// Function to reload cab types and clear cache
export const reloadCabTypes = async (): Promise<CabType[]> => {
  if (isReloadingCabTypes) {
    console.log('Reload operation already in progress, skipping redundant request');
    toast.info("Vehicle data refresh already in progress", {
      id: "fare-refresh-in-progress"
    });
    return cabTypes;
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
    
    // Use fareService to refresh cab types
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
  return `₹${price.toLocaleString('en-IN')}`;
};
