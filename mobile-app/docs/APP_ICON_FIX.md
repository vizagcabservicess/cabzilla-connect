# App Icon – Fix Cropping on Android

Android adaptive icons use a **safe zone**: only the center ~66% of the foreground image is always visible. The outer area is cropped by the system mask (circle, squircle, etc.).

## Problem

If the logo in `android-icon-foreground.png` is too wide or close to the edges, the left and right sides get cut off.

## Fix

1. Open `assets/android-icon-foreground.png` in an image editor (Figma, Photoshop, GIMP, etc.).
2. **Add padding** – Keep all important content inside the center 66% (about 17% margin on each side).
3. **Shrink the logo** – Make it about 60–70% of the canvas so it stays within the safe zone.
4. **Export** as 1024×1024 PNG with transparent background.
5. Replace `assets/android-icon-foreground.png`.
6. Rebuild: `npx eas build --platform android --profile production`

## Reference

- [Android Adaptive Icon Guidelines](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive)
- [Expo Figma template](https://www.figma.com/community/file/1466490409418563617) – includes safe-zone guides
