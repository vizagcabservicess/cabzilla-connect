
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

  // Create hidden div for PlacesService and initialize it
  useEffect(() => {
    if (isLoaded && !mapCanvasInitialized && window.google?.maps) {
      console.log("Initializing Google Maps hidden canvas");
      try {
        const mapCanvas = createMapCanvas();
        
        if (mapCanvas) {
          initializeHiddenMap(mapCanvas);
          
          // Create autocomplete service immediately once map is initialized
          if (window.google.maps.places) {
            console.log("Creating Autocomplete service");
            new window.google.maps.places.AutocompleteService();
            new window.google.maps.places.PlacesService(mapCanvas);
          }
        }
        
        setMapCanvasInitialized(true);
        
        // Force Places API initialization with a slight delay
        setTimeout(() => forcePlacesInitialization(), 300);
      } catch (error) {
        console.error("Error initializing map canvas:", error);
      }
    }
  }, [isLoaded, mapCanvasInitialized]);

  // Store the google object once loaded and set default bounds
  useEffect(() => {
    if (isLoaded && !loadError && window.google) {
      console.log("Setting Google instance in context");
      setGoogleInstance(window.google);
      
      // Set default bounds for India if Maps loaded successfully
      setDefaultIndiaBounds();
      
      // Set global debug variables
      setGlobalDebugVariables();
      
      // Force another Places initialization a bit later if needed
      const timer = setTimeout(() => {
        try {
          if (window.google?.maps?.places && !window.google.maps.places.AutocompleteService) {
            console.log("Forcing places initialization again");
            forcePlacesInitialization();
          }
        } catch (error) {
          console.error("Error in delayed Places init:", error);
        }
      }, 1500);
      
      return () => clearTimeout(timer);
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
