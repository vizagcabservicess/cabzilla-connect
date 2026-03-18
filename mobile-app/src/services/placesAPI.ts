/**
 * Google Places Autocomplete - native only (Android/iOS).
 * Web uses Maps JS SDK via LocationInput.web.tsx (same as web app).
 */
import { GOOGLE_MAPS_API_KEY } from '../config';
import type { Location } from '../types';

const VIZAG_LAT = 17.6868;
const VIZAG_LNG = 83.2185;

function getDistanceFromLatLng(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isWithinVizagRange(lat: number, lng: number, maxKm: number = 35): boolean {
  return getDistanceFromLatLng(VIZAG_LAT, VIZAG_LNG, lat, lng) <= maxKm;
}

export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting?: { main_text: string; secondary_text: string };
}

export interface PlacePredictionsOptions {
  /** When true, bias results to 35km around Vizag. When false, India-wide search (for outstation drop). */
  restrictToVizag?: boolean;
}

export type PlacePredictionsResult = {
  predictions: PlacePrediction[];
  error?: 'NO_API_KEY' | 'REQUEST_DENIED' | 'NETWORK';
};

export async function fetchPlacePredictions(
  input: string,
  options?: PlacePredictionsOptions
): Promise<PlacePredictionsResult> {
  if (!input || input.length < 2) return { predictions: [] };
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('[Places API] EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not set.');
    return { predictions: [], error: 'NO_API_KEY' };
  }

  const restrictToVizag = options?.restrictToVizag !== false;

  try {
    let url =
      `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
      `?input=${encodeURIComponent(input)}` +
      `&key=${GOOGLE_MAPS_API_KEY}` +
      `&components=country:in`;
    if (restrictToVizag) {
      url += `&location=${VIZAG_LAT},${VIZAG_LNG}&radius=35000`;
    }

    const res = await fetch(url);
    const data = await res.json();

    if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
      const predictions = (data.predictions || []).map((p: any) => ({
        place_id: p.place_id,
        description: p.description,
        structured_formatting: p.structured_formatting,
      }));
      return { predictions };
    }

    if (data.status === 'REQUEST_DENIED') {
      console.warn('[Places API] REQUEST_DENIED:', data.error_message || '');
      return { predictions: [], error: 'REQUEST_DENIED' };
    }

    console.warn('[Places API] Status:', data.status, data.error_message || '');
    return { predictions: [] };
  } catch (err) {
    console.error('[Places API] Failed:', err);
    return { predictions: [], error: 'NETWORK' };
  }
}

export async function fetchPlaceDetails(placeId: string): Promise<Location | null> {
  if (!placeId || !GOOGLE_MAPS_API_KEY) return null;

  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${encodeURIComponent(placeId)}` +
      `&fields=name,formatted_address,geometry` +
      `&key=${GOOGLE_MAPS_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status === 'OK' && data.result) {
      const r = data.result;
      const lat = r.geometry?.location?.lat ?? 0;
      const lng = r.geometry?.location?.lng ?? 0;
      const name = r.name || r.formatted_address || '';
      const address = r.formatted_address || name;
      return {
        id: placeId,
        name,
        address,
        city: 'Visakhapatnam',
        state: 'Andhra Pradesh',
        lat,
        lng,
        type: 'other',
        popularityScore: 50,
        isInVizag: isWithinVizagRange(lat, lng),
      };
    }
  } catch {
    // ignored
  }

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'location,displayName,formattedAddress',
        },
      }
    );
    const data = await res.json();
    if (res.ok && data.location) {
      const lat = data.location.latitude ?? 0;
      const lng = data.location.longitude ?? 0;
      const name = data.displayName?.text || data.formattedAddress || '';
      const address = data.formattedAddress || name;
      return {
        id: placeId,
        name,
        address,
        city: 'Visakhapatnam',
        state: 'Andhra Pradesh',
        lat,
        lng,
        type: 'other',
        popularityScore: 50,
        isInVizag: isWithinVizagRange(lat, lng),
      };
    }
  } catch {
    // ignored
  }

  return null;
}

export function validatePickupLocation(
  loc: Location,
  tripType: string
): { valid: boolean; message?: string } {
  // Use 35km for all trip types (matches web app ToursPage)
  const maxKm = 35;
  if (!isWithinVizagRange(loc.lat, loc.lng, maxKm)) {
    return {
      valid: false,
      message: 'Selected location is outside the 35km radius from Visakhapatnam. Please select a location within Visakhapatnam city limits.',
    };
  }
  return { valid: true };
}

/**
 * Validate drop location for airport - outside 35km is allowed but we notify.
 * Returns { valid: true, notifyOutstation: true } when outside 35km.
 */
export function validateDropLocation(
  loc: Location,
  tripType: string
): { valid: boolean; message?: string; notifyOutstation?: boolean } {
  if (tripType !== 'airport') return { valid: true };
  if (!isWithinVizagRange(loc.lat, loc.lng, 35)) {
    return {
      valid: true,
      notifyOutstation: true,
      message: "Selected location is outside the 35km radius from Visakhapatnam. We'll automatically switch to Outstation for this trip.",
    };
  }
  return { valid: true };
}
