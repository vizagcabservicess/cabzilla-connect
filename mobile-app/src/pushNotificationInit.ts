/**
 * Import this module from index.ts before App mounts so `setNotificationHandler` runs
 * as early as possible (foreground presentation rules for expo-notifications).
 *
 * Android: register high-priority channels before the first FCM message so lock screen / heads-up work.
 */
import { Platform } from 'react-native';
import './services/pushNotificationService';
import {
  ensureDefaultPushChannel,
  ensureEventDutyAlertChannel,
  ensureEventManagerAlertChannel,
  ensureTripAssignmentNotificationChannel,
} from './services/pushNotificationService';
import { registerTripAssignmentAlarmTask } from './lib/tripAssignmentAlarm';

if (Platform.OS !== 'web') {
  void (async () => {
    await ensureTripAssignmentNotificationChannel();
    await registerTripAssignmentAlarmTask();
    if (Platform.OS !== 'android') return;
    await ensureEventDutyAlertChannel();
    await ensureEventManagerAlertChannel();
    await ensureDefaultPushChannel();
  })();
}
