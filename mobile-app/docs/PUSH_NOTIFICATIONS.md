# Push notifications (Android & iOS)

## What that Expo Go warning means

From **Expo SDK 53+**, **Android remote push notifications are not supported in Expo Go** the way they used to be. You should **not** rely on Expo Go for testing production-like push on Android.

- **Expo Go**: Limited / unreliable for **remote** notifications on Android (you may see warnings in the terminal).
- **Standalone app** (Play Store APK/AAB or internal build): This is where push must work for real users.

Use a **development build** (`eas build --profile development`) or **preview/production** builds to test push properly.

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
