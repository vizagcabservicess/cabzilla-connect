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
 * Safely parse a numeric value from a string or other input
 * Returns a number or 0 if the input is not a valid number
 */
export const parseNumericValue = (value: any): number => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  
  // If it's already a number, return it
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  
  // Otherwise try to parse it as a string
  try {
    const stringValue = String(value);
    // Remove all non-numeric characters except decimal points and minus signs
    const cleanedValue = stringValue.replace(/[^\d.-]/g, '');
    const parsedValue = parseFloat(cleanedValue);
    
    return isNaN(parsedValue) ? 0 : parsedValue;
  } catch (e) {
    console.error('Error parsing numeric value:', e);
    return 0;
  }
};

/**
 * Format a number as currency
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Format a numeric value for display in an input field
 */
export const formatNumericInput = (value: number): string => {
  if (value === 0) return '';
  return String(value);
};

/**
 * Ensure a value is a string
 */
export const ensureString = (value: any): string => {
  if (value === null || value === undefined) {
    return '';
  }
  
  return String(value);
};

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
};

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
