
import { Location } from "./locationData";

export interface DistanceResult {
  distance: number; // in kilometers
  duration: number; // in minutes
  status: "OK" | "FAILED";
}

// Function to fetch actual distance using Google Maps API directly
export async function calculateDistanceMatrix(
  origin: Location,
  destination: Location
): Promise<DistanceResult> {
  console.log(`🔍 Calculating distance between: ${origin.name} → ${destination.name}`);
  
  // Make sure Google Maps API is loaded
  if (typeof window.google === 'undefined' || !window.google.maps) {
    console.error("❌ Google Maps API not loaded yet");
    return fallbackDistanceCalculation(origin, destination);
  }
  
  try {
    // Create a Distance Matrix Service instance
    const distanceService = new window.google.maps.DistanceMatrixService();
    
    // Request the distance
    const response = await new Promise<google.maps.DistanceMatrixResponse>((resolve, reject) => {
      distanceService.getDistanceMatrix(
        {
          origins: [{ lat: origin.lat, lng: origin.lng }],
          destinations: [{ lat: destination.lat, lng: destination.lng }],
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
    
    // If we couldn't get a proper response, use fallback
    console.warn("⚠️ Invalid Distance Matrix response, using fallback");
    return fallbackDistanceCalculation(origin, destination);
    
  } catch (error) {
    console.error("❌ Error in Distance Matrix API:", error);
    return fallbackDistanceCalculation(origin, destination);
  }
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
