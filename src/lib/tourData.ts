
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
  }
};

// Track ongoing tour fare fetch operations
let isFetchingTourFares = false;

// Function to load tour fares dynamically
export const loadTourFares = async (): Promise<TourFares> => {
  if (isFetchingTourFares) {
    console.log('Tour fare fetch already in progress, returning cached data');
    return tourFares;
  }
  
  try {
    isFetchingTourFares = true;
    console.log("Loading tour fares from API");
    
    // First, make sure the tour_fares table is synced with vehicles
    try {
      // Ensure the auth token is set before syncing
      const token = localStorage.getItem('authToken');
      if (!token) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const userData = JSON.parse(userStr);
            if (userData?.token) {
              localStorage.setItem('authToken', userData.token);
              console.log('Retrieved token from user object for tour fares sync');
            }
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
      }
      
      const syncSuccess = await syncTourFaresTable();
      console.log("Tour fares table sync result:", syncSuccess ? "success" : "failed");
    } catch (syncError) {
      console.error("Error syncing tour fares table:", syncError);
    }
    
    // Fetch the tour fare data
    const tourFareData = await fareAPI.getTourFares();
    console.log("Tour fare data:", tourFareData);
    
    // Create a properly typed object that will hold our dynamic tour fares
    const dynamicTourFares: TourFares = {};
    
    if (Array.isArray(tourFareData) && tourFareData.length > 0) {
      tourFareData.forEach((tour) => {
        if (tour && tour.tourId) {
          // Initialize the base fare entry with required properties
          const fareEntry: Record<string, number> = {
            sedan: 0,
            ertiga: 0,
            innova: 0
          };
          
          // Extract all vehicle prices from the tour fare object
          Object.entries(tour).forEach(([key, value]) => {
            // Only add keys that have numeric values and aren't id, tourId, or tourName
            if (
              typeof value === 'number' &&
              !['id', 'tourId', 'tourName'].includes(key)
            ) {
              fareEntry[key] = value;
            }
          });
          
          // Ensure all required properties are initialized
          if (typeof fareEntry.sedan !== 'number') fareEntry.sedan = 0;
          if (typeof fareEntry.ertiga !== 'number') fareEntry.ertiga = 0;
          if (typeof fareEntry.innova !== 'number') fareEntry.innova = 0;
          
          // Type assertion to ensure TypeScript understands this object has the required properties
          dynamicTourFares[tour.tourId] = fareEntry as {
            sedan: number;
            ertiga: number;
            innova: number;
            tempo?: number;
            luxury?: number;
            [key: string]: number | undefined;
          };
        }
      });
    }
    
    isFetchingTourFares = false;
    
    // Check if we have any dynamic fares, otherwise return the default ones
    // Also ensure TypeScript that the returned object conforms to TourFares
    if (Object.keys(dynamicTourFares).length > 0) {
      console.log("Returning dynamic tour fares", dynamicTourFares);
      return dynamicTourFares;
    } else {
      console.log("No dynamic fares found, returning default fares");
      return tourFares;
    }
  } catch (error) {
    console.error('Error loading tour fares:', error);
    isFetchingTourFares = false;
    // Fall back to default tour fares if API call fails
    return tourFares;
  }
};
