
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

// Function to fetch actual distance using Google Maps API directly
export async function calculateDistanceMatrix(
  origin: Location,
  destination: Location
): Promise<DistanceResult> {
  // Validate locations before proceeding
  const safeOrigin = validateLocation(origin);
  const safeDestination = validateLocation(destination);
  
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
        
        return {
          distance: Math.round(distanceInKm), // Round to nearest km
          duration: durationInMinutes,
          status: "OK",
        };
      }
    }
    
    // If we couldn't get a proper response, try direct route calculation as backup
    console.warn("⚠️ Distance Matrix failed, trying DirectionsService...");
    return await calculateDirectionsDistance(safeOrigin, safeDestination);
    
  } catch (error) {
    console.error("❌ Error in Distance Matrix API:", error);
    try {
      // If Distance Matrix fails, try DirectionsService as a fallback
      return await calculateDirectionsDistance(safeOrigin, safeDestination);
    } catch (directionsError) {
      console.error("❌ Both distance calculation methods failed:", directionsError);
      return fallbackDistanceCalculation(safeOrigin, safeDestination);
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

// Function to validate and normalize location objects
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
  
  return {
    id: typeof location.id === 'string' ? location.id : `loc_${Date.now()}`,
    name: safeGetString(location, 'name') || 'Unknown Location',
    address: safeGetString(location, 'address') || safeGetString(location, 'name') || 'Unknown Address',
    city: safeGetString(location, 'city') || 'Visakhapatnam',
    state: safeGetString(location, 'state') || 'Andhra Pradesh',
    lat: typeof location.lat === 'number' && !isNaN(location.lat) ? location.lat : DEFAULT_LAT,
    lng: typeof location.lng === 'number' && !isNaN(location.lng) ? location.lng : DEFAULT_LNG,
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
