
import { ReactNode, useEffect, useState, useRef } from "react";
import { useLoadScript } from "@react-google-maps/api";
import { toast } from "sonner";
import GoogleMapsContext from "../contexts/GoogleMapsContext";
import { 
  GOOGLE_MAPS_API_KEY, 
  MAPS_LIBRARIES,
  createMapCanvas,
  initializeHiddenMap,
  forcePlacesInitialization,
  setDefaultIndiaBounds,
  setGlobalDebugVariables
} from "../utils/googleMapsUtils";

// Provider props interface
interface GoogleMapsProviderProps {
  children: ReactNode;
  apiKey?: string;
}

// Provider component for Google Maps
export const GoogleMapsProvider = ({ children, apiKey }: GoogleMapsProviderProps) => {
  const [googleInstance, setGoogleInstance] = useState<typeof google | null>(null);
  const [hasShownAPIKeyError, setHasShownAPIKeyError] = useState(false);
  const [mapCanvasInitialized, setMapCanvasInitialized] = useState(false);
  const initializationAttempts = useRef(0);
  
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
    libraries: MAPS_LIBRARIES,
    region: 'IN', // Set region to India
    language: 'en',
    version: "weekly", // Use the latest weekly version
  });

  // Create hidden div for PlacesService
  useEffect(() => {
    if (isLoaded && !mapCanvasInitialized) {
      const mapCanvas = createMapCanvas();
      
      if (mapCanvas) {
        initializeHiddenMap(mapCanvas);
      }
      
      setMapCanvasInitialized(true);
    }
  }, [isLoaded, mapCanvasInitialized]);

  // Force Places API initialization
  useEffect(() => {
    if (isLoaded && !loadError) {
      // Give a short delay to ensure Google Maps is fully loaded
      setTimeout(() => forcePlacesInitialization(), 500);
    }
  }, [isLoaded, loadError]);

  // Log loading status
  useEffect(() => {
    if (isLoaded) {
      console.log("Google Maps API loaded successfully!");
    }
    if (loadError) {
      console.error("Error during Google Maps load:", loadError);
      toast.error("Failed to load Google Maps. Please check your API key and internet connection.", {
        duration: 5000,
        id: "google-maps-load-error",
      });
    }
  }, [isLoaded, loadError]);

  // Store the google object once loaded and set default bounds
  useEffect(() => {
    if (isLoaded && !loadError && window.google) {
      console.log("Setting Google instance in context", window.google);
      setGoogleInstance(window.google);
      
      // Set default bounds for India if Maps loaded successfully
      setDefaultIndiaBounds();
    }
  }, [isLoaded, loadError]);

  // Set global debug variables
  useEffect(() => {
    if (isLoaded) {
      setGlobalDebugVariables();
    }
  }, [isLoaded]);

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

// Re-export the hook for convenient usage
export { useGoogleMaps } from "../hooks/useGoogleMaps";

export default GoogleMapsProvider;
