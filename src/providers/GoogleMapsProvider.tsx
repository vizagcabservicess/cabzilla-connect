
import { ReactNode, createContext, useContext, useEffect, useState, useCallback } from "react";
import { useLoadScript } from "@react-google-maps/api";
import { toast } from "sonner";

// Define libraries array as a constant to prevent unnecessary re-renders
const libraries = ["places"] as ["places"];

// Create a comprehensive context
interface GoogleMapsContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
  google: typeof google | null;
  retryLoading: () => void;
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
  google: null,
  retryLoading: () => {}
});

// Hook to use Google Maps context
export const useGoogleMaps = () => useContext(GoogleMapsContext);

// Provider component for Google Maps
export const GoogleMapsProvider = ({ children, apiKey }: GoogleMapsProviderProps) => {
  const [googleInstance, setGoogleInstance] = useState<typeof google | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [scriptLoadAttempted, setScriptLoadAttempted] = useState(false);
  
  // Check if Google Maps API is already loaded via script tag
  useEffect(() => {
    // Function to check if Google Maps is available
    const checkForGoogleMaps = () => {
      if (window.google && window.google.maps) {
        console.log("Google Maps already loaded via script tag");
        setGoogleInstance(window.google);
        return true;
      }
      return false;
    };
    
    // Check immediately
    if (checkForGoogleMaps()) {
      return;
    }
    
    // If not available, listen for the load event
    const handleGoogleMapsLoaded = () => {
      console.log("Google Maps load event detected");
      if (window.google && window.google.maps) {
        setGoogleInstance(window.google);
      }
    };
    
    // Listen for our custom event from main.tsx
    window.addEventListener('google-maps-loaded', handleGoogleMapsLoaded);
    
    // Set up an interval to check for Google Maps
    const interval = setInterval(checkForGoogleMaps, 1000);
    
    // Clean up
    return () => {
      clearInterval(interval);
      window.removeEventListener('google-maps-loaded', handleGoogleMapsLoaded);
    };
  }, []);

  // Retry loading function - can be called manually if needed
  const retryLoading = useCallback(() => {
    console.log("Retrying Google Maps loading...");
    setRetryCount(prev => prev + 1);
    
    // Check if script already exists in DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (!existingScript) {
      console.log("No Google Maps script found, relying on script in index.html");
    } else {
      console.log("Google Maps script already exists in DOM");
    }
  }, []);

  // Provide context values
  const contextValue = {
    isLoaded: !!googleInstance, 
    loadError: googleInstance ? undefined : new Error("Google Maps not loaded"),
    google: googleInstance,
    retryLoading
  };

  return (
    <GoogleMapsContext.Provider value={contextValue}>
      {children}
    </GoogleMapsContext.Provider>
  );
};

export default GoogleMapsProvider;
