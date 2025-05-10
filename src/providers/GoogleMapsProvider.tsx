
import { ReactNode, createContext, useContext, useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

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
  
  // Check if Google Maps API is already loaded via script tag
  useEffect(() => {
    // Function to check if Google Maps is available
    const checkForGoogleMaps = () => {
      if (window.google && window.google.maps) {
        console.log("Google Maps API detected");
        setGoogleInstance(window.google);
        return true;
      }
      return false;
    };
    
    // Check immediately
    if (checkForGoogleMaps()) {
      return;
    }
    
    // Listen for our custom event from main.tsx
    const handleGoogleMapsLoaded = () => {
      console.log("Google Maps load event detected");
      if (window.google && window.google.maps) {
        setGoogleInstance(window.google);
      }
    };
    
    // Listen for our custom event from main.tsx
    window.addEventListener('google-maps-loaded', handleGoogleMapsLoaded);
    
    // Check periodically (every 2 seconds)
    const interval = setInterval(() => {
      if (checkForGoogleMaps()) {
        clearInterval(interval);
      }
    }, 2000);
    
    // Clean up
    return () => {
      clearInterval(interval);
      window.removeEventListener('google-maps-loaded', handleGoogleMapsLoaded);
    };
  }, [retryCount]);

  // Retry loading function - can be called manually if needed
  const retryLoading = useCallback(() => {
    console.log("Retrying Google Maps loading...");
    setRetryCount(prev => prev + 1);
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
