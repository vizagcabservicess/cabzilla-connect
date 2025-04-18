
import { TourInfo, TourFares } from '@/types/cab';
import { fareAPI } from '@/services/api';

export const availableTours: TourInfo[] = [
  {
    id: 'araku_valley',
    name: 'Araku Valley Tour',
    distance: 120,
    days: 1, // This is now added to the interface
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
    // Remove the timestamp parameter as it's not accepted by the API
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
            innova: tour.innova || 0
          };
        }
      });
    }
    
    isFetchingTourFares = false;
    return Object.keys(dynamicTourFares).length > 0 ? dynamicTourFares : tourFares;
  } catch (error) {
    console.error('Error loading tour fares:', error);
    isFetchingTourFares = false;
    // Fall back to default tour fares if API call fails
    return tourFares;
  }
};
