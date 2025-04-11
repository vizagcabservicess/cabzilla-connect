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

export const loadTourFares = async (): Promise<TourFares> => {
  if (isFetchingTourFares) {
    console.log('Tour fare fetch already in progress, returning cached data');
    return lastFetchedTourFares || tourFares;
  }
  
  try {
    isFetchingTourFares = true;
    console.log("Loading tour fares from API");
    
    try {
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
    
    const tourFareData = await fareAPI.getTourFares();
    console.log("Tour fare data received:", tourFareData);
    
    const dynamicTourFares: TourFares = {};
    
    if (Array.isArray(tourFareData) && tourFareData.length > 0) {
      tourFareData.forEach((tour) => {
        if (tour && tour.tourId) {
          const tourId = tour.tourId;
          dynamicTourFares[tourId] = {
            sedan: tour.sedan || 0,
            ertiga: tour.ertiga || 0,
            innova: tour.innova || 0
          };
          
          Object.entries(tour).forEach(([key, value]) => {
            if (['id', 'tourId', 'tourName', 'updated_at', 'created_at'].includes(key)) {
              return;
            }
            
            if (typeof value === 'number') {
              if (key === 'distance') {
                (dynamicTourFares[tourId] as any).distance = value;
                return;
              }
              
              if (key === 'days') {
                (dynamicTourFares[tourId] as any).days = value;
                return;
              }
              
              if (key === 'sedan') {
                dynamicTourFares[tourId].sedan = value;
              } else if (key === 'ertiga') {
                dynamicTourFares[tourId].ertiga = value;
              } else if (key === 'innova') {
                dynamicTourFares[tourId].innova = value;
              } else if (key === 'tempo') {
                dynamicTourFares[tourId].tempo = value;
              } else if (key === 'luxury') {
                dynamicTourFares[tourId].luxury = value;
              } else if (key === 'innova_crysta') {
                dynamicTourFares[tourId].innova_crysta = value;
              } else if (key === 'tempo_traveller') {
                dynamicTourFares[tourId].tempo_traveller = value;
              } else if (key === 'mpv') {
                dynamicTourFares[tourId].mpv = value;
              } else if (key === 'toyota') {
                dynamicTourFares[tourId].toyota = value;
              } else if (key === 'dzire_cng') {
                dynamicTourFares[tourId].dzire_cng = value;
              } else if (key === 'etios') {
                dynamicTourFares[tourId].etios = value;
              } else {
                (dynamicTourFares[tourId] as any)[key] = value;
              }
            }
          });
          
          if (!dynamicTourFares[tourId].innova && dynamicTourFares[tourId].innova_crysta) {
            dynamicTourFares[tourId].innova = dynamicTourFares[tourId].innova_crysta;
          }
        }
      });
      
      lastFetchedTourFares = dynamicTourFares;
      
      console.log("Processed dynamic tour fares:", dynamicTourFares);
      isFetchingTourFares = false;
      
      try {
        localStorage.setItem('tourFaresCache', JSON.stringify(dynamicTourFares));
        localStorage.setItem('tourFaresCacheTimestamp', Date.now().toString());
      } catch (e) {
        console.warn('Could not cache tour fares in localStorage:', e);
      }
      
      if (Object.keys(dynamicTourFares).length > 0) {
        return dynamicTourFares;
      }
    }
    
    try {
      const cachedFares = localStorage.getItem('tourFaresCache');
      if (cachedFares) {
        const parsedFares = JSON.parse(cachedFares);
        console.log("Using cached tour fares from localStorage");
        isFetchingTourFares = false;
        return parsedFares;
      }
    } catch (e) {
      console.error('Error reading tour fares from localStorage:', e);
    }
    
    isFetchingTourFares = false;
    return tourFares;
  } catch (error) {
    console.error('Error loading tour fares:', error);
    isFetchingTourFares = false;
    
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
    
    return tourFares;
  }
};
