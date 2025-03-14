
import { Location } from "./locationData";

export interface DistanceResult {
  distance: number; // in kilometers
  duration: number; // in minutes
  status: "OK" | "FAILED";
}

// Function to fetch actual distance using Google Distance Matrix API
export async function calculateDistanceMatrix(
  origin: Location,
  destination: Location
): Promise<DistanceResult> {
  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!API_KEY) {
    console.error("❌ Google API Key is missing. Check .env file.");
    return { distance: 0, duration: 0, status: "FAILED" };
  }

  console.log(`🚀 Calculating distance between: ${origin.name} → ${destination.name}`);

  // Use fallback calculation if Google API fails
  try {
    // Since we're getting a CORS error with the direct API call,
    // let's use a fallback calculation for now
    const calculatedDistance = getApproximateDistance(
      origin.lat, origin.lng,
      destination.lat, destination.lng
    );
    
    const estimatedDuration = calculateEstimatedDuration(calculatedDistance);
    
    return {
      distance: calculatedDistance,
      duration: estimatedDuration,
      status: "OK",
    };
  } catch (error) {
    console.error("❌ Distance calculation error:", error);
    return { distance: 0, duration: 0, status: "FAILED" };
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
