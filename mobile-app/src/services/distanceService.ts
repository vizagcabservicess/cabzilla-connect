/**
 * Distance calculation - same as web app (Google Distance Matrix API)
 */
import { GOOGLE_MAPS_API_KEY } from '../config';
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
  const o = `${origin.lat},${origin.lng}`;
  const d = `${destination.lat},${destination.lng}`;
  const url =
    `https://maps.googleapis.com/maps/api/distancematrix/json` +
    `?origins=${encodeURIComponent(o)}` +
    `&destinations=${encodeURIComponent(d)}` +
    `&mode=driving` +
    `&units=metric` +
    `&key=${GOOGLE_MAPS_API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (
      data.rows?.[0]?.elements?.[0]?.status === 'OK' &&
      data.rows[0].elements[0].distance
    ) {
      const el = data.rows[0].elements[0];
      return {
        distance: Math.round((el.distance.value || 0) / 1000),
        duration: Math.ceil((el.duration?.value || 0) / 60),
        status: 'OK',
      };
    }
    return {
      distance: 0,
      duration: 0,
      status: 'FAILED',
    };
  } catch {
    return { distance: 0, duration: 0, status: 'FAILED' };
  }
}
