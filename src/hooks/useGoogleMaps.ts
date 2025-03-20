
import { useContext, useEffect, useState } from 'react';
import GoogleMapsContext from '../contexts/GoogleMapsContext';
import { createMapCanvas } from '../utils/googleMapsUtils';
import { toast } from 'sonner';

// Enhanced hook to use Google Maps context
export const useGoogleMaps = () => {
  const context = useContext(GoogleMapsContext);
  const [placesInitialized, setPlacesInitialized] = useState(false);
  
  // Verify if places API is available
  useEffect(() => {
    if (context.isLoaded && context.google) {
      try {
        // Check if Places API is available
        const placesAvailable = !!(
          context.google.maps && 
          context.google.maps.places && 
          context.google.maps.places.AutocompleteService
        );
        
        setPlacesInitialized(placesAvailable);
        
        // If Places API is not available, try to initialize it
        if (!placesAvailable) {
          console.log("Places API not available, trying to initialize it");
          
          // Create a map canvas if not exists
          const mapCanvas = createMapCanvas();
          
          if (mapCanvas && context.google.maps) {
            try {
              // Initialize AutocompleteService
              if (context.google.maps.places) {
                new context.google.maps.places.AutocompleteService();
                new context.google.maps.places.PlacesService(mapCanvas);
                setPlacesInitialized(true);
              }
            } catch (error) {
              console.error("Failed to initialize Places services:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error checking Places API:", error);
      }
    }
  }, [context.isLoaded, context.google]);
  
  // Return enhanced context
  return {
    ...context,
    placesInitialized
  };
};

export default useGoogleMaps;
