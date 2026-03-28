/**
 * Dynamic Expo config: adds Google OAuth reversed client-id URL scheme + Android intent filter
 * so `com.googleusercontent.apps.*:/oauthredirect` returns to the app (required by Google native OAuth).
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const appJson = require('./app.json');

function reverseGoogleScheme(clientId) {
  const id = (clientId || '').trim();
  const suffix = '.apps.googleusercontent.com';
  if (!id.endsWith(suffix)) {
    return null;
  }
  return `com.googleusercontent.apps.${id.slice(0, -suffix.length)}`;
}

module.exports = () => {
  const base = appJson.expo;
  const baseScheme = base.scheme || 'vizagtaxihub';

  const androidId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
  const iosId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
    '';

  const androidRev = reverseGoogleScheme(androidId);
  const iosRev = reverseGoogleScheme(iosId);

  /** @type {(string)[]} */
  const schemes = [baseScheme];
  if (androidRev && !schemes.includes(androidRev)) {
    schemes.push(androidRev);
  }
  if (iosRev && iosRev !== androidRev && !schemes.includes(iosRev)) {
    schemes.push(iosRev);
  }

  const existingFilters = Array.isArray(base.android?.intentFilters) ? base.android.intentFilters : [];
  /** @type {typeof existingFilters} */
  const intentFilters = [...existingFilters];
  if (androidRev) {
    intentFilters.push({
      action: 'VIEW',
      autoVerify: true,
      data: [{ scheme: androidRev }],
      category: ['BROWSABLE', 'DEFAULT'],
    });
  }

  return {
    expo: {
      ...base,
      scheme: schemes.length === 1 ? schemes[0] : schemes,
      android: {
        ...base.android,
        ...(intentFilters.length > existingFilters.length ? { intentFilters } : {}),
      },
    },
  };
};
