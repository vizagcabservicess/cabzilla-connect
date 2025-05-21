
import { TourInfo, TourFares } from '@/types/cab';
import { fareAPI } from '@/services/api';

export const availableTours: TourInfo[] = [
  {
    id: 'araku_valley',
    name: 'Araku Valley Tour',
    distance: 120,
    days: 1,
    image: '/tours/araku_valley.jpg'
  },
  {
    id: 'yarada_beach',
    name: 'Yarada Beach Tour',
    distance: 40,
    days: 1,
    image: '/tours/yarada_beach.jpg'
  },
  {
    id: 'rushikonda',
    name: 'Rushikonda Beach Tour',
    distance: 25,
    days: 1,
    image: '/tours/rushikonda.jpg'
  },
  {
    id: 'kailasagiri',
    name: 'Kailasagiri Hill Park',
    distance: 30,
    days: 1,
    image: '/tours/kailasagiri.jpg'
  },
  {
    id: 'borra_caves',
    name: 'Borra Caves Adventure',
    distance: 90,
    days: 1,
    image: '/tours/borra_caves.jpg'
  }
];

export const tourFares: TourFares = {
  araku_valley: {
    sedan: 6000,
    ertiga: 7500,
    innova: 9000
  },
  yarada_beach: {
    sedan: 2500,
    ertiga: 3500,
    innova: 4500
  },
  rushikonda: {
    sedan: 2000,
    ertiga: 3000,
    innova: 4000
  },
  kailasagiri: {
    sedan: 2200,
    ertiga: 3200, 
    innova: 4200
  },
  borra_caves: {
    sedan: 5500,
    ertiga: 7000,
    innova: 8500
  }
};

// Track ongoing tour fare fetch operations
let isFetchingTourFares = false;
let lastFetchTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// Function to load tour fares dynamically
export const loadTourFares = async (): Promise<TourFares> => {
  const now = Date.now();
  
  // Skip if fetch already in progress or recent cache exists
  if (isFetchingTourFares) {
    console.log('Tour fare fetch already in progress, returning cached data');
    return tourFares;
  }
  
  // Use cached data if still fresh
  if (now - lastFetchTime < CACHE_DURATION) {
    console.log('Using cached tour fares, last fetch time:', new Date(lastFetchTime).toLocaleTimeString());
    return tourFares;
  }
  
  try {
    isFetchingTourFares = true;
    console.log("Loading tour fares from API");
    
    const tourFareData = await fareAPI.getTourFares();
    console.log("Tour fare data:", tourFareData);
    
    // Convert the API data to match the existing structure
    const dynamicTourFares: TourFares = {};
    
    if (Array.isArray(tourFareData) && tourFareData.length > 0) {
      tourFareData.forEach((tour) => {
        if (tour && tour.tourId) {
          dynamicTourFares[tour.tourId] = {
            sedan: tour.sedan || 0,
            ertiga: tour.ertiga || 0,
            innova: tour.innova || 0,
            tempo: tour.tempo || 0,
            luxury: tour.luxury || 0
          };
        }
      });
      
      // Save last fetch time
      lastFetchTime = now;
    }
    
    isFetchingTourFares = false;
    
    // Return API data if available, otherwise use default
    if (Object.keys(dynamicTourFares).length > 0) {
      console.log('Using API tour fares');
      return dynamicTourFares;
    } else {
      console.log('No tour fares from API, using defaults');
      return tourFares;
    }
  } catch (error) {
    console.error('Error loading tour fares:', error);
    isFetchingTourFares = false;
    // Fall back to default tour fares if API call fails
    return tourFares;
  }
};

// Get specific tour fare
export const getTourFare = async (tourId: string, cabType: string): Promise<number> => {
  try {
    const fares = await loadTourFares();
    if (fares[tourId] && fares[tourId][cabType as keyof typeof fares[typeof tourId]]) {
      return fares[tourId][cabType as keyof typeof fares[typeof tourId]] as number;
    }
    
    // If specific fare not found, use default
    return tourFares[tourId]?.[cabType as keyof typeof tourFares[typeof tourId]] || 0;
  } catch (error) {
    console.error(`Error getting fare for tour ${tourId}, cab ${cabType}:`, error);
    return tourFares[tourId]?.[cabType as keyof typeof tourFares[typeof tourId]] || 0;
  }
};
