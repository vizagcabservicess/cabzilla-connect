
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
