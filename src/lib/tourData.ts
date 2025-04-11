
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
  // Add the tours shown in your console log
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

// Default fallback fares
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

// Map of vehicle ID variants to normalized IDs
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
          
          // Process all properties from the API response
          Object.entries(tour).forEach(([key, value]) => {
            // Skip non-fare fields
            if (['id', 'tourId', 'tourName', 'updated_at', 'created_at', 'distance', 'days'].includes(key)) {
              return;
            }
            
            if (typeof value === 'number') {
              // Handle specific known vehicle columns
              if (key === 'sedan') {
                dynamicTourFares[tourId].sedan = value;
              } else if (key === 'ertiga') {
                dynamicTourFares[tourId].ertiga = value;
              } else if (key === 'innova') {
                dynamicTourFares[tourId].innova = value;
              } else if (key === 'innova_crysta') {
                dynamicTourFares[tourId].innova_crysta = value;
              } else if (key === 'tempo' || key === 'tempo_traveller') {
                dynamicTourFares[tourId].tempo = value;
                // Also store as tempo_traveller for backward compatibility
                dynamicTourFares[tourId].tempo_traveller = value;
              } else if (key === 'luxury') {
                dynamicTourFares[tourId].luxury = value;
              } else if (key === 'mpv') {
                dynamicTourFares[tourId].mpv = value;
              } else if (key === 'toyota') {
                dynamicTourFares[tourId].toyota = value;
              } else if (key === 'dzire_cng') {
                dynamicTourFares[tourId].dzire_cng = value;
              } else if (key === 'etios') {
                dynamicTourFares[tourId].etios = value;
              } else {
                // For any other vehicle type, just add it to the fare object
                (dynamicTourFares[tourId] as any)[key] = value;
              }
            }
          });
          
          // Special handling for innova - try to set from innova_crysta if innova is not set
          if (!dynamicTourFares[tourId].innova && dynamicTourFares[tourId].innova_crysta) {
            dynamicTourFares[tourId].innova = dynamicTourFares[tourId].innova_crysta;
          }
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
