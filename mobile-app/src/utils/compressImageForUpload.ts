/**
 * Resize + JPEG compress before OCR / upload so files stay under Vision API (~4MB) limits.
 * Never upscales: stretching a small odometer or pump crop softens the digits OCR has to read.
 * Use `geminiVisionPreset: true` for driver fuel captures (2048px max edge, ~92% JPEG).
 */
import { manipulateAsync, SaveFormat, type Action } from 'expo-image-manipulator';
import { getInfoAsync } from 'expo-file-system/legacy';
import { Image } from 'react-native';

/** Target max file size (binary); Vision uses base64 ~4M chars — stay under ~3MB binary. */
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_EDGE = 2048;
const JPEG_QUALITY = 0.9;
const FALLBACK_EDGE = 1600;
const FALLBACK_QUALITY = 0.8;

const GEMINI_VISION_MAX_EDGE = 2048;
const GEMINI_VISION_JPEG_QUALITY = 0.92;

function imageSize(uri: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 4000);
    Image.getSize(
      uri,
      (width, height) => {
        clearTimeout(timer);
        resolve(width > 0 && height > 0 ? { width, height } : null);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

async function fileBytes(uri: string): Promise<number> {
  try {
    const info = await getInfoAsync(uri);
    return typeof info === 'object' && info && 'size' in info ? Number(info.size) || 0 : 0;
  } catch {
    return 0;
  }
}

/** Downscale the long edge. A missing measurement falls back to a width cap (may upscale). */
function downscaleAction(
  size: { width: number; height: number } | null,
  maxEdge: number,
): Action {
  if (!size) return { resize: { width: maxEdge } };
  if (size.height > size.width) {
    return { resize: { height: Math.min(maxEdge, size.height) } };
  }
  return { resize: { width: Math.min(maxEdge, size.width) } };
}

export async function compressImageForUpload(
  uri: string,
  options?: { preserveFullResolution?: boolean; geminiVisionPreset?: boolean }
): Promise<string> {
  if (!uri) return uri;
  if (options?.preserveFullResolution) {
    return uri;
  }

  const size = await imageSize(uri);
  const longEdge = size ? Math.max(size.width, size.height) : 0;
  const quality = options?.geminiVisionPreset ? GEMINI_VISION_JPEG_QUALITY : JPEG_QUALITY;
  const maxEdge = options?.geminiVisionPreset ? GEMINI_VISION_MAX_EDGE : MAX_EDGE;

  try {
    if (longEdge > 0 && longEdge <= maxEdge) {
      const bytes = await fileBytes(uri);
      if (bytes > 0 && bytes <= MAX_BYTES) return uri;
      if (bytes === 0 && options?.geminiVisionPreset) return uri;
    }

    const first = await manipulateAsync(uri, [downscaleAction(size, maxEdge)], {
      compress: quality,
      format: SaveFormat.JPEG,
    });
    if (options?.geminiVisionPreset) return first.uri;

    const bytes = await fileBytes(first.uri);
    if (bytes > MAX_BYTES && bytes > 0) {
      const second = await manipulateAsync(uri, [downscaleAction(size, FALLBACK_EDGE)], {
        compress: FALLBACK_QUALITY,
        format: SaveFormat.JPEG,
      });
      return second.uri;
    }
    return first.uri;
  } catch {
    return uri;
  }
}
