
/**
 * Cache mechanism for fare calculations
 */

// Create cache for fare calculations
const fareCache: Record<string, { result: number, timestamp: number }> = {};
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

export const clearFareCache = (): void => {
  Object.keys(fareCache).forEach(key => {
    delete fareCache[key];
  });
  console.log("Fare cache cleared");
};

export const getCachedFare = (cacheKey: string): number | null => {
  const now = Date.now();
  if (fareCache[cacheKey] && now - fareCache[cacheKey].timestamp < CACHE_EXPIRY) {
    console.log(`Using cached fare: ₹${fareCache[cacheKey].result}`);
    return fareCache[cacheKey].result;
  }
  return null;
};

export const setCachedFare = (cacheKey: string, fare: number): void => {
  fareCache[cacheKey] = {
    result: Math.round(fare),
    timestamp: Date.now()
  };
};

export const generateFareCacheKey = (
  cabId: string,
  tripType: string,
  tripMode: string,
  hourlyPackage: string | undefined,
  distance: number,
  pickupDate?: Date,
  returnDate?: Date
): string => {
  return `${cabId}-${tripType}-${tripMode}-${hourlyPackage || 'none'}-${distance}-${pickupDate?.getTime() || 0}-${returnDate?.getTime() || 0}`;
};
