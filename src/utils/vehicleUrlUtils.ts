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





























































