import type { GalleryItem } from '@/types/cab';

/** PHP / admin APIs sometimes use snake_case or other keys for the image URL. */
export function normalizeGalleryItemsFromApi(raw: unknown[]): GalleryItem[] {
  const out: GalleryItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const url = String(r.url ?? r.image_url ?? r.image ?? r.src ?? '').trim();
    if (!url) continue;
    const alt =
      (typeof r.alt === 'string' && r.alt.trim()) ||
      (typeof r.caption === 'string' && r.caption.trim()) ||
      undefined;
    out.push({ url, alt });
  }
  return out;
}
