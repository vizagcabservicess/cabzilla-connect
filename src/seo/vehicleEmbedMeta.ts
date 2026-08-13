/**
 * Shared config for `/vehicle/*` pages that embed the Hero booking widget
 * (Urbania-style mobile layout: illustration, search slot, step-2 hide grid).
 */
import {
  generateVehicleUrl,
  getVehicleDisplayName,
  getVehicleImageUrl,
  getPreloadImageUrlForSlug,
  getVehicleSearchHeroImageUrl,
  VIZAG_SITE_IMAGE_ORIGIN,
} from '../utils/vehicleUrlUtils';

export type VehicleEmbedSlug = 'urbania' | 'tempo-traveller';

export interface VehicleEmbedSeo {
  title: string;
  description: string;
  keywords: string;
  /** Appended in VehicleDetailPage as `, ${capacity} seater …` */
  capacityKeywordSuffix: string;
  canonicalUrl: string;
  ogImageUrl: string;
  pageHeadline: string;
  pageSubtitle: string;
  structuredDataName: string;
  structuredDataDescription: string;
  defaultPricePerKm: string;
  structuredDataFallbackImage: string;
}

export interface VehicleEmbedIllustration {
  cdnUrl: string;
  localPath: string;
  envVarKey?: 'VITE_URBANIA_ILLUSTRATION_URL' | 'VITE_TEMPO_ILLUSTRATION_URL';
}

export interface VehicleEmbedConfig {
  slug: string;
  /** Fleet ids that resolve to this embed page */
  vehicleIds: readonly string[];
  seo: VehicleEmbedSeo;
  illustration: VehicleEmbedIllustration;
  featureStripLabels: readonly string[];
  featureBarAriaLabel: string;
  searchButtonLabel: string;
}

export interface VehicleEmbedVehicleInput {
  id?: string;
  name?: string;
  capacity?: number;
  pricePerKm?: number;
  amenities?: string[];
  features?: string[];
  description?: string;
  image?: string;
  seoContent?: {
    title?: string;
    metaDescription?: string;
    keywords?: string;
  };
}

export const VEHICLE_EMBED_CONFIGS: Record<VehicleEmbedSlug, VehicleEmbedConfig> = {
  urbania: {
    slug: 'urbania',
    vehicleIds: ['bus'],
    seo: {
      title: 'Urbania Rental Vizag | Force Urbania for Rent | Vizag Taxi Hub',
      description:
        'Book Urbania rental Vizag and Force Urbania for rent — weddings, corporate groups, outstation trips. Premium AC with professional driver. Call +91 9966363662.',
      keywords:
        'urbania rental vizag, force urbania vizag, force urbania for rent vizag, urbania hire visakhapatnam, premium van hire vizag, corporate urbania vizag, wedding urbania vizag',
      capacityKeywordSuffix: 'seater urbania',
      canonicalUrl: 'https://vizagtaxihub.com/vehicle/urbania',
      ogImageUrl: 'https://vizagtaxihub.com/uploads/og-image-urbania.jpg',
      pageHeadline: 'Urbania Rental Vizag',
      pageSubtitle: 'Force Urbania for rent — premium AC group travel',
      structuredDataName: 'Urbania Premium Van Rental in Visakhapatnam',
      structuredDataDescription:
        'Force Urbania Vizag hire for weddings, corporate travel, pilgrimages, and outstation group trips — AC comfort and professional driver.',
      defaultPricePerKm: '28',
      structuredDataFallbackImage: 'uploads/og-image-urbania.jpg',
    },
    illustration: {
      cdnUrl: 'https://vizagtaxihub.com/uploads/urbania-illustrator-vth.png',
      localPath: '/uploads/urbania-illustrator-vth.png',
      envVarKey: 'VITE_URBANIA_ILLUSTRATION_URL',
    },
    featureStripLabels: [
      'Spacious & Comfortable',
      'Ample Luggage Space',
      'Powerful AC for Relaxed Ride',
      'Clean, Safe & Well Maintained',
    ],
    featureBarAriaLabel: 'Urbania van highlights',
    searchButtonLabel: 'SEARCH URBANIA',
  },
  'tempo-traveller': {
    slug: 'tempo-traveller',
    vehicleIds: ['tempo_traveller'],
    seo: {
      title: 'Tempo Traveller in Vizag | 17 Seater Hire & Van Rental | Vizag Taxi Hub',
      description:
        'Book tempo traveller in Vizag — 17 seater vehicle hire and van rental with AC and professional driver for groups, weddings, and outstation. Call +91 9966363662.',
      keywords:
        'tempo traveller in vizag, tempo traveller hire vizag, tempo traveller rent in vizag, 17 seater vehicle, van rental, traveller van rental, tempo traveller rental vizag',
      capacityKeywordSuffix: 'seater tempo traveller',
      canonicalUrl: 'https://vizagtaxihub.com/vehicle/tempo-traveller',
      ogImageUrl: 'https://vizagtaxihub.com/uploads/taxi-services--visakhapatnam-tempo-traveller.png',
      pageHeadline: 'Tempo Traveller in Vizag',
      pageSubtitle: '17 seater AC hire & van rental for groups',
      structuredDataName: '17 Seater AC Tempo Traveller Rental in Vizag',
      structuredDataDescription:
        'Tempo traveller hire in Visakhapatnam with professional drivers, AC comfort, and modern amenities for group travel.',
      defaultPricePerKm: '35',
      structuredDataFallbackImage: 'cars/tempo.png',
    },
    illustration: {
      cdnUrl: 'https://vizagtaxihub.com/uploads/tempo-traveller-search.jpg',
      localPath: '/uploads/tempo-traveller-search.jpg',
      envVarKey: 'VITE_TEMPO_ILLUSTRATION_URL',
    },
    featureStripLabels: [
      '17 Seater Group Travel',
      'Spacious Luggage Space',
      'Powerful AC Comfort',
      'Clean, Safe & Maintained',
    ],
    featureBarAriaLabel: 'Tempo traveller highlights',
    searchButtonLabel: 'SEARCH TEMPO',
  },
};

const STATIC_EMBED_SLUG_SET = new Set<string>(Object.keys(VEHICLE_EMBED_CONFIGS));

export function isStaticVehicleEmbedSlug(slug: string | undefined): slug is VehicleEmbedSlug {
  return Boolean(slug && STATIC_EMBED_SLUG_SET.has(slug));
}

/** @deprecated Use `getVehicleEmbedConfig` — returns true for any slug with embed layout support. */
export function isVehicleEmbedSlug(slug: string | undefined): boolean {
  return Boolean(slug?.trim());
}

function capacityKeywordSuffix(capacity: number): string {
  if (capacity > 12) return 'seater group vehicle';
  if (capacity > 6) return 'seater SUV';
  return 'seater cab';
}

function buildPageSubtitle(name: string, capacity: number): string {
  const lower = name.toLowerCase();
  if (lower.includes('innova')) return 'Innova Crysta taxi booking — rates & hire in Vizag';
  if (capacity > 12) return `${capacity}-seater for group travel`;
  if (capacity > 6) return `Spacious ${name} taxi for family travel in Vizag`;
  return `Comfortable ${capacity}-seater taxi in Vizag`;
}

function buildFeatureStripLabels(vehicle: VehicleEmbedVehicleInput, capacity: number): string[] {
  const fromList = (vehicle.amenities ?? vehicle.features ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (fromList.length >= 3) return fromList;

  if (capacity > 12) {
    return [
      'Spacious & Comfortable',
      'Ample Luggage Space',
      'Powerful AC for Relaxed Ride',
      'Clean, Safe & Well Maintained',
    ];
  }
  if (capacity > 6) {
    return [
      'Spacious SUV Cabin',
      'Ample Luggage Space',
      'Powerful AC Comfort',
      'Professional Driver',
    ];
  }
  return [
    'Comfortable AC Cabin',
    'Music System',
    'Professional Driver',
    'Clean & Well Maintained',
  ];
}

function resolveIllustrationForSlug(
  slug: string,
  vehicle?: VehicleEmbedVehicleInput | null,
): VehicleEmbedIllustration {
  const searchHeroUrl = getVehicleSearchHeroImageUrl(slug);
  if (searchHeroUrl) {
    return {
      cdnUrl: searchHeroUrl,
      localPath: searchHeroUrl.replace(VIZAG_SITE_IMAGE_ORIGIN, ''),
    };
  }

  const displayName = vehicle?.name ?? getVehicleDisplayName(slug);
  const imageUrl =
    getVehicleImageUrl({ ...vehicle, name: displayName }) ??
    getPreloadImageUrlForSlug(slug) ??
    `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/taxi-services--visakhapatnam-sedan.png`;

  const localPath = imageUrl.startsWith(VIZAG_SITE_IMAGE_ORIGIN)
    ? imageUrl.replace(VIZAG_SITE_IMAGE_ORIGIN, '')
    : imageUrl.startsWith('/')
      ? imageUrl
      : `/${imageUrl}`;

  return { cdnUrl: imageUrl, localPath };
}

function toFallbackImagePath(imageUrl: string): string {
  if (imageUrl.startsWith(VIZAG_SITE_IMAGE_ORIGIN)) {
    return imageUrl.replace(`${VIZAG_SITE_IMAGE_ORIGIN}/`, '');
  }
  return imageUrl.replace(/^\//, '');
}

function buildDynamicVehicleEmbedConfig(
  slug: string,
  vehicle?: VehicleEmbedVehicleInput | null,
): VehicleEmbedConfig {
  const name = vehicle?.name ?? getVehicleDisplayName(slug);
  const capacity = vehicle?.capacity && vehicle.capacity > 0 ? vehicle.capacity : 4;
  const pricePerKm =
    typeof vehicle?.pricePerKm === 'number' && vehicle.pricePerKm > 0
      ? String(vehicle.pricePerKm)
      : '14';
  const illustration = resolveIllustrationForSlug(slug, vehicle);
  const ogImageUrl = illustration.cdnUrl;
  const description =
    vehicle?.seoContent?.metaDescription ??
    vehicle?.description ??
    `Book ${name} taxi in Visakhapatnam with professional driver, AC comfort, and transparent rates. Local, airport & outstation trips across Vizag and Andhra Pradesh. Call +91 9966363662.`;

  const isInnova = name.toLowerCase().includes('innova');
  return {
    slug,
    vehicleIds: vehicle?.id ? [vehicle.id] : [],
    seo: {
      title:
        vehicle?.seoContent?.title ??
        (isInnova
          ? 'Innova Crysta Taxi Booking in Vizag | Rates & Hire | Vizag Taxi Hub'
          : `${name} Taxi in Vizag | AC Cab Rental | Vizag Taxi Hub`),
      description,
      keywords:
        vehicle?.seoContent?.keywords ??
        `${name.toLowerCase()} taxi vizag, ${name.toLowerCase()} cab visakhapatnam, book ${name.toLowerCase()} vizag, vizag taxi hub`,
      capacityKeywordSuffix: capacityKeywordSuffix(capacity),
      canonicalUrl: `https://vizagtaxihub.com/vehicle/${slug}`,
      ogImageUrl,
      pageHeadline: isInnova ? 'Innova Crysta Taxi Booking' : `Book ${name}`,
      pageSubtitle: buildPageSubtitle(name, capacity),
      structuredDataName: `${name} Taxi Rental in Visakhapatnam`,
      structuredDataDescription: description,
      defaultPricePerKm: pricePerKm,
      structuredDataFallbackImage: toFallbackImagePath(ogImageUrl),
    },
    illustration,
    featureStripLabels: buildFeatureStripLabels(vehicle ?? {}, capacity),
    featureBarAriaLabel: `${name} highlights`,
    searchButtonLabel: `SEARCH ${name.toUpperCase()}`,
  };
}

export function getVehicleEmbedConfig(
  slug: string | undefined,
  vehicle?: VehicleEmbedVehicleInput | null,
): VehicleEmbedConfig | null {
  const normalized = slug?.trim().toLowerCase();
  if (!normalized) return null;

  if (isStaticVehicleEmbedSlug(normalized)) {
    return VEHICLE_EMBED_CONFIGS[normalized];
  }

  return buildDynamicVehicleEmbedConfig(normalized, vehicle);
}

/** Resolve embed slug from route param and/or loaded vehicle record. */
export function resolveVehicleEmbedSlug(
  slug: string | undefined,
  vehicle?: { id?: string; name?: string } | null,
): string | null {
  if (slug?.trim()) {
    return slug.trim().toLowerCase();
  }

  if (vehicle) {
    return generateVehicleUrl(vehicle);
  }

  return null;
}

export function resolveEmbedIllustrationSrc(config: VehicleEmbedConfig): string {
  const key = config.illustration.envVarKey;
  if (key) {
    const fromEnv = import.meta.env[key] as string | undefined;
    if (fromEnv?.trim()) return fromEnv.trim();
  }
  return config.illustration.cdnUrl;
}

export function resolveEmbedIllustrationLocalSrc(config: VehicleEmbedConfig): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${config.illustration.localPath}`;
}
