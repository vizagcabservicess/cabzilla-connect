import { Location } from "./locationData";

export interface DistanceResult {
  distance: number; // in kilometers
  duration: number; // in minutes
  status: "OK" | "FAILED";
}

// Ensure API Key is properly loaded
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// ✅ Function to fetch actual distance using Google Distance Matrix API
export async function calculateDistanceMatrix(
  origin: Location,
  destination: Location
): Promise<DistanceResult> {
  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!API_KEY) {
    console.error("❌ Google API Key is missing. Check .env file.");
    return { distance: 0, duration: 0, status: "FAILED" };
  }

  console.log(`🚀 Fetching distance from API: ${origin.name} → ${destination.name}`);

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&key=${API_KEY}`
    );

    const data = await response.json();
    console.log("✅ Google API Response:", data);

    if (data.status === "OK" && data.rows[0].elements[0].status === "OK") {
      return {
        distance: data.rows[0].elements[0].distance.value / 1000, // Convert meters to KM
        duration: Math.round(data.rows[0].elements[0].duration.value / 60),
        status: "OK",
      };
    } else {
      console.error("❌ Google API Error:", data);
      return { distance: 0, duration: 0, status: "FAILED" };
    }
  } catch (error) {
    console.error("❌ Google Distance Matrix API error:", error);
    return { distance: 0, duration: 0, status: "FAILED" };
  }
}
