/**
 * Full-screen trip assignment alert for drivers: vibration + repeating local notifications (sound)
 * until the driver opens the trip (Uber/Ola-style acknowledge).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Vibration,
  ActivityIndicator,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { CommonActions } from '@react-navigation/native';
import { useAuth } from '../providers/AuthProvider';
import { navigationRef } from '../navigation/navigationRef';
import { driverTripsAPI } from '../services/driverTripsAPI';
import {
  ensureTripAssignmentNotificationChannel,
  TRIP_ASSIGNMENT_CHANNEL_ID,
} from '../services/pushNotificationService';
import { colors } from '../theme/colors';

type PendingAssignment = {
  bookingId: number;
  bookingNumber: string;
  title: string;
  body: string;
};

function parseTripAssignedData(data: Record<string, unknown> | undefined): Omit<PendingAssignment, 'title' | 'body'> | null {
  if (!data || String(data.type) !== 'trip_assigned') return null;
  const bookingId = Number(data.bookingId ?? data.booking_id);
  if (!Number.isFinite(bookingId) || bookingId <= 0) return null;
  const bookingNumber = String(data.bookingNumber ?? data.booking_number ?? `#${bookingId}`);
  return { bookingId, bookingNumber };
}

function pendingFromNotification(notification: Notifications.Notification): PendingAssignment | null {
  const data = notification.request.content.data as Record<string, unknown>;
  const base = parseTripAssignedData(data);
  if (!base) return null;
  const title = notification.request.content.title ?? 'New trip assigned';
  const body = notification.request.content.body ?? `Booking ${base.bookingNumber} — tap to open`;
  return { ...base, title, body };
}

export function DriverTripAssignmentOverlay() {
  const { user, isAuthenticated } = useAuth();
  const [pending, setPending] = useState<PendingAssignment | null>(null);
  const [opening, setOpening] = useState(false);
  const scheduledIdRef = useRef<string | null>(null);
  const vibrationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAlarm = useCallback(async () => {
    if (Platform.OS === 'android') {
      Vibration.cancel();
    } else {
      Vibration.cancel();
    }
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    const sid = scheduledIdRef.current;
    scheduledIdRef.current = null;
    if (sid) {
      try {
        await Notifications.cancelScheduledNotificationAsync(sid);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const startAlarm = useCallback(async (p: PendingAssignment) => {
    await stopAlarm();
    await ensureTripAssignmentNotificationChannel();

    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 600, 200, 600, 200, 800], true);
    } else {
      Vibration.vibrate();
      vibrationIntervalRef.current = setInterval(() => {
        Vibration.vibrate(500);
      }, 1400);
    }

    const repeatSeconds = Platform.OS === 'ios' ? 60 : 12;
    try {
      const nid = await Notifications.scheduleNotificationAsync({
        content: {
          title: p.title,
          body: p.body,
          sound: true,
          data: {
            type: 'trip_assigned',
            bookingId: String(p.bookingId),
            bookingNumber: p.bookingNumber,
          },
          ...(Platform.OS === 'android' ? { vibrate: [0, 500, 200, 500] } : {}),
        },
        trigger: {
          type: SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: repeatSeconds,
          repeats: true,
          ...(Platform.OS === 'android' ? { channelId: TRIP_ASSIGNMENT_CHANNEL_ID } : {}),
        },
      });
      scheduledIdRef.current = nid;
    } catch (e) {
      if (__DEV__) console.warn('[trip assignment] schedule repeat failed', e);
    }
  }, [stopAlarm]);

  const setPendingFromNotification = useCallback((notification: Notifications.Notification) => {
    const next = pendingFromNotification(notification);
    if (!next) return;
    setPending((prev) => (prev?.bookingId === next.bookingId ? prev : next));
  }, []);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'driver' || Platform.OS === 'web') return;

    const sub = Notifications.addNotificationReceivedListener((notification) => {
      setPendingFromNotification(notification);
    });

    const subTap = Notifications.addNotificationResponseReceivedListener((response) => {
      setPendingFromNotification(response.notification);
    });

    Notifications.getLastNotificationResponseAsync().then((res) => {
      if (res?.notification) setPendingFromNotification(res.notification);
    });

    return () => {
      sub.remove();
      subTap.remove();
    };
  }, [isAuthenticated, user?.role, setPendingFromNotification]);

  useEffect(() => {
    if (!pending) {
      void stopAlarm();
      return;
    }
    void startAlarm(pending);
    return () => {
      void stopAlarm();
    };
  }, [pending, startAlarm, stopAlarm]);

  const navigateToTrip = useCallback(async () => {
    if (!pending) return;
    setOpening(true);
    try {
      const trips = await driverTripsAPI.getTrips();
      const trip = trips.find((t) => t.id === pending.bookingId);
      if (!trip) {
        setOpening(false);
        return;
      }
      await stopAlarm();
      setPending(null);

      let tries = 0;
      const go = () => {
        if (navigationRef.isReady()) {
          navigationRef.dispatch(
            CommonActions.navigate({
              name: 'DriverTab',
              params: { screen: 'DriverTripDetail', params: { trip } },
            })
          );
          return;
        }
        if (tries++ < 60) setTimeout(go, 100);
      };
      go();
    } catch {
      /* keep overlay if fetch fails */
    } finally {
      setOpening(false);
    }
  }, [pending, stopAlarm]);

  const onMuteLater = useCallback(async () => {
    await stopAlarm();
    setPending(null);
  }, [stopAlarm]);

  if (!isAuthenticated || user?.role !== 'driver' || Platform.OS === 'web') {
    return null;
  }

  return (
    <Modal visible={!!pending} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.badge}>NEW TRIP</Text>
          <Text style={styles.title}>{pending?.title ?? 'Trip assigned'}</Text>
          <Text style={styles.body}>{pending?.body}</Text>
          <Text style={styles.hint}>
            Sound and alerts repeat until you open the trip (like Ola/Uber).
          </Text>
          <TouchableOpacity
            style={[styles.btnPrimary, opening && styles.btnDisabled]}
            onPress={() => void navigateToTrip()}
            disabled={opening}
          >
            {opening ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnPrimaryText}>View trip</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => void onMuteLater()}>
            <Text style={styles.btnSecondaryText}>Mute alerts (trip stays in list)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dc2626',
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    color: colors.gray600,
    marginBottom: 12,
    lineHeight: 22,
  },
  hint: {
    fontSize: 13,
    color: colors.gray500,
    marginBottom: 20,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  btnDisabled: { opacity: 0.7 },
  btnSecondary: { paddingVertical: 12, alignItems: 'center' },
  btnSecondaryText: { color: colors.gray600, fontSize: 15 },
});
