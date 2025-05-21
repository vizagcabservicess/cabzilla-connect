
import { TourInfo, TourFares } from '@/types/cab';
import { fareAPI } from '@/services/api';
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
    
    // Use fetch directly to avoid axios dependency issues
    const response = await fetch('/api/fares/tours.php');
    if (!response.ok) {
      throw new Error(`Failed to fetch tours: ${response.status} ${response.statusText}`);
    }
    
    const tourData = await response.json();
    console.log("Tour data from API:", tourData);
    
    // Transform the API data to match our app's structure
    const dynamicTours: TourInfo[] = [];
    
    if (Array.isArray(tourData) && tourData.length > 0) {
      tourData.forEach((tour) => {
        if (tour && tour.tourId) {
          dynamicTours.push({
            id: tour.tourId,
            name: tour.tourName,
            distance: parseFloat(tour.distance) || 50,
            days: parseInt(tour.days) || 1,
            image: tour.image || `/tours/${tour.tourId}.jpg`,
            description: tour.description
          });
        }
      });
    }
    
    // If we got valid data, cache it
    if (dynamicTours.length > 0) {
      cachedTours = dynamicTours;
      lastFetchTime = now;
      return dynamicTours;
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
    
    // Use fetch directly to avoid axios dependency issues
    const response = await fetch('/api/fares/tours.php');
    if (!response.ok) {
      throw new Error(`Failed to fetch tour fares: ${response.status} ${response.statusText}`);
    }
    
    const tourFareData = await response.json();
    console.log("Tour fare data from API:", tourFareData);
    
    // Convert the API data to match the existing structure
    const dynamicTourFares: TourFares = {};
    
    if (Array.isArray(tourFareData) && tourFareData.length > 0) {
      tourFareData.forEach((tour) => {
        if (tour && tour.tourId) {
          dynamicTourFares[tour.tourId] = {
            sedan: parseFloat(tour.sedan) || 0,
            ertiga: parseFloat(tour.ertiga) || 0,
            innova: parseFloat(tour.innova) || 0
          };
        }
      });
    }
    
    // If we got valid data, cache it
    if (Object.keys(dynamicTourFares).length > 0) {
      cachedTourFares = dynamicTourFares;
      lastFetchTime = now;
      return dynamicTourFares;
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
