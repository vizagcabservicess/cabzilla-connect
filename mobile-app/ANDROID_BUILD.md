# Android Build Guide - Vizag Taxi Hub

## Quick build (APK for testing)

```bash
cd mobile-app
npm run build:android
```

Or for an APK (instead of AAB) for sideloading/testing:

```bash
npx eas build --platform android --profile preview
```

---

## First-time production setup (Play Store)

### 1. EAS CLI & login

```bash
npm install -g eas-cli
eas login
```

### 2. Set EAS Secrets (required for production builds)

Your `.env` is **not** used by EAS. Add secrets at [expo.dev](https://expo.dev) → Project → Secrets, or:

```bash
eas secret:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value "YOUR_GOOGLE_MAPS_API_KEY" --scope project --type string
eas secret:create --name EXPO_PUBLIC_API_BASE_URL --value "https://www.vizagtaxihub.com" --scope project --type string
eas secret:create --name EXPO_PUBLIC_WEB_APP_BASE_URL --value "https://www.vizagtaxihub.com" --scope project --type string
```

### 3. Configure Google Maps API key for production

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Edit your mobile API key (or create one)
3. **Application restrictions** → **Android apps** → Add:
   - Package: `com.vizagtaxihub.app`
   - SHA-1: From Play Console → **Setup** → **App signing** → **App signing key certificate**
4. Enable **Places API** (and **Geocoding API** if used)

### 4. Build production AAB (for Play Store)

```bash
cd mobile-app
eas build --platform android --profile production
```

### 5. Submit to Play Store

After the build completes:

```bash
eas submit --platform android --latest
```

Or upload the AAB manually: [Play Console](https://play.google.com/console) → Your app → **Production** → **Create new release**.

---

## Configuration summary

| File      | Purpose                                      |
|-----------|----------------------------------------------|
| `app.json` | Package `com.vizagtaxihub.app`, adaptive icons, `versionCode` |
| `eas.json` | Production uses AAB; preview uses APK for testing |
| `.env`    | Local dev only; EAS builds use EAS Secrets   |
