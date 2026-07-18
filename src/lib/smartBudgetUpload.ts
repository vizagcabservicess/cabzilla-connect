import axios from 'axios';
import { getApiUrl } from '@/config/api';

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Upload API returns paths like `/uploads/…`. Vite only proxies `/api`, so relative
 * `/uploads` URLs break as <img src> on localhost — always resolve to the live site.
 */
export function resolveSmartBudgetMediaUrl(url: string | null | undefined): string {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';
  if (/^(https?:|blob:|data:)/i.test(trimmed)) return trimmed;

  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (/^https?:\/\/([a-z0-9-]+\.)*vizagtaxihub\.com$/i.test(origin)) {
      return `${origin}${path}`;
    }
  }
  return `https://www.vizagtaxihub.com${path}`;
}

export async function uploadSmartBudgetVendorFile(
  file: File,
  category = 'sb-vendor-doc'
): Promise<string> {
  if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
    throw new Error('Upload JPG, PNG, WEBP, or PDF only');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('File must be under 5MB');
  }
  const form = new FormData();
  form.append('image', file);
  form.append('category', category);
  const { data } = await axios.post(getApiUrl('/api/upload-image.php'), form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const url =
    data?.url ||
    data?.data?.url ||
    data?.file_url ||
    data?.data?.file_url ||
    data?.path ||
    data?.data?.path;
  if (!url) throw new Error('Upload failed');
  return resolveSmartBudgetMediaUrl(String(url));
}
