
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
