/**
 * PhonePe-style full-screen trip assignment alert: Accept / Decline with ringtone until the driver responds.
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
  AppState,
  Alert,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { CommonActions } from '@react-navigation/native';
import { useAuth } from '../providers/AuthProvider';
import { navigationRef } from '../navigation/navigationRef';
import { driverTripsAPI, type DriverTrip } from '../services/driverTripsAPI';
import { ensureTripAssignmentNotificationChannel } from '../services/pushNotificationService';
import {
  isTripAssignmentHandled,
  markTripAssignmentHandled,
  readPendingLockTrip,
  startTripAssignmentChimes,
  stopTripAssignmentChimes,
} from '../lib/tripAssignmentAlarm';
import { colors } from '../theme/colors';

/** Dev + EAS internal: set EXPO_PUBLIC_SHOW_TRIP_ASSIGNMENT_DEBUG=1 to see why the overlay did/didn't open */
const SHOW_TRIP_ASSIGNMENT_DEBUG = process.env.EXPO_PUBLIC_SHOW_TRIP_ASSIGNMENT_DEBUG === '1';
/** Seconds the ringtone runs before auto-mute (trip stays assigned until Accept/Decline). */
const ACCEPT_WINDOW_SEC = 60;

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
  if (String(data.alarm ?? '') === 'chime') return null;
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
  // Repeating chimes reuse the same title/body; never reopen the overlay from them.
  if (data && (String(data.alarm ?? '') === 'chime' || String(data.type ?? '') === 'trip_chime')) {
    return null;
  }
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

function normalizeBookingRef(value: string): string {
  return String(value ?? '')
    .trim()
    .replace(/^#/, '')
    .toLowerCase();
}

function shouldSkipIfAlreadyHandled(source: string): boolean {
  return source !== 'foreground';
}

export function DriverTripAssignmentOverlay() {
  const { user, isAuthenticated } = useAuth();
  const [pending, setPending] = useState<PendingAssignment | null>(null);
  const [opening, setOpening] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [, setDebugTick] = useState(0);
  const debugLinesRef = useRef<string[]>([]);
  const vibrationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const openingRef = useRef(false);
  const decliningRef = useRef(false);
  /** Booking keys the driver already viewed/muted this session (sync gate before AsyncStorage). */
  const handledKeysRef = useRef<Set<string>>(new Set());

  const pushDebug = useCallback((line: string) => {
    if (!SHOW_TRIP_ASSIGNMENT_DEBUG) return;
    const hhmmss = new Date().toISOString().slice(11, 19);
    debugLinesRef.current = [...debugLinesRef.current.slice(-14), `${hhmmss} ${line}`];
    setDebugTick((n) => n + 1);
  }, []);

  const rememberHandledLocally = useCallback((bookingId: number | null, bookingNumber: string) => {
    const bn = normalizeBookingRef(bookingNumber);
    if (bn) handledKeysRef.current.add(`n:${bn}`);
    if (bookingId != null && bookingId > 0) handledKeysRef.current.add(`i:${bookingId}`);
  }, []);

  const isHandledLocally = useCallback((bookingId: number | null, bookingNumber: string) => {
    const bn = normalizeBookingRef(bookingNumber);
    if (bn && handledKeysRef.current.has(`n:${bn}`)) return true;
    if (bookingId != null && bookingId > 0 && handledKeysRef.current.has(`i:${bookingId}`)) return true;
    return false;
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
    await stopTripAssignmentChimes();
  }, []);

  const dismissAssignment = useCallback(
    async (p: PendingAssignment) => {
      rememberHandledLocally(p.bookingId, p.bookingNumber);
      await stopAlarm();
      await markTripAssignmentHandled(p.bookingId, p.bookingNumber);
      setPending(null);
    },
    [rememberHandledLocally, stopAlarm]
  );

  const startAlarm = useCallback(async (p: PendingAssignment) => {
    Vibration.cancel();
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    await stopTripAssignmentChimes(false);
    await ensureTripAssignmentNotificationChannel();

    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 600, 200, 600, 200, 800], true);
    } else {
      Vibration.vibrate();
      vibrationIntervalRef.current = setInterval(() => {
        Vibration.vibrate(500);
      }, 1400);
    }

    try {
      await startTripAssignmentChimes(
        p.title,
        p.body,
        p.bookingId != null ? String(p.bookingId) : '',
        p.bookingNumber
      );
    } catch (e) {
      if (__DEV__) console.warn('[trip assignment] schedule repeat failed', e);
    }
  }, []);

  const tryOpenPending = useCallback(
    async (next: PendingAssignment, source: string) => {
      if (shouldSkipIfAlreadyHandled(source)) {
        if (isHandledLocally(next.bookingId, next.bookingNumber)) {
          pushDebug(`${source}: skip handled ${next.bookingNumber}`);
          return;
        }
        if (await isTripAssignmentHandled(next.bookingId, next.bookingNumber)) {
          rememberHandledLocally(next.bookingId, next.bookingNumber);
          pushDebug(`${source}: skip stored-handled ${next.bookingNumber}`);
          return;
        }
      }
      pushDebug(`${source}: OPEN ${next.bookingNumber} (id=${String(next.bookingId)})`);
      setPending((prev) =>
        prev &&
        normalizeBookingRef(prev.bookingNumber) === normalizeBookingRef(next.bookingNumber)
          ? prev
          : next
      );
    },
    [isHandledLocally, pushDebug, rememberHandledLocally]
  );

  const setPendingFromNotification = useCallback(
    (notification: Notifications.Notification, source: string) => {
      const next = pendingFromNotification(notification);
      if (!next) {
        pushDebug(
          `${source}: skipped title="${String(notification.request.content.title).slice(0, 30)}"`
        );
        return;
      }
      void tryOpenPending(next, source);
    },
    [pushDebug, tryOpenPending]
  );

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'driver' || user.appAccess === 'event_driver' || user.appAccess === 'event_manager' || Platform.OS === 'web') return;

    pushDebug(
      `listeners on user=${user?.id} ownership=${Constants.appOwnership ?? 'n/a'} (expo=Expo Go, standalone=store/internal build)`
    );

    const sub = Notifications.addNotificationReceivedListener((notification) => {
      setPendingFromNotification(notification, 'foreground');
    });

    const subTap = Notifications.addNotificationResponseReceivedListener((response) => {
      const actionId = String(response.actionIdentifier ?? '');
      setPendingFromNotification(response.notification, 'tap');
      if (actionId === 'decline_trip') {
        // Overlay opens; decline is confirmed from the on-screen button for safety.
        pushDebug('tap: decline action from notification');
      }
    });

    const openFromLastResponse = (label: string) => {
      void Notifications.getLastNotificationResponseAsync().then((res) => {
        if (res?.notification) {
          setPendingFromNotification(res.notification, label);
        } else {
          pushDebug(
            `${label}: getLastNotificationResponse = null (normal if opened from app icon, not from a push)`
          );
        }
      });
    };
    const openStoredTrip = (label: string) => {
      void readPendingLockTrip().then((stored) => {
        if (!stored) return;
        const bookingIdNumber = Number(stored.bookingId);
        const bookingId = Number.isFinite(bookingIdNumber) && bookingIdNumber > 0 ? bookingIdNumber : null;
        const bookingNumber = stored.bookingNumber || (bookingId != null ? `#${bookingId}` : '');
        if (bookingNumber === '') return;
        void tryOpenPending(
          {
            bookingId,
            bookingNumber,
            title: stored.title,
            body: stored.body,
          },
          label
        );
      });
    };
    openFromLastResponse('coldStart-0');
    openStoredTrip('stored-0');
    // One short retry only — previously 4 retries re-opened View trip after the driver already tapped it.
    const retryTimer = setTimeout(() => {
      openFromLastResponse('coldStart-1500');
      openStoredTrip('stored-1500');
    }, 1500);
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') openStoredTrip('resume');
    });

    return () => {
      clearTimeout(retryTimer);
      appStateSub.remove();
      sub.remove();
      subTap.remove();
    };
  }, [isAuthenticated, user?.id, user?.role, setPendingFromNotification, pushDebug, tryOpenPending]);

  useEffect(() => {
    if (!pending) {
      void stopAlarm();
      return;
    }
    void startAlarm(pending);
    setSecondsLeft(ACCEPT_WINDOW_SEC);
    const tick = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(tick);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      clearInterval(tick);
      void stopAlarm();
    };
  }, [pending, startAlarm, stopAlarm]);

  // After the accept window, stop ringing but keep the trip assigned (no auto-decline).
  useEffect(() => {
    if (!pending || secondsLeft > 0 || openingRef.current || decliningRef.current) return;
    void (async () => {
      await stopAlarm();
    })();
  }, [secondsLeft, pending, stopAlarm]);

  const navigateToDriverHome = useCallback((trip?: DriverTrip) => {
    let tries = 0;
    const go = () => {
      if (navigationRef.isReady()) {
        if (trip) {
          navigationRef.dispatch(
            CommonActions.navigate({
              name: 'DriverTab',
              params: { screen: 'DriverTripDetail', params: { trip } },
            })
          );
        } else {
          navigationRef.dispatch(
            CommonActions.navigate({
              name: 'DriverTab',
              params: { screen: 'DriverTripsList' },
            })
          );
        }
        return;
      }
      if (tries++ < 60) setTimeout(go, 100);
    };
    go();
  }, []);

  const onAcceptTrip = useCallback(async () => {
    if (!pending || openingRef.current || decliningRef.current) return;
    openingRef.current = true;
    setOpening(true);
    const current = pending;
    try {
      try {
        await driverTripsAPI.respondToTripAssignment({
          bookingId: current.bookingId,
          bookingNumber: current.bookingNumber,
          action: 'accept',
        });
      } catch (e) {
        // Still open the trip if the accept stamp fails — assignment already exists.
        if (__DEV__) console.warn('[trip assignment] accept API', e);
      }
      await dismissAssignment(current);

      const trips = await driverTripsAPI.getTrips();
      const wantId = current.bookingId;
      const wantBn = normalizeBookingRef(current.bookingNumber);
      const trip =
        (wantId != null ? trips.find((t) => t.id === wantId) : undefined) ??
        trips.find((t) => normalizeBookingRef(String(t.bookingNumber ?? '')) === wantBn);

      if (!trip) {
        navigateToDriverHome();
        Alert.alert(
          'Trip accepted',
          'Could not open that trip yet. It should appear in your trip list — pull to refresh if needed.'
        );
        return;
      }
      navigateToDriverHome(trip);
    } catch {
      navigateToDriverHome();
      Alert.alert('Trip accepted', 'Could not load the trip. Open it from your trip list.');
    } finally {
      openingRef.current = false;
      setOpening(false);
    }
  }, [pending, dismissAssignment, navigateToDriverHome]);

  const onDeclineTrip = useCallback(async () => {
    if (!pending || openingRef.current || decliningRef.current) return;
    const current = pending;
    Alert.alert(
      'Decline this trip?',
      'The office will be notified and can assign another driver.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              decliningRef.current = true;
              setDeclining(true);
              try {
                await driverTripsAPI.respondToTripAssignment({
                  bookingId: current.bookingId,
                  bookingNumber: current.bookingNumber,
                  action: 'decline',
                });
                await dismissAssignment(current);
                Alert.alert('Trip declined', 'Office has been notified.');
              } catch (e) {
                Alert.alert('Could not decline', e instanceof Error ? e.message : 'Try again');
              } finally {
                decliningRef.current = false;
                setDeclining(false);
              }
            })();
          },
        },
      ]
    );
  }, [pending, dismissAssignment]);

  if (user?.appAccess === 'event_driver' || user?.appAccess === 'event_manager') {
    return null;
  }

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
            <Text style={styles.badge}>NEW TRIP REQUEST</Text>
            <Text style={styles.timer}>{secondsLeft > 0 ? `${secondsLeft}s` : 'Ringing stopped'}</Text>
            <Text style={styles.title}>{pending?.title ?? 'Trip assigned'}</Text>
            <Text style={styles.body}>{pending?.body}</Text>
            <Text style={styles.hint}>
              Accept to take this trip. Decline returns it to the office. The phone keeps ringing until you respond.
            </Text>
            <TouchableOpacity
              style={[styles.btnAccept, (opening || declining) && styles.btnDisabled]}
              onPress={() => void onAcceptTrip()}
              disabled={opening || declining}
              accessibilityLabel="Accept trip"
            >
              {opening ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnAcceptText}>Accept</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnDecline, (opening || declining) && styles.btnDisabled]}
              onPress={() => void onDeclineTrip()}
              disabled={opening || declining}
              accessibilityLabel="Decline trip"
            >
              {declining ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnDeclineText}>Decline</Text>
              )}
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
    alignSelf: 'center',
    backgroundColor: '#dc2626',
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
    letterSpacing: 0.4,
  },
  timer: {
    alignSelf: 'center',
    fontSize: 28,
    fontWeight: '800',
    color: '#0f766e',
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    color: colors.gray600,
    marginBottom: 12,
    lineHeight: 22,
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    color: colors.gray500,
    marginBottom: 22,
    textAlign: 'center',
    lineHeight: 18,
  },
  btnAccept: {
    backgroundColor: '#16a34a',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnAcceptText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  btnDecline: {
    backgroundColor: '#dc2626',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnDeclineText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.7 },
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
