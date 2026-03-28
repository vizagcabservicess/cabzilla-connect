// API configuration - no hardcoded values
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
/** Google OAuth Client ID for social login - Web client (used for web platform and as webClientId) */
export const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
/** Android OAuth Client ID - required for native Android (Web client does not allow custom scheme redirects) */
export const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
/** iOS OAuth Client ID - use iOS client type in Google Cloud for native return-to-app (optional; falls back to web client on Simulator) */
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

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
