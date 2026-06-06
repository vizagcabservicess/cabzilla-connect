/**
 * Shared config for `/vehicle/*` pages that embed the Hero booking widget
 * (Urbania-style mobile layout: illustration, search slot, step-2 hide grid).
 */
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
  slug: VehicleEmbedSlug;
  /** Fleet ids that resolve to this embed page */
  vehicleIds: readonly string[];
  seo: VehicleEmbedSeo;
  illustration: VehicleEmbedIllustration;
  featureStripLabels: readonly string[];
  featureBarAriaLabel: string;
  searchButtonLabel: string;
}

export const VEHICLE_EMBED_CONFIGS: Record<VehicleEmbedSlug, VehicleEmbedConfig> = {
  urbania: {
    slug: 'urbania',
    vehicleIds: ['bus'],
    seo: {
      title: 'Urbania Van Rental in Vizag | Premium AC Group Travel | Vizag Taxi Hub',
      description:
        'Book Urbania van hire in Visakhapatnam for weddings, corporate groups, and outstation trips. Premium AC Urbania with professional driver — local, airport & Andhra Pradesh. Call +91 9966363662.',
      keywords:
        'urbania rental vizag, urbania hire visakhapatnam, force urbania vizag, urbania mini bus vizag, corporate urbania vizag, wedding urbania vizag, AC urbania outstation vizag, premium van hire vizag, vizag taxi hub urbania',
      capacityKeywordSuffix: 'seater urbania',
      canonicalUrl: 'https://vizagtaxihub.com/vehicle/urbania',
      ogImageUrl: 'https://vizagtaxihub.com/uploads/og-image-urbania.jpg',
      pageHeadline: 'Book Urbania',
      pageSubtitle: 'Premium Urbania for group travel',
      structuredDataName: 'Urbania Premium Van Rental in Visakhapatnam',
      structuredDataDescription:
        'Urbania van hire in Vizag for weddings, corporate travel, pilgrimages, and outstation group trips — AC comfort and professional driver.',
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
      title: '17 Seater Tempo Traveller Rental in Vizag | AC Group Travel | Vizag Taxi Hub',
      description:
        'Book 17 seater AC tempo traveller in Visakhapatnam for weddings, corporate groups, and outstation trips. Professional driver, modern amenities — local, airport & AP routes. Call +91 9966363662.',
      keywords:
        'tempo traveller rental vizag, 17 seater tempo visakhapatnam, tempo traveller hire vizag, AC tempo traveller vizag, group travel tempo vizag, wedding tempo traveller vizag, corporate tempo vizag, outstation tempo vizag, vizag taxi hub tempo',
      capacityKeywordSuffix: 'seater tempo traveller',
      canonicalUrl: 'https://vizagtaxihub.com/vehicle/tempo-traveller',
      ogImageUrl: 'https://vizagtaxihub.com/uploads/taxi-services--visakhapatnam-tempo-traveller.png',
      pageHeadline: 'Book Tempo Traveller',
      pageSubtitle: '17-seater AC tempo for group travel',
      structuredDataName: '17 Seater AC Tempo Traveller Rental in Vizag',
      structuredDataDescription:
        'Best 17 seater tempo traveller rental service in Visakhapatnam with professional drivers, AC comfort, and modern amenities for group travel.',
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

const EMBED_SLUG_SET = new Set<string>(Object.keys(VEHICLE_EMBED_CONFIGS));

export function isVehicleEmbedSlug(slug: string | undefined): slug is VehicleEmbedSlug {
  return Boolean(slug && EMBED_SLUG_SET.has(slug));
}

export function getVehicleEmbedConfig(slug: string | undefined): VehicleEmbedConfig | null {
  if (!isVehicleEmbedSlug(slug)) return null;
  return VEHICLE_EMBED_CONFIGS[slug];
}

/** Resolve embed slug from route param and/or loaded vehicle record. */
export function resolveVehicleEmbedSlug(
  slug: string | undefined,
  vehicle?: { id?: string; name?: string } | null,
): VehicleEmbedSlug | null {
  if (isVehicleEmbedSlug(slug)) return slug;

  const vehicleId = vehicle?.id?.toLowerCase();
  if (vehicleId) {
    for (const config of Object.values(VEHICLE_EMBED_CONFIGS)) {
      if (config.vehicleIds.some((id) => id === vehicleId)) {
        return config.slug;
      }
    }
  }

  const name = vehicle?.name?.toLowerCase() ?? '';
  if (name.includes('urbania')) return 'urbania';
  if (name.includes('tempo')) return 'tempo-traveller';

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
