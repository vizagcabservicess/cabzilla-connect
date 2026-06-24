/**
 * Utility functions for generating vehicle URLs
 */

/** Site images live on apex domain (same as public marketing URLs). */
export const VIZAG_SITE_IMAGE_ORIGIN = 'https://vizagtaxihub.com';

/** Preferred full URLs when uploads use a non–taxi-services filename (dashboard assets). */
const PREFERRED_IMAGE_URLS: Record<string, string> = {
  ertiga: `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/ertiga-taxi-services-in-visakhapatnam-vizagtaxihub.png`,
  'toyota-glanza': `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/toyota-glanza-vizagtaxihub.png`,
  'innova-crysta': `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/img_68a32a68407e75.04067794.png`,
};

/**
 * Canonical fleet images: `uploads/taxi-services--visakhapatnam-{segment}.png`
 * (see e.g. sedan: taxi-services--visakhapatnam-sedan.png)
 */
const SLUG_TO_TAXI_SERVICES_IMAGE: Record<string, string> = {
  sedan: `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/taxi-services--visakhapatnam-sedan.png`,
  'swift-dzire': `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/taxi-services--visakhapatnam-sedan.png`,
  ertiga: `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/ertiga-taxi-services-in-visakhapatnam-vizagtaxihub.png`,
  'innova-crysta': `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/taxi-services--visakhapatnam-innova-crysta.png`,
  'toyota-glanza': `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/taxi-services--visakhapatnam-toyota-glanza.png`,
  amaze: `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/taxi-services--visakhapatnam-amaze.png`,
  'honda-amaze': `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/taxi-services--visakhapatnam-amaze.png`,
  'innova-hycross': `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/taxi-services--visakhapatnam-innova-hycross.png`,
  'tempo-traveller': `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/taxi-services--visakhapatnam-tempo-traveller.png`,
  urbania: `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/og-image-urbania.jpg`,
  luxury: `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/taxi-services--visakhapatnam-luxury.png`,
};

const TAXI_SERVICES_DEFAULT_IMAGE = SLUG_TO_TAXI_SERVICES_IMAGE.sedan;

/** Local dev / placeholder paths that must not be prefixed onto production — use slug map instead */
function isNonProductionImagePlaceholder(path: string): boolean {
  const p = path.trim().toLowerCase();
  return (
    p.startsWith('/cars/') ||
    p.startsWith('cars/') ||
    p.includes('/lovable-uploads/')
  );
}

/** Get likely LCP image URL for a vehicle slug - for early preload during loading */
export function getPreloadImageUrlForSlug(slug: string | undefined): string | null {
  if (!slug) return null;
  const preferred = PREFERRED_IMAGE_URLS[slug];
  if (preferred) return preferred;
  return SLUG_TO_TAXI_SERVICES_IMAGE[slug] ?? null;
}

// Mapping from vehicle_id to URL-friendly names
const vehicleUrlMapping: Record<string, string> = {
  'sedan': 'sedan',
  'ertiga': 'ertiga', 
  'toyota': 'toyota-glanza',
  'glanza': 'toyota-glanza',
  'toyota_glanza': 'toyota-glanza',
  'innova_crysta': 'innova-crysta',
  'tempo_traveller': 'tempo-traveller',
  'amaze': 'amaze',
  'mpv': 'innova-hycross',
  'bus': 'urbania'
};

// Mapping from vehicle names to URL-friendly names
const vehicleNameMapping: Record<string, string> = {
  'Swift Dzire': 'swift-dzire',
  'Ertiga': 'ertiga',
  'Toyota Glanza': 'toyota-glanza', 
  'Innova Crysta': 'innova-crysta',
  'Tempo Traveller': 'tempo-traveller',
  'Honda Amaze': 'amaze',
  'Innova Hycross': 'innova-hycross',
  'Urbania': 'urbania'
};

/** Wide hero banners above the booking widget on `/vehicle/*` landing pages. */
const SLUG_SEARCH_HERO_IMAGES: Record<string, string> = {
  ertiga: `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/ertiga-search.jpg`,
  'innova-crysta': `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/crysta-search.jpg`,
  sedan: `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/dzire-search.jpg`,
  'swift-dzire': `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/dzire-search.jpg`,
  amaze: `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/amaze-search.jpg`,
  'honda-amaze': `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/amaze-search.jpg`,
  'toyota-glanza': `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/glanza-search.jpg`,
};

export function getVehicleSearchHeroImageUrl(slug: string | undefined): string | null {
  if (!slug?.trim()) return null;
  return SLUG_SEARCH_HERO_IMAGES[slug.trim().toLowerCase()] ?? null;
}

/**
 * Fare tables in admin often key sedan-class vehicles as `sedan` even when the fleet id is `glanza`.
 */
export function resolveCanonicalFareVehicleId(
  vehicleId: string,
  vehicleName?: string,
): string {
  const id = vehicleId.trim().toLowerCase();
  const name = (vehicleName ?? '').toLowerCase();

  if (
    id === 'glanza' ||
    id === 'toyota' ||
    id === 'toyota_glanza' ||
    name.includes('glanza')
  ) {
    return 'sedan';
  }
  if (id === 'amaze' || name.includes('amaze')) {
    return 'sedan';
  }
  if (
    id === 'sedan' ||
    id === 'swift_dzire' ||
    id === 'swift-dzire' ||
    name.includes('swift') ||
    name.includes('dzire')
  ) {
    return 'sedan';
  }
  if (id === 'bus' || name.includes('urbania')) {
    return 'bus';
  }
  return vehicleId;
}

/** Candidate fleet ids when reading tour / pricing maps from the API. */
export function getFleetFareLookupIds(vehicleId: string, vehicleName?: string): string[] {
  const canonical = resolveCanonicalFareVehicleId(vehicleId, vehicleName);
  const ids = new Set<string>();
  const add = (value?: string) => {
    const key = value?.trim().toLowerCase();
    if (key) ids.add(key);
  };

  add(vehicleId);
  add(canonical);

  const name = (vehicleName ?? '').toLowerCase();
  if (name.includes('glanza') || vehicleId === 'glanza') {
    add('glanza');
    add('toyota');
    add('toyota_glanza');
    add('sedan');
  }
  if (name.includes('amaze') || vehicleId === 'amaze') {
    add('amaze');
    add('sedan');
  }
  if (name.includes('swift') || name.includes('dzire')) {
    add('swift_dzire');
    add('sedan');
  }

  return Array.from(ids);
}

export function pickFleetPricingAmount(
  pricing: Record<string, number> | undefined,
  lookupIds: string[],
): number | undefined {
  if (!pricing) return undefined;
  for (const id of lookupIds) {
    const key = Object.keys(pricing).find((k) => k.toLowerCase() === id);
    if (key && pricing[key] > 0) return pricing[key];
  }
  return undefined;
}

/**
 * Generate a URL-friendly slug from vehicle data
 * @param vehicle - Vehicle object with id, vehicleId, or name
 * @returns URL-friendly slug
 */
export function generateVehicleUrl(vehicle: any): string {
  // First try to use vehicle_id if available
  if (vehicle.vehicleId && vehicleUrlMapping[vehicle.vehicleId]) {
    return vehicleUrlMapping[vehicle.vehicleId];
  }
  
  // Then try to use id if available
  if (vehicle.id && vehicleUrlMapping[vehicle.id]) {
    return vehicleUrlMapping[vehicle.id];
  }
  
  // Then try to use name if available
  if (vehicle.name && vehicleNameMapping[vehicle.name]) {
    return vehicleNameMapping[vehicle.name];
  }
  
  // Fallback: convert name to URL-friendly format
  if (vehicle.name) {
    return vehicle.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }
  
  // Last resort: use id as string
  return vehicle.id ? vehicle.id.toString().toLowerCase() : 'unknown';
}

/**
 * Get the full vehicle URL
 * @param vehicle - Vehicle object
 * @returns Full vehicle URL
 */
export function getVehicleUrl(vehicle: any): string {
  return `/vehicle/${generateVehicleUrl(vehicle)}`;
}

/**
 * Get a usable image URL for a vehicle - handles relative paths, empty values, and fallbacks.
 * @param vehicle - Vehicle object with id, vehicleId, name, image
 * @param baseUrl - Origin for non-placeholder relative uploads (defaults to apex vizagtaxihub.com)
 * @returns Absolute image URL or null if no image available
 */
export function getVehicleImageUrl(
  vehicle: { id?: string; vehicleId?: string; name?: string; image?: string },
  baseUrl = VIZAG_SITE_IMAGE_ORIGIN,
): string | null {
  const slug = generateVehicleUrl(vehicle);

  // 1. Use API/dashboard image when it is a real remote or non-placeholder relative path
  const rawImage = vehicle?.image;
  if (typeof rawImage === 'string' && rawImage.trim() !== '') {
    const trimmed = rawImage.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    if (!isNonProductionImagePlaceholder(trimmed)) {
      const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
      return `${baseUrl.replace(/\/$/, '')}${path}`;
    }
  }

  // 2. Preferred uploads (non–taxi-services filenames)
  const preferredUrl = PREFERRED_IMAGE_URLS[slug];
  if (preferredUrl) {
    return preferredUrl;
  }

  // 3. Canonical taxi-services uploads by slug
  const taxiUrl = SLUG_TO_TAXI_SERVICES_IMAGE[slug];
  if (taxiUrl) {
    return taxiUrl;
  }

  return null;
}

/** Always returns an absolute image URL for lists (e.g. similar vehicles); never third-party placeholders. */
export function getVehicleImageUrlForDisplay(vehicle: {
  id?: string;
  vehicleId?: string;
  name?: string;
  image?: string;
}): string {
  return getVehicleImageUrl(vehicle) || TAXI_SERVICES_DEFAULT_IMAGE;
}

/**
 * Convert URL slug back to vehicle name for display
 * @param slug - URL slug
 * @returns Display name
 */
export function getVehicleDisplayName(slug: string): string {
  // Reverse mapping from URL slug to display name
  const reverseMapping: Record<string, string> = {
    'swift-dzire': 'Swift Dzire',
    'ertiga': 'Ertiga',
    'toyota-glanza': 'Toyota Glanza',
    'innova-crysta': 'Innova Crysta', 
    'tempo-traveller': 'Tempo Traveller',
    'amaze': 'Honda Amaze',
    'innova-hycross': 'Innova Hycross',
    'urbania': 'Urbania',
    'sedan': 'Sedan Cars'
  };
  
  return reverseMapping[slug] || slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Route slug → fleet record matchers when canonical URL slug does not match stored id/name. */
const SLUG_VEHICLE_MATCHERS: Record<
  string,
  { ids?: readonly string[]; nameIncludes?: readonly string[] }
> = {
  'toyota-glanza': {
    ids: ['glanza', 'toyota', 'toyota_glanza'],
    nameIncludes: ['toyota glanza', 'glanza'],
  },
  'swift-dzire': {
    ids: ['sedan', 'swift_dzire', 'swift-dzire'],
    nameIncludes: ['swift dzire', 'dzire'],
  },
  sedan: {
    ids: ['sedan'],
    nameIncludes: ['sedan', 'swift dzire'],
  },
  amaze: {
    ids: ['amaze'],
    nameIncludes: ['honda amaze', 'amaze'],
  },
  'honda-amaze': {
    ids: ['amaze'],
    nameIncludes: ['honda amaze', 'amaze'],
  },
  'innova-hycross': {
    ids: ['mpv', 'innova_hycross', 'innova-hycross'],
    nameIncludes: ['innova hycross', 'hycross'],
  },
  luxury: {
    ids: ['luxury'],
    nameIncludes: ['luxury'],
  },
};

function vehicleRecordMatchesSlug(
  vehicle: { id?: string; vehicleId?: string; name?: string },
  slug: string,
): boolean {
  const id = (vehicle.id ?? '').toLowerCase();
  const vehicleId = (vehicle.vehicleId ?? '').toLowerCase();
  const name = (vehicle.name ?? '').toLowerCase();
  const matchers = SLUG_VEHICLE_MATCHERS[slug];

  if (matchers?.ids?.some((candidate) => id === candidate || vehicleId === candidate)) {
    return true;
  }
  if (matchers?.nameIncludes?.some((fragment) => name.includes(fragment))) {
    return true;
  }

  return false;
}

/** Find a fleet vehicle for a `/vehicle/:slug` route param. */
export function findVehicleByRouteSlug<T extends { id?: string; vehicleId?: string; name?: string }>(
  vehicles: T[],
  slug: string,
): T | undefined {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return undefined;

  const direct = vehicles.find((vehicle) => {
    const urlSlug = getVehicleUrl(vehicle).replace('/vehicle/', '');
    return urlSlug === normalized;
  });
  if (direct) return direct;

  if (SLUG_VEHICLE_MATCHERS[normalized]) {
    return vehicles.find((vehicle) => vehicleRecordMatchesSlug(vehicle, normalized));
  }

  return undefined;
}





























































