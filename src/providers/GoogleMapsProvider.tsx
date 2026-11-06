
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
let startGoogleMapsLoad: (() => void) | null = null;
let mapsStartRequested = false;

/** Start the Maps script. Safe to call more than once. Queues until the provider is mounted. */
export function requestGoogleMaps(): void {
  mapsStartRequested = true;
  startGoogleMapsLoad?.();
}

export function GoogleMapsProvider({ children, apiKey }: GoogleMapsProviderProps) {
  const [isLoaded, setIsLoaded] = useState(isLoadedGlobal);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Require API key from env - no hardcoded fallback (security)
    const finalApiKey = apiKey && apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY' && apiKey !== ''
      ? apiKey
      : '';
    
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

    // Places and the route map load when a booking actually needs them.
    // They are not started on idle, so the homepage text can paint first.
    const scheduleLoad = () => {
      if (isLoadedGlobal || isLoading || globalLoader) return;
      globalLoader = new Loader({
        apiKey: finalApiKey,
        version: 'weekly',
        libraries: ['places'],
      });
      isLoading = true;
      globalLoader.load()
        .then(() => {
          isLoadedGlobal = true;
          isLoading = false;
          setIsLoaded(true);
        })
        .catch((err) => {
          isLoading = false;
          globalLoader = null;
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
    };
    startGoogleMapsLoad = scheduleLoad;
    if (mapsStartRequested) scheduleLoad();
    const onFieldIntent = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        scheduleLoad();
      }
    };
    document.addEventListener('focusin', onFieldIntent, true);
    document.addEventListener('pointerdown', onFieldIntent, true);
    return () => {
      if (startGoogleMapsLoad === scheduleLoad) startGoogleMapsLoad = null;
      document.removeEventListener('focusin', onFieldIntent, true);
      document.removeEventListener('pointerdown', onFieldIntent, true);
    };
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
