
import { TourInfo, TourFares } from '@/types/cab';
import { tourAPI } from '@/services/api/tourAPI';
import { toast } from 'sonner';

// Default tours that will be used while loading or if API fails
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
  }
];

// Default fares that will be used while loading or if API fails
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
  }
};

// Track ongoing tour fetch operations
let isFetchingTours = false;
let isFetchingTourFares = false;
let cachedTours: TourInfo[] | null = null;
let cachedTourFares: TourFares | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

/**
 * Load tour information dynamically from API
 */
export const loadTours = async (): Promise<TourInfo[]> => {
  const now = Date.now();
  
  // Return cached data if available and recent
  if (cachedTours && now - lastFetchTime < CACHE_DURATION) {
    console.log('Using cached tour data');
    return cachedTours;
  }
  
  if (isFetchingTours) {
    console.log('Tour fetch already in progress, returning default data');
    return cachedTours || availableTours;
  }
  
  try {
    isFetchingTours = true;
    console.log("Loading tours from API");
    
    // Use the tourAPI instead of direct fetch
    const tourData = await tourAPI.getTours();
    console.log("Tour data from API:", tourData);
    
    // If we got valid data, cache it
    if (tourData && tourData.length > 0) {
      cachedTours = tourData;
      lastFetchTime = now;
      return tourData;
    } else {
      console.warn('No valid tour data received from API, using defaults');
      return availableTours;
    }
  } catch (error) {
    console.error('Error loading tours:', error);
    toast.error('Could not load tour information');
    // Fall back to default tours if API call fails
    return availableTours;
  } finally {
    isFetchingTours = false;
  }
};

/**
 * Load tour fares dynamically from API
 */
export const loadTourFares = async (): Promise<TourFares> => {
  const now = Date.now();
  
  // Return cached data if available and recent
  if (cachedTourFares && now - lastFetchTime < CACHE_DURATION) {
    console.log('Using cached tour fare data');
    return cachedTourFares;
  }
  
  if (isFetchingTourFares) {
    console.log('Tour fare fetch already in progress, returning default data');
    return cachedTourFares || tourFares;
  }
  
  try {
    isFetchingTourFares = true;
    console.log("Loading tour fares from API");
    
    // Use the tourAPI instead of direct fetch
    const tourFareData = await tourAPI.getTourFares();
    console.log("Tour fare data from API:", tourFareData);
    
    // If we got valid data, cache it
    if (tourFareData && Object.keys(tourFareData).length > 0) {
      cachedTourFares = tourFareData as TourFares;
      lastFetchTime = now;
      return tourFareData as TourFares;
    } else {
      console.warn('No valid tour fare data received from API, using defaults');
      return tourFares;
    }
  } catch (error) {
    console.error('Error loading tour fares:', error);
    // Fall back to default tour fares if API call fails
    return tourFares;
  } finally {
    isFetchingTourFares = false;
  }
};

// Force reload of tour data and fares
export const refreshTourData = () => {
  cachedTours = null;
  cachedTourFares = null;
  lastFetchTime = 0;
  console.log("Tour data cache cleared, will fetch fresh data on next request");
};
