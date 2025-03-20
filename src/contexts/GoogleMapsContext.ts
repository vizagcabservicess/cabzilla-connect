
import { createContext } from "react";

// Define the context type
export interface GoogleMapsContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
  google: typeof google | null;
}

// Create context with default values
const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: undefined,
  google: null
});

export default GoogleMapsContext;
