/**
 * Web: use Maps JS SDK DistanceMatrixService (avoids CORS).
 * Same approach as web app - no direct fetch to Google REST API.
 */
import type { Location } from '../types';

export interface DistanceResult {
  distance: number;
  duration: number;
  status: 'OK' | 'FAILED';
}

export async function calculateDistanceMatrix(
  origin: Location,
  destination: Location
): Promise<DistanceResult> {
  if (typeof window === 'undefined' || !window.google?.maps) {
    return { distance: 0, duration: 0, status: 'FAILED' };
  }

  const g = window.google;
  const service = new g.maps.DistanceMatrixService();

  return new Promise((resolve) => {
    service.getDistanceMatrix(
      {
        origins: [{ lat: origin.lat, lng: origin.lng }],
        destinations: [{ lat: destination.lat, lng: destination.lng }],
        travelMode: g.maps.TravelMode.DRIVING,
        unitSystem: g.maps.UnitSystem.METRIC,
      },
      (response, status) => {
        if (status === 'OK' && response?.rows?.[0]?.elements?.[0]?.status === 'OK') {
          const el = response.rows[0].elements[0];
          resolve({
            distance: Math.round((el.distance?.value ?? 0) / 1000),
            duration: Math.ceil((el.duration?.value ?? 0) / 60),
            status: 'OK',
          });
        } else {
          resolve({ distance: 0, duration: 0, status: 'FAILED' });
        }
      }
    );
  });
}
