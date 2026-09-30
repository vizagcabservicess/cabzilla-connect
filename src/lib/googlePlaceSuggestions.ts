export type PlaceSuggestionRow = {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  placePrediction?: unknown;
};

export type PlaceSuggestionGeo = {
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

function textOf(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'text' in value) {
    const text = (value as { text?: unknown }).text;
    if (typeof text === 'string') return text;
  }
  if (typeof (value as { toString?: () => string }).toString === 'function') {
    const text = (value as { toString: () => string }).toString();
    if (text && text !== '[object Object]') return text;
  }
  return '';
}

function latLngOf(value: unknown): { lat: number; lng: number } | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as { lat?: unknown; lng?: unknown };
  const lat = typeof record.lat === 'function' ? Number(record.lat()) : Number(record.lat);
  const lng = typeof record.lng === 'function' ? Number(record.lng()) : Number(record.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export async function fetchPlaceSuggestionRows(
  google: typeof window.google,
  input: string,
  options: {
    isOutstationDrop: boolean;
    vizagBiasRadiusKm: number;
    enforceVizag35Km: boolean;
    biasLat: number;
    biasLng: number;
  }
): Promise<PlaceSuggestionRow[]> {
  const maps = google.maps as typeof google.maps & {
    importLibrary?: (name: string) => Promise<Record<string, unknown>>;
  };
  let Suggestion: {
    fetchAutocompleteSuggestions: (request: Record<string, unknown>) => Promise<{
      suggestions?: Array<{ placePrediction?: Record<string, unknown> }>;
    }>;
  } | undefined;

  try {
    const loaded = maps.importLibrary ? await maps.importLibrary('places') : google.maps.places;
    Suggestion = (loaded as { AutocompleteSuggestion?: typeof Suggestion }).AutocompleteSuggestion
      || (google.maps.places as { AutocompleteSuggestion?: typeof Suggestion }).AutocompleteSuggestion;
  } catch {
    Suggestion = (google.maps.places as { AutocompleteSuggestion?: typeof Suggestion }).AutocompleteSuggestion;
  }
  if (typeof Suggestion?.fetchAutocompleteSuggestions === 'function') {
    const request: Record<string, unknown> = {
      input,
      includedRegionCodes: ['in'],
      language: 'en-IN',
      region: 'in',
    };
    if (!options.isOutstationDrop) {
      request.locationBias = {
        center: { lat: options.biasLat, lng: options.biasLng },
        radius: options.vizagBiasRadiusKm * 1000,
      };
    }
    const { suggestions } = await Suggestion.fetchAutocompleteSuggestions(request);
    return (suggestions || [])
      .map((item) => {
        const prediction = (item.placePrediction || item) as Record<string, unknown>;
        const main = textOf(prediction.mainText) || textOf(prediction.text);
        const secondary = textOf(prediction.secondaryText);
        const description = textOf(prediction.text) || [main, secondary].filter(Boolean).join(', ');
        const placeId = String(prediction.placeId || prediction.place_id || '');
        if (!placeId && !description) return null;
        if (!placeId) return null;
        return {
          place_id: placeId,
          description,
          structured_formatting: { main_text: main || description, secondary_text: secondary },
          placePrediction: prediction,
        };
      })
      .filter((row): row is PlaceSuggestionRow => Boolean(row));
  }

  if (!google.maps.places.AutocompleteService) return [];

  return new Promise((resolve) => {
    const service = new google.maps.places.AutocompleteService();
    const request: google.maps.places.AutocompletionRequest = {
      input,
      componentRestrictions: { country: 'in' },
      types: ['geocode', 'establishment'],
    };
    if (!options.isOutstationDrop) {
      const circle = new google.maps.Circle({
        center: new google.maps.LatLng(options.biasLat, options.biasLng),
        radius: options.vizagBiasRadiusKm * 1000,
      });
      request.bounds = circle.getBounds() as google.maps.LatLngBounds;
      if (options.enforceVizag35Km) {
        (request as google.maps.places.AutocompletionRequest & { strictBounds?: boolean }).strictBounds = true;
      }
    }
    service.getPlacePredictions(request, (predictions, status) => {
      const ok = status === google.maps.places.PlacesServiceStatus.OK;
      const zero = status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS;
      if (!ok && !zero) {
        resolve([]);
        return;
      }
      resolve(
        (predictions || []).map((prediction) => ({
          place_id: prediction.place_id,
          description: prediction.description,
          structured_formatting: {
            main_text: prediction.structured_formatting?.main_text || prediction.description,
            secondary_text: prediction.structured_formatting?.secondary_text || '',
          },
        }))
      );
    });
  });
}

export async function resolvePlaceSuggestionGeo(
  google: typeof window.google,
  row: PlaceSuggestionRow
): Promise<PlaceSuggestionGeo | null> {
  const prediction = row.placePrediction as
    | {
        toPlace?: () => {
          fetchFields: (request: { fields: string[] }) => Promise<unknown>;
          id?: string;
          displayName?: unknown;
          formattedAddress?: unknown;
          location?: unknown;
        };
      }
    | undefined;

  if (typeof prediction?.toPlace === 'function') {
    const place = prediction.toPlace();
    await place.fetchFields({ fields: ['id', 'displayName', 'formattedAddress', 'location'] });
    const coords = latLngOf(place.location);
    if (!coords) return null;
    return {
      place_id: place.id || row.place_id,
      name: textOf(place.displayName) || row.structured_formatting.main_text,
      address: textOf(place.formattedAddress) || row.description,
      lat: coords.lat,
      lng: coords.lng,
    };
  }

  if (!google.maps.places.PlacesService) return null;

  return new Promise((resolve) => {
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    service.getDetails(
      {
        placeId: row.place_id,
        fields: ['place_id', 'name', 'formatted_address', 'geometry'],
      },
      (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) {
          resolve(null);
          return;
        }
        resolve({
          place_id: place.place_id || row.place_id,
          name: place.name || row.structured_formatting.main_text,
          address: place.formatted_address || row.description,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
      }
    );
  });
}
