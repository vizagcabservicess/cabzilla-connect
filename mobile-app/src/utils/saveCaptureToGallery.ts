/**
 * Best-effort save of an in-app camera capture to the device photo gallery
 * so drivers can resubmit / WhatsApp photos to the office if upload fails.
 *
 * Android: do not request READ_MEDIA_* (Play Photo/Video Permissions policy).
 * App-created captures can be inserted via MediaStore without broad gallery read.
 * iOS: request add-only (writeOnly) access when needed.
 */
import { Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';

export async function saveCaptureToGallery(localUri: string | null | undefined): Promise<boolean> {
  if (!localUri || Platform.OS === 'web') return false;
  try {
    if (Platform.OS === 'ios') {
      const current = await MediaLibrary.getPermissionsAsync(true);
      if (!current.granted) {
        const requested = await MediaLibrary.requestPermissionsAsync(true);
        if (!requested.granted) return false;
      }
    }
    await MediaLibrary.saveToLibraryAsync(localUri);
    return true;
  } catch {
    return false;
  }
}
