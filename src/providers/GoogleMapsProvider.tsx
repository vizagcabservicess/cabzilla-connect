
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
  const [loadError, setLoadError] = useState<Error | undefined>(undefined);
  const [retryCount, setRetryCount] = useState(0);
  
  // Initialize Google Maps check
  useEffect(() => {
    console.log("GoogleMapsProvider: Initializing Google Maps check");
    
    const checkForGoogleMaps = () => {
      if (window.google && window.google.maps) {
        console.log("GoogleMapsProvider: Google Maps API detected in window object");
        setGoogleInstance(window.google);
        setLoadError(undefined);
        return true;
      }
      return false;
    };
    
    // Check immediately (might already be loaded in the page)
    if (checkForGoogleMaps()) {
      return;
    }
    
    // Listen for our custom event from the script tag callback
    const handleGoogleMapsLoaded = () => {
      console.log("GoogleMapsProvider: Google Maps loaded event detected");
      setTimeout(() => {
        if (window.google && window.google.maps) {
          console.log("GoogleMapsProvider: Setting Google Maps instance after event");
          setGoogleInstance(window.google);
          setLoadError(undefined);
        } else {
          console.error("GoogleMapsProvider: Event fired but Google Maps not available");
          setLoadError(new Error("Google Maps API event fired but maps not available"));
        }
      }, 100);
    };
    
    // Add event listener for our custom event
    window.addEventListener('google-maps-loaded', handleGoogleMapsLoaded);
    
    // Check periodically for a limited time
    const maxChecks = 10;
    let checkCount = 0;
    
    const interval = setInterval(() => {
      checkCount++;
      if (checkForGoogleMaps()) {
        clearInterval(interval);
      } else if (checkCount >= maxChecks) {
        clearInterval(interval);
        setLoadError(new Error("Timed out waiting for Google Maps API to load"));
      }
    }, 1000);
    
    // Clean up
    return () => {
      clearInterval(interval);
      window.removeEventListener('google-maps-loaded', handleGoogleMapsLoaded);
    };
  }, [retryCount]);
  
  // Retry loading function
  const retryLoading = useCallback(() => {
    console.log("GoogleMapsProvider: Retrying Google Maps loading...");
    setRetryCount(prev => prev + 1);
    setLoadError(undefined);
    
    toast.info("Reloading Google Maps API...", {
      duration: 3000,
    });
  }, []);
  
  // Context value
  const contextValue = {
    isLoaded: !!googleInstance, 
    loadError: loadError,
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
