
import { useContext, useEffect, useState, useRef } from 'react';
import GoogleMapsContext from '../contexts/GoogleMapsContext';
import { createMapCanvas } from '../utils/googleMapsUtils';
import { toast } from 'sonner';

// Enhanced hook to use Google Maps context
export const useGoogleMaps = () => {
  const context = useContext(GoogleMapsContext);
  const [placesInitialized, setPlacesInitialized] = useState(false);
  const initializationAttempts = useRef(0);
  const MAX_ATTEMPTS = 5;
  
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
                return true;
              }
            } catch (error) {
              console.error("Failed to initialize Places services:", error);
              return false;
            }
          }
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
    
    attemptInitialization();
  }, [context.isLoaded, context.google]);
  
  // Return enhanced context
  return {
    ...context,
    placesInitialized: placesInitialized || !!(context.google?.maps?.places?.AutocompleteService)
  };
};

export default useGoogleMaps;
