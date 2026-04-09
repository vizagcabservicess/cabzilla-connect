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
} as const;
