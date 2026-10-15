import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EventManagerBoard } from '../components/events/EventManagerBoard';
import { useAuth } from '../providers/AuthProvider';
import { formatDutyDate, mobileEventAPI, type MobileEvent } from '../services/eventDutyAPI';
import { EventDutyScreen } from './EventDutyScreen';
import { colors, fonts } from '../theme/colors';

function PortalBar({ title, onBack, onLogout }: { title: string; onBack?: () => void; onLogout: () => void }) {
  return (
    <View style={styles.bar}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
      ) : <View style={styles.iconBtn} />}
      <Text style={styles.barTitle} numberOfLines={1}>{title}</Text>
      <TouchableOpacity onPress={onLogout}>
        <Text style={styles.logout}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

export function EventManagerPortal() {
  const { logout } = useAuth();
  const [events, setEvents] = useState<MobileEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<{ event: MobileEvent; token: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await mobileEventAPI.listEvents();
      setEvents(result.events);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (loading || open || events.length !== 1) return;
    void openEvent(events[0]);
  }, [events, loading, open]);

  const openEvent = async (event: MobileEvent) => {
    try {
      const token = await mobileEventAPI.ensureShareToken(event.id);
      setOpen({ event, token });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open this event');
    }
  };

  if (open) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <EventManagerBoard
          token={open.token}
          event={open.event}
          events={events}
          onOpenEvent={(item) => { void openEvent(item); }}
          onLogout={() => { void logout(); }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <PortalBar title="Event manager" onLogout={() => { void logout(); }} />
      {loading ? <ActivityIndicator style={styles.pad} color="#2563eb" /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={events}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? null : <Text style={styles.empty}>No events are assigned yet.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => { void openEvent(item); }}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardMeta}>{item.eventCode} · {formatDutyDate(item.startDate)} – {formatDutyDate(item.endDate)}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

export function EventDriverPortal() {
  const { logout } = useAuth();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDuty = useCallback(() => {
    setLoading(true);
    void mobileEventAPI.myAppAccess().then((access) => {
      if (access.driverToken) {
        setToken(access.driverToken);
        setError('');
      } else {
        setError('No event duty is linked to this driver login yet.');
      }
    }).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Could not open the duty');
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadDuty();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadDuty();
    });
    return () => sub.remove();
  }, [loadDuty]);

  if (token) {
    return <EventDutyScreen embeddedToken={token} onLogout={() => { void logout(); }} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <PortalBar title="Event duty" onLogout={() => { void logout(); }} />
      {loading ? <ActivityIndicator style={styles.pad} color="#2563eb" /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  iconBtn: { width: 32 },
  barTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.bold, fontSize: 16, color: '#0f172a' },
  logout: { color: '#b91c1c', fontFamily: fonts.semiBold, fontSize: 13 },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, marginBottom: 10 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16, color: '#0f172a' },
  cardMeta: { marginTop: 4, color: '#64748b', fontFamily: fonts.regular },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 24, fontFamily: fonts.regular },
  error: { color: '#b91c1c', padding: 16, fontFamily: fonts.regular },
  pad: { marginTop: 24 },
});
