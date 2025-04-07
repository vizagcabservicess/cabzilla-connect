
/**
 * Calculate the surge multiplier based on the date/time
 * 
 * @param date The date to check for surge pricing
 * @returns The surge multiplier (e.g., 1.0 = no surge, 1.2 = 20% surge)
 */
export function getSurgeMultiplier(date?: Date): number {
  if (!date) {
    return 1.0; // No surge if no date provided
  }
  
  const hour = date.getHours();
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Surge during weekend mornings and evenings
  if ((day === 0 || day === 6) && (hour >= 7 && hour <= 10 || hour >= 17 && hour <= 21)) {
    return 1.15; // 15% surge on weekend rush hours
  }
  
  // Surge on weekday mornings and evenings (rush hour)
  if ((day >= 1 && day <= 5) && (hour >= 7 && hour <= 10 || hour >= 17 && hour <= 20)) {
    return 1.2; // 20% surge on weekday rush hours
  }
  
  // Surge for late night rides
  if (hour >= 22 || hour <= 5) {
    return 1.25; // 25% surge for late night/early morning
  }
  
  // No surge for normal hours
  return 1.0;
}
