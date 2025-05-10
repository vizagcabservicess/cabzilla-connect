
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
  
  // Check if Google Maps API is already loaded via script tag
  useEffect(() => {
    console.log("GoogleMapsProvider: Initializing Google Maps check");
    
    // Function to check if Google Maps is available and store it
    const checkForGoogleMaps = () => {
      if (window.google && window.google.maps) {
        console.log("GoogleMapsProvider: Google Maps API detected");
        setGoogleInstance(window.google);
        setLoadError(undefined);
        return true;
      }
      return false;
    };
    
    // Check immediately
    if (checkForGoogleMaps()) {
      return;
    }
    
    // Listen for our custom event from the script tag callback
    const handleGoogleMapsLoaded = () => {
      console.log("GoogleMapsProvider: Google Maps loaded event detected");
      if (window.google && window.google.maps) {
        setGoogleInstance(window.google);
        setLoadError(undefined);
        console.log("GoogleMapsProvider: Google Maps instance saved");
      } else {
        console.error("GoogleMapsProvider: Event fired but Google Maps not available");
        setLoadError(new Error("Google Maps API event fired but maps not available"));
      }
    };
    
    // Add event listener
    window.addEventListener('google-maps-loaded', handleGoogleMapsLoaded);
    
    // Check periodically (every 2 seconds) for a limited time
    const maxChecks = 10;
    let checkCount = 0;
    
    const interval = setInterval(() => {
      checkCount++;
      if (checkForGoogleMaps() || checkCount >= maxChecks) {
        clearInterval(interval);
        
        if (checkCount >= maxChecks && !window.google?.maps) {
          console.error("GoogleMapsProvider: Timed out waiting for Google Maps");
          setLoadError(new Error("Timed out waiting for Google Maps API to load"));
        }
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
    console.log("GoogleMapsProvider: Retrying Google Maps loading...");
    setRetryCount(prev => prev + 1);
    
    // Create a new script tag to reload the API
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log("GoogleMapsProvider: Removing existing Google Maps script");
      existingScript.remove();
    }
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey || 'AIzaSyDqhYmgEp_DafM1jKJ8XHTgEdLXCg-fGy4'}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    
    toast.info("Reloading Google Maps API...", {
      duration: 3000,
    });
  }, [apiKey]);

  // Provide context values
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
