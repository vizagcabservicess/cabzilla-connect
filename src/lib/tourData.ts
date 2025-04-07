
import { getVehicleData } from '@/services/vehicleDataService';
import { TourInfo, TourFares } from '@/types/cab';

export const popularTours: TourInfo[] = [
  {
    id: 'araku_valley',
    name: 'Araku Valley',
    description: 'Explore the beautiful Araku Valley with its scenic views and coffee plantations.',
    duration: 12, // hours
    distance: 120,
    locations: ['Araku Valley', 'Coffee Plantations', 'Tribal Museum'],
    basePrice: 3500,
    days: 1,
    image: '/images/tours/araku-valley.jpg'
  },
  {
    id: 'yarada_beach',
    name: 'Yarada Beach',
    description: 'Relax at the pristine Yarada Beach with golden sands and beautiful sunset views.',
    duration: 6, // hours
    distance: 40,
    locations: ['Yarada Beach', 'Dolphin's Nose', 'Ross Hill Church'],
    basePrice: 1800,
    days: 1,
    image: '/images/tours/yarada-beach.jpg'
  },
  {
    id: 'rushikonda',
    name: 'Rushikonda Beach',
    description: 'Visit the popular Rushikonda Beach known for its golden sands and water sports.',
    duration: 5, // hours
    distance: 25,
    locations: ['Rushikonda Beach', 'VMRDA Park', 'Kailasagiri'],
    basePrice: 1500,
    days: 1,
    image: '/images/tours/rushikonda.jpg'
  }
];

// Set tour fares for different cab types
export const tourFares: Record<string, TourFares> = {
  'araku_valley_sedan': {
    tourId: 'araku_valley',
    vehicleId: 'sedan',
    basePrice: 3500,
    perKmPrice: 12
  },
  'araku_valley_ertiga': {
    tourId: 'araku_valley',
    vehicleId: 'ertiga',
    basePrice: 4500,
    perKmPrice: 15
  },
  'araku_valley_innova': {
    tourId: 'araku_valley',
    vehicleId: 'innova_crysta',
    basePrice: 5500,
    perKmPrice: 18
  },
  'yarada_beach_sedan': {
    tourId: 'yarada_beach',
    vehicleId: 'sedan',
    basePrice: 1800,
    perKmPrice: 12
  },
  'yarada_beach_ertiga': {
    tourId: 'yarada_beach',
    vehicleId: 'ertiga',
    basePrice: 2500,
    perKmPrice: 15
  },
  'yarada_beach_innova': {
    tourId: 'yarada_beach',
    vehicleId: 'innova_crysta',
    basePrice: 3200,
    perKmPrice: 18
  },
  'rushikonda_sedan': {
    tourId: 'rushikonda',
    vehicleId: 'sedan',
    basePrice: 1500,
    perKmPrice: 12
  },
  'rushikonda_ertiga': {
    tourId: 'rushikonda',
    vehicleId: 'ertiga',
    basePrice: 2000,
    perKmPrice: 15
  },
  'rushikonda_innova': {
    tourId: 'rushikonda',
    vehicleId: 'innova_crysta',
    basePrice: 2800,
    perKmPrice: 18
  }
};

/**
 * Get available tours
 */
export function getAvailableTours(): TourInfo[] {
  return popularTours;
}

/**
 * Get tour by ID
 */
export function getTourById(id: string): TourInfo | undefined {
  return popularTours.find(tour => tour.id === id);
}

/**
 * Calculate tour fare for specific vehicle
 */
export function calculateTourFare(tourId: string, vehicleId: string): number {
  const tour = getTourById(tourId);
  if (!tour) return 0;
  
  const fareKey = `${tourId}_${vehicleId}`;
  const tourFare = tourFares[fareKey];
  
  if (tourFare) {
    return tourFare.basePrice;
  }
  
  // Default pricing based on distance if no specific fare found
  const basePrice = {
    sedan: 1500,
    ertiga: 2000,
    innova_crysta: 2500,
    tempo_traveller: 3500
  };
  
  const pricePerKm = {
    sedan: 12,
    ertiga: 15,
    innova_crysta: 18,
    tempo_traveller: 22
  };
  
  const defaultBasePrice = basePrice[vehicleId as keyof typeof basePrice] || 2000;
  const defaultPricePerKm = pricePerKm[vehicleId as keyof typeof pricePerKm] || 15;
  
  return defaultBasePrice + (tour.distance * defaultPricePerKm);
}

/**
 * Get tour fares for all vehicles
 */
export async function getTourFaresForAllVehicles(tourId: string): Promise<any[]> {
  const vehicles = await getVehicleData();
  const tour = getTourById(tourId);
  
  if (!tour) return [];
  
  return vehicles.map(vehicle => ({
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    fare: calculateTourFare(tourId, vehicle.id)
  }));
}
