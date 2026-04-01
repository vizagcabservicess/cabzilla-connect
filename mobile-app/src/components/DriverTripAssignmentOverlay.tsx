/**
 * Full-screen trip assignment alert for drivers: vibration + repeating local notifications (sound)
 * until the driver opens the trip.
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
  ScrollView,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import Constants from 'expo-constants';
import { CommonActions } from '@react-navigation/native';
import { useAuth } from '../providers/AuthProvider';
import { navigationRef } from '../navigation/navigationRef';
import { driverTripsAPI } from '../services/driverTripsAPI';
import {
  ensureTripAssignmentNotificationChannel,
  TRIP_ASSIGNMENT_CHANNEL_ID,
} from '../services/pushNotificationService';
import { colors } from '../theme/colors';

/** Dev + EAS internal: set EXPO_PUBLIC_SHOW_TRIP_ASSIGNMENT_DEBUG=1 to see why the overlay did/didn't open */
const SHOW_TRIP_ASSIGNMENT_DEBUG =
  (typeof __DEV__ !== 'undefined' && __DEV__) ||
  process.env.EXPO_PUBLIC_SHOW_TRIP_ASSIGNMENT_DEBUG === '1';

type PendingAssignment = {
  /** DB id from push `data`; null when FCM only shows title/body (standalone) — we match via bookingNumber */
  bookingId: number | null;
  bookingNumber: string;
  title: string;
  body: string;
};

/**
 * Remote pushes often carry custom fields in FCM `data` / iOS `userInfo`, which expo may expose on
 * `request.trigger` (push.remoteMessage.data / push.payload) while `content.data` stays empty.
 * Without merging, the overlay never sees `type: trip_assigned`.
 */
function getMergedNotificationData(notification: Notifications.Notification): Record<string, unknown> | undefined {
  const raw = notification.request.content.data;
  const merged: Record<string, unknown> =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? { ...(raw as Record<string, unknown>) } : {};

  const trigger = notification.request.trigger as
    | { type?: string; remoteMessage?: { data?: Record<string, string> }; payload?: Record<string, unknown> }
    | undefined;

  // Merge FCM/APNs payload whenever present — some builds use trigger.type other than 'push'.
  if (trigger && typeof trigger === 'object') {
    const rm = trigger.remoteMessage?.data;
    if (rm && typeof rm === 'object') {
      for (const [k, v] of Object.entries(rm)) {
        merged[k] = v;
      }
    }
    const pl = trigger.payload;
    if (pl && typeof pl === 'object') {
      for (const [k, v] of Object.entries(pl)) {
        if (merged[k] === undefined) merged[k] = v;
      }
    }
  }

  // Single JSON blob (some gateways wrap payload)
  const bodyKey = merged.body;
  if (typeof bodyKey === 'string' && bodyKey.startsWith('{')) {
    try {
      const inner = JSON.parse(bodyKey) as Record<string, unknown>;
      if (inner && typeof inner === 'object') {
        for (const [k, v] of Object.entries(inner)) {
          if (merged[k] === undefined) merged[k] = v;
        }
      }
    } catch {
      /* ignore */
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

function parseTripAssignedData(
  data: Record<string, unknown> | undefined
): Pick<PendingAssignment, 'bookingId' | 'bookingNumber'> | null {
  if (!data) return null;
  const typeNorm = String(data.type ?? '').trim();
  if (typeNorm !== 'trip_assigned') return null;

  const bookingIdRaw = String(data.bookingId ?? data.booking_id ?? '').trim();
  let bookingId: number | null = null;
  if (bookingIdRaw !== '') {
    const n = Number(bookingIdRaw);
    if (Number.isFinite(n) && n > 0) bookingId = n;
  }
  let bookingNumber = String(data.bookingNumber ?? data.booking_number ?? '').trim();
  if (bookingNumber === '' && bookingId != null) {
    bookingNumber = `#${bookingId}`;
  }
  if (bookingId == null && bookingNumber === '') return null;
  if (bookingNumber === '' && bookingId != null) {
    bookingNumber = `#${bookingId}`;
  }
  return { bookingId, bookingNumber };
}

/**
 * Standalone Android often delivers title/body to the tray but omits custom data; same text as Expo Go.
 * Parse booking ref from body, e.g. "Booking #VTH17747214162855 — …"
 */
function inferTripAssignmentFromDisplayOnly(
  notification: Notifications.Notification
): Pick<PendingAssignment, 'bookingId' | 'bookingNumber'> | null {
  const title = String(notification.request.content.title ?? '').trim();
  const body = String(notification.request.content.body ?? '').trim();
  const numMatch = body.match(/Booking\s*#?\s*([A-Za-z0-9][A-Za-z0-9\-]*)/i);
  if (!numMatch?.[1]) return null;
  const bookingNumber = numMatch[1].trim();
  if (!bookingNumber) return null;
  const titleOk = /new trip assigned|trip assigned/i.test(title);
  const titleEmptyOrApp = title === '';
  const bodyStartsBooking = /^booking\s*#/i.test(body.trim());
  // OEMs sometimes omit custom title (only app name) — body still matches our server template
  if (!titleOk && !titleEmptyOrApp && !(bodyStartsBooking && (title.length <= 40 || /taxi|vizag|trip/i.test(title)))) {
    return null;
  }
  return { bookingId: null, bookingNumber };
}

function pendingFromNotification(notification: Notifications.Notification): PendingAssignment | null {
  const data = getMergedNotificationData(notification);
  const base = parseTripAssignedData(data) ?? inferTripAssignmentFromDisplayOnly(notification);
  if (!base) {
    if (__DEV__ || SHOW_TRIP_ASSIGNMENT_DEBUG) {
      console.warn('[trip assignment] Unrecognized push', {
        title: notification.request.content.title,
        bodyPrefix: String(notification.request.content.body).slice(0, 80),
        triggerType: (notification.request.trigger as { type?: string })?.type,
        contentData: notification.request.content.data,
        merged: data,
      });
    }
    return null;
  }
  const title = notification.request.content.title ?? 'New trip assigned';
  const body = notification.request.content.body ?? `Booking ${base.bookingNumber} — tap to open`;
  return { ...base, title, body };
}

export function DriverTripAssignmentOverlay() {
  const { user, isAuthenticated } = useAuth();
  const [pending, setPending] = useState<PendingAssignment | null>(null);
  const [opening, setOpening] = useState(false);
  const [, setDebugTick] = useState(0);
  const debugLinesRef = useRef<string[]>([]);
  const scheduledIdRef = useRef<string | null>(null);
  const vibrationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pushDebug = useCallback((line: string) => {
    if (!SHOW_TRIP_ASSIGNMENT_DEBUG) return;
    const hhmmss = new Date().toISOString().slice(11, 19);
    debugLinesRef.current = [...debugLinesRef.current.slice(-14), `${hhmmss} ${line}`];
    setDebugTick((n) => n + 1);
  }, []);

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
            bookingId: p.bookingId != null ? String(p.bookingId) : '',
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

  const setPendingFromNotification = useCallback(
    (notification: Notifications.Notification, source: string) => {
      const next = pendingFromNotification(notification);
      if (!next) {
        pushDebug(
          `${source}: skipped title="${String(notification.request.content.title).slice(0, 30)}"`
        );
        return;
      }
      pushDebug(`${source}: OPEN ${next.bookingNumber} (id=${String(next.bookingId)})`);
      setPending((prev) => (prev?.bookingNumber === next.bookingNumber ? prev : next));
    },
    [pushDebug]
  );

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'driver' || Platform.OS === 'web') return;

    pushDebug(
      `listeners on user=${user?.id} ownership=${Constants.appOwnership ?? 'n/a'} (expo=Expo Go, standalone=store/internal build)`
    );

    const sub = Notifications.addNotificationReceivedListener((notification) => {
      setPendingFromNotification(notification, 'foreground');
    });

    const subTap = Notifications.addNotificationResponseReceivedListener((response) => {
      setPendingFromNotification(response.notification, 'tap');
    });

    const openFromLastResponse = (label: string) => {
      void Notifications.getLastNotificationResponseAsync().then((res) => {
        if (res?.notification) {
          setPendingFromNotification(res.notification, label);
        } else {
          pushDebug(`${label}: getLastNotificationResponse = null`);
        }
      });
    };
    openFromLastResponse('coldStart-0');
    const timers = [600, 2000, 4500, 8000].map((ms) =>
      setTimeout(() => openFromLastResponse(`coldStart-${ms}`), ms)
    );

    return () => {
      for (const t of timers) clearTimeout(t);
      sub.remove();
      subTap.remove();
    };
  }, [isAuthenticated, user?.id, user?.role, setPendingFromNotification, pushDebug]);

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
      const byId =
        pending.bookingId != null ? trips.find((t) => t.id === pending.bookingId) : undefined;
      const bn = pending.bookingNumber.trim().toLowerCase();
      const trip =
        byId ??
        trips.find((t) => String(t.bookingNumber ?? '').trim().toLowerCase() === bn) ??
        trips.find((t) => String(t.bookingNumber ?? '').replace(/^#/, '').trim().toLowerCase() === bn.replace(/^#/, ''));
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
    return SHOW_TRIP_ASSIGNMENT_DEBUG && Platform.OS !== 'web' ? (
      <View style={styles.debugOnly} pointerEvents="none">
        <Text style={styles.debugOnlyText}>
          Trip overlay inactive — log in as driver (role={user?.role ?? 'none'})
        </Text>
      </View>
    ) : null;
  }

  return (
    <View style={styles.rootWrap} pointerEvents="box-none">
      <Modal
        visible={!!pending}
        animationType="fade"
        transparent
        statusBarTranslucent
        presentationStyle="overFullScreen"
      >
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.badge}>NEW TRIP</Text>
            <Text style={styles.title}>{pending?.title ?? 'Trip assigned'}</Text>
            <Text style={styles.body}>{pending?.body}</Text>
            <Text style={styles.hint}>Sound and alerts repeat until you open the trip.</Text>
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
      {SHOW_TRIP_ASSIGNMENT_DEBUG ? (
        <View style={styles.debugStrip} pointerEvents="box-none">
          <Text style={styles.debugTitle}>Trip overlay debug · ownership={Constants.appOwnership ?? '?'}</Text>
          <ScrollView style={styles.debugScroll} nestedScrollEnabled>
            {debugLinesRef.current.map((line, i) => (
              <Text key={`${i}-${line.slice(0, 12)}`} style={styles.debugLine}>
                {line}
              </Text>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rootWrap: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
    zIndex: 200000,
    elevation: 200000,
  },
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
  debugStrip: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: Platform.OS === 'android' ? 40 : 52,
    maxHeight: 120,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 8,
    padding: 8,
    zIndex: 999999,
  },
  debugTitle: { color: '#fde047', fontSize: 10, fontWeight: '700', marginBottom: 4 },
  debugScroll: { maxHeight: 88 },
  debugLine: { color: '#e2e8f0', fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  debugOnly: {
    position: 'absolute',
    bottom: 120,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(220,38,38,0.9)',
    padding: 8,
    borderRadius: 8,
    zIndex: 999998,
  },
  debugOnlyText: { color: '#fff', fontSize: 11 },
});
