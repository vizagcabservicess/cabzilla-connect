
// Mock distance calculation service
export const getDistance = async (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<number> => {
  // Simple Haversine formula for distance calculation
  const R = 6371; // Earth's radius in kilometers
  const dLat = (toLat - fromLat) * Math.PI / 180;
  const dLng = (toLng - fromLng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(fromLat * Math.PI / 180) * Math.cos(toLat * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return Math.round(distance);
};

// Mock function for getting travel time
export const getTravelTime = async (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<number> => {
  const distance = await getDistance(fromLat, fromLng, toLat, toLng);
  // Assuming average speed of 60 km/h
  return Math.round((distance / 60) * 60); // Return time in minutes
};

// Calculate distance matrix between two locations
export const calculateDistanceMatrix = async (
  pickup: any,
  dropoff: any
): Promise<{ status: string; distance: number; duration: number }> => {
  try {
    // Extract coordinates from location objects
    const fromLat = pickup.lat || pickup.latitude || 17.6868;
    const fromLng = pickup.lng || pickup.longitude || 83.2185;
    const toLat = dropoff.lat || dropoff.latitude || 17.7231;
    const toLng = dropoff.lng || dropoff.longitude || 83.3012;

    const distance = await getDistance(fromLat, fromLng, toLat, toLng);
    const duration = await getTravelTime(fromLat, fromLng, toLat, toLng);

    return {
      status: "OK",
      distance,
      duration
    };
  } catch (error) {
    console.error("Error calculating distance matrix:", error);
    return {
      status: "ERROR",
      distance: 0,
      duration: 0
    };
  }
};
