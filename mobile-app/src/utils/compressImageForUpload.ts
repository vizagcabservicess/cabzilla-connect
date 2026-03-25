/**
 * Resize + JPEG compress before OCR / upload so files stay under Vision API (~4MB) limits.
 */
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { getInfoAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';

/** Target max file size (binary); Vision uses base64 ~4M chars — stay under ~3MB binary. */
const MAX_BYTES = 3 * 1024 * 1024;
const INITIAL_WIDTH = 1920;
const FALLBACK_WIDTH = 1280;
const INITIAL_QUALITY = 0.78;
const FALLBACK_QUALITY = 0.52;

export async function compressImageForUpload(uri: string): Promise<string> {
  if (!uri) return uri;

  async function compress(width: number, compressQuality: number) {
    return manipulateAsync(
      uri,
      [{ resize: { width } }],
      { compress: compressQuality, format: SaveFormat.JPEG }
    );
  }

  try {
    if (Platform.OS === 'web') {
      const first = await compress(Math.min(INITIAL_WIDTH, 1600), INITIAL_QUALITY);
      return first.uri;
    }

    let { uri: outUri } = await compress(INITIAL_WIDTH, INITIAL_QUALITY);

    try {
      const info = await getInfoAsync(outUri);
      const size = typeof info === 'object' && info && 'size' in info ? (info.size as number) : 0;
      if (size > MAX_BYTES && size > 0) {
        const second = await compress(FALLBACK_WIDTH, FALLBACK_QUALITY);
        outUri = second.uri;
      }
    } catch {
      /* keep first pass */
    }

    return outUri;
  } catch {
    return uri;
  }
}
