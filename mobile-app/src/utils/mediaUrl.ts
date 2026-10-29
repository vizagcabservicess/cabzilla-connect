/**
 * Phone image views need an absolute URL on the apex host.
 * www.vizagtaxihub.com redirects, and React Native often drops that redirect.
 * Paths under /cars/ are placeholders (the server returns HTML), so fleet photos
 * come from the uploads that actually exist.
 */

const IMAGE_ORIGIN = 'https://vizagtaxihub.com';

const FLEET_PHOTOS: Record<string, string> = {
  sedan: `${IMAGE_ORIGIN}/uploads/taxi-services--visakhapatnam-sedan.png`,
  'swift-dzire': `${IMAGE_ORIGIN}/uploads/taxi-services--visakhapatnam-sedan.png`,
  ertiga: `${IMAGE_ORIGIN}/uploads/ertiga-taxi-services-in-visakhapatnam-vizagtaxihub.png`,
  'innova-crysta': `${IMAGE_ORIGIN}/uploads/img_68a32a68407e75.04067794.png`,
  'toyota-glanza': `${IMAGE_ORIGIN}/uploads/toyota-glanza-vizagtaxihub.png`,
  amaze: `${IMAGE_ORIGIN}/uploads/amaze-search.jpg`,
  'honda-amaze': `${IMAGE_ORIGIN}/uploads/amaze-search.jpg`,
  'innova-hycross': `${IMAGE_ORIGIN}/uploads/img_68a32a68407e75.04067794.png`,
  'tempo-traveller': `${IMAGE_ORIGIN}/uploads/tempo-png.png`,
  urbania: `${IMAGE_ORIGIN}/uploads/og-image-urbania.jpg`,
};

const ID_TO_SLUG: Record<string, string> = {
  sedan: 'sedan',
  swift_dzire: 'swift-dzire',
  ertiga: 'ertiga',
  toyota: 'toyota-glanza',
  glanza: 'toyota-glanza',
  toyota_glanza: 'toyota-glanza',
  innova: 'innova-crysta',
  innova_crysta: 'innova-crysta',
  tempo: 'tempo-traveller',
  tempo_traveller: 'tempo-traveller',
  amaze: 'amaze',
  mpv: 'innova-hycross',
  innova_hycross: 'innova-hycross',
  bus: 'urbania',
  urbania: 'urbania',
};

export function resolveMediaUrl(raw: string | null | undefined): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  if (/^(blob:|data:)/i.test(trimmed)) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^https?:\/\/www\.vizagtaxihub\.com/i, IMAGE_ORIGIN);
  }
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${IMAGE_ORIGIN}${path}`;
}

function isPlaceholderImage(raw: string): boolean {
  const path = raw.trim().toLowerCase();
  return path.includes('/cars/') || path.startsWith('cars/') || path.includes('/lovable-uploads/');
}

function slugForVehicle(vehicle: { id?: string; vehicleId?: string; name?: string }): string {
  const id = String(vehicle.vehicleId || vehicle.id || '')
    .toLowerCase()
    .replace(/-/g, '_');
  if (ID_TO_SLUG[id]) return ID_TO_SLUG[id];

  const name = String(vehicle.name || '').toLowerCase();
  if (name.includes('ertiga')) return 'ertiga';
  if (name.includes('glanza')) return 'toyota-glanza';
  if (name.includes('hycross')) return 'innova-hycross';
  if (name.includes('innova') || name.includes('crysta')) return 'innova-crysta';
  if (name.includes('tempo') || name.includes('traveller')) return 'tempo-traveller';
  if (name.includes('urbania') || name.includes('urban')) return 'urbania';
  if (name.includes('amaze')) return 'amaze';
  if (name.includes('dzire') || name.includes('sedan')) return 'sedan';
  return 'sedan';
}

export function resolveVehicleImageUrl(vehicle: {
  id?: string;
  vehicleId?: string;
  name?: string;
  image?: string;
}): string {
  const raw = String(vehicle.image || '').trim();
  if (raw && !isPlaceholderImage(raw)) {
    const resolved = resolveMediaUrl(raw);
    if (resolved && !isPlaceholderImage(resolved)) return resolved;
  }
  return FLEET_PHOTOS[slugForVehicle(vehicle)] || FLEET_PHOTOS.sedan;
}
