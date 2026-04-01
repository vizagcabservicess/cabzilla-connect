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

## Driver fuel refills (admin)

When a driver successfully uploads a **fuel** receipt or pump photo to `upload-fuel-odometer.php`, the server sends an Expo push to all **`admin`** and **`super_admin`** users who have registered a token (same `push_tokens` table as bookings). Message uses **real** driver name, **₹** amount (comma-grouped decimals), quantity with **L** or **kg** (CNG), and **vehicle no** from the upload. Payload data: `type: driver_fuel_refill` (plus `driverName`, `vehicleNumber`, `amount`, `quantity`, `quantityUnit`). Tapping opens **Fuel Management** in the app.

### Desktop (web admin) — how it works

This is **not** system/browser push. The SPA shows **Sonner toasts** while you stay on any **`/admin/*`** route:

1. **`AdminDriverFuelRefillPoller`** calls **`GET /api/admin/driver-fuel-uploads-poll.php`** with your JWT (same login as admin).
2. First call **`?init=1`** stores the latest fuel row id in **`sessionStorage`** (no toast — avoids spamming old data).
3. Later **`?since_id=…`** runs every **30s**, and when a **new** `driver_ocr_records` row exists with `type = fuel`, you get a toast.

**Requirements**

- Deploy **`driver-fuel-uploads-poll.php`** next to your other admin PHP endpoints (same repo path: `api/admin/driver-fuel-uploads-poll.php`).
- Stay logged in as **`admin`** or **`super_admin`** and keep an admin tab open (e.g. `/admin` or `/admin/fuel`).
- **Local dev:** Vite proxies `/api` to your backend (see `vite.config.ts`). Poll URLs use `/api/admin/...` in dev.
- **Frontend on a different domain than PHP:** set **`VITE_API_BASE_URL`** at build time to your API origin (e.g. `https://www.vizagtaxihub.com`) so polls hit the real server; ensure that host allows **CORS** for your SPA origin.

**If you never see toasts:** open DevTools → Network, filter `driver-fuel-uploads-poll`, confirm **200** (not 404/401). **401** = token missing or role not admin. **404** = PHP file not deployed or wrong path.

Disable **mobile** server push with env `FUEL_REFILL_ADMIN_PUSH=0` if needed (desktop polling is unchanged).

## Backend: register-push-token.php

The app registers its push token by POSTing to `/api/auth/register-push-token.php` when a **super_admin**, **admin**, or **driver** logs in (admin/super_admin: bookings + fuel alerts; driver: trip assignment). **This endpoint must exist and be deployed** for notifications to work.

- **File**: `src/backend/php-templates/api/auth/register-push-token.php`
- **Deploy to**: `https://your-domain.com/api/auth/register-push-token.php`
- **Database**: Requires `push_tokens` table (see `sql/push_tokens_migration.sql`)

If the endpoint returns 404, the token is never saved and no notifications will be sent.

## Web Push (desktop browser — Chrome, Edge, Firefox)

**Standard Web Push (VAPID)** is implemented for the **web admin** in addition to in-page toasts and Expo mobile push.

### Server

1. **Database:** run `sql/web_push_subscriptions.sql`.
2. **Composer** (in `php-templates`): `composer install` — pulls `minishlink/web-push`.
3. **VAPID keys** (one-time):
   - `npx web-push generate-vapid-keys`  
   - or use any Web Push VAPID generator; keys are Base64 URL-safe.
4. **Env** (see `env.example`):
   - `WEB_PUSH_VAPID_SUBJECT=mailto:your@email` (must be a `mailto:` or `https:` URI per spec)
   - `WEB_PUSH_VAPID_PUBLIC_KEY`
   - `WEB_PUSH_VAPID_PRIVATE_KEY` (**secret** — never expose to frontend except the public key via the public endpoint)
5. **Deploy** these files on the same API host:
   - `api/public/web-push-vapid-public.php` (public key only)
   - `api/auth/register-web-push.php`
   - `api/utils/web_push.inc.php`
6. Ensure **`vendor/autoload.php`** exists on the server after `composer install`.

When a driver logs a fuel refill, **`upload-fuel-odometer.php`** still sends Expo push; it also calls **`web_push_send_fuel_refill_to_admins`** if VAPID + vendor are configured.

### Web app

- **`AdminWebPushGate`** (mounted in the web `App` inside `AuthProvider`) runs for any **`admin` / `super_admin`** session, registers **`/sw.js`**, requests notification permission, subscribes with the public key from `web-push-vapid-public.php`, and POSTs the subscription to **`register-web-push.php`**.
- **`public/sw.js`** handles **`push`** and **`notificationclick`** (opens `/admin/fuel`).

### Requirements

- **HTTPS** (or **localhost** only) — browsers block push on plain HTTP.
- User must **Allow** notifications when prompted.
- Safari / iOS have **limited** Web Push support; prefer Chrome/Edge desktop for testing.

## Troubleshooting checklist

1. **Endpoint deployed?** Verify `GET/POST /api/auth/register-push-token.php` exists on your server.
2. **push_tokens table?** Run `sql/push_tokens_migration.sql` if not already applied.
3. **Admin logged in (mobile push)?** **`admin`** and **`super_admin`** can register push tokens. Log in on the mobile app at least once with a role that should receive alerts.
4. **FCM (Android)?** For standalone/release builds, FCM credentials must be configured in EAS (see above).
5. **Physical device?** Emulators return `null` for the push token.
6. **Desktop fuel toasts?** Deploy `driver-fuel-uploads-poll.php`, stay on `/admin/*`, wait ~30s after a driver upload, check Network tab for 200 (see “Desktop (web admin)” above).
