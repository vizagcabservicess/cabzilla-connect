/**
 * Image URL optimization for LCP and performance.
 * Appends resize/quality params when backend supports them (WordPress, CDNs, etc.)
 *
 * Disabled by default until backend supports ?w= and ?q= params.
 * Set VITE_IMAGE_OPTIMIZATION=true in .env when backend is ready.
 */

const OPTIMIZATION_ENABLED = import.meta.env.VITE_IMAGE_OPTIMIZATION === 'true';

const OPTIMIZATION_HOSTS = ['vizagtaxihub.com', 'www.vizagtaxihub.com'];

export interface ImageOptimizationOptions {
  width?: number;
  quality?: number;
  format?: 'webp' | 'avif';
}

/**
 * Returns an optimized image URL with resize/quality params for same-origin images.
 * Falls back to original URL if optimization is disabled or URL is external.
 */
export function getOptimizedImageUrl(
  url: string | undefined,
  options: ImageOptimizationOptions = {}
): string {
  if (!url) return '';
  if (!OPTIMIZATION_ENABLED) return url;

  const { width = 800, quality = 80 } = options;

  try {
    const parsed = new URL(url, 'https://vizagtaxihub.com');
    const isOptimizable = OPTIMIZATION_HOSTS.some((h) =>
      parsed.hostname.toLowerCase().includes(h)
    );

    if (!isOptimizable) return url;

    // Append params - many backends (WordPress, CDNs) support w= and q=
    parsed.searchParams.set('w', String(width));
    parsed.searchParams.set('q', String(quality));
    return parsed.toString();
  } catch {
    return url;
  }
}
