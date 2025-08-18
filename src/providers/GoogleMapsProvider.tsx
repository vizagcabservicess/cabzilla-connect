
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface GoogleMapsContextType {
  isLoaded: boolean;
  error: Error | null;
  google?: typeof window.google;
}

const GoogleMapsContext = createContext<GoogleMapsContextType | undefined>(undefined);

interface GoogleMapsProviderProps {
  children: React.ReactNode;
  apiKey: string;
}

// Global loader instance to prevent multiple loaders
let globalLoader: Loader | null = null;
let isLoading = false;
let isLoadedGlobal = false;

export function GoogleMapsProvider({ children, apiKey }: GoogleMapsProviderProps) {
  const [isLoaded, setIsLoaded] = useState(isLoadedGlobal);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Use the provided API key or fallback to the production key
    const finalApiKey = apiKey && apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY' && apiKey !== ''
      ? apiKey 
      : 'AIzaSyDqhYmgEp_DafM1jKJ8XHTgEdLXCg-fGy4';
    
    if (!finalApiKey) {
      setError(new Error('Google Maps API key is required'));
      return;
    }

    // Check if we're in a sandboxed iframe
    try {
      // Test if we can access parent window (indicates iframe)
      const isInIframe = window !== window.parent;
      if (isInIframe) {
        console.warn('Google Maps detected in iframe - checking sandbox permissions');
      }
    } catch (e) {
      console.warn('Google Maps may be in a sandboxed iframe');
    }

    // If already loaded globally, just update local state
    if (isLoadedGlobal) {
      setIsLoaded(true);
      return;
    }

    // If currently loading, wait for it to complete
    if (isLoading) {
      const checkLoading = setInterval(() => {
        if (isLoadedGlobal) {
          setIsLoaded(true);
          clearInterval(checkLoading);
        }
      }, 100);
      return () => clearInterval(checkLoading);
    }

    // Create loader only if it doesn't exist
    if (!globalLoader) {
      isLoading = true;
      globalLoader = new Loader({
        apiKey: finalApiKey,
        version: 'weekly',
        libraries: ['places'],
        // Add additional options to handle iframe issues
        mapIds: ['DEMO_MAP_ID'], // Optional: Add a map ID if you have one
      });

      globalLoader.load()
        .then(() => {
          isLoadedGlobal = true;
          isLoading = false;
          setIsLoaded(true);
          console.log('Google Maps loaded successfully');
        })
        .catch((err) => {
          isLoading = false;
          
          // Handle specific iframe sandbox errors
          if (err.message && err.message.includes('sandboxed')) {
            const sandboxError = new Error(
              'Google Maps cannot load due to iframe sandbox restrictions. ' +
              'Please ensure the iframe has allow-scripts permission or load the page directly.'
            );
            setError(sandboxError);
            console.error('Google Maps iframe sandbox error:', err);
          } else {
            setError(err);
            console.error('Error loading Google Maps:', err);
          }
        });
    }
  }, [apiKey]);

  const value = {
    isLoaded,
    error,
    google: (window as any).google
  };

  return (
    <GoogleMapsContext.Provider value={value}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

export function useGoogleMaps() {
  const context = useContext(GoogleMapsContext);
  if (context === undefined) {
    throw new Error('useGoogleMaps must be used within a GoogleMapsProvider');
  }
  return context;
}
