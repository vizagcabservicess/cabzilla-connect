# Publishing Vizag Taxi Hub to App Store & Play Store

## Where to Put Your App Icon & Splash Screen

**Important:** These images go in the **mobile app** folder, not the web app.

| Image | Folder path | Filename | Recommended size |
|-------|-------------|----------|-------------------|
| **App icon** | `mobile-app/assets/` | `icon.png` | 1024×1024 px |
| **Splash screen** | `mobile-app/assets/` | `splash-icon.png` | 1242×2436 px (or similar high-res) |

### Steps to upload your images

1. **App icon:** Replace  
   `mobile-app/assets/icon.png`  
   with your Vizag Taxi Hub logo (1024×1024 px, PNG, no transparency for best results).

2. **Splash screen:** Replace  
   `mobile-app/assets/splash-icon.png`  
   with your splash screen image.  
   The app uses **`resizeMode: "cover"`** in `app.json` so the image **fills the screen** on tall phones. Use a **wide, full-bleed** design (e.g. 1242×2436 or 1284×2778 px); avoid small centered logos on a huge canvas.  
   After changing splash settings, **rebuild the native app** (EAS Build or `expo prebuild` + local build)—splash is baked in at build time, not updated on JS refresh alone.

### Android adaptive icons (optional)

If you have separate layers for Android:
- `mobile-app/assets/android-icon-foreground.png` - logo/icon
- `mobile-app/assets/android-icon-background.png` - background
- `mobile-app/assets/android-icon-monochrome.png` - monochrome version

If you only have one icon image, you can use the same file for all three or use `icon.png` as the foreground.

---

## Publishing checklist

### 1. Install EAS CLI
```bash
npm install -g eas-cli
```

### 2. Log in to Expo
```bash
eas login
```

### 3. Configure credentials (first time only)
```bash
eas credentials
```

### 4. Build for stores

**Android (AAB for Play Store):**
```bash
cd mobile-app
eas build --platform android --profile production
```

**iOS (IPA for App Store):**
```bash
eas build --platform ios --profile production
```

**Both:**
```bash
eas build --platform all --profile production
```

### 5. Submit to stores

After builds complete:
```bash
eas submit --platform android --latest
eas submit --platform ios --latest
```

---

## Store accounts required

- **Google Play:** [Google Play Console](https://play.google.com/console) – $25 one-time
- **Apple:** [Apple Developer Program](https://developer.apple.com) – $99/year

---

## Bundle identifiers (configured in app.json)

- **iOS:** `com.vizagtaxihub.app`
- **Android:** `com.vizagtaxihub.app`

Change these if you need a different identifier (e.g. `com.yourcompany.vizagtaxihub`).
