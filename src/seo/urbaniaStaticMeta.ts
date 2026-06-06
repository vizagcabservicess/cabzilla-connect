/**
 * Urbania-specific exports — backed by shared vehicle embed config.
 * @see vehicleEmbedMeta.ts
 */
import {
  VEHICLE_EMBED_CONFIGS,
  resolveEmbedIllustrationLocalSrc,
  resolveEmbedIllustrationSrc,
} from '@/seo/vehicleEmbedMeta';

const urbania = VEHICLE_EMBED_CONFIGS.urbania;

export const URBANIA_SEO_DEFAULTS = {
  title: urbania.seo.title,
  description: urbania.seo.description,
  keywords: urbania.seo.keywords,
  canonicalUrl: urbania.seo.canonicalUrl,
  ogImageUrl: urbania.seo.ogImageUrl,
  pageHeadline: urbania.seo.pageHeadline,
  pageSubtitle: urbania.seo.pageSubtitle,
} as const;

export const URBANIA_ILLUSTRATION_CDN_URL = urbania.illustration.cdnUrl;
export const URBANIA_ILLUSTRATION_PATH = urbania.illustration.localPath;
export const URBANIA_ILLUSTRATION_URL = URBANIA_ILLUSTRATION_CDN_URL;

export function resolveUrbaniaIllustrationLocalSrc(): string {
  return resolveEmbedIllustrationLocalSrc(urbania);
}

export function resolveUrbaniaIllustrationSrc(): string {
  return resolveEmbedIllustrationSrc(urbania);
}

export const URBANIA_FEATURE_STRIP_LABELS = urbania.featureStripLabels;
