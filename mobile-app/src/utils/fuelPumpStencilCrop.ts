/**
 * Maps the on-screen stencil box (pump LCD or odometer MID guide) onto takePictureAsync dimensions,
 * crops, then resizes for Gemini OCR (high segment clarity).
 */
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export const GEMINI_PUMP_EXPORT_WIDTH = 2048;
export const GEMINI_PUMP_EXPORT_QUALITY = 0.88;

export type StencilLayout = {
  screenW: number;
  screenH: number;
  boxW: number;
  boxH: number;
  topOffset: number;
};

/**
 * Crops to the stencil region and exports a wide JPEG. Falls back to original URI if crop would be invalid.
 */
export async function cropPumpStencilForGemini(
  uri: string,
  photoWidth: number,
  photoHeight: number,
  stencil: StencilLayout,
): Promise<string> {
  const { screenW: w, screenH: h, boxW, boxH, topOffset } = stencil;
  if (!photoWidth || !photoHeight || w <= 0 || h <= 0 || boxW <= 0 || boxH <= 0) {
    return uri;
  }

  const focusLeft = (w - boxW) / 2;
  let originX = Math.floor((focusLeft / w) * photoWidth);
  let originY = Math.floor((topOffset / h) * photoHeight);
  let cropW = Math.ceil((boxW / w) * photoWidth);
  let cropH = Math.ceil((boxH / h) * photoHeight);

  originX = Math.max(0, Math.min(originX, photoWidth - 1));
  originY = Math.max(0, Math.min(originY, photoHeight - 1));
  cropW = Math.max(1, Math.min(cropW, photoWidth - originX));
  cropH = Math.max(1, Math.min(cropH, photoHeight - originY));

  if (cropW < 64 || cropH < 64) {
    return uri;
  }

  try {
    const out = await manipulateAsync(
      uri,
      [
        { crop: { originX, originY, width: cropW, height: cropH } },
        { resize: { width: GEMINI_PUMP_EXPORT_WIDTH } },
      ],
      { compress: GEMINI_PUMP_EXPORT_QUALITY, format: SaveFormat.JPEG },
    );
    return out.uri;
  } catch {
    return uri;
  }
}
