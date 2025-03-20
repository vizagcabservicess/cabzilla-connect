
/**
 * Helper function to calculate distance between two coordinates
 */
export function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
}

/**
 * Convert degrees to radians
 */
export function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}

/**
 * Get initial input value from different location types
 */
export function getInitialInputValue(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  
  // Handle Location type
  if ('address' in value) {
    return value.name || value.address || '';
  }
  
  // Handle AutocompletePrediction type
  if ('description' in value) {
    return value.description;
  }
  
  return '';
}
