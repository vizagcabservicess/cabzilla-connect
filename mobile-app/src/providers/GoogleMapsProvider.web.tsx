/**
 * Web implementation - loads Google Maps JS SDK via @googlemaps/js-api-loader.
 * Same approach as web app - no proxy, real Google Maps API.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface GoogleMapsContextType {
  isLoaded: boolean;
  error: Error | null;
  google?: typeof window.google;
}

const GoogleMapsContext = createContext<GoogleMapsContextType | undefined>(undefined);

let globalLoaded = false;
let globalLoading = false;

export function GoogleMapsProvider({
  children,
  apiKey,
}: {
  children: React.ReactNode;
  apiKey: string;
}) {
  const [isLoaded, setIsLoaded] = useState(globalLoaded);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY' || apiKey === '') {
      setError(new Error('Google Maps API key is required. Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY.'));
      return;
    }

    if (globalLoaded) {
      setIsLoaded(true);
      return;
    }

    if (globalLoading) {
      const id = setInterval(() => {
        if (globalLoaded) {
          setIsLoaded(true);
          clearInterval(id);
        }
      }, 100);
      return () => clearInterval(id);
    }

    globalLoading = true;
    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places'],
    });

    loader
      .load()
      .then(() => {
        globalLoaded = true;
        globalLoading = false;
        setIsLoaded(true);
      })
      .catch((err) => {
        globalLoading = false;
        setError(err);
      });

    return () => {};
  }, [apiKey]);

  const value: GoogleMapsContextType = {
    isLoaded,
    error,
    google: typeof window !== 'undefined' ? (window as any).google : undefined,
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
    throw new Error('useGoogleMaps must be used within GoogleMapsProvider');
  }
  return context;
}
