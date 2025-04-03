
/**
 * Parse a potentially string or null numeric value to a number
 */
export function parseNumericValue(value: string | number | null | undefined, defaultValue: number): number {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  
  if (typeof value === 'number') {
    return isNaN(value) ? defaultValue : value;
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  
  return defaultValue;
}

/**
 * Parse amenities value which could be string, array or undefined
 */
export function parseAmenities(amenities: string | string[] | null | undefined): string[] {
  if (!amenities) {
    return ['AC'];
  }
  
  if (typeof amenities === 'string') {
    return amenities.split(',').map(item => item.trim()).filter(Boolean);
  }
  
  if (Array.isArray(amenities)) {
    return amenities.filter(Boolean);
  }
  
  return ['AC']; 
}

/**
 * Normalize vehicle ID to ensure consistency
 * Maps numeric IDs to their string counterparts and handles edge cases
 */
export function normalizeVehicleId(vehicleId: string | number | undefined | null): string {
  if (!vehicleId) {
    return 'sedan'; // Default to sedan if no ID is provided
  }
  
  // Convert to string and trim
  const idStr = String(vehicleId).trim();
  
  // Remove 'item-' prefix if present
  const normalizedId = idStr.startsWith('item-') ? idStr.substring(5) : idStr;
  
  // Map of known numeric IDs to their string counterparts
  const numericIdMap: Record<string, string> = {
    '1': 'sedan',
    '2': 'ertiga',
    '3': 'innova',
    '4': 'crysta',
    '5': 'tempo',
    '6': 'bus',
    '7': 'van',
    '8': 'suv',
    '9': 'traveller',
    '10': 'luxury',
    '180': 'etios',
    '592': 'urbania',
    '1266': 'mpv',
    '1270': 'mpv',
  };
  
  // If ID is numeric and in our map, use the mapped string version
  if (numericIdMap[normalizedId]) {
    return numericIdMap[normalizedId];
  }
  
  // Standardize known vehicle types to lowercase
  const knownTypes = ['sedan', 'ertiga', 'innova', 'crysta', 'tempo', 'bus', 'van', 
                      'suv', 'traveller', 'luxury', 'etios', 'urbania', 'mpv'];
                      
  const lowerCaseId = normalizedId.toLowerCase();
  for (const type of knownTypes) {
    if (lowerCaseId === type.toLowerCase()) {
      return type.toLowerCase();
    }
  }
  
  // For unknown IDs, return as is or default to sedan for numeric IDs
  return /^\d+$/.test(normalizedId) ? 'sedan' : normalizedId.toLowerCase();
}
