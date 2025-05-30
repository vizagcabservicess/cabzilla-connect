
import { TourInfo, TourFares } from '@/types/cab';
import { fareAPI } from '@/services/api';
import { tourAPI } from '@/services/api/tourAPI';
import { formatDate } from '@/lib/dateUtils';

// Default tours as fallback
export const defaultTours: TourInfo[] = [
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
    id: 'vizag_city',
    name: 'Vizag City Tour',
    distance: 50,
    days: 1,
    image: '/tours/vizag_city.jpg'
  },
  {
    id: 'srikakulam',
    name: 'Srikakulam Temple Tour',
    distance: 110,
    days: 1,
    image: '/tours/srikakulam.jpg'
  }
];

// Default tour fares as fallback
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
  vizag_city: {
    sedan: 3000,
    ertiga: 3800,
    innova: 4600
  },
  srikakulam: {
    sedan: 5500,
    ertiga: 6500,
    innova: 8000
  }
};

// Cache management
let toursCache: TourInfo[] | null = null;
let tourFaresCache: TourFares | null = null;
let lastFetchTimestamp = 0;
const CACHE_DURATION = 1000 * 60 * 10; // 10 minutes cache

// Track ongoing tour fetch operations
let isFetchingTours = false;
let isFetchingTourFares = false;

// Function to load tours dynamically
export const loadAvailableTours = async (): Promise<TourInfo[]> => {
  // Check if we have a fresh cache
  const now = Date.now();
  if (toursCache && now - lastFetchTimestamp < CACHE_DURATION) {
    console.log("Using cached tours data");
    return toursCache;
  }
  
  if (isFetchingTours) {
    console.log('Tour fetch already in progress, returning cached or default data');
    return toursCache || defaultTours;
  }
  
  try {
    isFetchingTours = true;
    console.log("Loading tours from API");
    
    const tourData = await tourAPI.getAvailableTours();
    console.log("Tours loaded:", tourData);
    
    if (Array.isArray(tourData) && tourData.length > 0) {
      toursCache = tourData;
      lastFetchTimestamp = now;
      return tourData;
    }
    
    console.log("No tour data received, using default tours");
    return defaultTours;
  } catch (error) {
    console.error('Error loading tours:', error);
    return defaultTours;
  } finally {
    isFetchingTours = false;
  }
};

// Function to load tour fares dynamically
export const loadTourFares = async (): Promise<TourFares> => {
  // Check if we have a fresh cache
  const now = Date.now();
  if (tourFaresCache && now - lastFetchTimestamp < CACHE_DURATION) {
    console.log("Using cached tour fares data");
    return tourFaresCache;
  }
  
  if (isFetchingTourFares) {
    console.log('Tour fare fetch already in progress, returning cached data');
    return tourFaresCache || tourFares;
  }
  
  try {
    isFetchingTourFares = true;
    console.log("Loading tour fares from API");
    
    const tourFareData = await tourAPI.getTourFares();
    console.log("Tour fare data:", tourFareData);
    
    // Convert the API data to match the existing structure
    const dynamicTourFares: TourFares = {};
    
    if (Array.isArray(tourFareData) && tourFareData.length > 0) {
      tourFareData.forEach((tour) => {
        if (tour && tour.tourId) {
          dynamicTourFares[tour.tourId] = {
            sedan: tour.sedan || 0,
            ertiga: tour.ertiga || 0,
            innova: tour.innova || 0
          };
        }
      });
      
      tourFaresCache = dynamicTourFares;
      lastFetchTimestamp = now;
      return Object.keys(dynamicTourFares).length > 0 ? dynamicTourFares : tourFares;
    }
    
    return tourFares;
  } catch (error) {
    console.error('Error loading tour fares:', error);
    // Fall back to default tour fares if API call fails
    return tourFares;
  } finally {
    isFetchingTourFares = false;
  }
};

// Function to get tour fare with fallback mechanism
export const getTourFare = (tourId: string, cabId: string): number => {
  if (!tourId || !cabId) return 0;
  
  console.log(`Getting tour fare for tour: ${tourId}, cab: ${cabId}`);
  
  // First check if we have this in the tour fares cache
  if (tourFaresCache && tourFaresCache[tourId]) {
    const fare = tourFaresCache[tourId][cabId as keyof typeof tourFaresCache[typeof tourId]];
    if (fare) return fare as number;
  }
  
  // Then check default tour fares
  const tourFareMatrix = tourFares[tourId];
  if (tourFareMatrix) {
    const fare = tourFareMatrix[cabId as keyof typeof tourFareMatrix];
    console.log(`Tour fare from matrix: ${fare}`);
    if (fare) return fare as number;
  }
  
  // Default prices if all else fails
  if (cabId === 'sedan') return 3500;
  if (cabId === 'ertiga') return 4500;
  if (cabId === 'innova') return 5500;
  
  return 4000;
};
