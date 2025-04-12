import { TourInfo, TourFares } from '@/types/cab';
import { fareAPI, syncTourFaresTable } from '@/services/api';

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
    id: 'annavaram',
    name: 'Annavaram Temple Tour',
    distance: 90,
    days: 1,
    image: '/tours/annavaram.jpg'
  },
  {
    id: 'araku',
    name: 'Araku Scenic Tour',
    distance: 115,
    days: 1,
    image: '/tours/araku.jpg'
  },
  {
    id: 'lambasingi',
    name: 'Lambasingi Hill Tour',
    distance: 100,
    days: 1,
    image: '/tours/lambasingi.jpg'
  },
  {
    id: 'srikakulam',
    name: 'Srikakulam Tour',
    distance: 110,
    days: 1,
    image: '/tours/srikakulam.jpg'
  },
  {
    id: 'vanajangi',
    name: 'Vanajangi Scenic Tour',
    distance: 95,
    days: 1,
    image: '/tours/vanajangi.jpg'
  },
  {
    id: 'vizag',
    name: 'Vizag City Tour',
    distance: 30,
    days: 1,
    image: '/tours/vizag.jpg'
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
  annavaram: {
    sedan: 6000,
    ertiga: 7500, 
    innova: 9000,
    tempo: 13500,
    luxury: 17000
  },
  araku: {
    sedan: 5000,
    ertiga: 6500,
    innova: 8000,
    tempo: 12000,
    luxury: 15000
  },
  lambasingi: {
    sedan: 5500,
    ertiga: 7000,
    innova: 8500,
    tempo: 12500,
    luxury: 16000
  },
  srikakulam: {
    sedan: 6500,
    ertiga: 8000,
    innova: 9500,
    tempo: 14000,
    luxury: 18000
  },
  vanajangi: {
    sedan: 5500,
    ertiga: 7000,
    innova: 8500,
    tempo: 12500,
    luxury: 16000
  },
  vizag: {
    sedan: 3000,
    ertiga: 4000,
    innova: 5500,
    tempo: 7500,
    luxury: 9000
  }
};

// Standard vehicle ID mapping
export const vehicleIdMapping: Record<string, string> = {
  'sedan': 'sedan',
  'Sedan': 'sedan',
  'ertiga': 'ertiga',
  'Ertiga': 'ertiga',
  'innova': 'innova',
  'Innova': 'innova',
  'innova_crysta': 'innova_crysta',
  'Innova Crysta': 'innova_crysta',
  'tempo': 'tempo',
  'Tempo': 'tempo',
  'tempo_traveller': 'tempo_traveller',
  'Tempo Traveller': 'tempo_traveller',
  'luxury': 'luxury',
  'Luxury': 'luxury',
  'mpv': 'mpv',
  'MPV': 'mpv',
  'toyota': 'toyota',
  'Toyota': 'toyota',
  'dzire_cng': 'dzire_cng',
  'Dzire CNG': 'dzire_cng',
  'etios': 'etios',
  'Etios': 'etios'
};

let isFetchingTourFares = false;
let lastFetchedTourFares: TourFares | null = null;
let lastFetchTimestamp = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute in milliseconds

// Function to normalize vehicle type/id for consistent mapping
const normalizeVehicleType = (vehicleId: string): string => {
  const id = vehicleId.toLowerCase();
  
  // Standard vehicle type mappings
  if (id.includes('sedan')) return 'sedan';
  if (id.includes('ertiga')) return 'ertiga'; 
  if (id.includes('innova_crysta')) return 'innova_crysta';
  if (id.includes('innova')) return 'innova';
  if (id.includes('tempo_traveller')) return 'tempo_traveller';
  if (id.includes('tempo')) return 'tempo';
  if (id.includes('luxury')) return 'luxury';
  if (id.includes('mpv')) return 'mpv';
  if (id.includes('toyota')) return 'toyota';
  if (id.includes('dzire_cng') || (id.includes('dzire') && id.includes('cng'))) return 'dzire_cng';
  if (id.includes('etios')) return 'etios';
  
  // Return original ID if no specific type matches
  return id;
};

export const loadTourFares = async (force = false): Promise<TourFares> => {
  const now = Date.now();
  
  // Check if we should use cached data
  if (!force && 
      lastFetchedTourFares && 
      now - lastFetchTimestamp < CACHE_DURATION && 
      Object.keys(lastFetchedTourFares).length > 0) {
    console.log('Using cached tour fares, last fetched at:', new Date(lastFetchTimestamp).toLocaleTimeString());
    return lastFetchedTourFares;
  }
  
  // If already fetching, return cached data or default
  if (isFetchingTourFares) {
    console.log('Tour fare fetch already in progress, returning cached data');
    return lastFetchedTourFares || tourFares;
  }
  
  try {
    isFetchingTourFares = true;
    console.log("Loading tour fares from API");
    
    try {
      // Make sure tour fares table is synced with vehicle data first
      const syncSuccess = await syncTourFaresTable();
      console.log("Tour fares table sync result:", syncSuccess ? "success" : "failed");
    } catch (syncError) {
      console.error("Error syncing tour fares table:", syncError);
    }
    
    // Fetch tour fares from the API
    const tourFareData = await fareAPI.getTourFares();
    console.log("Tour fare data received:", tourFareData);
    
    const dynamicTourFares: TourFares = {};
    
    if (Array.isArray(tourFareData) && tourFareData.length > 0) {
      // Process the API response data
      tourFareData.forEach((tour) => {
        if (tour && tour.tourId) {
          const tourId = tour.tourId;
          
          // Create an object for this tour with default required properties
          dynamicTourFares[tourId] = {
            sedan: 0,  // Add default required properties
            ertiga: 0, 
            innova: 0
          };
          
          // Add all vehicle prices to this tour
          Object.entries(tour).forEach(([key, value]) => {
            // Skip non-price properties
            if (['id', 'tourId', 'tourName', 'distance', 'days', 'updated_at', 'created_at'].includes(key)) {
              // Store distance and days as separate metadata
              if (key === 'distance' && typeof value === 'number') {
                (dynamicTourFares[tourId] as any)._distance = value;
              }
              
              if (key === 'days' && typeof value === 'number') {
                (dynamicTourFares[tourId] as any)._days = value;
              }
              return;
            }
            
            // Add all numeric values as vehicle prices
            if (typeof value === 'number' && value > 0) {
              const normalizedVehicleType = normalizeVehicleType(key);
              dynamicTourFares[tourId][normalizedVehicleType] = value;
            }
          });
          
          // If we don't have any real values for the required properties, set reasonable defaults
          if (dynamicTourFares[tourId].sedan === 0) dynamicTourFares[tourId].sedan = 3000;
          if (dynamicTourFares[tourId].ertiga === 0) dynamicTourFares[tourId].ertiga = 4500;
          if (dynamicTourFares[tourId].innova === 0) dynamicTourFares[tourId].innova = 6000;
        }
      });
      
      // Only if we have successfully parsed tour fares, update the cache
      if (Object.keys(dynamicTourFares).length > 0) {
        console.log("Processed dynamic tour fares:", dynamicTourFares);
        lastFetchedTourFares = dynamicTourFares;
        lastFetchTimestamp = now;
        
        // Cache in localStorage for persistence
        try {
          localStorage.setItem('tourFaresCache', JSON.stringify(dynamicTourFares));
          localStorage.setItem('tourFaresCacheTimestamp', now.toString());
        } catch (e) {
          console.warn('Could not cache tour fares in localStorage:', e);
        }
        
        // Dispatch an event to notify components that the tour fares have been updated
        window.dispatchEvent(new CustomEvent('tour-fares-updated', { 
          detail: { timestamp: now, source: 'api' } 
        }));
        
        return dynamicTourFares;
      }
    }
    
    // If API failed or returned invalid data, try localStorage cache
    try {
      const cachedFares = localStorage.getItem('tourFaresCache');
      const cacheTimestamp = localStorage.getItem('tourFaresCacheTimestamp');
      
      if (cachedFares) {
        const parsedFares = JSON.parse(cachedFares);
        console.log("Using cached tour fares from localStorage");
        
        // Update memory cache
        lastFetchedTourFares = parsedFares;
        lastFetchTimestamp = cacheTimestamp ? parseInt(cacheTimestamp) : now;
        
        return parsedFares;
      }
    } catch (e) {
      console.error('Error reading tour fares from localStorage:', e);
    }
    
    // Return default tour fares as last resort
    return tourFares;
  } catch (error) {
    console.error('Error loading tour fares:', error);
    
    // Try localStorage cache
    try {
      const cachedFares = localStorage.getItem('tourFaresCache');
      if (cachedFares) {
        const parsedFares = JSON.parse(cachedFares);
        console.log("Using cached tour fares from localStorage after error");
        return parsedFares;
      }
    } catch (e) {
      console.error('Error reading tour fares from localStorage:', e);
    }
    
    // Fall back to default tour fares
    return tourFares;
  } finally {
    isFetchingTourFares = false;
  }
};
