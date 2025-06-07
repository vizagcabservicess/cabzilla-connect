
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
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      setError(new Error('Google Maps API key is required'));
      return;
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
        apiKey,
        version: 'weekly',
        libraries: ['places']
      });

      globalLoader.load()
        .then(() => {
          isLoadedGlobal = true;
          isLoading = false;
          setIsLoaded(true);
        })
        .catch((err) => {
          isLoading = false;
          setError(err);
          console.error('Error loading Google Maps:', err);
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
