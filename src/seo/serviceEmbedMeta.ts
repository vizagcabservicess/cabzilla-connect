import { VIZAG_SITE_IMAGE_ORIGIN } from '@/utils/vehicleUrlUtils';

export type ServiceEmbedSlug = 'airport' | 'local' | 'outstation' | 'araku';

export interface ServiceEmbedSeo {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  pageHeadline: string;
  pageSubtitle: string;
  ogImageUrl: string;
}

export interface ServiceEmbedIllustration {
  cdnUrl: string;
  localPath: string;
}

export interface ServiceEmbedTrustItem {
  title: string;
  subtitle: string;
  icon: 'shield' | 'clock' | 'badgeCheck';
}

export interface ServiceEmbedMarketingHero {
  badge: string;
  /** Word inside `pageHeadline` rendered in brand blue (e.g. "Vizag"). */
  accentWord?: string;
  /** Desktop booking-card heading. */
  bookingCardTitle: string;
  trustItems: ServiceEmbedTrustItem[];
  heroImageUrl: string;
}

export interface ServiceEmbedConfig {
  slug: ServiceEmbedSlug;
  seo: ServiceEmbedSeo;
  illustration: ServiceEmbedIllustration;
  summaryBackHref: string;
  /** Optional marketing hero (Local mockup-style). */
  marketingHero?: ServiceEmbedMarketingHero;
}

export const SERVICE_EMBED_CONFIGS: Record<ServiceEmbedSlug, ServiceEmbedConfig> = {
  airport: {
    slug: 'airport',
    seo: {
      title: 'Vizag Airport Taxi | Airport Pickup & Transfer | Cabs in Visakhapatnam Airport',
      description:
        'Book Vizag airport taxi, airport pickup Vizag, and airport transfer Vizag at fixed rates. Visakhapatnam airport cabs 24/7 with professional drivers. Call +91 9966363662.',
      keywords:
        'vizag airport taxi, vizag airport cabs, airport pickup vizag, airport transfer vizag, airport taxi visakhapatnam, visakhapatnam airport taxi, visakhapatnam airport cabs, cabs in vizag airport',
      canonicalUrl: 'https://vizagtaxihub.com/airport-taxi',
      pageHeadline: 'Cabs in Visakhapatnam Airport',
      pageSubtitle: 'Vizag airport taxi, pickup & transfer at fixed rates',
      ogImageUrl: `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/taxi-services--visakhapatnam-innova-crysta.png`,
    },
    illustration: {
      cdnUrl: `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/crysta-search.jpg`,
      localPath: '/uploads/hero-vizag-scene.png',
    },
    summaryBackHref: '/airport-taxi',
    marketingHero: {
      badge: 'On-time. Fixed rates. 24/7.',
      accentWord: 'Airport',
      bookingCardTitle: 'Book Airport Cab',
      trustItems: [
        {
          title: 'Flight Tracking',
          subtitle: 'We monitor delays & early arrivals',
          icon: 'clock',
        },
        {
          title: 'Meet & Greet',
          subtitle: 'Name board & luggage help',
          icon: 'badgeCheck',
        },
        {
          title: 'Safe Transfer',
          subtitle: 'Licensed drivers with GPS',
          icon: 'shield',
        },
      ],
      heroImageUrl: `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/taxi-services--visakhapatnam-innova-crysta.png`,
    },
  },
  local: {
    slug: 'local',
    seo: {
      title: 'Local Cabs in Vizag | Taxi in Visakhapatnam | Book City Cab',
      description:
        'Book local cabs in Vizag and taxi in Visakhapatnam for city rides and Vizag cab booking. 24/7 Vizag taxi service with verified drivers and fair rates. Call +91 9966363662.',
      keywords:
        'local cabs in vizag, taxi in visakhapatnam, vizag cab booking, vizag taxi service, visakhapatnam cab booking, local taxi visakhapatnam, city cab vizag',
      canonicalUrl: 'https://vizagtaxihub.com/local-taxi',
      pageHeadline: 'Local Cabs in Vizag',
      pageSubtitle: 'Taxi in Visakhapatnam — city rides, 24/7 booking',
      ogImageUrl: `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/taxi-services--visakhapatnam-sedan.png`,
    },
    illustration: {
      cdnUrl: `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/dzire-search.jpg`,
      localPath: '/uploads/hero-vizag-scene.png',
    },
    summaryBackHref: '/local-taxi',
    marketingHero: {
      badge: 'Reliable. Safe. On Time.',
      accentWord: 'Vizag',
      bookingCardTitle: 'Book Your Local Cab',
      trustItems: [
        {
          title: 'Verified Drivers',
          subtitle: 'Trained & Background Verified',
          icon: 'shield',
        },
        {
          title: '24/7 Support',
          subtitle: "We're always here for you",
          icon: 'clock',
        },
        {
          title: 'Best Price',
          subtitle: 'Transparent & Competitive',
          icon: 'badgeCheck',
        },
      ],
      heroImageUrl: `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/taxi-services--visakhapatnam-sedan.png`,
    },
  },
  outstation: {
    slug: 'outstation',
    seo: {
      title: 'Outstation Taxi Service in Visakhapatnam | One Way Cab from Vizag',
      description:
        'Book outstation taxi service in Visakhapatnam for one-way and round-trip cabs. Vizag to Araku, Annavaram, Hyderabad and more — transparent rates, 24/7. Call +91 9966363662.',
      keywords:
        'outstation taxi service in visakhapatnam, outstation taxi visakhapatnam, one way cab from vizag, vizag to annavaram cabs, outstation cab booking visakhapatnam',
      canonicalUrl: 'https://vizagtaxihub.com/outstation-taxi',
      pageHeadline: 'Outstation Taxi Service in Visakhapatnam',
      pageSubtitle: 'One-way & round-trip cabs from Vizag across AP',
      ogImageUrl: `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/taxi-services--visakhapatnam-innova-crysta.png`,
    },
    illustration: {
      cdnUrl: `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/crysta-search.jpg`,
      localPath: '/uploads/hero-vizag-scene.png',
    },
    summaryBackHref: '/outstation-taxi',
    marketingHero: {
      badge: 'One-way & Round-trip. Transparent rates.',
      accentWord: 'Visakhapatnam',
      bookingCardTitle: 'Book Outstation Cab',
      trustItems: [
        {
          title: 'Door-to-Door',
          subtitle: 'Pickup from your location',
          icon: 'badgeCheck',
        },
        {
          title: 'Safe Travel',
          subtitle: 'GPS tracking & verified drivers',
          icon: 'shield',
        },
        {
          title: 'Best Rates',
          subtitle: 'Clear per-km pricing',
          icon: 'clock',
        },
      ],
      heroImageUrl: `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/taxi-services--visakhapatnam-innova-crysta.png`,
    },
  },
  araku: {
    slug: 'araku',
    seo: {
      title: 'Araku Valley Tour Packages from Vizag | Vizag Taxi Hub',
      description:
        'Book Araku Valley tour packages from Vizag — one-day trips, cab booking, and sightseeing with AC tempo traveller. Araku tour from Vizag with driver. Call +91 9966363662.',
      keywords:
        'araku valley tour, araku valley tour package, araku tour from vizag, araku valley one day trip, araku valley trip from vizag, vizag araku tour, araku valley cab booking',
      canonicalUrl: 'https://vizagtaxihub.com/araku-tour-packages-vizag',
      pageHeadline: 'Araku Valley Tour Packages from Vizag',
      pageSubtitle: 'One-day trips, cab booking & sightseeing from Vizag',
      ogImageUrl: `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/taxi-services--visakhapatnam-tempo-traveller.png`,
    },
    illustration: {
      cdnUrl: `${VIZAG_SITE_IMAGE_ORIGIN}/uploads/tempo-traveller-search.jpg`,
      localPath: '/uploads/hero-vizag-scene.png',
    },
    summaryBackHref: '/araku-tour-packages-vizag',
  },
};

export function getServiceEmbedConfig(slug: ServiceEmbedSlug): ServiceEmbedConfig {
  return SERVICE_EMBED_CONFIGS[slug];
}

export function resolveServiceIllustrationSrc(config: ServiceEmbedConfig): string {
  return config.illustration.cdnUrl;
}

export function resolveServiceIllustrationLocalSrc(config: ServiceEmbedConfig): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${config.illustration.localPath}`;
}
