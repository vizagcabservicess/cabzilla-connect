
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
        console.log("GoogleMapsProvider: Google Maps API detected in window object");
        setGoogleInstance(window.google);
        setLoadError(undefined);
        return true;
      }
      return false;
    };
    
    // Check immediately
    if (checkForGoogleMaps()) {
      console.log("GoogleMapsProvider: Google Maps API found immediately");
      return;
    }
    
    // Listen for our custom event from the script tag callback
    const handleGoogleMapsLoaded = () => {
      console.log("GoogleMapsProvider: Google Maps loaded event detected");
      // Add a small delay to ensure the Google object is fully initialized
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
    
    // Add event listener
    window.addEventListener('google-maps-loaded', handleGoogleMapsLoaded);
    
    // Check periodically (every 1.5 seconds) for a limited time
    const maxChecks = 10;
    let checkCount = 0;
    
    const interval = setInterval(() => {
      checkCount++;
      if (checkForGoogleMaps()) {
        console.log(`GoogleMapsProvider: Found Google Maps on check #${checkCount}`);
        clearInterval(interval);
      } else if (checkCount >= maxChecks) {
        console.error("GoogleMapsProvider: Timed out waiting for Google Maps");
        clearInterval(interval);
        setLoadError(new Error("Timed out waiting for Google Maps API to load"));
      }
    }, 1500);
    
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
    setLoadError(undefined);
    
    // Remove old script and create a new one
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

  // Log the loaded state for debugging
  useEffect(() => {
    console.log(`GoogleMapsProvider: Maps loaded state: ${!!googleInstance}`);
  }, [googleInstance]);

  return (
    <GoogleMapsContext.Provider value={contextValue}>
      {children}
    </GoogleMapsContext.Provider>
  );
};

export default GoogleMapsProvider;
