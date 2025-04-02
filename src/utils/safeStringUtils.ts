
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
