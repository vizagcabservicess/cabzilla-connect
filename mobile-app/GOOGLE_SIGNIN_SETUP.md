# Google Sign-In - Mobile App Setup

The mobile app uses the same backend (`social-login.php`, `social-signup.php`) as the web app for Google authentication.

## Why two client IDs?

**"Custom scheme URIs are not allowed for 'WEB' client type"** – Google's Web OAuth client does **not** allow redirect URIs like `vizagtaxihub://oauthredirect`. The native app uses this custom scheme to return from the browser. You must use an **Android** OAuth client for the native app.

## 1. Google Cloud Console – Create Android OAuth Client

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Click **Create Credentials** → **OAuth client ID**.
3. Application type: **Android**.
4. Name: e.g. `Vizag Taxi Hub Android`.
5. Package name: `com.vizagtaxihub.app` (from `app.json`).
6. **SHA-1 certificate fingerprint** – required. Get it from:
   - **EAS Build (production):** [Expo Dashboard](https://expo.dev) → your project → Credentials → Android → Keystore → SHA-1 fingerprint.
   - **Or** run: `cd mobile-app && npx eas credentials --platform android` and copy the SHA-1.
   - **Google Play:** If using Play App Signing, add the **App signing key certificate** SHA-1 from Play Console → Release → Setup → App Integrity.
7. Create the client and copy the **Client ID** (e.g. `288864155190-xxxx.apps.googleusercontent.com`).

## 2. Environment variables

Add to `mobile-app/.env`:

```
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_web_client_id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_google_android_client_id
```

- **Web client ID** – same as web app (`VITE_GOOGLE_CLIENT_ID`). Used for web platform and as `webClientId` for id_token.
- **Android client ID** – the new Android OAuth client. Required for native Android.

## 3. Google Cloud Console – Redirect URIs (Web client only)

For the **Web** client, add these **Authorized redirect URIs**:

- **Web (Expo web):** `http://localhost:8080`, `http://localhost:19006`, and your production URL
- **Do NOT add** `vizagtaxihub://oauthredirect` to the Web client – it is not allowed.

The Android client does not use redirect URIs; it uses package name + SHA-1.

## 4. EAS Build (production)

EAS builds do **not** use your local `.env`. Set both secrets:

```bash
cd mobile-app
npx eas secret:create --name EXPO_PUBLIC_GOOGLE_CLIENT_ID --value "YOUR_WEB_CLIENT_ID" --scope project --type string
npx eas secret:create --name EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID --value "YOUR_ANDROID_CLIENT_ID" --scope project --type string
```

Or in [Expo Dashboard](https://expo.dev) → your project → **Secrets**.

Then rebuild:

```bash
npx eas build --platform android --profile production
```

## 5. Testing

- **Expo Web:** Run `npm run web`. Uses Web client ID.
- **Native (Expo Go):** Google Sign-In is hidden (expo-crypto not available). Use a development build.
- **Development build:** `npx eas build --platform android --profile preview` – use the preview keystore SHA-1 when creating the Android OAuth client for testing.

## Troubleshooting

- **"Custom scheme URIs are not allowed for 'WEB' client type"** – You are using the Web client on Android. Create an Android OAuth client and set `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`.
- **"Google Client ID not configured"** – Set both `EXPO_PUBLIC_GOOGLE_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` in `.env` (and EAS secrets for builds).
- **"Redirect URI mismatch"** – For Web client, add web redirect URIs only. For Android, ensure package name and SHA-1 match.
