import { TourInfo, TourFares } from '@/types/cab';
import { fareAPI } from '@/services/api';
import { tourAPI } from '@/services/api/tourAPI';
import { formatDate } from '@/lib/dateUtils';

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
  const now = Date.now();
  if (toursCache && now - lastFetchTimestamp < CACHE_DURATION) {
    return toursCache;
  }
  if (isFetchingTours) {
    return toursCache || [];
  }
  try {
    isFetchingTours = true;
    const tourData = await tourAPI.getAvailableTours();
    if (Array.isArray(tourData) && tourData.length > 0) {
      toursCache = tourData;
      lastFetchTimestamp = now;
      return tourData;
    }
    return [];
  } catch (error) {
    return [];
  } finally {
    isFetchingTours = false;
  }
};

// Function to load tour fares dynamically
export const loadTourFares = async (): Promise<TourFares> => {
  const now = Date.now();
  if (tourFaresCache && now - lastFetchTimestamp < CACHE_DURATION) {
    return tourFaresCache;
  }
  if (isFetchingTourFares) {
    return tourFaresCache || {};
  }
  try {
    isFetchingTourFares = true;
    const tourFareData = await tourAPI.getTourFares();
    const dynamicTourFares: TourFares = {};
    if (Array.isArray(tourFareData) && tourFareData.length > 0) {
      tourFareData.forEach((tour) => {
        if (tour && tour.tourId && tour.pricing) {
          dynamicTourFares[tour.tourId] = tour.pricing;
        }
      });
      tourFaresCache = dynamicTourFares;
      lastFetchTimestamp = now;
      return dynamicTourFares;
    }
    return {};
  } catch (error) {
    return {};
  } finally {
    isFetchingTourFares = false;
  }
};

// Function to get tour fare with fallback mechanism
export const getTourFare = (tourId: string, cabId: string): number => {
  if (!tourId || !cabId) return 0;
  if (tourFaresCache && tourFaresCache[tourId]) {
    const fare = tourFaresCache[tourId][cabId];
    if (typeof fare === 'number' && fare > 0) return fare;
  }
  return 0;
};
