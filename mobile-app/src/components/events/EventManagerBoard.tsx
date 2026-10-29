import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { EventDateButton } from './EventDateButton';
import { EventTrackMap } from './EventTrackMap';
import { useAuth } from '../../providers/AuthProvider';
import { ensureEventManagerAlertChannel, EVENT_MANAGER_ALERT_CHANNEL_ID } from '../../services/pushNotificationService';
import {
  formatDutyDate,
  mobileEventAPI,
  type EventSharePayload,
  type MobileEvent,
  type ShareVehicle,
  type TrackVehicle,
} from '../../services/eventDutyAPI';
import { fonts } from '../../theme/colors';
import { resolveVehicleImageUrl } from '../../utils/mediaUrl';

type Tab = 'dashboard' | 'vehicles' | 'map' | 'more';
type Chip = 'all' | 'trip' | 'parking' | 'completed';
type StatusFilter = 'all' | 'trip' | 'parking' | 'completed' | 'pending';

function vehicleSerial(row: ShareVehicle, list: ShareVehicle[]): number {
  if (row.serialNo != null && row.serialNo > 0) return row.serialNo;
  const index = list.findIndex((item) => item.dutySlipNo === row.dutySlipNo && item.dutyId === row.dutyId);
  return index >= 0 ? index + 1 : 1;
}

function initials(name?: string | null): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  const letters = `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase();
  return letters || 'U';
}

function dayParts(iso: string): { label: string; week: string } {
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return { label: iso, week: '' };
  return {
    label: parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    week: parsed.toLocaleDateString('en-IN', { weekday: 'short' }),
  };
}

function displayMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  if (digits.length >= 10) return `+91 ${digits.slice(-10)}`;
  return mobile;
}

function dutyStarted(row: ShareVehicle): boolean {
  return row.status === 'in_progress' && Boolean(row.openingAt) && !row.closingAt;
}

function placeOf(row: ShareVehicle): 'trip' | 'parking' {
  return row.dutyPlace === 'parking' ? 'parking' : 'trip';
}

function isCompleted(row: ShareVehicle): boolean {
  return row.status === 'completed' || Boolean(row.closingAt);
}

function isPending(row: ShareVehicle): boolean {
  return !dutyStarted(row) && !isCompleted(row);
}

function durationMinutes(row: ShareVehicle): number {
  if (!row.openingAt) return 0;
  const from = new Date(row.openingAt.replace(' ', 'T'));
  if (Number.isNaN(from.getTime())) return 0;
  const end = row.closingAt || row.endRequestedAt;
  const to = end ? new Date(end.replace(' ', 'T')) : new Date();
  if (Number.isNaN(to.getTime())) return 0;
  const seconds = Math.floor((to.getTime() - from.getTime()) / 1000) - Math.max(0, row.pausedSeconds || 0);
  return Math.max(0, Math.floor(seconds / 60));
}

function listRank(row: ShareVehicle): number {
  if (dutyStarted(row) && placeOf(row) === 'parking') return 0;
  if (dutyStarted(row)) return 1;
  if (durationMinutes(row) > 0) return 2;
  return 3;
}

function durationLabel(start?: string | null, end?: string | null, pausedSeconds = 0): string {
  if (!start) return '';
  const from = new Date(start.replace(' ', 'T'));
  if (Number.isNaN(from.getTime())) return '';
  const to = end ? new Date(end.replace(' ', 'T')) : new Date();
  const seconds = Math.floor((to.getTime() - from.getTime()) / 1000) - Math.max(0, pausedSeconds);
  const mins = Math.max(0, Math.floor(seconds / 60));
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  if (hours <= 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

type NoticeKind = 'started' | 'parking' | 'trip' | 'ended';

type ManagerNotice = {
  id: string;
  dutyId: number;
  kind: NoticeKind;
  title: string;
  body: string;
  at: number;
  read: boolean;
};

function noticeKey(eventId: number): string {
  return `vth.manager.notices.${eventId}`;
}

function baselineStorageKey(eventId: number, day: string): string {
  return `vth.manager.baseline.${eventId}.${day}`;
}

function parseBaseline(raw: string): Map<number, ShareVehicle> | null {
  try {
    const rows = JSON.parse(raw) as ShareVehicle[];
    if (!Array.isArray(rows)) return null;
    const map = new Map<number, ShareVehicle>();
    rows.forEach((row) => {
      if (row && typeof row.dutyId === 'number') map.set(row.dutyId, row);
    });
    return map;
  } catch {
    return null;
  }
}

function who(row: ShareVehicle): string {
  const driver = row.driverName || 'Driver';
  const vehicle = [row.vehicleType, row.vehicleNumber].filter(Boolean).join(' ');
  return vehicle ? `${driver} · ${vehicle}` : driver;
}

function noticeCopy(kind: NoticeKind, row: ShareVehicle): { title: string; body: string } {
  const name = who(row);
  switch (kind) {
    case 'started':
      return { title: 'Trip started', body: `${name} started the duty.` };
    case 'parking':
      return { title: 'In Parking', body: `${name} is in parking.` };
    case 'trip':
      return { title: 'In Trip', body: `${name} is on a trip.` };
    case 'ended':
      return { title: 'Trip ended', body: `${name} ended the duty.` };
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}

function noticeStyle(kind: NoticeKind): { icon: keyof typeof Ionicons.glyphMap; color: string } {
  switch (kind) {
    case 'started':
      return { icon: 'play-circle', color: '#16a34a' };
    case 'parking':
      return { icon: 'pause-circle', color: '#ea580c' };
    case 'trip':
      return { icon: 'navigate-circle', color: '#2563eb' };
    case 'ended':
      return { icon: 'checkmark-circle', color: '#0284c7' };
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}

function isManagerNotice(value: unknown): value is ManagerNotice {
  if (!value || typeof value !== 'object') return false;
  const row = value as ManagerNotice;
  return typeof row.id === 'string'
    && typeof row.dutyId === 'number'
    && (row.kind === 'started' || row.kind === 'parking' || row.kind === 'trip' || row.kind === 'ended')
    && typeof row.title === 'string'
    && typeof row.body === 'string'
    && typeof row.at === 'number';
}

function collectChanges(previous: Map<number, ShareVehicle>, rows: ShareVehicle[]): ManagerNotice[] {
  const found: ManagerNotice[] = [];
  for (const row of rows) {
    if (!row.dutyId) continue;
    const prev = previous.get(row.dutyId);
    if (!prev) continue;
    const kinds: NoticeKind[] = [];
    const wasDone = isCompleted(prev);
    const nowDone = isCompleted(row);
    if (!prev.openingAt && row.openingAt && !nowDone) kinds.push('started');
    if (!wasDone && nowDone) kinds.push('ended');
    if (dutyStarted(row) && placeOf(prev) !== 'parking' && placeOf(row) === 'parking') kinds.push('parking');
    if (dutyStarted(row) && placeOf(prev) === 'parking' && placeOf(row) === 'trip') kinds.push('trip');
    for (const kind of kinds) {
      const copy = noticeCopy(kind, row);
      const stamp = kind === 'ended' ? row.closingAt : kind === 'started' ? row.openingAt : row.placeSince;
      found.push({
        id: `${row.dutyId}:${kind}:${stamp || ''}`,
        dutyId: row.dutyId,
        kind,
        title: copy.title,
        body: copy.body,
        at: Date.now(),
        read: false,
      });
    }
  }
  return found;
}

function liveBoardRows(rows: ShareVehicle[]): ManagerNotice[] {
  const found: ManagerNotice[] = [];
  for (const row of rows) {
    if (!row.dutyId) continue;
    let kind: NoticeKind | null = null;
    if (isCompleted(row)) kind = 'ended';
    else if (dutyStarted(row) && placeOf(row) === 'parking') kind = 'parking';
    else if (dutyStarted(row)) kind = 'trip';
    if (!kind) continue;
    const copy = noticeCopy(kind, row);
    found.push({
      id: `live:${row.dutyId}:${kind}`,
      dutyId: row.dutyId,
      kind,
      title: copy.title,
      body: copy.body,
      at: 0,
      read: true,
    });
  }
  return found;
}

function ago(at: number): string {
  if (at <= 0) return '';
  const mins = Math.max(0, Math.floor((Date.now() - at) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

async function presentManagerAlerts(items: ManagerNotice[]): Promise<void> {
  if (Platform.OS === 'web' || items.length === 0) return;
  const current = await Notifications.getPermissionsAsync();
  const status = current.status === 'granted' ? current.status : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return;
  await ensureEventManagerAlertChannel().catch(() => undefined);
  for (const item of items) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.title,
        body: item.body,
        sound: true,
        data: { type: 'event_manager', dutyId: String(item.dutyId) },
        ...(Platform.OS === 'android' ? { channelId: EVENT_MANAGER_ALERT_CHANNEL_ID } : {}),
      },
      trigger: null,
    }).catch(() => undefined);
  }
}

function statusLine(row: ShareVehicle): { text: string; color: string } {
  if (row.endRequestedAt) {
    return {
      text: row.endRequestSeenAt ? 'Seen · end duty' : 'Asked to end',
      color: '#e11d48',
    };
  }
  if (isCompleted(row)) return { text: 'Completed', color: '#0284c7' };
  if (dutyStarted(row)) return { text: placeOf(row) === 'parking' ? 'In Parking' : 'In Trip', color: '#d97706' };
  return { text: 'Pending', color: '#e11d48' };
}

export function EventManagerBoard({
  token,
  event,
  events,
  onOpenEvent,
  onLogout,
}: {
  token: string;
  event: MobileEvent;
  events: MobileEvent[];
  onOpenEvent: (event: MobileEvent) => void;
  onLogout: () => void;
}) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [view, setView] = useState<EventSharePayload | null>(null);
  const [tracks, setTracks] = useState<TrackVehicle[]>([]);
  const [date, setDate] = useState(event.startDate);
  const [chip, setChip] = useState<Chip>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [focusId, setFocusId] = useState<number | null>(null);
  const [picker, setPicker] = useState<'type' | 'status' | 'events' | 'details' | null>(null);
  const [sheet, setSheet] = useState<'alerts' | 'profile' | null>(null);
  const [notices, setNotices] = useState<ManagerNotice[]>([]);
  const [selected, setSelected] = useState<ShareVehicle | null>(null);
  const placeAdjustRef = useRef<Record<number, PlaceTap[]>>({});
  const [placeTick, setPlaceTick] = useState(0);
  const baselineRef = useRef<Map<number, ShareVehicle> | null>(null);
  const watchRef = useRef('');
  const skipDutyRef = useRef<number | null>(null);
  const storedNoticeKey = noticeKey(event.id);

  const load = useCallback(async (nextDate?: string, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [share, located] = await Promise.all([
        mobileEventAPI.fetchShare(token, nextDate),
        mobileEventAPI.fetchTracking(token, nextDate).catch(() => [] as TrackVehicle[]),
      ]);
      setView(share);
      setTracks(located);
      setDate(share.selectedDate || nextDate || event.startDate);
      setError('');
      const selected = share.selectedDate || nextDate || event.startDate;
      const watch = `${token}:${selected}`;
      let previous = baselineRef.current;
      if (watchRef.current !== watch) {
        watchRef.current = watch;
        const raw = await AsyncStorage.getItem(baselineStorageKey(event.id, selected)).catch(() => null);
        previous = raw ? parseBaseline(raw) : null;
      }
      const nextMap = new Map<number, ShareVehicle>();
      share.vehicles.forEach((row) => {
        if (row.dutyId) nextMap.set(row.dutyId, row);
      });
      baselineRef.current = nextMap;
      void AsyncStorage.setItem(baselineStorageKey(event.id, selected), JSON.stringify(share.vehicles)).catch(() => undefined);
      if (previous) {
        const skip = skipDutyRef.current;
        const fresh = collectChanges(previous, share.vehicles).filter((item) => item.dutyId !== skip);
        if (fresh.length) {
          setNotices((current) => {
            const ids = new Set(current.map((item) => item.id));
            const merged = [...fresh.filter((item) => !ids.has(item.id)), ...current].slice(0, 50);
            void AsyncStorage.setItem(storedNoticeKey, JSON.stringify(merged)).catch(() => undefined);
            return merged;
          });
          void presentManagerAlerts(fresh);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this event');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [event.id, event.startDate, storedNoticeKey, token]);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storedNoticeKey).then((raw) => {
      if (!active || !raw) {
        if (active) setNotices([]);
        return;
      }
      try {
        const saved = JSON.parse(raw) as unknown[];
        const parsed = Array.isArray(saved) ? saved.filter(isManagerNotice).slice(0, 50) : [];
        if (active) {
          setNotices((current) => {
            const ids = new Set(current.map((item) => item.id));
            return [...current, ...parsed.filter((item) => !ids.has(item.id))].slice(0, 50);
          });
        }
      } catch {
        if (active) setNotices([]);
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [storedNoticeKey]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void Notifications.getPermissionsAsync().then((current) => {
      if (current.status === 'granted') return;
      return Notifications.requestPermissionsAsync();
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    void load(date);
    const id = setInterval(() => { void load(date, true); }, 15000);
    return () => clearInterval(id);
  }, [date, load]);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(PLACE_MEMORY_KEY).then((raw) => {
      if (!active || !raw) return;
      try {
        const saved = JSON.parse(raw) as Record<string, PlaceTap[]>;
        const next: Record<number, PlaceTap[]> = {};
        Object.entries(saved).forEach(([id, value]) => {
          const dutyId = Number(id);
          const taps = Array.isArray(value)
            ? value.filter((tap) => (tap.place === 'trip' || tap.place === 'parking') && Number.isFinite(tap.at))
            : [];
          if (dutyId > 0 && taps.length) next[dutyId] = taps;
        });
        placeAdjustRef.current = { ...next, ...placeAdjustRef.current };
        setPlaceTick((count) => count + 1);
      } catch {
        // Ignore a damaged saved tap log.
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const vehicles = useMemo(() => view?.vehicles ?? [], [view?.vehicles]);
  useEffect(() => {
    setSelected((current) => {
      if (!current?.dutyId) return current;
      return vehicles.find((item) => item.dutyId === current.dutyId) ?? current;
    });
  }, [vehicles]);
  const types = useMemo(
    () => Array.from(new Set(vehicles.map((row) => row.vehicleType).filter(Boolean))),
    [vehicles],
  );
  const tripCount = vehicles.filter((row) => dutyStarted(row) && placeOf(row) === 'trip').length;
  const parkingCount = vehicles.filter((row) => dutyStarted(row) && placeOf(row) === 'parking').length;
  const completedCount = vehicles.filter(isCompleted).length;
  const pendingCount = vehicles.filter(isPending).length;
  const unreadCount = notices.filter((item) => !item.read).length;
  const liveNow = useMemo(() => liveBoardRows(vehicles), [vehicles]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vehicles.filter((row) => {
      if (typeFilter !== 'all' && row.vehicleType !== typeFilter) return false;
      const place = statusFilter === 'trip' || statusFilter === 'parking' ? statusFilter : chip === 'trip' || chip === 'parking' ? chip : null;
      if (place) {
        if (!dutyStarted(row) || placeOf(row) !== place) return false;
      } else if (statusFilter === 'completed' || chip === 'completed') {
        if (!isCompleted(row)) return false;
      } else if (statusFilter === 'pending' && !isPending(row)) {
        return false;
      }
      if (!q) return true;
      return [row.vehicleNumber, row.driverName, row.vehicleType, row.driverMobile, row.dutySlipNo]
        .join(' ')
        .toLowerCase()
        .includes(q);
    }).sort((a, b) => {
      const group = listRank(a) - listRank(b);
      if (group !== 0) return group;
      const tapsFor = (item: ShareVehicle) => (item.dutyId ? placeAdjustRef.current[item.dutyId] : undefined);
      return placeSortSeconds(b, tapsFor(b)) - placeSortSeconds(a, tapsFor(a));
    });
  }, [chip, placeTick, query, statusFilter, typeFilter, vehicles]);

  const setPlace = async (row: ShareVehicle) => {
    if (!row.dutyId) return;
    const next = placeOf(row) === 'parking' ? 'trip' : 'parking';
    const opened = parseServer(row.openingAt)?.getTime() ?? 0;
    const since = parseServer(row.placeSince)?.getTime() ?? 0;
    const existing = placeAdjustRef.current[row.dutyId] ?? [];
    const base = existing.length === 0 && since > opened + 1000 ? [{ place: placeOf(row), at: since }] : existing;
    const previous = base.length ? [...base].sort((a, b) => a.at - b.at)[base.length - 1] : undefined;
    const previousPlace = previous?.place ?? 'trip';
    const recorded = previousPlace !== next;
    if (recorded) {
      const taps = [...base, { place: next, at: Date.now() }];
      placeAdjustRef.current[row.dutyId] = taps;
      void AsyncStorage.setItem(PLACE_MEMORY_KEY, JSON.stringify(placeAdjustRef.current)).catch(() => undefined);
    }
    setPlaceTick((count) => count + 1);
    setView((current) => {
      if (!current) return current;
      return {
        ...current,
        vehicles: current.vehicles.map((item) => (
          item.dutyId === row.dutyId
            ? { ...item, dutyPlace: next, placeSince: recorded ? localStamp(Date.now()) : item.placeSince }
            : item
        )),
      };
    });
    setSelected((current) => {
      if (current?.dutyId !== row.dutyId) return current;
      return recorded
        ? { ...current, dutyPlace: next, placeSince: localStamp(Date.now()) }
        : { ...current, dutyPlace: next };
    });
    setBusyId(row.dutyId);
    skipDutyRef.current = row.dutyId;
    try {
      await mobileEventAPI.setDutyPlace(token, row.dutyId, next);
      await load(date, true);
    } catch (err) {
      Alert.alert('Could not update', err instanceof Error ? err.message : 'Try again');
    } finally {
      skipDutyRef.current = null;
      setBusyId(null);
    }
  };

  const openAlerts = () => {
    setSheet('alerts');
    setNotices((current) => {
      if (!current.some((item) => !item.read)) return current;
      const next = current.map((item) => ({ ...item, read: true }));
      void AsyncStorage.setItem(storedNoticeKey, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  };

  const openNotice = (item: ManagerNotice) => {
    const row = vehicles.find((vehicle) => vehicle.dutyId === item.dutyId);
    setSheet(null);
    if (!row) return;
    setSelected(row);
    setPicker('details');
  };

  const remind = async (row: ShareVehicle) => {
    if (!row.dutyId) return;
    setBusyId(row.dutyId);
    try {
      await mobileEventAPI.askEndDuty(token, row.dutyId);
      const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
      setSelected((current) => (
        current && current.dutyId === row.dutyId
          ? { ...current, endRequestedAt: current.endRequestedAt || stamp }
          : current
      ));
      Alert.alert('Reminded', 'The driver was asked to end this duty.');
      await load(date, true);
    } catch (err) {
      Alert.alert('Could not remind', err instanceof Error ? err.message : 'Try again');
    } finally {
      setBusyId(null);
    }
  };

  const clearEndRequest = (dutyId: number) => {
    setView((current) => {
      if (!current) return current;
      return {
        ...current,
        vehicles: current.vehicles.map((item) => (
          item.dutyId === dutyId ? { ...item, endRequestedAt: null, endRequestSeenAt: null } : item
        )),
      };
    });
    setSelected((current) => (
      current?.dutyId === dutyId ? { ...current, endRequestedAt: null, endRequestSeenAt: null } : current
    ));
  };

  const continueDuty = (row: ShareVehicle) => {
    if (!row.dutyId) return;
    const dutyId = row.dutyId;
    Alert.alert(
      'Continue this duty?',
      'The ending odometer is removed, and hours start counting again from the stopped time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            setBusyId(dutyId);
            void mobileEventAPI.resumeDutyShare(token, dutyId)
              .then(async () => {
                Alert.alert('Duty continued', 'Hours are counting again.');
                await load(date, true);
              })
              .catch((err: unknown) => {
                Alert.alert('Could not continue', err instanceof Error ? err.message : 'Try again');
              })
              .finally(() => setBusyId(null));
          },
        },
      ],
    );
  };

  const revokeEnd = (row: ShareVehicle) => {
    if (!row.dutyId || !row.endRequestedAt) return;
    Alert.alert(
      'Revoke end request?',
      'This trip stays open, and time after the request counts again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => {
            const dutyId = row.dutyId;
            if (!dutyId) return;
            setBusyId(dutyId);
            void mobileEventAPI.revokeEndDuty(token, dutyId)
              .then(async () => {
                clearEndRequest(dutyId);
                Alert.alert('End request revoked', 'This trip stays open and time is counting again.');
                await load(date, true);
              })
              .catch((err: unknown) => {
                Alert.alert('Could not revoke', err instanceof Error ? err.message : 'Try again');
              })
              .finally(() => setBusyId(null));
          },
        },
      ],
    );
  };

  const callDriver = (mobile?: string) => {
    const digits = (mobile || '').replace(/\D/g, '');
    if (!digits) return;
    void Linking.openURL(`tel:+91${digits.slice(-10)}`);
  };

  const whatsAppDriver = (mobile?: string) => {
    const digits = (mobile || '').replace(/\D/g, '');
    if (!digits) return;
    void Linking.openURL(`https://wa.me/91${digits.slice(-10)}`);
  };

  const openMap = (row: ShareVehicle) => {
    if (row.dutyId) setFocusId(row.dutyId);
    setTab('map');
  };

  const range = `${formatDutyDate(event.startDate)} – ${formatDutyDate(event.endDate)}`;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Image
          source={{ uri: 'https://www.vizagtaxihub.com/uploads/vizagtaxihub-logo.png' }}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Vizag Taxi Hub"
        />
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.bell} onPress={openAlerts} accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={20} color="#0f172a" />
            {unreadCount > 0 ? (
              <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatar} onPress={() => setSheet('profile')} accessibilityLabel="Profile">
            <Text style={styles.avatarText}>{initials(user?.name)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {tab === 'map' ? (
        <View style={styles.mapPane}>
          <EventTrackMap fill vehicles={tracks} focusId={focusId} onSelect={setFocusId} />
        </View>
      ) : null}

      {tab === 'more' ? (
        <View style={styles.more}>
          <Text style={styles.eventTitle}>{event.name}</Text>
          <Text style={styles.eventSub}>{range}</Text>
          {events.length > 1 ? events.map((item) => (
            <TouchableOpacity key={item.id} style={styles.moreRow} onPress={() => onOpenEvent(item)}>
              <Text style={styles.moreLabel}>{item.name}</Text>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )) : null}
          <TouchableOpacity style={styles.moreRow} onPress={onLogout}>
            <Text style={styles.logout}>Log out</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {tab === 'dashboard' || tab === 'vehicles' ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(date, true); }} />}
        >
          {tab === 'dashboard' ? (
            <>
              <TouchableOpacity style={styles.range} onPress={() => { if (events.length > 1) setPicker('events'); }}>
                <Ionicons name="calendar-outline" size={14} color="#64748b" />
                <Text style={styles.rangeText}>{range}</Text>
                <Ionicons name="chevron-down" size={14} color="#64748b" />
              </TouchableOpacity>
              <Text style={styles.eventTitle}>{event.name}</Text>
              <Text style={styles.eventSub}>Event Vehicle List</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
                {(view?.dates ?? []).map((day) => {
                  const parts = dayParts(day);
                  const on = day === date;
                  return (
                    <TouchableOpacity key={day} style={[styles.dayChip, on && styles.dayChipOn]} onPress={() => setDate(day)}>
                      <Text style={[styles.dayLabel, on && styles.dayLabelOn]}>{parts.label}</Text>
                      <Text style={[styles.dayWeek, on && styles.dayLabelOn]}>{parts.week}</Text>
                    </TouchableOpacity>
                  );
                })}
                <EventDateButton compact label="Date" value={date} onChange={setDate} />
              </ScrollView>
              <View style={styles.stats}>
                <Stat icon="car-outline" value={vehicles.length} label={'Total\nVehicles'} tint="#eff6ff" color="#2563eb" />
                <Stat icon="play" value={tripCount} label={'In\nTrip'} tint="#ecfdf5" color="#16a34a" />
                <Stat icon="pause" value={parkingCount} label={'In\nParking'} tint="#fff7ed" color="#ea580c" />
                <Stat icon="checkmark-circle-outline" value={completedCount} label={'Trip\nCompleted'} tint="#f0f9ff" color="#0284c7" />
                <Stat icon="time-outline" value={pendingCount} label={'Total\nPending'} tint="#fff1f2" color="#e11d48" />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
                <Filter icon="car-outline" label={`All Vehicles (${vehicles.length})`} active={chip === 'all' && statusFilter === 'all'} onPress={() => { setChip('all'); setStatusFilter('all'); }} />
                <Filter icon="play" label={`In Trip (${tripCount})`} active={chip === 'trip'} onPress={() => { setChip('trip'); setStatusFilter('all'); }} />
                <Filter icon="pause" label={`In Parking (${parkingCount})`} active={chip === 'parking'} onPress={() => { setChip('parking'); setStatusFilter('all'); }} />
                <Filter icon="checkmark" label={`Completed (${completedCount})`} active={chip === 'completed'} onPress={() => { setChip('completed'); setStatusFilter('all'); }} />
              </ScrollView>
            </>
          ) : null}

          <View style={styles.searchRow}>
            <View style={styles.search}>
              <Ionicons name="search" size={16} color="#94a3b8" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by vehicle, driver or number..."
                placeholderTextColor="#94a3b8"
                style={styles.searchInput}
              />
            </View>
            <TouchableOpacity style={styles.select} onPress={() => setPicker('type')}>
              <Text style={styles.selectText} numberOfLines={1}>{typeFilter === 'all' ? 'All Types' : typeFilter}</Text>
              <Ionicons name="chevron-down" size={14} color="#64748b" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.select} onPress={() => setPicker('status')}>
              <Text style={styles.selectText}>{statusFilter === 'all' ? 'All Status' : statusFilter}</Text>
              <Ionicons name="chevron-down" size={14} color="#64748b" />
            </TouchableOpacity>
          </View>

          {loading && !view ? <ActivityIndicator color="#2563eb" style={styles.pad} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {rows.map((row) => {
            const started = dutyStarted(row);
            const line = statusLine(row);
            const duration = durationLabel(row.openingAt, row.closingAt || row.endRequestedAt, row.pausedSeconds || 0);
            const taps = row.dutyId ? placeAdjustRef.current[row.dutyId] : undefined;
            const secs = placeSeconds(row, Date.now(), taps);
            const currentSecs = placeOf(row) === 'parking' ? secs.parking : secs.trip;
            const placeTime = currentSecs > 0 ? secondsLabel(currentSecs) : duration;
            return (
              <View key={`${row.dutyId ?? row.vehicleNumber}-${row.dutySlipNo}`} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardMain}>
                    <Text style={styles.vehicleName} numberOfLines={1}>{row.vehicleType || 'Vehicle'}</Text>
                    <View style={styles.regRow}>
                      <Text style={styles.reg} numberOfLines={1}>{row.vehicleNumber}</Text>
                      {view?.event.showSerialNo ? (
                        <Text style={styles.serial}>{vehicleSerial(row, vehicles)}</Text>
                      ) : null}
                    </View>
                    {duration ? <Text style={styles.duration}>{duration}</Text> : null}
                  </View>
                  <View style={styles.driverCol}>
                    <Text style={styles.driverName} numberOfLines={1}>{row.driverName || 'Driver'}</Text>
                    {row.driverMobile ? <Text style={styles.phone} numberOfLines={1}>{displayMobile(row.driverMobile)}</Text> : null}
                    <Text style={[styles.statusText, { color: line.color }]} numberOfLines={1}>{line.text}</Text>
                  </View>
                  <View style={styles.actionCol}>
                    {started ? (
                      <>
                        {row.endRequestedAt && !row.closingAt ? (
                          <TouchableOpacity style={styles.revoke} disabled={busyId === row.dutyId} onPress={() => revokeEnd(row)}>
                            <Text style={styles.revokeText}>Revoke</Text>
                          </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity style={styles.remind} disabled={busyId === row.dutyId} onPress={() => { void remind(row); }}>
                          <Ionicons name="notifications-outline" size={14} color="#ef4444" />
                          <Text style={styles.remindText}>Remind</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.placeBtn, placeOf(row) === 'parking' ? styles.placePark : styles.placeTrip]}
                          disabled={busyId === row.dutyId}
                          onPress={() => { void setPlace(row); }}
                        >
                          <Text style={styles.placeText}>{placeOf(row) === 'parking' ? 'In Parking' : 'In Trip'}</Text>
                          {placeTime ? <Text style={styles.placeTime}>{placeTime}</Text> : null}
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        {isCompleted(row) && row.dutyId ? (
                          <TouchableOpacity style={styles.continueBtn} disabled={busyId === row.dutyId} onPress={() => continueDuty(row)}>
                            <Text style={styles.continueText}>Continue</Text>
                          </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity style={styles.viewBtn} onPress={() => { setSelected(row); setPicker('details'); }}>
                          <Ionicons name="eye-outline" size={16} color="#16a34a" />
                          <Text style={styles.viewText}>View</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <CardAction icon="location-outline" label="Live Map" onPress={() => openMap(row)} />
                  <CardAction icon="document-text-outline" label="Trip Details" onPress={() => { setSelected(row); setPicker('details'); }} />
                  <CardAction icon="logo-whatsapp" label="WhatsApp" onPress={() => whatsAppDriver(row.driverMobile)} />
                  <CardAction icon="call-outline" label="Call" onPress={() => callDriver(row.driverMobile)} />
                </View>
              </View>
            );
          })}
          {!loading && rows.length === 0 ? <Text style={styles.empty}>No vehicles match this filter.</Text> : null}
        </ScrollView>
      ) : null}

      <View style={styles.tabs}>
        <TabButton icon="home-outline" activeIcon="home" label="Dashboard" active={tab === 'dashboard'} onPress={() => setTab('dashboard')} />
        <TabButton icon="car-outline" activeIcon="car" label="Vehicles" active={tab === 'vehicles'} onPress={() => setTab('vehicles')} />
        <TabButton icon="map-outline" activeIcon="map" label="Live Map" active={tab === 'map'} onPress={() => setTab('map')} />
        <TabButton icon="ellipsis-horizontal" activeIcon="ellipsis-horizontal" label="More" active={tab === 'more'} onPress={() => setTab('more')} />
      </View>

      <PickerSheet
        visible={picker === 'type' || picker === 'status' || picker === 'events'}
        title={picker === 'type' ? 'Vehicle type' : picker === 'status' ? 'Status' : 'Events'}
        onClose={() => setPicker(null)}
        options={
          picker === 'type'
            ? ['all', ...types]
            : picker === 'status'
              ? ['all', 'trip', 'parking', 'completed', 'pending']
              : events.map((item) => item.name)
        }
        label={(value) => {
          if (picker === 'events') return value;
          if (value === 'all') return picker === 'type' ? 'All Types' : 'All Status';
          return value.replace(/_/g, ' ');
        }}
        onPick={(value) => {
          if (picker === 'type') setTypeFilter(value);
          if (picker === 'status') {
            setStatusFilter(value as StatusFilter);
            if (value !== 'all') setChip('all');
          }
          if (picker === 'events') {
            const next = events.find((item) => item.name === value);
            if (next) onOpenEvent(next);
          }
          setPicker(null);
        }}
      />

      <TripDetailsSheet
        visible={picker === 'details' && selected != null}
        row={selected}
        date={date}
        token={token}
        reminding={selected != null && busyId === selected.dutyId}
        taps={selected?.dutyId ? placeAdjustRef.current[selected.dutyId] : undefined}
        onClose={() => setPicker(null)}
        onCall={callDriver}
        onRemind={(item) => { void remind(item); }}
        onRevoke={revokeEnd}
      />

      <Modal visible={sheet === 'alerts'} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheet(null)} />
        <View style={styles.tripSheet}>
          <ScrollView contentContainerStyle={styles.tripContent} showsVerticalScrollIndicator={false}>
            <View style={styles.handle} />
            <Text style={styles.tripTitle}>Notifications</Text>
            <Text style={styles.sheetHint}>Trip started, in parking, and trip ended.</Text>
            {notices.length === 0 ? <Text style={styles.empty}>No new updates yet. Changes show up here.</Text> : notices.map((item) => (
              <NoticeRow key={item.id} item={item} onPress={() => openNotice(item)} />
            ))}
            <Text style={styles.sectionLabel}>On the board now</Text>
            {liveNow.length === 0 ? <Text style={styles.empty}>Nobody is on a duty for this day.</Text> : liveNow.map((item) => (
              <NoticeRow key={item.id} item={item} onPress={() => openNotice(item)} />
            ))}
            <TouchableOpacity style={styles.trackRow} onPress={() => { setSheet(null); setTab('map'); }}>
              <Ionicons name="map" size={18} color="#2563eb" />
              <Text style={styles.trackText}>Open live tracking</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={sheet === 'profile'} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheet(null)} />
        <View style={styles.profileSheet}>
          <View style={styles.handle} />
          <View style={styles.profileHead}>
            <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{initials(user?.name)}</Text></View>
            <Text style={styles.profileName}>{user?.name || 'Account'}</Text>
            {user?.phone ? <Text style={styles.profilePhone}>{displayMobile(user.phone)}</Text> : null}
          </View>
          <TouchableOpacity style={styles.profileRow} onPress={() => { setSheet(null); setTab('map'); }}>
            <Ionicons name="navigate" size={18} color="#2563eb" />
            <Text style={styles.profileRowText}>Live tracking</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileRow} onPress={onLogout}>
            <Ionicons name="log-out-outline" size={18} color="#b91c1c" />
            <Text style={styles.profileLogout}>Log out</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

function NoticeRow({ item, onPress }: { item: ManagerNotice; onPress: () => void }) {
  const look = noticeStyle(item.kind);
  const when = ago(item.at);
  return (
    <TouchableOpacity style={styles.noticeRow} onPress={onPress}>
      <Ionicons name={look.icon} size={22} color={look.color} />
      <View style={styles.noticeCopy}>
        <Text style={styles.noticeTitle}>{item.title}</Text>
        <Text style={styles.noticeBody}>{item.body}</Text>
      </View>
      {when ? <Text style={styles.noticeWhen}>{when}</Text> : null}
    </TouchableOpacity>
  );
}

function reportingClock(value?: string | null): string {
  if (!value) return '—';
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return value;
  const hours = Number(match[1]);
  if (Number.isNaN(hours)) return value;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${match[2]} ${suffix}`;
}

function weekdayName(iso: string): string {
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-IN', { weekday: 'long' });
}

function shortDate(iso: string): string {
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function dateTimeLabel(value?: string | null): string {
  if (!value) return '';
  const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return '';
  const day = parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const clock = parsed.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return `${day}, ${clock}`;
}

function secondsLabel(total: number): string {
  const whole = Math.max(0, Math.floor(total));
  if (whole < 60) return whole > 0 ? `${whole}s` : '0m';
  const mins = Math.floor(whole / 60);
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  if (hours <= 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

function localStamp(ms: number): string {
  const date = new Date(ms);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function parseServer(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const PLACE_MEMORY_KEY = 'vth.duty.place.taps.v2';

type PlaceTap = { place: 'trip' | 'parking'; at: number };

function placeClockEnd(row: ShareVehicle, nowMs: number): number {
  const asked = parseServer(row.endRequestedAt)?.getTime() ?? 0;
  const closed = parseServer(row.closingAt)?.getTime() ?? 0;
  let end = nowMs;
  if (asked > 0 && (!closed || closed > asked)) end = asked;
  else if (closed > 0) end = closed;
  return Math.min(end, nowMs);
}

function durationsFromTaps(openingMs: number, endMs: number, taps: PlaceTap[]): { trip: number; parking: number } {
  const points: PlaceTap[] = [{ place: 'trip', at: openingMs }];
  const sorted = [...taps].filter((tap) => tap.at > openingMs + 1000 && tap.at <= endMs).sort((a, b) => a.at - b.at);
  for (const tap of sorted) {
    const last = points[points.length - 1];
    if (tap.place !== last.place) points.push(tap);
  }
  let trip = 0;
  let parking = 0;
  for (let index = 0; index < points.length; index += 1) {
    const stop = index + 1 < points.length ? points[index + 1].at : endMs;
    const secs = Math.max(0, Math.floor((stop - points[index].at) / 1000));
    if (points[index].place === 'parking') parking += secs;
    else trip += secs;
  }
  return { trip, parking };
}

function tapsForRow(row: ShareVehicle, taps: PlaceTap[] | undefined): PlaceTap[] {
  const list: PlaceTap[] = [];
  for (const span of row.placeSpans ?? []) {
    const at = parseServer(span.at)?.getTime();
    if (!at || (span.place !== 'trip' && span.place !== 'parking')) continue;
    list.push({ place: span.place, at });
  }
  const opened = parseServer(row.openingAt)?.getTime() ?? 0;
  const since = parseServer(row.placeSince)?.getTime() ?? 0;
  if (list.length === 0 && opened > 0 && since > opened + 1000) {
    list.push({ place: placeOf(row), at: since });
  }
  const local = (taps ?? []).filter((tap) => (tap.place === 'trip' || tap.place === 'parking') && Number.isFinite(tap.at));
  const last = local.length ? [...local].sort((a, b) => a.at - b.at)[local.length - 1] : undefined;
  if (last && last.place !== placeOf(row)) return list;
  return list.concat(local);
}

function placeSeconds(row: ShareVehicle, nowMs: number, taps?: PlaceTap[]): { trip: number; parking: number } {
  const opened = parseServer(row.openingAt);
  if (!opened) return { trip: 0, parking: 0 };
  return durationsFromTaps(opened.getTime(), placeClockEnd(row, nowMs), tapsForRow(row, taps));
}

function placeSortSeconds(row: ShareVehicle, taps?: PlaceTap[]): number {
  const secs = placeSeconds(row, Date.now(), taps);
  if (dutyStarted(row) && placeOf(row) === 'parking') {
    return secs.parking > 0 ? secs.parking : durationMinutes(row) * 60;
  }
  if (dutyStarted(row)) return secs.trip > 0 ? secs.trip : durationMinutes(row) * 60;
  return durationMinutes(row) * 60;
}

function placeDurations(row: ShareVehicle, nowMs: number, taps?: PlaceTap[]): { trip: string; parking: string } {
  const opened = parseServer(row.openingAt);
  if (!opened) return { trip: '—', parking: '—' };
  const totals = placeSeconds(row, nowMs, taps);
  return { trip: secondsLabel(totals.trip), parking: secondsLabel(totals.parking) };
}

function fleetPhoto(type: string): string {
  return resolveVehicleImageUrl({ name: type });
}

function startLocation(row: ShareVehicle): string {
  const gps = row.openingGps;
  if (!gps) return '—';
  if (gps.address?.trim()) return gps.address.trim();
  if (Number.isFinite(gps.lat) && Number.isFinite(gps.lng)) {
    return `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`;
  }
  return '—';
}

function TripDetailsSheet({
  visible,
  row,
  date,
  token,
  reminding,
  taps,
  onClose,
  onCall,
  onRemind,
  onRevoke,
}: {
  visible: boolean;
  row: ShareVehicle | null;
  date: string;
  token: string;
  reminding: boolean;
  taps?: PlaceTap[];
  onClose: () => void;
  onCall: (mobile?: string) => void;
  onRemind: (row: ShareVehicle) => void;
  onRevoke: (row: ShareVehicle) => void;
}) {
  const [vehicleFailed, setVehicleFailed] = useState(false);
  const [faceFailed, setFaceFailed] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    setVehicleFailed(false);
    setFaceFailed(false);
  }, [row?.vehicleNumber, row?.driverPhotoId]);
  useEffect(() => {
    if (!visible || !row?.openingAt || row.closingAt || row.endRequestedAt) return undefined;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [visible, row?.openingAt, row?.closingAt, row?.dutyId]);
  if (!row) {
    return null;
  }
  const started = Boolean(row.openingAt);
  const done = isCompleted(row);
  const pending = !started && !done;
  const statusText = pending ? 'Pending' : done ? 'Completed' : placeOf(row) === 'parking' ? 'In Parking' : 'In Trip';
  const when = reportingClock(row.reportingTime);
  const dayLabel = formatDutyDate(date);
  const place = (row.reportingLocation || '').trim();
  const placeTitle = place.split(',')[0] || 'Pickup location';
  const placeRest = place.includes(',') ? place.slice(place.indexOf(',') + 1).trim() : '';
  const photo = row.driverPhotoId
    ? `https://www.vizagtaxihub.com/api/events/media.php?id=${row.driverPhotoId}&shareToken=${encodeURIComponent(token)}`
    : '';
  const startKm = row.openingKm != null ? `${row.openingKm} km` : '— km';
  const endKm = row.closingKm != null ? `${row.closingKm} km` : '— km';
  const asked = Boolean(row.endRequestedAt);
  const canRemind = started && !done;
  const startedAt = startLocation(row);
  const places = placeDurations(row, nowMs, taps);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={styles.tripSheet}>
        <ScrollView contentContainerStyle={styles.tripContent} showsVerticalScrollIndicator={false}>
          <View style={styles.handle} />
          <View style={styles.tripHead}>
            <Text style={styles.tripTitle}>Trip Details</Text>
            <View style={styles.pendingPill}>
              <Ionicons name="time-outline" size={13} color="#d97706" />
              <Text style={styles.pendingPillText}>{statusText}</Text>
            </View>
          </View>

          <View style={styles.tripCard}>
            {vehicleFailed ? null : (
              <Image source={{ uri: fleetPhoto(row.vehicleType) }} style={styles.tripVehicle} resizeMode="contain" onError={() => setVehicleFailed(true)} />
            )}
            <View style={styles.tripVehicleCopy}>
              <Text style={styles.tripVehicleName}>{row.vehicleType || 'Vehicle'}</Text>
              <Text style={styles.tripReg}>{row.vehicleNumber}</Text>
            </View>
            <View style={styles.typePill}><Text style={styles.typePillText}>{row.vehicleType}</Text></View>
          </View>

          <View style={styles.tripCard}>
            {photo && !faceFailed ? (
              <Image source={{ uri: photo }} style={styles.driverFace} onError={() => setFaceFailed(true)} />
            ) : (
              <View style={styles.driverFaceFallback}><Text style={styles.driverFaceText}>{initials(row.driverName)}</Text></View>
            )}
            <View style={styles.tripVehicleCopy}>
              <Text style={styles.driverKicker}>Driver</Text>
              <Text style={styles.tripVehicleName}>{row.driverName || 'Driver'}</Text>
              {row.driverMobile ? <Text style={styles.tripPhone}>{displayMobile(row.driverMobile)}</Text> : null}
            </View>
            <TouchableOpacity style={styles.callCircle} onPress={() => onCall(row.driverMobile)}>
              <Ionicons name="call" size={16} color="#2563eb" />
            </TouchableOpacity>
          </View>

          <View style={styles.slipRow}>
            <Ionicons name="document-text-outline" size={16} color="#64748b" />
            <View>
              <Text style={styles.slipLabel}>Trip Slip No.</Text>
              <Text style={styles.slipValue}>{row.dutySlipNo || '—'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <Ionicons name="calendar-outline" size={16} color="#2563eb" />
              <Text style={styles.infoLabel}>Scheduled start</Text>
              <Text style={styles.infoValue}>{dayLabel}</Text>
              <Text style={styles.infoHint}>{weekdayName(date)}</Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="time-outline" size={16} color="#64748b" />
              <Text style={styles.infoLabel}>Reporting time</Text>
              <Text style={styles.infoValue}>{when}</Text>
              <Text style={styles.infoHint}>At pickup location</Text>
            </View>
          </View>

          <View style={styles.block}>
            <Ionicons name="location-outline" size={16} color="#16a34a" />
            <View style={styles.blockCopy}>
              <Text style={styles.infoLabel}>Pickup Location</Text>
              <Text style={styles.infoValue}>{placeTitle}</Text>
              {placeRest ? <Text style={styles.infoHint}>{placeRest}</Text> : null}
            </View>
          </View>

          <TouchableOpacity
            style={styles.block}
            disabled={!row.openingGps}
            onPress={() => {
              const gps = row.openingGps;
              if (!gps) return;
              void Linking.openURL(`https://maps.google.com/?q=${gps.lat},${gps.lng}`);
            }}
          >
            <Ionicons name="navigate-outline" size={16} color="#2563eb" />
            <View style={styles.blockCopy}>
              <Text style={styles.infoLabel}>Start location</Text>
              <Text style={styles.infoValue} numberOfLines={2}>{startedAt}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.block}>
            <Ionicons name="speedometer-outline" size={16} color="#64748b" />
            <View style={styles.blockCopy}>
              <Text style={styles.infoLabel}>Odometer Reading</Text>
              <View style={styles.odoRow}>
                <View>
                  <Text style={styles.infoHint}>Start KM</Text>
                  <Text style={styles.infoValue}>{startKm}</Text>
                </View>
                <Text style={styles.odoArrow}>———›</Text>
                <View>
                  <Text style={styles.infoHint}>End KM</Text>
                  <Text style={styles.infoValue}>{endKm}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>In trip</Text>
              <Text style={styles.infoValue}>{places.trip}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>In parking</Text>
              <Text style={styles.infoValue}>{places.parking}</Text>
            </View>
          </View>

          <View style={styles.timelineHead}>
            <Text style={styles.timelineTitle}>Trip timeline</Text>
            <View style={styles.waitPill}>
              <Ionicons name="time-outline" size={12} color="#d97706" />
              <Text style={styles.waitText}>{pending ? 'Not started yet' : done ? 'Completed' : 'In progress'}</Text>
            </View>
          </View>
          <Text style={styles.waitHint}>{pending ? 'Awaiting trip start' : done ? 'Duty is closed' : 'Duty is open'}</Text>
          <View style={styles.timeline}>
            <View style={styles.timelineLine} />
            <TimelineStep title="Scheduled" detail={when === '—' ? shortDate(date) : `${shortDate(date)}, ${when}`} done />
            <TimelineStep title="Started" detail={started ? (dateTimeLabel(row.openingAt) || 'Started') : 'Pending'} done={started} />
            <TimelineStep title="Completed" detail={done ? (dateTimeLabel(row.closingAt) || 'Completed') : 'Pending'} done={done} />
          </View>

          {canRemind ? (
            <TouchableOpacity
              style={[styles.fullBtn, asked ? styles.fullBtnSent : null]}
              disabled={asked || reminding}
              onPress={() => onRemind(row)}
            >
              <Ionicons name="notifications-outline" size={16} color={asked ? '#b45309' : '#fff'} />
              <Text style={[styles.fullBtnText, asked ? styles.fullBtnTextSent : null]}>
                {reminding ? 'Sending…' : asked ? 'Reminder sent' : 'Send reminder'}
              </Text>
            </TouchableOpacity>
          ) : null}
          {asked && !done ? (
            <TouchableOpacity style={styles.revokeBtn} disabled={reminding} onPress={() => onRevoke(row)}>
              <Text style={styles.revokeBtnText}>{reminding ? 'Working…' : 'Revoke end request'}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={onClose} style={styles.tripClose}>
            <Text style={styles.sheetCloseText}>Close</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

function TimelineStep({ title, detail, done }: { title: string; detail: string; done: boolean }) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepDot, done ? styles.stepDotOn : null]} />
      <Text style={[styles.stepTitle, done ? styles.stepTitleOn : null]}>{title}</Text>
      <Text style={styles.stepDetail}>{detail}</Text>
    </View>
  );
}

function Stat({ icon, value, label, tint, color }: { icon: keyof typeof Ionicons.glyphMap; value: number; label: string; tint: string; color: string }) {
  return (
    <View style={[styles.stat, { backgroundColor: tint }]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Filter({ icon, label, active, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.filter, active && styles.filterOn]} onPress={onPress}>
      <Ionicons name={icon} size={13} color={active ? '#fff' : '#64748b'} />
      <Text style={[styles.filterText, active && styles.filterTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

function CardAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.cardAction} onPress={onPress}>
      <Ionicons name={icon} size={14} color="#64748b" />
      <Text style={styles.cardActionText}>{label}</Text>
    </TouchableOpacity>
  );
}

function TabButton({ icon, activeIcon, label, active, onPress }: { icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.tab} onPress={onPress}>
      <Ionicons name={active ? activeIcon : icon} size={20} color={active ? '#2563eb' : '#94a3b8'} />
      <Text style={[styles.tabLabel, active && styles.tabLabelOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

function PickerSheet({
  visible,
  title,
  options,
  label,
  onPick,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: string[];
  label: (value: string) => string;
  onPick: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.sheetTitle}>{title}</Text>
        {options.map((option) => (
          <TouchableOpacity key={option} style={styles.option} onPress={() => onPick(option)}>
            <Text style={styles.optionText}>{label(option)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f7fb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  logo: { width: 108, height: 28 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bell: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 9, fontFamily: fonts.bold },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: fonts.bold, fontSize: 12 },
  sheetHint: { fontFamily: fonts.regular, fontSize: 12, color: '#64748b', marginTop: 4, marginBottom: 8 },
  sectionLabel: { fontFamily: fonts.bold, fontSize: 13, color: '#0f172a', marginTop: 14, marginBottom: 6 },
  noticeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f8fafc', borderRadius: 12, padding: 10, marginBottom: 8 },
  noticeCopy: { flex: 1 },
  noticeTitle: { fontFamily: fonts.bold, fontSize: 13, color: '#0f172a' },
  noticeBody: { fontFamily: fonts.regular, fontSize: 12, color: '#475569', marginTop: 2 },
  noticeWhen: { fontFamily: fonts.medium, fontSize: 10, color: '#94a3b8' },
  trackRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, paddingVertical: 12 },
  trackText: { fontFamily: fonts.bold, fontSize: 14, color: '#2563eb' },
  profileSheet: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24 },
  profileHead: { alignItems: 'center', marginBottom: 12 },
  profileAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { color: '#fff', fontFamily: fonts.bold, fontSize: 22 },
  profileName: { marginTop: 8, fontFamily: fonts.bold, fontSize: 18, color: '#0f172a' },
  profilePhone: { marginTop: 2, fontFamily: fonts.medium, fontSize: 13, color: '#64748b' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, marginTop: 8 },
  profileRowText: { fontFamily: fonts.semiBold, fontSize: 15, color: '#0f172a' },
  profileLogout: { fontFamily: fonts.bold, fontSize: 15, color: '#b91c1c' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 14, paddingBottom: 16 },
  range: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginTop: 4 },
  rangeText: { fontFamily: fonts.medium, fontSize: 12, color: '#475569' },
  eventTitle: { marginTop: 10, fontFamily: fonts.bold, fontSize: 26, color: '#0f172a' },
  eventSub: { marginTop: 2, fontFamily: fonts.medium, fontSize: 14, color: '#94a3b8' },
  dateRow: { gap: 8, paddingVertical: 12, alignItems: 'center' },
  dayChip: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, minWidth: 64, alignItems: 'center' },
  dayChipOn: { backgroundColor: '#2563eb' },
  dayLabel: { fontFamily: fonts.bold, fontSize: 12, color: '#334155' },
  dayWeek: { fontFamily: fonts.medium, fontSize: 11, color: '#94a3b8' },
  dayLabelOn: { color: '#fff' },
  stats: { flexDirection: 'row', gap: 6 },
  stat: { flex: 1, borderRadius: 16, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', minHeight: 86 },
  statValue: { fontFamily: fonts.bold, fontSize: 18, marginTop: 2 },
  statLabel: { fontFamily: fonts.medium, fontSize: 9, color: '#64748b', textAlign: 'center', marginTop: 2 },
  filters: { gap: 8, paddingVertical: 12 },
  filter: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8 },
  filterOn: { backgroundColor: '#2563eb' },
  filterText: { fontFamily: fonts.semiBold, fontSize: 11, color: '#64748b' },
  filterTextOn: { color: '#fff' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 12, height: 40 },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: '#0f172a', padding: 0 },
  select: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 8, height: 40, maxWidth: 92 },
  selectText: { fontFamily: fonts.medium, fontSize: 11, color: '#475569', textTransform: 'capitalize' },
  card: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardMain: { flex: 1.05, minWidth: 0 },
  vehicleName: { fontFamily: fonts.semiBold, fontSize: 12, color: '#0f172a' },
  regRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 },
  reg: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 10, color: '#94a3b8' },
  serial: { flexShrink: 0, overflow: 'hidden', borderRadius: 6, backgroundColor: '#f1f5f9', paddingHorizontal: 5, paddingVertical: 1, fontFamily: fonts.bold, fontSize: 10, color: '#334155' },
  duration: { alignSelf: 'flex-start', marginTop: 3, backgroundColor: '#fef3c7', color: '#92400e', fontFamily: fonts.bold, fontSize: 9, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, overflow: 'hidden' },
  driverCol: { flex: 1.25, minWidth: 0 },
  driverName: { fontFamily: fonts.medium, fontSize: 12, color: '#0f172a' },
  phone: { fontFamily: fonts.regular, fontSize: 10, color: '#94a3b8', marginTop: 1 },
  statusText: { fontFamily: fonts.bold, fontSize: 10, marginTop: 1 },
  actionCol: { alignItems: 'flex-end', justifyContent: 'center', width: 108 },
  remind: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  remindText: { color: '#ef4444', fontFamily: fonts.bold, fontSize: 10 },
  revoke: { marginBottom: 2 },
  revokeText: { color: '#64748b', fontFamily: fonts.bold, fontSize: 10 },
  placeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, marginTop: 4 },
  placePark: { backgroundColor: '#f97316' },
  placeTrip: { backgroundColor: '#2563eb' },
  placeText: { color: '#fff', fontFamily: fonts.bold, fontSize: 9 },
  placeTime: { color: '#fff', fontFamily: fonts.bold, fontSize: 9 },
  continueBtn: { backgroundColor: '#2563eb', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 4 },
  continueText: { color: '#fff', fontFamily: fonts.bold, fontSize: 10 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#ecfdf5', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  viewText: { color: '#16a34a', fontFamily: fonts.bold, fontSize: 11 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  cardAction: { alignItems: 'center', gap: 2, flex: 1 },
  cardActionText: { fontFamily: fonts.medium, fontSize: 9, color: '#64748b' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 24, fontFamily: fonts.regular },
  error: { color: '#b91c1c', marginBottom: 8, fontFamily: fonts.regular },
  pad: { marginVertical: 16 },
  mapPane: { flex: 1, paddingHorizontal: 12, paddingBottom: 8 },
  more: { flex: 1, padding: 16 },
  moreRow: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moreLabel: { fontFamily: fonts.semiBold, fontSize: 15, color: '#0f172a' },
  logout: { color: '#b91c1c', fontFamily: fonts.bold, fontSize: 15 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 6, paddingBottom: 4 },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabLabel: { fontFamily: fonts.medium, fontSize: 10, color: '#94a3b8' },
  tabLabelOn: { color: '#2563eb', fontFamily: fonts.bold },
  tripSheet: { maxHeight: '88%', backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, position: 'absolute', left: 0, right: 0, bottom: 0 },
  tripContent: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12 },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 6 },
  tripHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  tripTitle: { fontFamily: fonts.bold, fontSize: 16, color: '#0f172a' },
  pendingPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff7ed', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pendingPillText: { color: '#d97706', fontFamily: fonts.bold, fontSize: 11 },
  tripCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6, marginBottom: 6 },
  tripVehicle: { width: 56, height: 36 },
  tripVehicleCopy: { flex: 1 },
  tripVehicleName: { fontFamily: fonts.bold, fontSize: 14, color: '#0f172a' },
  tripReg: { fontFamily: fonts.regular, fontSize: 11, color: '#64748b', marginTop: 1 },
  typePill: { backgroundColor: '#fff7ed', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  typePillText: { color: '#ea580c', fontFamily: fonts.bold, fontSize: 11 },
  driverFace: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e2e8f0' },
  driverFaceFallback: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  driverFaceText: { color: '#fff', fontFamily: fonts.bold, fontSize: 12 },
  driverKicker: { fontFamily: fonts.medium, fontSize: 10, color: '#94a3b8' },
  tripPhone: { fontFamily: fonts.semiBold, fontSize: 12, color: '#2563eb', marginTop: 1 },
  callCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  slipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  slipLabel: { fontFamily: fonts.medium, fontSize: 10, color: '#94a3b8' },
  slipValue: { fontFamily: fonts.bold, fontSize: 13, color: '#0f172a' },
  infoRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  infoCard: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6 },
  infoLabel: { fontFamily: fonts.medium, fontSize: 10, color: '#94a3b8', marginTop: 2 },
  infoValue: { fontFamily: fonts.bold, fontSize: 13, color: '#0f172a', marginTop: 1 },
  infoHint: { fontFamily: fonts.regular, fontSize: 10, color: '#94a3b8', marginTop: 1 },
  block: { flexDirection: 'row', gap: 8, backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6, marginBottom: 6 },
  blockCopy: { flex: 1 },
  odoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  odoArrow: { color: '#cbd5e1', fontFamily: fonts.bold },
  timelineHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  timelineTitle: { fontFamily: fonts.bold, fontSize: 15, color: '#0f172a' },
  waitPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff7ed', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  waitText: { color: '#d97706', fontFamily: fonts.bold, fontSize: 11 },
  waitHint: { fontFamily: fonts.regular, fontSize: 10, color: '#94a3b8', textAlign: 'right', marginBottom: 4 },
  timeline: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  timelineLine: { position: 'absolute', left: '18%', right: '18%', top: 5, height: 2, backgroundColor: '#e2e8f0' },
  step: { flex: 1, alignItems: 'center' },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#cbd5e1', marginBottom: 6 },
  stepDotOn: { backgroundColor: '#2563eb' },
  stepTitle: { fontFamily: fonts.bold, fontSize: 12, color: '#94a3b8' },
  stepTitleOn: { color: '#2563eb' },
  stepDetail: { fontFamily: fonts.regular, fontSize: 10, color: '#94a3b8', marginTop: 2, textAlign: 'center' },
  fullBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 11 },
  fullBtnSent: { backgroundColor: '#fff7ed', paddingVertical: 8 },
  fullBtnText: { color: '#fff', fontFamily: fonts.bold, fontSize: 14 },
  fullBtnTextSent: { color: '#b45309' },
  revokeBtn: { marginTop: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 11, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  revokeBtnText: { color: '#0f172a', fontFamily: fonts.bold, fontSize: 14 },
  tripClose: { alignItems: 'center', paddingVertical: 8 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 16, color: '#0f172a', marginBottom: 8 },
  sheetLine: { fontFamily: fonts.regular, fontSize: 14, color: '#475569', marginTop: 4 },
  sheetClose: { marginTop: 16, alignSelf: 'flex-start' },
  sheetCloseText: { color: '#2563eb', fontFamily: fonts.bold },
  option: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  optionText: { fontFamily: fonts.medium, fontSize: 15, color: '#0f172a', textTransform: 'capitalize' },
});
