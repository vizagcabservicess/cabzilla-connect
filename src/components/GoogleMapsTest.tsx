import React, { useEffect } from 'react';
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';

export function GoogleMapsTest() {
  const { isLoaded, error, google } = useGoogleMaps();

  useEffect(() => {
    console.log('🔍 GOOGLE MAPS TEST:');
    console.log('- isLoaded:', isLoaded);
    console.log('- error:', error);
    console.log('- google object:', google);
    console.log('- VITE_GOOGLE_MAPS_API_KEY:', import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  }, [isLoaded, error, google]);

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded">
      <h3 className="font-bold text-blue-800">Google Maps Test</h3>
      <div className="text-sm text-blue-700">
        <p><strong>Loaded:</strong> {isLoaded ? '✅ Yes' : '❌ No'}</p>
        <p><strong>Error:</strong> {error ? error.message : 'None'}</p>
        <p><strong>API Key:</strong> {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? '✅ Set' : '❌ Missing'}</p>
        <p><strong>Google Object:</strong> {google ? '✅ Available' : '❌ Not Available'}</p>
      </div>
    </div>
  );
}
