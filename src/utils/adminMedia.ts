import axios from 'axios';
import { getApiUrl } from '@/config/api';

function adminHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Normalize stored URL / GCS URL / storage key to object path for media.php */
export function extractStorageObject(sourceUrl: string): string | null {
  const trimmed = sourceUrl.trim();
  if (!trimmed) return null;

  if (/^(carpool-id|app-uploads|odometer-readings)\/.+/.test(trimmed)) {
    return trimmed;
  }

  const gcsMatch = trimmed.match(/storage\.googleapis\.com\/[^/]+\/(.+?)(?:\?|$)/i);
  if (gcsMatch) {
    return decodeURIComponent(gcsMatch[1]);
  }

  if (trimmed.startsWith('/uploads/')) {
    return trimmed.slice('/uploads/'.length);
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith('/uploads/')) {
      return parsed.pathname.slice('/uploads/'.length);
    }
  } catch {
    /* not a full URL */
  }

  return null;
}

function buildMediaQuery(sourceUrl: string, format?: 'json'): string {
  const object = extractStorageObject(sourceUrl);
  const params = new URLSearchParams({ action: 'media' });
  if (format === 'json') params.set('format', 'json');
  if (object) {
    params.set('object', object);
  } else {
    params.set('url', sourceUrl);
  }
  return params.toString();
}

async function fetchAdminMediaJson(sourceUrl: string): Promise<Blob> {
  const qs = buildMediaQuery(sourceUrl, 'json');
  const url = getApiUrl(`/api/shared-carpool/admin.php?${qs}`);
  const { data } = await axios.get<{ success: boolean; mime?: string; data?: string; error?: string }>(url, {
    headers: adminHeaders(),
  });
  if (!data.success || !data.data) {
    throw new Error(data.error || 'Unable to load image');
  }
  const binary = atob(data.data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: data.mime || 'image/png' });
}

async function fetchAdminMediaBinary(sourceUrl: string): Promise<Blob> {
  const qs = buildMediaQuery(sourceUrl);
  const url = getApiUrl(`/api/shared-carpool/admin.php?${qs}`);
  const response = await axios.get(url, {
    headers: adminHeaders(),
    responseType: 'blob',
    validateStatus: (status) => status >= 200 && status < 300,
  });
  const blob = response.data as Blob;
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new Error('Empty media response');
  }

  const header = (await blob.slice(0, 256).text()).trimStart();
  if (/^<(!DOCTYPE|html|head)/i.test(header)) {
    throw new Error('Server returned HTML instead of image');
  }
  if (/^(Unauthorized|Missing object|Unable to load|Invalid image|File not found)/i.test(header)) {
    throw new Error(header.split('\n')[0]);
  }

  const objectKey = extractStorageObject(sourceUrl);
  const mime =
    blob.type && !blob.type.includes('text') && blob.type !== 'application/octet-stream'
      ? blob.type
      : objectKey?.endsWith('.png')
        ? 'image/png'
        : objectKey?.endsWith('.webp')
          ? 'image/webp'
          : 'image/jpeg';

  return blob.type === mime ? blob : new Blob([blob], { type: mime });
}

export async function fetchAdminMediaBlob(sourceUrl: string): Promise<Blob> {
  try {
    return await fetchAdminMediaJson(sourceUrl);
  } catch (jsonErr) {
    try {
      return await fetchAdminMediaBinary(sourceUrl);
    } catch (binaryErr) {
      const msg =
        (binaryErr instanceof Error && binaryErr.message) ||
        (jsonErr instanceof Error && jsonErr.message) ||
        'Unable to load image';
      throw new Error(msg);
    }
  }
}

export async function openAdminMediaInNewTab(sourceUrl: string): Promise<void> {
  const blob = await fetchAdminMediaBlob(sourceUrl);
  const objectUrl = URL.createObjectURL(blob);
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) {
    URL.revokeObjectURL(objectUrl);
    throw new Error('Pop-up blocked. Allow pop-ups or use the in-page preview.');
  }
  win.document.title = 'ID Card';
  win.document.body.style.margin = '0';
  win.document.body.style.background = '#111';
  win.document.body.innerHTML = `<img src="${objectUrl}" alt="ID card" style="max-width:100%;height:auto;display:block;margin:0 auto;" />`;
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
}
