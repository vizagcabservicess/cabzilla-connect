/**
 * Utility functions for generating tour URLs
 */

// Mapping from tour_id to URL-friendly names
const tourUrlMapping: Record<string, string> = {
  'araku-valley-tour': 'araku-valley-tour',
  'lambasingi-tour': 'lambasingi-tour', 
  'vizag_north_city_tour': 'vizag-north-city-tour',
  'vizag_south_city_tour': 'vizag-south-city-tour',
  'araku-vizag-3d-2n': 'araku-vizag-3d-2n',
  'araku': 'araku-valley-tour',
  'araku_valley': 'araku-valley-tour',
  'lambasingi': 'lambasingi-tour',
  'vizag_city': 'vizag-north-city-tour',
  'vizag-city-tour': 'vizag-north-city-tour',
  'araku_vizag_3D_2N': 'araku-vizag-3d-2n'
};

// Mapping from tour names to URL-friendly names
const tourNameMapping: Record<string, string> = {
  'Araku Valley Tour': 'araku-valley-tour',
  'Lambasingi Tour': 'lambasingi-tour',
  'Vizag North City Tour': 'vizag-north-city-tour',
  'Vizag South City Tour': 'vizag-south-city-tour',
  'Araku-Vizag 3D/2N Tour': 'araku-vizag-3d-2n',
  'Araku Valley': 'araku-valley-tour',
  'Lambasingi': 'lambasingi-tour',
  'Vizag City Tour': 'vizag-north-city-tour'
};

/**
 * Generate a URL-friendly slug from tour data
 * @param tour - Tour object with id, tourId, or tourName
 * @returns URL-friendly slug
 */
export function generateTourUrl(tour: any): string {
  // First try to use tourId if available
  if (tour.tourId && tourUrlMapping[tour.tourId]) {
    return tourUrlMapping[tour.tourId];
  }
  
  // Then try to use id if available
  if (tour.id && tourUrlMapping[tour.id]) {
    return tourUrlMapping[tour.id];
  }
  
  // Then try to use tourName if available
  if (tour.tourName && tourNameMapping[tour.tourName]) {
    return tourNameMapping[tour.tourName];
  }
  
  // Fallback: convert tourName to URL-friendly format
  if (tour.tourName) {
    return tour.tourName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }
  
  // Last resort: use id as string
  return tour.id ? tour.id.toString().toLowerCase() : 'unknown';
}

/**
 * Get the full tour URL
 * @param tour - Tour object
 * @returns Full tour URL
 */
export function getTourUrl(tour: any): string {
  return `/tours/${generateTourUrl(tour)}`;
}

/**
 * Convert URL slug back to tour name for display
 * @param slug - URL slug
 * @returns Display name
 */
export function getTourDisplayName(slug: string): string {
  // Reverse mapping from URL slug to display name
  const reverseMapping: Record<string, string> = {
    'araku-valley-tour': 'Araku Valley Tour',
    'lambasingi-tour': 'Lambasingi Tour',
    'vizag-north-city-tour': 'Vizag North City Tour',
    'vizag-south-city-tour': 'Vizag South City Tour',
    'araku-vizag-3d-2n': 'Araku-Vizag 3D/2N Tour'
  };
  
  return reverseMapping[slug] || slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get tour ID from URL slug (for backward compatibility)
 * @param slug - URL slug
 * @returns Tour ID
 */
export function getTourIdFromSlug(slug: string): string {
  // Mapping from URL slug to actual tour ID that the API expects
  const slugToIdMapping: Record<string, string> = {
    'araku-valley-tour': 'araku_valley',
    'lambasingi-tour': 'lambasingi',
    'vizag-north-city-tour': 'vizag_north_city_tour',
    'vizag-south-city-tour': 'vizag_south_city_tour',
    'araku-vizag-3d-2n': 'araku_vizag_3D_2N'
  };
  
  return slugToIdMapping[slug] || slug;
}
