
import { useCallback, useRef } from 'react';
import { createMapCanvas } from '@/utils/googleMapsUtils';

/**
 * Hook for getting place details
 */
export function usePlaceDetails(google: typeof window.google | undefined) {
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  
  const getPlaceDetails = useCallback((placeId: string): Promise<google.maps.places.PlaceResult> => {
    return new Promise((resolve, reject) => {
      // If Places service is not initialized, try to initialize it on-demand
      if (!placesServiceRef.current && google?.maps?.places) {
        const mapCanvas = createMapCanvas();
        if (mapCanvas) {
          try {
            placesServiceRef.current = new google.maps.places.PlacesService(mapCanvas);
          } catch (error) {
            console.error("Failed to initialize Places service on-demand:", error);
          }
        }
      }
      
      if (!placesServiceRef.current) {
        reject(new Error('Places service not initialized'));
        return;
      }
      
      placesServiceRef.current.getDetails(
        {
          placeId,
          fields: ['name', 'formatted_address', 'geometry', 'address_components']
        },
        (result, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && result) {
            resolve(result);
          } else {
            console.error("Places detail request failed with status:", status);
            reject(new Error(`Places detail request failed: ${status}`));
          }
        }
      );
    });
  }, [google]);

  return {
    getPlaceDetails,
    placesServiceRef
  };
}
