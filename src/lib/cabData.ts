
import { CabType } from '@/types/cab';

// Export the formatPrice function
export function formatPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN')}`;
}

// Define cab types
export const cabTypes: CabType[] = [
  {
    id: 'sedan',
    name: 'Sedan',
    capacity: 4,
    luggageCapacity: 2,
    image: '/images/sedan.jpg',
    amenities: ['AC', 'Music System', 'Water Bottle'],
    description: 'Comfortable sedan for up to 4 passengers',
    ac: true,
    price: 12,
    pricePerKm: 14
  },
  {
    id: 'ertiga',
    name: 'Ertiga',
    capacity: 6,
    luggageCapacity: 3,
    image: '/images/ertiga.jpg',
    amenities: ['AC', 'Music System', 'Water Bottle', 'Extra Legroom'],
    description: 'Spacious SUV for up to 6 passengers',
    ac: true,
    price: 15,
    pricePerKm: 18
  },
  {
    id: 'innova',
    name: 'Innova Crysta',
    capacity: 7,
    luggageCapacity: 4,
    image: '/images/innova.jpg',
    amenities: ['AC', 'Music System', 'Water Bottle', 'Extra Legroom', 'Premium Interior'],
    description: 'Premium SUV for up to 7 passengers with extra comfort',
    ac: true,
    price: 18,
    pricePerKm: 20
  }
];

// Function to load cab types (with optional force refresh parameter)
export async function loadCabTypes(forceRefresh: boolean = false): Promise<CabType[]> {
  try {
    console.log(`Loading cab types (force refresh: ${forceRefresh})`);
    
    // In a real app, you would fetch from an API here
    // For demonstration, we're just returning the local data
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Clear cache if force refresh is requested
    if (forceRefresh) {
      console.log('Forcing refresh of cab types data');
      localStorage.removeItem('cabTypes');
      sessionStorage.removeItem('cabTypes');
    }
    
    // Return the cab types data
    return cabTypes;
  } catch (error) {
    console.error('Error loading cab types:', error);
    return cabTypes; // Return default cab types on error
  }
}

// Function to reload cab types (force refresh)
export async function reloadCabTypes(): Promise<CabType[]> {
  console.log('Reloading cab types...');
  
  try {
    // Clear any cached data
    localStorage.removeItem('cabTypes');
    sessionStorage.removeItem('cabTypes');
    
    // In a real app, you would make an API request here
    // For demonstration, we're just returning the local data with a delay
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Event notifications for other components
    window.dispatchEvent(new CustomEvent('cab-types-reloaded', {
      detail: {
        timestamp: Date.now(),
        count: cabTypes.length
      }
    }));
    
    return cabTypes;
  } catch (error) {
    console.error('Error reloading cab types:', error);
    
    // Notify about the error
    window.dispatchEvent(new CustomEvent('cab-types-reload-failed', {
      detail: {
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }));
    
    return cabTypes; // Return default cab types on error
  }
}
