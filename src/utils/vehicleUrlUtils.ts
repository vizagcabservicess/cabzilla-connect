/**
 * Utility functions for generating vehicle URLs
 */

/** Preferred full URLs for vehicles with verified images (takes precedence over API) */
const PREFERRED_IMAGE_URLS: Record<string, string> = {
  'toyota-glanza': 'https://vizagtaxihub.com/uploads/toyota-glanza-vizagtaxihub.png',
  'innova-crysta': 'https://vizagtaxihub.com/uploads/img_68a32a68407e75.04067794.png',
};

/** Known vehicle slug -> image path (used for fallback when API image is missing) */
const SLUG_TO_IMAGE_PATH: Record<string, string> = {
  'innova-crysta': '/uploads/img_68a32a68407e75.04067794.png',
  'sedan': '/cars/sedan.png',
  'ertiga': '/cars/ertiga.png',
  'tempo-traveller': '/cars/tempo.png',
  'toyota-glanza': '/uploads/toyota-glanza-vizagtaxihub.png',
  'amaze': '/cars/amaze.png',
  'swift-dzire': '/cars/sedan.png',
  'honda-amaze': '/cars/amaze.png',
  'innova-hycross': '/cars/innova.png',
  'urbania': '/cars/tempo.png',
  'luxury': '/cars/luxury.png',
};

/** Get likely LCP image URL for a vehicle slug - for early preload during loading */
export function getPreloadImageUrlForSlug(slug: string | undefined): string | null {
  if (!slug) return null;
  const preferred = PREFERRED_IMAGE_URLS[slug];
  if (preferred) return preferred;
  const path = SLUG_TO_IMAGE_PATH[slug];
  if (!path) return null;
  return path.startsWith('http') ? path : `https://vizagtaxihub.com${path}`;
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

/** Base URL for assets - cars images live on main domain */
const ASSET_BASE_URL = 'https://www.vizagtaxihub.com';

/**
 * Get a usable image URL for a vehicle - handles relative paths, empty values, and fallbacks.
 * @param vehicle - Vehicle object with id, vehicleId, name, image
 * @param baseUrl - Optional base URL (defaults to vizagtaxihub.com)
 * @returns Absolute image URL or null if no image available
 */
export function getVehicleImageUrl(vehicle: { id?: string; vehicleId?: string; name?: string; image?: string }, baseUrl = ASSET_BASE_URL): string | null {
  const slug = generateVehicleUrl(vehicle);

  // 1. Use API/dashboard image first when valid - dashboard updates must be respected
  const rawImage = vehicle?.image;
  if (typeof rawImage === 'string' && rawImage.trim() !== '') {
    const trimmed = rawImage.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${baseUrl.replace(/\/$/, '')}${path}`;
  }

  // 2. Fallback: preferred URLs or slug mapping when API image is missing
  const preferredUrl = PREFERRED_IMAGE_URLS[slug];
  if (preferredUrl) {
    return preferredUrl;
  }
  const fallbackPath = SLUG_TO_IMAGE_PATH[slug];
  if (fallbackPath) {
    const path = fallbackPath.startsWith('http') ? fallbackPath : `${baseUrl.replace(/\/$/, '')}${fallbackPath}`;
    return path;
  }

  return null;
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





























































