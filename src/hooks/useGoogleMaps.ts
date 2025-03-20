
import { useContext, useEffect, useState, useRef } from 'react';
import GoogleMapsContext from '../contexts/GoogleMapsContext';
import { createMapCanvas } from '../utils/googleMapsUtils';
import { toast } from 'sonner';

// Enhanced hook to use Google Maps context
export const useGoogleMaps = () => {
  const context = useContext(GoogleMapsContext);
  const [placesInitialized, setPlacesInitialized] = useState(false);
  const initializationAttempts = useRef(0);
  const MAX_ATTEMPTS = 8;  // Increased from 5 to 8
  const hasShownPlacesError = useRef(false);
  
  // Verify if places API is available
  useEffect(() => {
    const checkPlacesAvailability = () => {
      if (context.isLoaded && context.google) {
        try {
          // Check if Places API is available
          const placesAvailable = !!(
            context.google.maps && 
            context.google.maps.places && 
            context.google.maps.places.AutocompleteService
          );
          
          if (placesAvailable) {
            console.log("Places API is available in useGoogleMaps");
            setPlacesInitialized(true);
            hasShownPlacesError.current = false;
            return true;
          }
          
          // If Places API is not available, try to initialize it
          console.log("Places API not available, trying to initialize it");
          
          // Create a map canvas if not exists
          const mapCanvas = createMapCanvas();
          
          if (mapCanvas && context.google.maps) {
            try {
              // Initialize AutocompleteService
              if (context.google.maps.places) {
                new context.google.maps.places.AutocompleteService();
                new context.google.maps.places.PlacesService(mapCanvas);
                console.log("Successfully initialized Places services");
                setPlacesInitialized(true);
                hasShownPlacesError.current = false;
                return true;
              }
            } catch (error) {
              console.error("Failed to initialize Places services:", error);
            }
          }
          
          if (!hasShownPlacesError.current && initializationAttempts.current >= MAX_ATTEMPTS) {
            console.log("Showing Places API error message");
            toast.error("Location search might have limited functionality", {
              id: "places-api-error",
              duration: 3000
            });
            hasShownPlacesError.current = true;
          }
          
          return false;
        } catch (error) {
          console.error("Error checking Places API:", error);
          return false;
        }
      }
      return false;
    };
    
    const attemptInitialization = () => {
      const success = checkPlacesAvailability();
      
      if (!success && initializationAttempts.current < MAX_ATTEMPTS) {
        initializationAttempts.current++;
        console.log(`Retry Places initialization attempt ${initializationAttempts.current}/${MAX_ATTEMPTS}`);
        setTimeout(attemptInitialization, 800);
      }
    };
    
    // Retry immediately on context change
    if (context.isLoaded && context.google) {
      attemptInitialization();
    }
  }, [context.isLoaded, context.google]);
  
  // Return enhanced context
  return {
    ...context,
    placesInitialized: placesInitialized || !!(context.google?.maps?.places?.AutocompleteService)
  };
};

export default useGoogleMaps;
