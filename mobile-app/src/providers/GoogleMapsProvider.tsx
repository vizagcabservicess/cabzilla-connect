/**
 * Native stub - Google Maps JS SDK is web-only.
 * LocationInput uses REST Places API on native.
 */
import React, { createContext, useContext } from 'react';

interface GoogleMapsContextType {
  isLoaded: boolean;
  error: Error | null;
  google?: typeof window extends { google: infer G } ? G : never;
}

const stubValue: GoogleMapsContextType = {
  isLoaded: false,
  error: null,
  google: undefined,
};

const GoogleMapsContext = createContext<GoogleMapsContextType>(stubValue);

export function GoogleMapsProvider({
  children,
  apiKey,
}: {
  children: React.ReactNode;
  apiKey: string;
}) {
  return (
    <GoogleMapsContext.Provider value={stubValue}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

export function useGoogleMaps() {
  return useContext(GoogleMapsContext);
}
