
import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { useLoadScript } from "@react-google-maps/api";
import { toast } from "sonner";

// Environment variable for Google Maps API Key
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// Define libraries array as a constant to prevent unnecessary re-renders
const libraries = ["places"] as ["places"];

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
  const [hasShownAPIKeyError, setHasShownAPIKeyError] = useState(false);
  
  // Use provided apiKey or fallback to environment variable
  const googleMapsApiKey = apiKey || GOOGLE_MAPS_API_KEY;
  
  // Validate API key before attempting to load
  useEffect(() => {
    if (!googleMapsApiKey && !hasShownAPIKeyError) {
      console.error("No Google Maps API key provided");
      toast.error("Google Maps API key is missing. Some features may not work correctly.", {
        duration: 5000,
        id: "google-maps-api-key-missing",
      });
      setHasShownAPIKeyError(true);
    }
  }, [googleMapsApiKey, hasShownAPIKeyError]);
  
  // Load the Google Maps script with India region bias
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey,
    libraries,
    region: 'IN', // Set region to India
    language: 'en',
  });

  // Log loading status
  useEffect(() => {
    if (isLoaded) {
      console.log("Google Maps API loaded successfully");
    }
    if (loadError) {
      console.error("Error during Google Maps load:", loadError);
    }
  }, [isLoaded, loadError]);

  // Store the google object once loaded
  useEffect(() => {
    if (isLoaded && !loadError && window.google) {
      setGoogleInstance(window.google);
      console.log("✅ Google Maps API loaded successfully");
      
      // Set default bounds to India if Maps loaded successfully
      if (window.google.maps) {
        try {
          // Set default map options for all instances
          const indiaBounds = new window.google.maps.LatLngBounds(
            new window.google.maps.LatLng(8.0, 68.0),  // SW corner of India
            new window.google.maps.LatLng(37.0, 97.0)  // NE corner of India
          );
          
          // Store default bounds in window object for later use
          (window as any).indiaBounds = indiaBounds;
          
          console.log("Default India bounds set for Maps");
        } catch (error) {
          console.error("Error setting default bounds:", error);
        }
      }
    } else if (loadError) {
      console.error("❌ Error loading Google Maps API:", loadError);
      toast.error("Failed to load Google Maps. Please check your internet connection and refresh the page.", {
        duration: 5000,
        id: "google-maps-load-error",
      });
    }
  }, [isLoaded, loadError]);

  // Provide context values - ensure we have a consistent value for the google object
  const contextValue = {
    isLoaded, 
    loadError,
    // Always use window.google as a fallback to ensure it's available even if state hasn't updated
    google: googleInstance || (isLoaded && window.google ? window.google : null)
  };

  return (
    <GoogleMapsContext.Provider value={contextValue}>
      {children}
    </GoogleMapsContext.Provider>
  );
};

export default GoogleMapsProvider;
