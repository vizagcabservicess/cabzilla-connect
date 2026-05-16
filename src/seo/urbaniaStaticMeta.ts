/**
 * Single source for Urbania /vehicle/urbania meta used in:
 * - VehicleDetailPage (Helmet) fallbacks
 * - Build-time index-vehicle-urbania.html for WhatsApp / Facebook / etc. (no-JS crawlers)
 */
export const URBANIA_SEO_DEFAULTS = {
  title: 'Urbania Van Rental in Vizag | Premium AC Group Travel | Vizag Taxi Hub',
  description:
    'Book Urbania van hire in Visakhapatnam for weddings, corporate groups, and outstation trips. Premium AC Urbania with professional driver — local, airport & Andhra Pradesh. Call +91 9966363662.',
  /** Helmet appends `, ${capacity} seater urbania` in VehicleDetailPage. */
  keywords:
    'urbania rental vizag, urbania hire visakhapatnam, force urbania vizag, urbania mini bus vizag, corporate urbania vizag, wedding urbania vizag, AC urbania outstation vizag, premium van hire vizag, vizag taxi hub urbania',
  /** Absolute URLs for OG (required for WhatsApp / FB). */
  canonicalUrl: 'https://vizagtaxihub.com/vehicle/urbania',
  ogImageUrl: 'https://vizagtaxihub.com/uploads/og-image-urbania.jpg',
  /** Visible H1 / subcopy on `/vehicle/urbania` (kept outside collapsed browse content). */
  pageHeadline: 'Book Urbania',
  pageSubtitle: 'Premium Urbania for group travel',
} as const;

/**
 * Hero art (marketing illustration).
 * Default: vizagtaxihub CDN. Override with `VITE_URBANIA_ILLUSTRATION_URL`. Same filename under `public/uploads/` used as `<img onError>` fallback.
 */
export const URBANIA_ILLUSTRATION_CDN_URL =
  'https://vizagtaxihub.com/uploads/urbania-illustrator-vth.png' as const;

export const URBANIA_ILLUSTRATION_PATH = '/uploads/urbania-illustrator-vth.png' as const;

/** Absolute asset URL — OG / sharing / parity with CDN file name. */
export const URBANIA_ILLUSTRATION_URL = URBANIA_ILLUSTRATION_CDN_URL;

/** Bundled copy under `public/uploads/` (dev default + `<img>` fallback if CDN errors). */
export function resolveUrbaniaIllustrationLocalSrc(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${URBANIA_ILLUSTRATION_PATH}`;
}

/** Primary `<img src>` — CDN by default; env override wins. Local `URBANIA_ILLUSTRATION_PATH` is swapped in on load error from VehicleDetailPage. */
export function resolveUrbaniaIllustrationSrc(): string {
  const fromEnv = import.meta.env.VITE_URBANIA_ILLUSTRATION_URL as string | undefined;
  if (fromEnv?.trim()) return fromEnv.trim();
  return URBANIA_ILLUSTRATION_CDN_URL;
}

export const URBANIA_FEATURE_STRIP_LABELS = [
  'Spacious & Comfortable',
  'Ample Luggage Space',
  'Powerful AC for Relaxed Ride',
  'Clean, Safe & Well Maintained',
] as const;
