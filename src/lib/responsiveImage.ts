import { resolveSmartBudgetMediaUrl } from '@/lib/smartBudgetUpload';

const WIDTHS = [400, 800, 1280, 1600] as const;

export type UploadWidth = (typeof WIDTHS)[number];

export type ResponsiveUploadImage = {
  src: string;
  srcSet?: string;
  sizes?: string;
};

function uploadsPath(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  let pathname = trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      pathname = new URL(trimmed).pathname;
    } catch {
      return null;
    }
  }
  const path = pathname.split('?')[0];
  if (!path.startsWith('/uploads/') || path.includes('..') || path.includes('/_sized/')) return null;
  if (/\/(carpool-id|odometer-readings|vth-event-private|sb-vendor)\//.test(path)) return null;
  return path;
}

/** Static sized URL. image.php creates the file the first time it is requested. */
export function sizedUploadImage(url: string, width: UploadWidth): string {
  const path = uploadsPath(url);
  if (!path) return url;
  const relative = path.slice('/uploads/'.length);
  return resolveSmartBudgetMediaUrl(`/uploads/_sized/${width}/${relative}.webp`) || url;
}

export function responsiveUploadImage(url: string, sizes: string): ResponsiveUploadImage {
  const path = uploadsPath(url);
  if (!path) return { src: url };
  const srcSet = WIDTHS.map((width) => `${sizedUploadImage(url, width)} ${width}w`).join(', ');
  return { src: sizedUploadImage(url, 800), srcSet, sizes };
}

/** If the sized file is not on the server yet, show the original upload. */
export function showOriginalOnImageError(event: { currentTarget: HTMLImageElement }): void {
  const img = event.currentTarget;
  const full = img.dataset.full;
  if (!full || img.dataset.fallback === '1') return;
  img.dataset.fallback = '1';
  img.removeAttribute('srcset');
  img.src = full;
}
