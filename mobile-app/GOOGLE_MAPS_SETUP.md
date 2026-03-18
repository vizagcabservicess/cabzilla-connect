# Google Maps / Places API - Mobile App Setup

## Verify map suggestions BEFORE an Android build (no EAS needed)

Use Expo Go to test location suggestions without using an EAS build.

### Step 1: Add API key to .env

```bash
cd mobile-app
cp .env.example .env
```

Edit `.env` and set:
```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

### Step 2: Allow Expo Go in Google Cloud (if your key has Android restrictions)

If your key is restricted to **Android apps** with only `com.vizagtaxihub.app`, Expo Go will get `REQUEST_DENIED` because Expo Go uses a different package.

**Option A – Add Expo Go to your key:**
1. [Credentials](https://console.cloud.google.com/apis/credentials) → Edit your key
2. Under **Android apps** → **Add**:
   - **Package name:** `host.exp.exponent`
   - **SHA-1 fingerprint:** `F0:F1:A4:5B:33:90:47:0D:33:81:EF:8C:15:22:F7:E8:2D:97:4B:A1:73`
3. **Save** (can take up to 5 minutes to apply)

**Option B – Create a second key for development:**
1. Create a new API key
2. **Application restrictions** → **None** (for quick dev testing)
3. **API restrictions** → **Places API**
4. Put this key in `.env` for local testing. Use your main key in EAS for builds.

### Step 3: Run and test

```bash
cd mobile-app
npx expo start
```

1. Scan the QR code with **Expo Go** on your Android phone (same Wi‑Fi as your computer)
2. Open the app → Home → tap the **FROM** field
3. Type "Vis" or "Visa" – suggestions should appear (Visakhapatnam, etc.)

If suggestions appear in Expo Go, your setup is correct and an EAS build will work.

---

## Problem
`REQUEST_DENIED: API keys with referer restrictions cannot be used with this API`

Your API key is restricted to **HTTP referrers** (for the web app). Native apps and Expo Go don't send referrers, so Google blocks the request.

## Quick fix: Create a separate key for mobile (recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. **Create credentials** → **API key**
3. Click **Restrict key**
4. **Application restrictions** → Select **None** (for development)
5. **API restrictions** → **Restrict key** → Select **Places API** (and **Maps JavaScript API** if using web Maps)
6. Click **Save**
7. Copy the new key and add to `mobile-app/.env`:
   ```
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_new_mobile_key_here
   ```
8. Restart Expo (`npx expo start`)

This keeps your web key restricted for security; the mobile key is used only by the app.

## Alternative: Add Android app to existing key

If you want one key for both web and mobile:

1. **Credentials** → Click your existing API key
2. Under **Application restrictions** → **HTTP referrers (web sites)**, you may have `https://vizagtaxihub.com/*` etc.
3. Change to **Android apps** OR add **Android apps** as an additional restriction (if your console allows both):
   - Package name: `host.exp.exponent`
   - SHA-1: Run `keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android` and use the SHA1 value (without colons)
4. **Save**

Note: Some Google Cloud setups only allow one restriction type per key. In that case, use the "Quick fix" (separate key) above.

---

## Preview APK: No suggestions when typing

If you're testing with a **preview APK** (internal distribution) and location suggestions don't appear:

**The API key must be set for the `preview` environment.** If you only set it for `production`, preview builds won't have the key.

```bash
# Set for preview (so preview APK gets the key)
npx eas env:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value "YOUR_KEY" --type string --environment preview --visibility plaintext

# Or use a secret (applies to ALL builds: preview + production)
npx eas secret:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value "YOUR_KEY" --scope project --type string
```

Then **rebuild** the preview APK. Existing APKs were built without the key.

---

## Local testing: Map locations not working

If locations work in the Play Store app but **not** when running locally (Expo Go, `npx expo start`, dev build):

### Cause 1: No `.env` file

EAS builds get the key from EAS Secrets. Local runs use `mobile-app/.env`. Create it:

```bash
cd mobile-app
cp .env.example .env
```

Then edit `.env` and set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` to your API key.

### Cause 2: API key restricted to production app only

Your key may be restricted to **Android apps** with only the production SHA-1. Expo Go and dev builds use different signing, so they get `REQUEST_DENIED`.

**Option A – Development-only key (recommended):**

1. In [Google Cloud Console](https://console.cloud.google.com/) → **Credentials** → **Create credentials** → **API key**
2. Set **Application restrictions** → **None**
3. Set **API restrictions** → **Places API**
4. Copy the key and put it in `mobile-app/.env`:
   ```
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_dev_key_here
   ```
5. Keep your production key in EAS Secrets and in the restricted key for Play Store.

**Option B – Add Expo Go to the same key:**

1. In [Google Cloud Console](https://console.cloud.google.com/) → **Credentials** → Edit your key
2. Under **Android apps** → **Add**:
   - **Package name:** `host.exp.exponent`
   - **SHA-1:** `F0:F1:A4:5B:33:90:47:0D:33:81:EF:8C:15:22:F7:E8:2D:97:4B:A1:73`
3. **Save**

Restart Expo (`npx expo start --clear`) after changing `.env`.

---

## Play Store build: Locations not showing

If the app works in development/Expo Go but **map locations don't appear** in the Play Store build:

### 1. Add API key to EAS (production build)

EAS builds do **not** use your local `.env`. Set the key as an EAS secret:

```bash
cd mobile-app
npx eas secret:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value "YOUR_GOOGLE_MAPS_API_KEY" --scope project --type string
```

Or in [Expo Dashboard](https://expo.dev) → your project → **Secrets** → Add `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`.

### 2. Allow your Play Store app in Google Cloud

The production app is signed with a **different certificate** than Expo Go. Your API key must allow it:

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Edit your mobile API key
3. Under **Application restrictions** → **Android apps** → Add:
   - **Package name:** `com.vizagtaxihub.app`
   - **SHA-1 fingerprint:** Get it from [Play Console](https://play.google.com/console) → your app → **Setup** → **App signing** → **App signing key certificate** → copy SHA-1

4. Enable **Places API** (and **Geocoding API** if used) for this key
5. **Save**

### 3. Rebuild and submit

After updating the secret and API key:

```bash
npx eas build --platform android --profile production --non-interactive
npx eas submit --platform android --latest
```
