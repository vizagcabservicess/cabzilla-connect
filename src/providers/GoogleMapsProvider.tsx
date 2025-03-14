
import { ReactNode, createContext, useContext } from "react";
import { useLoadScript } from "@react-google-maps/api";

// Environment variable for Google Maps API Key
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// Libraries to load - use the correct type
const libraries = ["places"] as ["places"];

// Context for Google Maps
const GoogleMapsContext = createContext<{
  isLoaded: boolean;
  loadError: Error | undefined;
}>({
  isLoaded: false,
  loadError: undefined,
});

// Hook to use Google Maps context
export const useGoogleMaps = () => useContext(GoogleMapsContext);

// Provider component for Google Maps
export const GoogleMapsProvider = ({ children }: { children: ReactNode }) => {
  // Load the Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // Log load status
  if (loadError) {
    console.error("Error loading Google Maps API:", loadError);
  }

  // Provide context values
  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  );
};

export default GoogleMapsProvider;
