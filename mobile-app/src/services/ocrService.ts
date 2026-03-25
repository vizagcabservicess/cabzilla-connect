/**
 * OCR Service - Extracts text from images.
 * Uses backend OCR (api/bill-text.php) for Expo Go compatibility.
 * Uses expo-text-extractor when running in a development build (native module available).
 */
import Constants from 'expo-constants';
import {
  uploadAsync,
  copyAsync,
  cacheDirectory,
  FileSystemUploadType,
} from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { API_BASE_URL, WEB_APP_BASE_URL } from '../config';
import { compressImageForUpload } from '../utils/compressImageForUpload';

const getBase = () => {
  const base = API_BASE_URL || (Platform.OS === 'web' ? '' : WEB_APP_BASE_URL || 'https://www.vizagtaxihub.com');
  if (!base) return '';
  return base.replace(/^(https?:\/\/)www\./, '$1');
};

/** Expo Go does not include native modules like expo-text-extractor. Use backend OCR instead. */
const useBackendOcr =
  Constants.appOwnership === 'expo' || Platform.OS === 'web';

export const isSupported = true;

/**
 * Extract text from an image URI.
 * Returns array of text strings (empty array if extraction fails).
 */
export async function extractTextFromImage(uri: string): Promise<string[]> {
  const fileUri = await resolveFileUri(uri);
  const compressedUri = await compressImageForUpload(fileUri);

  if (useBackendOcr) {
    return extractViaBackend(compressedUri);
  }
  try {
    const mod = require('expo-text-extractor');
    const texts = await mod.extractTextFromImage(compressedUri);
    return Array.isArray(texts) ? texts : texts ? [String(texts)] : [];
  } catch {
    return extractViaBackend(compressedUri);
  }
}

/** Android camera often returns content:// — copy to file:// for native upload. */
async function resolveFileUri(uri: string): Promise<string> {
  const cache = cacheDirectory;
  if (Platform.OS === 'android' && uri.startsWith('content://') && cache) {
    const dest = `${cache}ocr-upload-${Date.now()}.jpg`;
    await copyAsync({ from: uri, to: dest });
    return dest;
  }
  return uri;
}

async function extractViaBackend(uri: string): Promise<string[]> {
  const base = getBase();
  if (!base) {
    throw new Error('API URL not configured. Set EXPO_PUBLIC_API_BASE_URL or EXPO_PUBLIC_WEB_APP_BASE_URL.');
  }

  try {
    // Native multipart first; some Android builds return HTTP 200 with empty body from uploadAsync — then retry fetch
    const upload = await uploadAsync(`${base}/api/bill-text.php`, uri, {
      httpMethod: 'POST',
      uploadType: FileSystemUploadType.MULTIPART,
      fieldName: 'image',
      mimeType: 'image/jpeg',
    });

    let httpStatus = upload.status;
    let raw = (upload.body ?? '').replace(/^\uFEFF/, '').trim();
    if (!raw && httpStatus === 200) {
      const fd = new FormData();
      fd.append('image', {
        uri,
        name: 'ocr.jpg',
        type: 'image/jpeg',
      } as unknown as Blob);
      const res = await fetch(`${base}/api/bill-text.php`, { method: 'POST', body: fd });
      httpStatus = res.status;
      raw = (await res.text()).replace(/^\uFEFF/, '').trim();
    }

    let data: { text?: string; error?: string; ok?: boolean } = {};
    try {
      data = JSON.parse(raw);
    } catch {
      const snippet = raw.slice(0, 150).replace(/\s+/g, ' ').trim() || '(empty)';
      let diag = '';
      try {
        const h = await fetch(`${base}/api/health.php`);
        const hb = (await h.text()).slice(0, 120);
        diag = ` health.php: HTTP ${h.status} ${hb || '(empty)'}`;
      } catch {
        diag = ' health.php fetch failed';
      }
      throw new Error(
        `[OCR v5] non-JSON (HTTP ${httpStatus}). Response: ${snippet}${raw.length > 150 ? '...' : ''}.${diag}`
      );
    }

    if (httpStatus >= 400) {
      throw new Error(String(data.error ?? data) || `Request failed (${httpStatus})`);
    }
    if (data.ok && !data.text && !data.error) {
      throw new Error('Got OPTIONS-only JSON. Deploy latest .htaccess (api/ + root) and bill-text.php.');
    }
    const text = typeof data.text === 'string' ? data.text.trim() : '';
    if (data.error && !text) {
      throw new Error(String(data.error));
    }
    if (!text) {
      throw new Error('OCR returned no text. Try again or enter details manually.');
    }
    return [text];
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.includes('Network request failed') || e.message === 'Network Error') {
        throw new Error('Cannot reach server. Check internet connection and try again.');
      }
    }
    throw e;
  }
}
