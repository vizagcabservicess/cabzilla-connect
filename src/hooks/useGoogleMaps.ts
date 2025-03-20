
import { useContext } from 'react';
import GoogleMapsContext from '../contexts/GoogleMapsContext';

// Hook to use Google Maps context
export const useGoogleMaps = () => useContext(GoogleMapsContext);
