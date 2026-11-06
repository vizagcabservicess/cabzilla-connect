/**
 * Opens the driver app over the lock screen when a trip-assignment notification is shown.
 * Android only allows that through a full-screen intent, which expo-notifications does not set.
 */
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'TRIP_LOCK_SCREEN_FULL_INTENT';

function ensurePermission(manifest, name) {
  if (!manifest['uses-permission']) manifest['uses-permission'] = [];
  const list = manifest['uses-permission'];
  const exists = list.some((item) => item?.$?.['android:name'] === name);
  if (!exists) list.push({ $: { 'android:name': name } });
}

function patchNotificationBuilder(projectRoot) {
  const file = path.join(
    projectRoot,
    'node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/notifications/presentation/builders/ExpoNotificationBuilder.kt'
  );
  if (!fs.existsSync(file)) return;
  const src = fs.readFileSync(file, 'utf8');
  if (src.includes(MARKER)) return;
  const needle = `    val defaultAction =
      NotificationAction(NotificationResponse.DEFAULT_ACTION_IDENTIFIER, null, true)
    builder.setContentIntent(
      createNotificationResponseIntent(
        context,
        notification,
        defaultAction
      )
    )`;
  const insert = `    val defaultAction =
      NotificationAction(NotificationResponse.DEFAULT_ACTION_IDENTIFIER, null, true)
    val contentPending = createNotificationResponseIntent(
      context,
      notification,
      defaultAction
    )
    builder.setContentIntent(contentPending)

    // ${MARKER}: a new trip opens over the lock screen, like an incoming call.
    val category = notificationContent.categoryId
    val dataJson = content.body?.toString() ?: ""
    val tripPopup = category == "trip_assigned" || dataJson.contains("trip_assigned")
    if (tripPopup) {
      builder.setFullScreenIntent(contentPending, true)
      builder.setCategory(NotificationCompat.CATEGORY_ALARM)
      builder.setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      builder.priority = NotificationCompat.PRIORITY_MAX
    }`;
  if (!src.includes(needle)) {
    throw new Error('Trip lock-screen patch could not find the notification builder block.');
  }
  fs.writeFileSync(file, src.replace(needle, insert));
}

module.exports = function withTripLockScreen(config) {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    ensurePermission(manifest, 'android.permission.USE_FULL_SCREEN_INTENT');
    ensurePermission(manifest, 'android.permission.VIBRATE');
    ensurePermission(manifest, 'android.permission.WAKE_LOCK');

    const application = manifest.application?.[0];
    const activities = application?.activity;
    if (Array.isArray(activities)) {
      for (const activity of activities) {
        if (!activity.$) activity.$ = {};
        activity.$['android:showWhenLocked'] = 'true';
        activity.$['android:turnScreenOn'] = 'true';
      }
    }
    return config;
  });

  return withDangerousMod(config, [
    'android',
    async (config) => {
      patchNotificationBuilder(config.modRequest.projectRoot);
      return config;
    },
  ]);
};
