
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
let lastFetchedTourFares: TourFares | null = null;

// Function to load tour fares dynamically
export const loadTourFares = async (): Promise<TourFares> => {
  if (isFetchingTourFares) {
    console.log('Tour fare fetch already in progress, returning cached data');
    return lastFetchedTourFares || tourFares;
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
    console.log("Tour fare data received:", tourFareData);
    
    // Create a properly typed object that will hold our dynamic tour fares
    const dynamicTourFares: TourFares = {};
    
    if (Array.isArray(tourFareData) && tourFareData.length > 0) {
      // Map API response to our TourFares structure
      tourFareData.forEach((tour) => {
        if (tour && tour.tourId) {
          // Create a new tour entry
          const tourId = tour.tourId;
          dynamicTourFares[tourId] = {
            sedan: 0,
            ertiga: 0,
            innova: 0
          };
          
          // Set the sedan value
          if (typeof tour.sedan === 'number') {
            dynamicTourFares[tourId].sedan = tour.sedan;
          }
          
          // Set the ertiga value
          if (typeof tour.ertiga === 'number') {
            dynamicTourFares[tourId].ertiga = tour.ertiga;
          }
          
          // Set the innova value (prioritize innova column, fallback to innova_crysta)
          if (typeof tour.innova === 'number') {
            dynamicTourFares[tourId].innova = tour.innova;
          } else if (typeof tour.innova_crysta === 'number') {
            dynamicTourFares[tourId].innova = tour.innova_crysta;
          }
          
          // Add other vehicle types as needed
          Object.entries(tour).forEach(([key, value]) => {
            if (
              typeof value === 'number' && 
              !['id', 'tourId', 'tourName', 'updated_at', 'created_at'].includes(key) &&
              !['sedan', 'ertiga', 'innova'].includes(key)
            ) {
              // Add other vehicle types to the tour fare object
              (dynamicTourFares[tourId] as any)[key] = value;
            }
          });
        }
      });
      
      // Save the fetched fares for future use
      lastFetchedTourFares = dynamicTourFares;
      
      console.log("Processed dynamic tour fares:", dynamicTourFares);
      isFetchingTourFares = false;
      
      // Return the dynamic fares if we have any
      if (Object.keys(dynamicTourFares).length > 0) {
        return dynamicTourFares;
      }
    }
    
    // If we didn't get valid data, return the default fares
    isFetchingTourFares = false;
    return tourFares;
  } catch (error) {
    console.error('Error loading tour fares:', error);
    isFetchingTourFares = false;
    // Fall back to default tour fares if API call fails
    return tourFares;
  }
};
