import { Location } from "./locationData";
import { safeGetString } from "./safeStringUtils";

export interface DistanceResult {
  distance: number; // in kilometers
  duration: number; // in minutes
  status: "OK" | "FAILED";
}

// Default Vizag coordinates for fallback
const DEFAULT_LAT = 17.6868;
const DEFAULT_LNG = 83.2185;

// Cache for distance calculations to prevent redundant API calls
const distanceCache = new Map<string, DistanceResult>();

// Generate a cache key for two locations
const generateCacheKey = (origin: Location, destination: Location): string => {
  return `${origin.lat},${origin.lng}_${destination.lat},${destination.lng}`;
};

const generateRouteCacheKey = (points: Location[]): string => {
  return points.map((point) => `${point.lat},${point.lng}`).join('_');
};

// Function to fetch actual distance using Google Maps API directly
export async function calculateDistanceMatrix(
  origin: Location,
  destination: Location
): Promise<DistanceResult> {
  // Validate locations before proceeding
  const safeOrigin = validateLocation(origin);
  const safeDestination = validateLocation(destination);
  
  // Generate cache key for this location pair
  const cacheKey = generateCacheKey(safeOrigin, safeDestination);
  
  // Check if we have a cached result
  if (distanceCache.has(cacheKey)) {
    console.log('🔄 Using cached distance calculation result');
    return distanceCache.get(cacheKey)!;
  }
  
  console.log(`🔍 Calculating distance between: ${safeOrigin.name} → ${safeDestination.name}`);
  
  // Make sure Google Maps API is loaded
  if (typeof window.google === 'undefined' || !window.google.maps) {
    console.error("❌ Google Maps API not loaded yet");
    return fallbackDistanceCalculation(safeOrigin, safeDestination);
  }
  
  try {
    // Create a Distance Matrix Service instance
    const distanceService = new window.google.maps.DistanceMatrixService();
    
    // Request the distance
    const response = await new Promise<google.maps.DistanceMatrixResponse>((resolve, reject) => {
      distanceService.getDistanceMatrix(
        {
          origins: [{ lat: safeOrigin.lat, lng: safeOrigin.lng }],
          destinations: [{ lat: safeDestination.lat, lng: safeDestination.lng }],
          travelMode: window.google.maps.TravelMode.DRIVING,
          unitSystem: window.google.maps.UnitSystem.METRIC,
          avoidHighways: false,
          avoidTolls: false,
        },
        (response, status) => {
          if (status === 'OK') {
            resolve(response);
          } else {
            reject(new Error(`Distance Matrix request failed: ${status}`));
          }
        }
      );
    });
    
    // Extract distance and duration from the response
    if (
      response.rows &&
      response.rows.length > 0 &&
      response.rows[0].elements &&
      response.rows[0].elements.length > 0
    ) {
      const element = response.rows[0].elements[0];
      
      if (element.status === 'OK') {
        // Convert distance from meters to kilometers
        const distanceInKm = element.distance.value / 1000;
        // Convert duration from seconds to minutes
        const durationInMinutes = Math.ceil(element.duration.value / 60);
        
        console.log(`✅ Distance Matrix result: ${distanceInKm.toFixed(1)} km, ${durationInMinutes} minutes`);
        
        const result = {
          distance: Math.round(distanceInKm), // Round to nearest km
          duration: durationInMinutes,
          status: "OK" as const,
        };
        
        // Cache the result
        distanceCache.set(cacheKey, result);
        
        return result;
      }
    }
    
    // If we couldn't get a proper response, try direct route calculation as backup
    console.warn("⚠️ Distance Matrix failed, trying DirectionsService...");
    const result = await calculateDirectionsDistance(safeOrigin, safeDestination);
    
    // Cache the result
    distanceCache.set(cacheKey, result);
    
    return result;
    
  } catch (error) {
    console.error("❌ Error in Distance Matrix API:", error);
    try {
      // If Distance Matrix fails, try DirectionsService as a fallback
      const result = await calculateDirectionsDistance(safeOrigin, safeDestination);
      
      // Cache the result
      distanceCache.set(cacheKey, result);
      
      return result;
    } catch (directionsError) {
      console.error("❌ Both distance calculation methods failed:", directionsError);
      const result = fallbackDistanceCalculation(safeOrigin, safeDestination);
      
      // Cache the result even if it's a fallback
      distanceCache.set(cacheKey, result);
      
      return result;
    }
  }
}

// Secondary method using DirectionsService
async function calculateDirectionsDistance(
  origin: Location,
  destination: Location
): Promise<DistanceResult> {
  // Validate locations before proceeding
  const safeOrigin = validateLocation(origin);
  const safeDestination = validateLocation(destination);
  
  // Generate cache key for this location pair
  const cacheKey = generateCacheKey(safeOrigin, safeDestination);
  
  // Check if we have a cached result
  if (distanceCache.has(cacheKey)) {
    console.log('🔄 Using cached directions result');
    return distanceCache.get(cacheKey)!;
  }
  
  console.log("🗺️ Trying DirectionsService for distance calculation");
  
  try {
    const directionsService = new window.google.maps.DirectionsService();
    
    const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
      directionsService.route(
        {
          origin: { lat: safeOrigin.lat, lng: safeOrigin.lng },
          destination: { lat: safeDestination.lat, lng: safeDestination.lng },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (response, status) => {
          if (status === 'OK' && response) {
            resolve(response);
          } else {
            reject(new Error(`Directions request failed: ${status}`));
          }
        }
      );
    });
    
    if (result.routes && result.routes.length > 0 && result.routes[0].legs && result.routes[0].legs.length > 0) {
      const leg = result.routes[0].legs[0];
      const distanceInKm = leg.distance ? leg.distance.value / 1000 : 0;
      const durationInMinutes = leg.duration ? Math.ceil(leg.duration.value / 60) : 0;
      
      console.log(`✅ DirectionsService result: ${distanceInKm.toFixed(1)} km, ${durationInMinutes} minutes`);
      
      return {
        distance: Math.round(distanceInKm),
        duration: durationInMinutes,
        status: "OK",
      };
    }
    
    throw new Error("Invalid response from DirectionsService");
  } catch (error) {
    console.error("❌ Error in DirectionsService:", error);
    return fallbackDistanceCalculation(safeOrigin, safeDestination);
  }
}

// Treat (0,0) or missing coords as invalid so we never pass them to Google APIs
function hasValidCoordinates(loc: any): boolean {
  if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return false;
  if (isNaN(loc.lat) || isNaN(loc.lng)) return false;
  return !(loc.lat === 0 && loc.lng === 0);
}

// Function to validate and normalize location objects; preserves correct coordinates
function validateLocation(location: any): Location {
  if (!location) {
    console.warn("Invalid location provided for distance calculation, using default");
    return {
      id: `default_${Date.now()}`,
      name: 'Default Location',
      address: 'Visakhapatnam, Andhra Pradesh',
      city: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      lat: DEFAULT_LAT,
      lng: DEFAULT_LNG,
      type: 'other',
      popularityScore: 50
    };
  }

  const lat = hasValidCoordinates(location) ? location.lat : DEFAULT_LAT;
  const lng = hasValidCoordinates(location) ? location.lng : DEFAULT_LNG;

  return {
    id: typeof location.id === 'string' ? location.id : `loc_${Date.now()}`,
    name: safeGetString(location, 'name') || 'Unknown Location',
    address: safeGetString(location, 'address') || safeGetString(location, 'name') || 'Unknown Address',
    city: safeGetString(location, 'city') || 'Visakhapatnam',
    state: safeGetString(location, 'state') || 'Andhra Pradesh',
    lat,
    lng,
    type: typeof location.type === 'string' ? location.type as any : 'other',
    popularityScore: typeof location.popularityScore === 'number' ? location.popularityScore : 50
  };
}

// Fallback calculation function that uses the Haversine formula
function fallbackDistanceCalculation(
  origin: Location,
  destination: Location
): DistanceResult {
  console.log("📊 Using fallback distance calculation");
  
  const distance = getApproximateDistance(
    origin.lat, origin.lng,
    destination.lat, destination.lng
  );
  
  const duration = calculateEstimatedDuration(distance);
  
  return {
    distance,
    duration,
    status: "OK",
  };
}

/**
 * Sync road-distance estimate (Haversine × 1.3, rounded) when Distance Matrix
 * has not updated React state yet — same formula as {@link fallbackDistanceCalculation}.
 */
export function estimateRoadKmSync(
  origin: Location | null | undefined,
  destination: Location | null | undefined
): number {
  if (!origin || !destination) return 0;
  if (!hasValidCoordinates(origin) || !hasValidCoordinates(destination)) return 0;
  return getApproximateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
}

export function estimateRoadKmAlongRoute(points: Location[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    total += estimateRoadKmSync(points[i], points[i + 1]);
  }
  return total;
}

function sumFallbackRoute(points: Location[]): DistanceResult {
  let distance = 0;
  let duration = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const leg = fallbackDistanceCalculation(points[i], points[i + 1]);
    distance += leg.distance;
    duration += leg.duration;
  }
  return { distance, duration, status: 'OK' };
}

/** Pickup → optional stops → drop. Uses Directions when there are waypoints. */
export async function calculateRouteDistance(points: Location[]): Promise<DistanceResult> {
  if (points.length < 2) {
    return { distance: 0, duration: 0, status: 'FAILED' };
  }

  const safePoints = points.map((point) => validateLocation(point));
  if (safePoints.length === 2) {
    return calculateDistanceMatrix(safePoints[0], safePoints[1]);
  }

  const cacheKey = generateRouteCacheKey(safePoints);
  if (distanceCache.has(cacheKey)) {
    return distanceCache.get(cacheKey)!;
  }

  if (typeof window.google === 'undefined' || !window.google.maps) {
    const fallback = sumFallbackRoute(safePoints);
    distanceCache.set(cacheKey, fallback);
    return fallback;
  }

  try {
    const origin = safePoints[0];
    const destination = safePoints[safePoints.length - 1];
    const waypoints = safePoints.slice(1, -1).map((point) => ({
      location: { lat: point.lat, lng: point.lng },
      stopover: true,
    }));

    const directionsService = new window.google.maps.DirectionsService();
    const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
      directionsService.route(
        {
          origin: { lat: origin.lat, lng: origin.lng },
          destination: { lat: destination.lat, lng: destination.lng },
          waypoints,
          optimizeWaypoints: false,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (response, status) => {
          if (status === 'OK' && response) {
            resolve(response);
            return;
          }
          reject(new Error(`Directions request failed: ${status}`));
        }
      );
    });

    const legs = result.routes[0]?.legs ?? [];
    if (legs.length === 0) {
      throw new Error('Directions returned no legs');
    }

    const distanceInKm = legs.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0) / 1000;
    const durationInMinutes = Math.ceil(
      legs.reduce((sum, leg) => sum + (leg.duration?.value ?? 0), 0) / 60
    );
    const computed: DistanceResult = {
      distance: Math.round(distanceInKm),
      duration: durationInMinutes,
      status: 'OK',
    };
    distanceCache.set(cacheKey, computed);
    return computed;
  } catch (error) {
    console.error('❌ Multi-stop route calculation failed:', error);
    const fallback = sumFallbackRoute(safePoints);
    distanceCache.set(cacheKey, fallback);
    return fallback;
  }
}

// Haversine formula to calculate distance between two points on Earth
function getApproximateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  
  // Round to nearest km and add some buffer for road routes vs direct distance
  return Math.round(distance * 1.3);
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

function calculateEstimatedDuration(distanceInKm: number): number {
  // Assume average speed of 50 km/h
  const averageSpeedKmh = 50;
  const timeInHours = distanceInKm / averageSpeedKmh;
  return Math.round(timeInHours * 60); // Convert to minutes
}
