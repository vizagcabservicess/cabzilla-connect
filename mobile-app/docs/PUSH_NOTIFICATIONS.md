# Push notifications (Android & iOS)

## Quick fix: “Still not getting notifications on Android”

**Expo Go does NOT support Android push notifications** (removed in SDK 53+). You must use a **development build** or **standalone APK**, not Expo Go.

### Steps to test push on Android

1. **Create a development build** (one-time):
   ```bash
   npx eas build --profile preview --platform android
   ```
   This produces an APK. Download and install it on your physical device.

2. **Configure FCM** (required for Android):
   - Go to [Expo Dashboard](https://expo.dev) → your project → **Credentials** → **Android**
   - Add Firebase Cloud Messaging (FCM) credentials per [Expo docs](https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-firebase-cloud-messaging)
   - Rebuild after adding FCM: `npx eas build --profile preview --platform android`

3. **Use the installed app** (not Expo Go):
   - Open the APK you installed
   - Log in as **super_admin** so the device token is registered
   - Send a test via [Expo Push Tool](https://expo.dev/notifications) using the token

4. **Physical device required** – Emulators cannot receive push notifications.

---

## What that Expo Go warning means

From **Expo SDK 53+**, **Android remote push notifications are not supported in Expo Go**. You cannot test real push in Expo Go.

- **Expo Go**: Push notifications **do not work** on Android.
- **Standalone app** (development build, preview APK, or production): Push works here.

Use `eas build --profile preview` (APK) or `eas build --profile production` (AAB) to get an installable app that supports push.

Docs: [Development builds](https://docs.expo.dev/develop/development-builds/introduction/), [Push notifications setup](https://docs.expo.dev/push-notifications/push-notifications-setup/).

## Why notifications work in one place but not the other

Typical causes when **Expo Go / dev** works but **installed app** does not:

1. **No FCM credentials on EAS (Android)**  
   Standalone Android apps need **Firebase Cloud Messaging** linked to your Expo project. Without this, `ExponentPushToken[...]` may be created but **Expo’s servers cannot deliver** to your release build.

   **Fix:**  
   - [Upload FCM credentials](https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-firebase-cloud-messaging)  
   - Or run: `eas credentials` → select the project → **Android** → add **FCM** / **Google Service Account** as documented by Expo.

2. **Old build vs new credentials**  
   After adding FCM, create a **new** Android build and reinstall the app.

3. **Different push tokens**  
   Each install (Expo Go vs standalone) gets a **different** token. The backend must send to the token registered **after** the user opens the **production** app and logs in as `super_admin` (`registerPushToken`).

4. **Physical device**  
   `getPushToken()` returns `null` on emulators (`Device.isDevice` is false).

5. **iOS**  
   Requires Apple push key / certificates in EAS for standalone builds.

## Checklist for production Android

- [ ] FCM configured in [Expo dashboard / EAS credentials](https://expo.dev/accounts/_/settings/credentials) for this project (`extra.eas.projectId` in `app.json`).
- [ ] New `eas build --platform android` (or your CI) **after** FCM setup.
- [ ] Install that build, log in as **super_admin**, confirm the device token is saved server-side.
- [ ] Send a test via [Expo push tool](https://expo.dev/notifications) using the **same** `ExponentPushToken[...]` string the app logged.

## App configuration

The app uses `expo-notifications` with `getExpoPushTokenAsync({ projectId })` where `projectId` comes from `app.json` → `expo.extra.eas.projectId`. If that is missing, **no token** is returned.

## Backend: register-push-token.php

The app registers its push token by POSTing to `/api/auth/register-push-token.php` when a super_admin logs in. **This endpoint must exist and be deployed** for notifications to work.

- **File**: `src/backend/php-templates/api/auth/register-push-token.php`
- **Deploy to**: `https://your-domain.com/api/auth/register-push-token.php`
- **Database**: Requires `push_tokens` table (see `sql/push_tokens_migration.sql`)

If the endpoint returns 404, the token is never saved and no notifications will be sent.

## Troubleshooting checklist

1. **Endpoint deployed?** Verify `GET/POST /api/auth/register-push-token.php` exists on your server.
2. **push_tokens table?** Run `sql/push_tokens_migration.sql` if not already applied.
3. **Super admin logged in?** Only super_admin users can register tokens. Log in on the mobile app as super_admin at least once.
4. **FCM (Android)?** For standalone/release builds, FCM credentials must be configured in EAS (see above).
5. **Physical device?** Emulators return `null` for the push token.
