
/**
 * Utility functions for safely handling strings
 * These help avoid TypeScript errors when dealing with potentially undefined values
 */

/**
 * Safely trims a string, handling undefined, null, or non-string values
 * @param str The string to trim
 * @returns Trimmed string or empty string if input is invalid
 */
export const safeTrim = (str: unknown): string => {
  if (typeof str !== 'string') return '';
  return str.trim();
};

/**
 * Safely splits a string, handling undefined, null, or non-string values
 * @param str The string to split
 * @param separator The separator to use for splitting
 * @returns Array of string segments or empty array if input is invalid
 */
export const safeSplit = (str: unknown, separator: string): string[] => {
  if (typeof str !== 'string') return [];
  return str.split(separator);
};

/**
 * Safely converts amenities data to a string array
 * @param amenities Amenities data which could be string, array, or undefined
 * @returns Processed array of amenities strings
 */
export const parseAmenities = (amenities: unknown): string[] => {
  if (Array.isArray(amenities)) {
    return amenities.filter(Boolean).map(a => 
      typeof a === 'string' ? a.trim() : String(a)
    );
  }
  
  if (typeof amenities === 'string' && amenities) {
    return amenities.split(',')
      .map(a => a.trim())
      .filter(Boolean);
  }
  
  return ['AC'];
};

/**
 * Safely parses a numeric value from various input types
 * @param value The value to parse as a number
 * @param defaultValue Default value if parsing fails
 * @returns Parsed number or default value
 */
export const parseNumericValue = (
  value: unknown, 
  defaultValue: number = 0
): number => {
  if (value === undefined || value === null) return defaultValue;
  
  if (typeof value === 'number') return value;
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  
  return defaultValue;
};

/**
 * Safely ensures a value is a boolean
 * @param value The value to convert to boolean
 * @param defaultValue Default value if conversion is ambiguous
 * @returns Boolean value
 */
export const ensureBoolean = (
  value: unknown, 
  defaultValue: boolean = true
): boolean => {
  if (typeof value === 'boolean') return value;
  
  if (value === 0 || value === '0' || 
      value === 'false' || value === 'no') {
    return false;
  }
  
  if (value === 1 || value === '1' || 
      value === 'true' || value === 'yes') {
    return true;
  }
  
  return defaultValue;
};
