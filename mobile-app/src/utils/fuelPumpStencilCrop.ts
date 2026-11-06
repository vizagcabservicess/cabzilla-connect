/**
 * Maps the on-screen stencil (pump LCD, receipt, or odometer) onto the captured photo.
 * The camera preview is center-cropped to fill the screen, so a straight percentage of the
 * full photo grabs the bezel and glare outside the frame and leaves the digits small.
 */
import { manipulateAsync, SaveFormat, type Action } from 'expo-image-manipulator';

/** Longest edge sent to Gemini. Smaller crops stay at native size so digits are not upscaled. */
export const GEMINI_PUMP_EXPORT_WIDTH = 2048;
export const GEMINI_PUMP_EXPORT_QUALITY = 0.93;

export type StencilLayout = {
  screenW: number;
  screenH: number;
  boxW: number;
  boxH: number;
  topOffset: number;
};

export type CropRect = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

/**
 * Visible photo region for a preview that fills the screen (center crop), then the stencil
 * inside that region. `padFraction` keeps a digit that sits on the box edge inside the crop.
 */
export function coverStencilCropRect(
  photoWidth: number,
  photoHeight: number,
  stencil: StencilLayout,
  padFraction = 0.06,
): CropRect | null {
  const { screenW, screenH, boxW, boxH, topOffset } = stencil;
  if (photoWidth < 2 || photoHeight < 2 || screenW <= 0 || screenH <= 0 || boxW <= 0 || boxH <= 0) {
    return null;
  }

  const screenAspect = screenW / screenH;
  const photoAspect = photoWidth / photoHeight;
  let visibleX = 0;
  let visibleY = 0;
  let visibleW = photoWidth;
  let visibleH = photoHeight;
  if (photoAspect > screenAspect + 0.01) {
    visibleH = photoHeight;
    visibleW = photoHeight * screenAspect;
    visibleX = (photoWidth - visibleW) / 2;
  } else if (photoAspect < screenAspect - 0.01) {
    visibleW = photoWidth;
    visibleH = photoWidth / screenAspect;
    visibleY = (photoHeight - visibleH) / 2;
  }

  const padX = boxW * padFraction;
  const padY = boxH * padFraction;
  const left = Math.max(0, (screenW - boxW) / 2 - padX);
  const top = Math.max(0, topOffset - padY);
  const frameW = Math.min(screenW - left, boxW + padX * 2);
  const frameH = Math.min(screenH - top, boxH + padY * 2);

  let originX = Math.round(visibleX + (left / screenW) * visibleW);
  let originY = Math.round(visibleY + (top / screenH) * visibleH);
  let cropW = Math.round((frameW / screenW) * visibleW);
  let cropH = Math.round((frameH / screenH) * visibleH);

  originX = Math.max(0, Math.min(originX, photoWidth - 1));
  originY = Math.max(0, Math.min(originY, photoHeight - 1));
  cropW = Math.max(1, Math.min(cropW, photoWidth - originX));
  cropH = Math.max(1, Math.min(cropH, photoHeight - originY));
  if (cropW < 64 || cropH < 64) return null;
  return { originX, originY, width: cropW, height: cropH };
}

/**
 * Crops to the stencil the driver framed and exports a JPEG. Falls back to the original URI
 * if the crop would be invalid.
 */
export async function cropPumpStencilForGemini(
  uri: string,
  photoWidth: number,
  photoHeight: number,
  stencil: StencilLayout,
  padFraction = 0.06,
): Promise<string> {
  let sourceUri = uri;
  let width = photoWidth;
  let height = photoHeight;
  const screenPortrait = stencil.screenH >= stencil.screenW;
  const photoPortrait = height >= width;
  if (width > 0 && height > 0 && screenPortrait !== photoPortrait) {
    try {
      const turned = await manipulateAsync(
        sourceUri,
        [{ rotate: 90 }],
        { compress: 1, format: SaveFormat.JPEG },
      );
      sourceUri = turned.uri;
      width = turned.width || height;
      height = turned.height || photoWidth;
    } catch {
      /* Crop the buffer as returned. */
    }
  }

  const rect = coverStencilCropRect(width, height, stencil, padFraction);
  if (!rect) return uri;

  const actions: Action[] = [{ crop: rect }];
  if (rect.width >= rect.height && rect.width > GEMINI_PUMP_EXPORT_WIDTH) {
    actions.push({ resize: { width: GEMINI_PUMP_EXPORT_WIDTH } });
  } else if (rect.height > rect.width && rect.height > GEMINI_PUMP_EXPORT_WIDTH) {
    actions.push({ resize: { height: GEMINI_PUMP_EXPORT_WIDTH } });
  }

  try {
    const out = await manipulateAsync(sourceUri, actions, {
      compress: GEMINI_PUMP_EXPORT_QUALITY,
      format: SaveFormat.JPEG,
    });
    return out.uri;
  } catch {
    return uri;
  }
}
