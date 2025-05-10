
import { ReactNode, createContext, useContext, useEffect, useState, useCallback } from "react";
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
  const [manualRetryFlag, setManualRetryFlag] = useState(0);
  
  // Use provided apiKey or fallback to environment variable
  const googleMapsApiKey = apiKey || GOOGLE_MAPS_API_KEY;
  
  // Load the Google Maps script with India region bias
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey,
    libraries,
    region: 'IN', // Set region to India
    language: 'en',
  });

  // Retry loading function - can be called manually if needed
  const retryLoading = useCallback(() => {
    setRetryCount(prev => prev + 1);
    setManualRetryFlag(prev => prev + 1);
    
    // Try to reload the script via DOM
    try {
      const existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
      if (existingScripts.length === 0) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&callback=Function.prototype`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
        console.log("Manually injected Google Maps script");
      }
    } catch (error) {
      console.error("Failed to manually inject Google Maps script:", error);
    }
  }, [googleMapsApiKey]);

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
      
      // Auto-retry logic (only retry a few times to avoid infinite loops)
      if (retryCount < 3) {
        console.log(`Auto-retrying Google Maps load (attempt ${retryCount + 1})...`);
        const timer = setTimeout(() => {
          retryLoading();
        }, 3000); // Wait 3 seconds before retrying
        
        return () => clearTimeout(timer);
      } else if (retryCount === 3) {
        // Show toast notification after several failed attempts
        toast.error("Google Maps failed to load. Some features may not work correctly.");
      }
    }
  }, [isLoaded, loadError, retryCount, retryLoading]);
  
  // Check for window.google even if useLoadScript says it's not ready
  useEffect(() => {
    // Double-check if Google Maps is actually available despite load errors
    if (!isLoaded && window.google && window.google.maps) {
      console.log("Google Maps detected in window despite useLoadScript reporting not loaded");
      setGoogleInstance(window.google);
    }
  }, [isLoaded, manualRetryFlag]);

  // Provide context values - ensure we have a consistent value for the google object
  const contextValue = {
    isLoaded, 
    loadError,
    // Always use window.google as a fallback to ensure it's available even if state hasn't updated
    google: googleInstance || (isLoaded && window.google ? window.google : null),
    retryLoading
  };

  return (
    <GoogleMapsContext.Provider value={contextValue}>
      {children}
    </GoogleMapsContext.Provider>
  );
};

export default GoogleMapsProvider;
