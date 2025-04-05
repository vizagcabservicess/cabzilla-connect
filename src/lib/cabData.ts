
// Import the correct function
import { getVehicleData } from '@/services/vehicleDataService';

// Store the loaded cab types for reuse
let cabTypesCache: CabType[] = [];

// Function to load cab types from API or cache
export const loadCabTypes = async (includeInactive: boolean = false): Promise<CabType[]> => {
  try {
    console.log('Attempting to load cab types...');
    
    // Try to get from sessionStorage first (for faster subsequent loads)
    const cachedData = sessionStorage.getItem('cabTypes');
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        // Validate cache has required fields
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
          console.log('Retrieved', parsed.length, 'active vehicle types from cache');
          cabTypesCache = parsed;
          
          // Update the cabTypes array in-place to keep the same reference
          cabTypes.length = 0;
          cabTypes.push(...parsed);
          
          // Filter out inactive ones if not including inactive
          if (!includeInactive) {
            return parsed.filter(vehicle => vehicle.isActive !== false);
          }
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing cached cab data:', e);
        sessionStorage.removeItem('cabTypes');
      }
    }

    // If no cache or invalid cache, fetch from API
    console.log('Fetching vehicle types from API...');
    const vehicles = await getVehicleData(includeInactive);
    
    // Process the data to ensure it conforms to CabType
    const processedVehicles = vehicles.map(vehicle => ({
      id: vehicle.id || vehicle.vehicleId || '',
      name: vehicle.name || '',
      capacity: Number(vehicle.capacity) || 4,
      luggageCapacity: Number(vehicle.luggageCapacity) || 2,
      price: Number(vehicle.price || vehicle.basePrice) || 0,
      pricePerKm: Number(vehicle.pricePerKm) || 0,
      image: vehicle.image || '/cars/sedan.png',
      amenities: Array.isArray(vehicle.amenities) ? vehicle.amenities : ['AC'],
      description: vehicle.description || '',
      ac: Boolean(vehicle.ac),
      nightHaltCharge: Number(vehicle.nightHaltCharge) || 0,
      driverAllowance: Number(vehicle.driverAllowance) || 0,
      isActive: vehicle.isActive !== false, // Default to active if not specified
      // Add the fare-specific properties
      outstationFares: vehicle.outstationFares,
      localPackageFares: vehicle.localPackageFares,
      airportFares: vehicle.airportFares
    }));
    
    console.log('Processed', processedVehicles.length, 'vehicle types');
    
    // Filter out vehicles with missing critical fields
    const validVehicles = processedVehicles.filter(v => 
      v.id && v.name && (v.price > 0 || v.pricePerKm > 0)
    );
    
    // Store in sessionStorage for later use
    if (validVehicles.length > 0) {
      sessionStorage.setItem('cabTypes', JSON.stringify(validVehicles));
      console.log('Cached', validVehicles.length, 'valid vehicle types');
      cabTypesCache = validVehicles;
      
      // Update the cabTypes array in-place to keep the same reference
      cabTypes.length = 0;
      cabTypes.push(...validVehicles);
    } else {
      console.warn('No valid vehicles found, not caching');
    }
    
    return validVehicles;
  } catch (error) {
    console.error('Error loading cab types:', error);
    
    // Return default cabs as fallback
    const defaultCabs = [
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
    
    // Store default cabs in cache
    cabTypesCache = defaultCabs;
    
    // Update the cabTypes array in-place to keep the same reference
    cabTypes.length = 0; 
    cabTypes.push(...defaultCabs);
    
    return defaultCabs;
  }
};

// Export a synchronously accessible cabTypes array that can be used directly by components
// Initially starts with default cabs and will be updated when loadCabTypes() is called
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

// Initialize cabTypes with data from the API on app startup
(async () => {
  try {
    console.log('Initializing cabTypes on app startup...');
    const loadedCabs = await loadCabTypes(true); // Get ALL vehicles including inactive ones
    if (loadedCabs && loadedCabs.length > 0) {
      // Update the cabTypes array in-place to keep the same reference
      cabTypes.length = 0; // Clear the array
      cabTypes.push(...loadedCabs); // Add all loaded cabs
      console.log('Initialized cabTypes with', loadedCabs.length, 'vehicles');
    }
  } catch (error) {
    console.error('Failed to initialize cabTypes:', error);
    // We already have default vehicles in the array, so no need to do anything here
  }
})();

// Force refresh cab types (ignore cache)
export const reloadCabTypes = async (forceRefresh: boolean = false): Promise<CabType[]> => {
  console.log('Force refreshing cab types...', forceRefresh ? '(force refresh)' : '');
  // Clear cache
  sessionStorage.removeItem('cabTypes');
  localStorage.removeItem('cabTypes');
  
  // Add a timestamp marker to force server cache refreshes
  const cacheBuster = Date.now().toString();
  localStorage.setItem('cache_buster', cacheBuster);
  
  // Set force refresh flag if requested
  if (forceRefresh) {
    localStorage.setItem('forceCacheRefresh', 'true');
    console.log('Set forceCacheRefresh flag to true');
  }
  
  try {
    // First try API endpoints directly
    try {
      console.info('Fetching fresh vehicle data from primary API...');
      
      // Try API endpoint first for most up-to-date data
      const freshVehicles = await getVehicleData(true);
      
      if (Array.isArray(freshVehicles) && freshVehicles.length > 0) {
        console.log('Successfully loaded', freshVehicles.length, 'vehicles from primary API');
        
        // Process the data to ensure it conforms to CabType
        const processedVehicles = freshVehicles.map(vehicle => ({
          id: vehicle.id || vehicle.vehicleId || '',
          name: vehicle.name || '',
          capacity: Number(vehicle.capacity) || 4,
          luggageCapacity: Number(vehicle.luggageCapacity) || 2,
          price: Number(vehicle.price || vehicle.basePrice) || 0,
          pricePerKm: Number(vehicle.pricePerKm) || 0,
          image: vehicle.image || '/cars/sedan.png',
          amenities: Array.isArray(vehicle.amenities) ? vehicle.amenities : ['AC'],
          description: vehicle.description || '',
          ac: Boolean(vehicle.ac !== false),
          nightHaltCharge: Number(vehicle.nightHaltCharge) || 0,
          driverAllowance: Number(vehicle.driverAllowance) || 0,
          isActive: vehicle.isActive !== false, // Default to active if not specified
          outstationFares: vehicle.outstationFares,
          localPackageFares: vehicle.localPackageFares,
          airportFares: vehicle.airportFares
        }));
        
        // Store in sessionStorage for later use
        sessionStorage.setItem('cabTypes', JSON.stringify(processedVehicles));
        console.log('Refreshed and cached', processedVehicles.length, 'vehicles');
        
        // Publish event to notify components about the refresh
        window.dispatchEvent(new CustomEvent('vehicle-data-refreshed', { 
          detail: { count: processedVehicles.length, source: 'api' }
        }));
        
        // Update the cabTypes array in-place
        cabTypes.length = 0;
        cabTypes.push(...processedVehicles);
        
        return processedVehicles;
      }
    } catch (apiError) {
      console.error('Error fetching from primary API:', apiError);
    }
    
    // If API fails, try direct database access
    try {
      console.info('Trying direct database query for vehicles...');
      
      // Try direct database query endpoint as backup
      const response = await fetch(`/api/admin/vehicles-update.php?action=getAll&_t=${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Force-Refresh': 'true'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        // Process data into CabType format
        const processedVehicles = data.map(vehicle => ({
          id: vehicle.id || vehicle.vehicle_id || '',
          name: vehicle.name || '',
          capacity: Number(vehicle.capacity) || 4,
          luggageCapacity: Number(vehicle.luggage_capacity) || 2,
          price: Number(vehicle.price || vehicle.base_price) || 0,
          pricePerKm: Number(vehicle.price_per_km) || 0,
          image: vehicle.image || '/cars/sedan.png',
          amenities: Array.isArray(vehicle.amenities) ? vehicle.amenities : ['AC'],
          description: vehicle.description || '',
          ac: Boolean(vehicle.ac),
          nightHaltCharge: Number(vehicle.night_halt_charge) || 0,
          driverAllowance: Number(vehicle.driver_allowance) || 0,
          isActive: vehicle.is_active !== false,
          outstationFares: vehicle.outstationFares,
          localPackageFares: vehicle.localPackageFares,
          airportFares: vehicle.airportFares
        }));
        
        sessionStorage.setItem('cabTypes', JSON.stringify(processedVehicles));
        console.log('Used database endpoint, cached', processedVehicles.length, 'vehicles');
        
        // Publish event to notify components
        window.dispatchEvent(new CustomEvent('vehicle-data-refreshed', { 
          detail: { count: processedVehicles.length, source: 'database' }
        }));
        
        // Update the cabTypes array in-place
        cabTypes.length = 0;
        cabTypes.push(...processedVehicles);
        
        return processedVehicles;
      }
    } catch (dbError) {
      console.error('Error with direct db query:', dbError);
    }
    
    // Last resort - try fares/vehicles.php specifically (dedicated endpoint)
    try {
      console.info('Trying dedicated vehicles endpoint as last resort...');
      
      const response = await fetch(`/api/fares/vehicles.php?_t=${cacheBuster}&includeInactive=true`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Force-Refresh': 'true'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error from vehicles.php! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      if (responseData && responseData.vehicles && Array.isArray(responseData.vehicles) && responseData.vehicles.length > 0) {
        // Process vehicles from the dedicated endpoint
        const processedVehicles = responseData.vehicles.map(vehicle => ({
          id: vehicle.id || vehicle.vehicleId || '',
          name: vehicle.name || '',
          capacity: Number(vehicle.capacity) || 4,
          luggageCapacity: Number(vehicle.luggageCapacity) || 2,
          price: Number(vehicle.price || vehicle.basePrice) || 0,
          pricePerKm: Number(vehicle.pricePerKm) || 0,
          image: vehicle.image || '/cars/sedan.png',
          amenities: Array.isArray(vehicle.amenities) ? vehicle.amenities : ['AC'],
          description: vehicle.description || '',
          ac: Boolean(vehicle.ac),
          nightHaltCharge: Number(vehicle.nightHaltCharge) || 0,
          driverAllowance: Number(vehicle.driverAllowance) || 0,
          isActive: vehicle.isActive !== false,
          outstationFares: vehicle.outstationFares,
          localPackageFares: vehicle.localPackageFares,
          airportFares: vehicle.airportFares
        }));
        
        sessionStorage.setItem('cabTypes', JSON.stringify(processedVehicles));
        console.log('Used vehicles.php endpoint, cached', processedVehicles.length, 'vehicles');
        
        // Publish event to notify components
        window.dispatchEvent(new CustomEvent('vehicle-data-refreshed', { 
          detail: { count: processedVehicles.length, source: 'vehicles-php' }
        }));
        
        // Update the cabTypes array in-place
        cabTypes.length = 0;
        cabTypes.push(...processedVehicles);
        
        return processedVehicles;
      }
    } catch (faresError) {
      console.error('Error with vehicles.php endpoint:', faresError);
    }
    
    console.warn('No vehicles found in any API response, using defaults');
    
    // Return default cabs as fallback
    const defaultCabs = [
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
    
    // Store default cabs in sessionStorage
    sessionStorage.setItem('cabTypes', JSON.stringify(defaultCabs));
    console.log('Using default vehicles as fallback');
    
    // Update the cabTypes array in-place
    cabTypes.length = 0;
    cabTypes.push(...defaultCabs);
    
    return defaultCabs;
  } catch (error) {
    console.error('Error refreshing cab types:', error);
    
    // Return default cabs as fallback
    const defaultCabs = [
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
    
    // Update the cabTypes array in-place
    cabTypes.length = 0;
    cabTypes.push(...defaultCabs);
    
    return defaultCabs;
  }
};

// Function to format price with Indian Rupees symbol
export const formatPrice = (price: number): string => {
  return `₹${price.toLocaleString('en-IN')}`;
};

// Function to clear fare cache (placeholder for compatibility)
export const clearFareCache = (): void => {
  console.log('Clearing fare cache');
  sessionStorage.removeItem('cabTypes');
  localStorage.removeItem('cabTypes');
};
