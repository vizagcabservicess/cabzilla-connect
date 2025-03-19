import { CabType } from '@/types/cab';
import { getVehicleData } from '@/services/vehicleDataService';

// Function to load cab types from API or cache
export const loadCabTypes = async (): Promise<CabType[]> => {
  try {
    // Try to get from sessionStorage first (for faster subsequent loads)
    const cachedData = sessionStorage.getItem('cabTypes');
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      // Validate cache has required fields
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
        console.log('Retrieved', parsed.length, 'active vehicle types from cache');
        return parsed;
      }
    }

    // If no cache or invalid cache, fetch from API
    console.log('Fetching vehicle types from API...');
    const vehicles = await getVehicleData();
    
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
      isActive: vehicle.isActive !== false // Default to active if not specified
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
    } else {
      console.warn('No valid vehicles found, not caching');
    }
    
    return validVehicles;
  } catch (error) {
    console.error('Error loading cab types:', error);
    
    // Return default cabs as fallback
    return [
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
  }
};

// Force refresh cab types (ignore cache)
export const reloadCabTypes = async (): Promise<CabType[]> => {
  console.log('Force refreshing cab types...');
  // Clear cache
  sessionStorage.removeItem('cabTypes');
  localStorage.removeItem('cabTypes');
  
  try {
    // Get fresh data from API with all fallbacks
    const freshVehicles = await getVehicleData(true);
    
    // Process the fresh data
    if (Array.isArray(freshVehicles) && freshVehicles.length > 0) {
      console.log('Successfully fetched vehicles from primary endpoint:', freshVehicles.length);
      
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
        ac: Boolean(vehicle.ac),
        nightHaltCharge: Number(vehicle.nightHaltCharge) || 0,
        driverAllowance: Number(vehicle.driverAllowance) || 0,
        isActive: vehicle.isActive !== false // Default to active if not specified
      }));
      
      // Store in sessionStorage for later use
      sessionStorage.setItem('cabTypes', JSON.stringify(processedVehicles));
      
      return processedVehicles;
    } else {
      throw new Error('API returned empty or invalid vehicle data');
    }
  } catch (error) {
    console.error('Error refreshing cab types:', error);
    
    try {
      console.info('Using direct database query as last resort');
      
      // Try direct database query endpoint as backup
      const response = await fetch('/api/admin/vehicles-update.php?action=getAll&_t=' + Date.now(), {
        headers: {
          'Cache-Control': 'no-cache',
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
          isActive: vehicle.is_active !== false
        }));
        
        sessionStorage.setItem('cabTypes', JSON.stringify(processedVehicles));
        return processedVehicles;
      }
    } catch (dbError) {
      console.error('Error with direct db query:', dbError);
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
    
    return defaultCabs;
  }
};

// Function to format price with Indian Rupees symbol
export const formatPrice = (price: number): string => {
  return `₹${price.toLocaleString('en-IN')}`;
};
