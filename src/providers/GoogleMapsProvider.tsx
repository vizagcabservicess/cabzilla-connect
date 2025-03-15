
import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { useLoadScript } from "@react-google-maps/api";

// Environment variable for Google Maps API Key
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// Libraries to load with correct typing
const libraries: ["places"] = ["places"];

// Create a more comprehensive context
interface GoogleMapsContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
  google: typeof google | null;
}

// Provider props interface
interface GoogleMapsProviderProps {
  children: ReactNode;
  apiKey?: string;
}

// Context for Google Maps
const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: undefined,
  google: null
});

// Hook to use Google Maps context
export const useGoogleMaps = () => useContext(GoogleMapsContext);

// Provider component for Google Maps
export const GoogleMapsProvider = ({ children, apiKey }: GoogleMapsProviderProps) => {
  const [googleInstance, setGoogleInstance] = useState<typeof google | null>(null);
  
  // Use provided apiKey or fallback to environment variable
  const googleMapsApiKey = apiKey || GOOGLE_MAPS_API_KEY;
  
  // Load the Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey,
    libraries,
  });

  // Store the google object once loaded
  useEffect(() => {
    if (isLoaded && !loadError && window.google) {
      setGoogleInstance(window.google);
      console.log("✅ Google Maps API loaded successfully");
    }
  }, [isLoaded, loadError]);

  // Log load status
  useEffect(() => {
    if (loadError) {
      console.error("❌ Error loading Google Maps API:", loadError);
    }
  }, [loadError]);

  // Provide context values
  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError, google: googleInstance }}>
      {children}
    </GoogleMapsContext.Provider>
  );
};

export default GoogleMapsProvider;
