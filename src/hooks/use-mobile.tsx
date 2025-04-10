
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    // Set initial value
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    
    // Create handler for window resize
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Use modern event listener
    window.addEventListener("resize", handleResize)
    
    // Cleanup event listener on component unmount
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return isMobile
}

/**
 * Safely get and parse a value from session storage
 * @param key The key to retrieve from session storage
 * @param defaultValue The default value to return if parsing fails
 * @returns The parsed value or default value
 */
export function safeGetFromSession<T>(key: string, defaultValue: T): T {
  try {
    const value = sessionStorage.getItem(key);
    if (value === null) return defaultValue;
    
    // If the value is a simple string that doesn't represent JSON
    // return it directly for string type
    if (typeof defaultValue === 'string' && 
        typeof value === 'string' && 
        !value.startsWith('{') && 
        !value.startsWith('[')) {
      return value as unknown as T;
    }
    
    try {
      // Try to parse as JSON
      return JSON.parse(value) as T;
    } catch (parseError) {
      // If parsing fails but the default value type matches the stored value type,
      // return the value directly
      if (typeof value === typeof defaultValue) {
        return value as unknown as T;
      }
      
      console.error(`Error parsing ${key} from session storage:`, parseError);
      return defaultValue;
    }
  } catch (e) {
    console.error(`Error loading ${key} from session storage:`, e);
    return defaultValue;
  }
}

/**
 * Safely store a value in session storage
 * @param key The key to store in session storage
 * @param value The value to store
 */
export function safeSetInSession(key: string, value: any): void {
  try {
    if (value === undefined || value === null) {
      // Remove item if value is null or undefined
      sessionStorage.removeItem(key);
      return;
    }
    
    // If the value is a simple primitive, store it directly
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sessionStorage.setItem(key, value.toString());
    } else {
      // For objects and arrays, use JSON.stringify
      sessionStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {
    console.error(`Error saving ${key} to session storage:`, e);
  }
}
