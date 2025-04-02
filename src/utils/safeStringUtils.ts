
/**
 * Parse a value as a number, with fallback to a default value if parsing fails
 * 
 * @param value The value to parse as a number
 * @param defaultValue The default value to use if parsing fails
 * @returns The parsed number or default value
 */
export function parseNumericValue(value: any, defaultValue: number): number {
  // If the value is already a number, return it
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  
  // If the value is a string, try to parse it
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const parsed = parseFloat(trimmed);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  
  // For any other case, return the default value
  return defaultValue;
}

/**
 * Parse amenities from various possible formats into a string array
 * 
 * @param amenities The amenities to parse
 * @returns An array of amenities as strings
 */
export function parseAmenities(amenities: any): string[] {
  // If it's already an array, just ensure it contains only strings
  if (Array.isArray(amenities)) {
    return amenities.filter(item => 
      item && (typeof item === 'string' || typeof item === 'number')
    ).map(item => String(item));
  }
  
  // If it's a string, try to split it
  if (typeof amenities === 'string') {
    // Check for common delimiters in the string
    if (amenities.includes(',')) {
      return amenities.split(',').map(s => s.trim()).filter(Boolean);
    } 
    else if (amenities.includes(';')) {
      return amenities.split(';').map(s => s.trim()).filter(Boolean);
    }
    else if (amenities.trim()) {
      // If no delimiters but not empty, treat as a single amenity
      return [amenities.trim()];
    }
  }
  
  // If it's an object (e.g., from JSON), try to extract values
  if (amenities && typeof amenities === 'object') {
    return Object.values(amenities)
      .filter(item => item && (typeof item === 'string' || typeof item === 'number'))
      .map(item => String(item));
  }
  
  // Default to empty array if nothing else worked
  return [];
}

/**
 * Safely convert a value to a boolean
 * 
 * @param value The value to convert to boolean
 * @param defaultValue The default value if conversion fails
 * @returns The boolean value
 */
export function parseBooleanValue(value: any, defaultValue: boolean = false): boolean {
  // Handle explicit boolean values
  if (typeof value === 'boolean') {
    return value;
  }
  
  // Handle numeric values (0 = false, anything else = true)
  if (typeof value === 'number') {
    return value !== 0;
  }
  
  // Handle string values
  if (typeof value === 'string') {
    const lowercased = value.toLowerCase().trim();
    
    // Handle common true/false strings
    if (['true', 'yes', 'y', '1', 'on'].includes(lowercased)) {
      return true;
    }
    
    if (['false', 'no', 'n', '0', 'off'].includes(lowercased)) {
      return false;
    }
  }
  
  // For null/undefined or other cases, return the default
  return defaultValue;
}
