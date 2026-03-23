# Google Sign-In on Android: Custom URI Scheme Fix

If you see **"Error 400: invalid_request — Custom URI scheme is not enabled for your Android client"**, Google has disabled custom URI redirects for new Android apps by default (Oct 2023). You must enable it in the Google Cloud Console.

## Fix in Google Cloud Console

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Open your **OAuth 2.0 Client ID** of type **Android**.
3. If you don't have an Android client:
   - Click **Create credentials** → **OAuth client ID**
   - Application type: **Android**
   - Name: e.g. "Vizag Taxi Hub Android"
   - Package name: `com.vizagtaxihub.app`
   - SHA-1: from your signing keystore (run `keytool -list -v -keystore <path>` or get from EAS)
4. In the **edit view** of your Android client, find **Advanced Settings** (or expand it).
5. Enable **"Allow custom URI scheme redirect"** (or equivalent).
6. Save.

## Environment variables

Ensure these are set in `.env` or EAS secrets:

- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` — Web OAuth client ID
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` — Android OAuth client ID

## App scheme

The app uses redirect URI: `vizagtaxihub://oauthredirect` (from `app.json` scheme + path).

### Redirect goes to webpage instead of app

If after Google sign-in the user is redirected to the website instead of back to the app:

1. **Google Cloud Console** → Credentials → your **Android** OAuth client
2. Under **Authorized redirect URIs**, ensure you have:
   - `vizagtaxihub://oauthredirect` (custom scheme for the app)
3. Do **not** use only the web app URL (e.g. `https://www.vizagtaxihub.com/...`) – that will open the browser.
4. Ensure you are using the **Android** OAuth client ID in the app (not only the Web client). The Web client rejects custom scheme redirects.

## Backend setup

The mobile app calls `social-signup.php` and `social-login.php` for Google auth. Deploy these files to your server under `api/auth/`:

- `src/backend/php-templates/api/auth/social-signup.php`
- `src/backend/php-templates/api/auth/social-login.php`

Add the `google_id` column to the `users` table (one-time migration). Either:

1. Call the ensure-db script: `/api/admin/ensure-db-columns.php` (adds `google_id` automatically), or
2. Run: `ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL UNIQUE AFTER password;`

Without `google_id`, social auth still works (matches by email); the column improves lookup for returning Google users.

## References

- [Google Blog: Custom URI scheme restrictions](https://developers.googleblog.com/en/improving-user-safety-in-oauth-flows-through-new-oauth-custom-uri-scheme-restrictions/)
- [Google: Enabling custom URI scheme](https://developers.google.com/identity/protocols/oauth2/native-app#enabling-custom-uri-scheme)
