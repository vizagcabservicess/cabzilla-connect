
import { ReactNode, createContext, useContext, useEffect, useState, useRef } from "react";
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
    libraries,
    region: 'IN', // Set region to India
    language: 'en',
    version: "weekly", // Use the latest weekly version
  });

  // Create hidden div for PlacesService
  useEffect(() => {
    if (isLoaded && !mapCanvasInitialized) {
      if (!document.getElementById('map-canvas')) {
        console.log("Creating hidden map-canvas element for PlacesService");
        const mapCanvas = document.createElement('div');
        mapCanvas.id = 'map-canvas';
        mapCanvas.style.display = 'none';
        mapCanvas.style.height = '200px';
        mapCanvas.style.width = '200px';
        document.body.appendChild(mapCanvas);
        
        // Initialize a map on this hidden canvas to fully activate the Places API
        if (window.google && window.google.maps) {
          try {
            new window.google.maps.Map(mapCanvas as HTMLDivElement, {
              center: { lat: 17.6868, lng: 83.2185 }, // Visakhapatnam coordinates
              zoom: 13,
              disableDefaultUI: true,
            });
            console.log("Hidden map initialized for Places API");
          } catch (e) {
            console.error("Failed to initialize hidden map:", e);
          }
        }
      }
      setMapCanvasInitialized(true);
    }
  }, [isLoaded, mapCanvasInitialized]);

  // Force Places API initialization
  useEffect(() => {
    const forcePlacesInitialization = () => {
      if (window.google && window.google.maps) {
        try {
          // These calls will force the Places library to load properly
          new window.google.maps.places.AutocompleteService();
          
          if (document.getElementById('map-canvas')) {
            const placesService = new window.google.maps.places.PlacesService(
              document.getElementById('map-canvas') as HTMLDivElement
            );
            // Make a simple request to ensure the service is initialized
            placesService.nearbySearch(
              {
                location: { lat: 17.6868, lng: 83.2185 }, // Visakhapatnam
                radius: 500,
                type: "transit_station"
              },
              (results, status) => {
                console.log("Places API initialization status:", status);
              }
            );
          }
          
          console.log("Places API initialized successfully");
          initializationAttempts.current = 0; // Reset counter on success
        } catch (error) {
          console.error("Error initializing Places API:", error);
          
          // Retry initialization if not too many attempts
          if (initializationAttempts.current < 3) {
            initializationAttempts.current++;
            console.log(`Retrying Places API initialization (attempt ${initializationAttempts.current}/3)...`);
            setTimeout(forcePlacesInitialization, 1000);
          }
        }
      }
    };
    
    if (isLoaded && !loadError) {
      // Give a short delay to ensure Google Maps is fully loaded
      setTimeout(forcePlacesInitialization, 500);
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

  // Store the google object once loaded
  useEffect(() => {
    if (isLoaded && !loadError && window.google) {
      console.log("Setting Google instance in context", window.google);
      setGoogleInstance(window.google);
      
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
    }
  }, [isLoaded, loadError]);

  // Create a function to check if Places API is available
  const checkPlacesApiAvailability = () => {
    if (window.google && window.google.maps && window.google.maps.places) {
      return true;
    }
    return false;
  };

  // Make Places API available as a global variable for debugging
  useEffect(() => {
    if (isLoaded && window.google && window.google.maps) {
      (window as any).googleMapsLoaded = true;
      (window as any).googlePlacesAvailable = checkPlacesApiAvailability();
      console.log("Google Maps loaded status set on window object");
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

export default GoogleMapsProvider;
