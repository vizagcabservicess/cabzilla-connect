
/**
 * Utility functions for safely handling string operations
 */

/**
 * Safely checks if a string contains a substring
 * Gracefully handles null, undefined, and non-string values
 * @param value Any value that might be a string
 * @param substring The substring to search for
 * @returns boolean indicating if the substring is found
 */
export function safeIncludes(value: any, substring: string): boolean {
  // Check if value is null, undefined, or not a string
  if (value === null || value === undefined || typeof value !== 'string') {
    return false;
  }
  
  // Ensure substring is a string and not null/undefined
  if (substring === null || substring === undefined || typeof substring !== 'string') {
    return false;
  }
  
  // Now safely perform the includes check
  return value.toLowerCase().includes(substring.toLowerCase());
}

/**
 * Safely converts a value to lowercase
 * @param value Any value that might be a string
 * @returns Lowercase string or empty string if input is invalid
 */
export function safeLowerCase(value: any): string {
  if (value === null || value === undefined || typeof value !== 'string') {
    return '';
  }
  return value.toLowerCase();
}

/**
 * Parse a value to a number, handling various input types
 * @param value Any value that might be convertible to a number
 * @param defaultValue Optional default value if parsing fails (defaults to 0)
 * @returns Numeric value or defaultValue if parsing fails
 */
export function parseNumericValue(value: any, defaultValue: number = 0): number {
  // If value is null, undefined, or empty string, return defaultValue
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  
  // Handle case where value is already a number
  if (typeof value === 'number') {
    return isNaN(value) ? defaultValue : value;
  }
  
  // Handle case where value is a string representing a number
  if (typeof value === 'string') {
    const parsedValue = parseFloat(value);
    return isNaN(parsedValue) ? defaultValue : parsedValue;
  }
  
  // Try to convert to number as a last resort
  const attemptNumber = Number(value);
  return isNaN(attemptNumber) ? defaultValue : attemptNumber;
}

/**
 * Safely gets a property from an object
 * @param obj The object to get the property from
 * @param prop The property name
 * @returns The property value or undefined
 */
export function safeGet(obj: any, prop: string): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return undefined;
  }
  return obj[prop];
}

/**
 * Safely extracts a string property from an object
 * @param obj The object to get the property from
 * @param prop The property name
 * @returns The property value as string or empty string
 */
export function safeGetString(obj: any, prop: string): string {
  const value = safeGet(obj, prop);
  if (value === null || value === undefined || typeof value !== 'string') {
    return '';
  }
  return value;
}

/**
 * Parse amenities from various input formats into a standardized array
 * @param amenities String, array, or comma-separated values
 * @returns Array of amenity strings
 */
export function parseAmenities(amenities: any): string[] {
  if (!amenities) {
    return [];
  }
  
  // If already an array, filter out any non-string or empty values
  if (Array.isArray(amenities)) {
    return amenities
      .filter(item => typeof item === 'string' && item.trim() !== '')
      .map(item => item.trim());
  }
  
  // If it's a string, split by commas and clean up
  if (typeof amenities === 'string') {
    return amenities
      .split(',')
      .map(item => item.trim())
      .filter(item => item !== '');
  }
  
  // For any other case, return empty array
  return [];
}
