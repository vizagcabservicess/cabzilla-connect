import { Platform } from 'react-native';

/**
 * EAS / production Google Sign-In checklist (Android standalone; Expo Go uses different auth):
 *
 * 1) Create OAuth clients in Google Cloud Console (same project as Firebase if you use FCM):
 *    - Type "Web application" → EXPO_PUBLIC_GOOGLE_CLIENT_ID
 *    - Type "Android" for package com.vizagtaxihub.app → EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
 *    - Optional "iOS" for bundle com.vizagtaxihub.app → EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
 *
 * 2) SHA-1 for the **upload keystore** EAS uses to sign release builds:
 *    - Run: `eas credentials` → Android → production → view Keystore → copy SHA-1 (or fingerprints from `eas credentials -p android`)
 *    - Firebase Console → Project settings → Your Android app → Add fingerprint (SHA-1)
 *    - Google Cloud → APIs & Services → Credentials → open the **Android** OAuth client → add same SHA-1
 *    - Re-download google-services.json and commit/replace mobile-app/google-services.json, then `eas build --platform android`
 *
 * 3) EAS secrets (embedded at build time):
 *    eas secret:create --name EXPO_PUBLIC_GOOGLE_CLIENT_ID --value "....apps.googleusercontent.com" --scope project
 *    eas secret:create --name EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID --value "....apps.googleusercontent.com" --scope project
 *    (Optional iOS) EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
 *
 * 4) Backend: native Google ID tokens often have audience = Android (or iOS) client id. If api/auth/social-login.php
 *    sets GOOGLE_OAUTH_CLIENT_IDS, include **comma-separated** Web + Android (+ iOS) client ids so verification passes.
 */

// API configuration - no hardcoded values
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
/** Google OAuth Client ID for social login - Web client (used for web platform and as webClientId) */
export const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
/** Android OAuth Client ID - required for native Android (Web client does not allow custom scheme redirects) */
export const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
/** iOS OAuth Client ID - use iOS client type in Google Cloud for native return-to-app (optional; falls back to web client on Simulator) */
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

const GOOGLE_CLIENT_SUFFIX = '.apps.googleusercontent.com';

/** OAuth client id string used for native redirect URI (reversed client id scheme). */
export function getGoogleNativeOAuthClientId(): string {
  if (Platform.OS === 'android') {
    return (GOOGLE_ANDROID_CLIENT_ID || '').trim();
  }
  if (Platform.OS === 'ios') {
    return (GOOGLE_IOS_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID || '').trim();
  }
  return '';
}

/**
 * Google native OAuth redirect URI. Must be com.googleusercontent.apps.<idPrefix>:/path
 * (not the app deep link scheme). See https://developers.google.com/identity/protocols/oauth2/native-app
 */
export function getGoogleNativeRedirectUri(): string | null {
  const id = getGoogleNativeOAuthClientId();
  if (!id.endsWith(GOOGLE_CLIENT_SUFFIX)) {
    return null;
  }
  const prefix = id.slice(0, -GOOGLE_CLIENT_SUFFIX.length);
  return `com.googleusercontent.apps.${prefix}:/oauthredirect`;
}

export function isGoogleNativeSignInConfigured(): boolean {
  if (Platform.OS === 'web') {
    return !!GOOGLE_CLIENT_ID;
  }
  return !!getGoogleNativeOAuthClientId() && !!getGoogleNativeRedirectUri() && !!GOOGLE_CLIENT_ID;
}

/** Web app base URL for login, dashboard, support & legal links */
export const WEB_APP_BASE_URL = process.env.EXPO_PUBLIC_WEB_APP_BASE_URL ?? 'https://www.vizagtaxihub.com';

export const APP_CONFIG = {
  appName: 'Vizag Taxi Hub',
  appVersion: '1.0.0',
  currency: '₹',
  defaultLanguage: 'en-IN',
  dateFormat: 'DD-MM-YYYY',
  timezone: 'Asia/Kolkata',
};
